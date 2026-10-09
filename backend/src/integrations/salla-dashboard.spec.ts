import { ForbiddenException, HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { signMerchantSession, verifyMerchantSession, SESSION_TTL_MS } from './salla-session';
import { SallaDashboardService, MERCHANT_FREE_AUDITS_PER_DAY } from './salla-dashboard.service';

const KEY = 'b'.repeat(64);

describe('session marchand', () => {
  it('aller-retour ; expire après 1 h ; refus si altérée ou autre clé', () => {
    const now = 1_000_000;
    const { session, expiresAt } = signMerchantSession('1234509876', KEY, now);
    expect(expiresAt.getTime()).toBe(now + SESSION_TTL_MS);
    expect(verifyMerchantSession(session, KEY, now)).toBe('1234509876');
    expect(verifyMerchantSession(session, KEY, now + SESSION_TTL_MS + 1)).toBeNull();
    expect(verifyMerchantSession(session, 'c'.repeat(64), now)).toBeNull();
    const [body, sig] = session.split('.');
    const forged = Buffer.from(JSON.stringify({ m: '999', exp: now + 10 })).toString('base64url');
    expect(verifyMerchantSession(`${forged}.${sig}`, KEY, now)).toBeNull();
    expect(verifyMerchantSession(`${body}`, KEY, now)).toBeNull();
    expect(verifyMerchantSession(undefined, KEY, now)).toBeNull();
  });
});

function setup(opts: { introspect?: any; installed?: boolean; used?: number; site?: boolean; appId?: string } = {}) {
  let n = 0;
  const owner = 'salla:1234509876';
  const site = { id: 's1', urlSite: 'https://demo.salla.group/ar/merchant-store', urlHash: 'h', lastAnalysisId: 'c0' };
  const db = {
    findInstallation: jest.fn(async () => (opts.installed === false
      ? { status: 'uninstalled' }
      : { status: 'installed', store_name: 'متجر تجريبي', store_domain: site.urlSite })),
    listTrackedSites: jest.fn(async (scope: string, auditors: string[]) => {
      expect(scope).toBe(`user:${owner}`);
      expect(auditors).toEqual([owner]);
      return opts.site === false ? [] : [site];
    }),
    findAnalysisById: jest.fn(async () => ({
      id: 'c0', createdAt: new Date('2026-10-01'), scorePerformance: 41,
      recommendations: [{ id: 'a', impact: 'high' }, { id: 'b', impact: 'medium' }, { id: 'c', impact: 'low' }, { id: 'd', impact: 'low' }],
      siteChecks: { blocked: false, issues: [{ code: 'arabic_without_rtl' }] },
      email: 'x@y.z', ipAddress: '1.2.3.xxx',
    })),
    countRecentAnalysesByUser: jest.fn(async () => opts.used ?? 0),
    createAnalysis: jest.fn(async (d: any) => ({ id: `c${++n}`, ...d })),
  };
  const queue = { add: jest.fn(async () => undefined) };
  const config = { get: jest.fn((k: string, def: any) => (k === 'marketplace.tokenKey' ? KEY : k === 'salla.appId' ? (opts.appId ?? '777') : def)) };
  const service = new SallaDashboardService(db as any, queue as any, config as any);
  service.introspect = jest.fn(async (token: string, appId: string) => {
    expect(appId).toBe(opts.appId ?? '777');
    if (opts.introspect instanceof Error) throw opts.introspect;
    return opts.introspect === undefined ? { merchantId: '1234509876', userId: '987654' } : opts.introspect;
  });
  return { db, queue, service };
}

describe('SallaDashboardService', () => {
  it('jeton Salla vérifié + app installée → session VELIFA', async () => {
    const { service } = setup();
    const { session } = await service.openSession('em_tok_exemple');
    expect(verifyMerchantSession(session, KEY)).toBe('1234509876');
  });

  it('refus : jeton rejeté par Salla, introspection en échec, app désinstallée, App ID non configuré', async () => {
    await expect(setup({ introspect: null }).service.openSession('t')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(setup({ introspect: new Error('401') }).service.openSession('t')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(setup({ installed: false }).service.openSession('t')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(setup({ appId: '' }).service.openSession('t')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(setup().service.openSession('')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('tableau de bord : boutique, dernier audit (3 recommandations), points Golfe, quota — sans donnée personnelle', async () => {
    const { service } = setup({ used: 1 });
    const { session } = signMerchantSession('1234509876', KEY);
    const d = await service.dashboard(session);
    expect(d).toMatchObject({
      store: { name: 'متجر تجريبي', domain: 'https://demo.salla.group/ar/merchant-store' }, tracked: true,
      lastAudit: { id: 'c0', scorePerformance: 41, siteIssues: ['arabic_without_rtl'] },
      audits: { usedToday: 1, limitPerDay: MERCHANT_FREE_AUDITS_PER_DAY },
    });
    expect(d.lastAudit!.recommendations).toHaveLength(3);
    expect(JSON.stringify(d)).not.toMatch(/x@y\.z|1\.2\.3/);
    await expect(service.dashboard('session-invalide')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('audit : boutique suivie, au nom du marchand, sans email ; limite 3 / 24 h → 429', async () => {
    const { service, db, queue } = setup();
    const { session } = signMerchantSession('1234509876', KEY);
    expect(await service.runAudit(session, 'ar')).toEqual({ id: 'c1' });
    expect(db.createAnalysis).toHaveBeenCalledWith(expect.objectContaining({
      urlSite: 'https://demo.salla.group/ar/merchant-store', source: 'salla', clerkUserId: 'salla:1234509876', email: '', locale: 'ar',
    }));
    expect(queue.add).toHaveBeenCalledWith('run', expect.objectContaining({ analysisId: 'c1' }), expect.objectContaining({ jobId: 'c1' }));
    const limited = setup({ used: MERCHANT_FREE_AUDITS_PER_DAY });
    const err = await limited.service.runAudit(signMerchantSession('1234509876', KEY).session).catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
  });
});
