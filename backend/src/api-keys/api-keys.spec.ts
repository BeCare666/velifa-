import { BadRequestException, ForbiddenException, HttpException, NotFoundException, UnauthorizedException } from '@nestjs/common';

jest.mock('../common/validators/url.validator', () => {
  const actual = jest.requireActual('../common/validators/url.validator');
  return { ...actual, assertPublicHost: jest.fn(async (host: string) => { if (host === 'interne.example') throw new Error('privé'); }) };
});

import { generateApiKey, hashApiKey, extractApiKey, API_KEY_PATTERN, MAX_ACTIVE_KEYS } from './api-key';
import { ApiKeysService, toApiAudit } from './api-keys.service';

describe('clés API', () => {
  it('format vlf_ + 40 hex, préfixe affichable, empreinte SHA-256, clés toutes différentes', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.key).toMatch(API_KEY_PATTERN);
    expect(a.prefix).toBe(a.key.slice(0, 12));
    expect(a.hash).toBe(hashApiKey(a.key));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).not.toContain(a.key.slice(4));
    expect(a.key).not.toBe(b.key);
  });

  it('lecture : Bearer ou X-API-Key ; jeton Clerk ou clé mal formée → null', () => {
    const { key } = generateApiKey();
    expect(extractApiKey(`Bearer ${key}`, undefined)).toBe(key);
    expect(extractApiKey(undefined, key)).toBe(key);
    expect(extractApiKey('Bearer eyJhbGciOiJSUzI1NiJ9.x.y', undefined)).toBeNull();
    expect(extractApiKey(undefined, 'vlf_123')).toBeNull();
    expect(extractApiKey(undefined, undefined)).toBeNull();
  });
});

function setup(opts: { plan?: string } = {}) {
  const keys: any[] = [];
  const analyses: Record<string, any> = {
    mine: { id: 'mine', urlSite: 'https://a.example', status: 'completed', clerkUserId: 'user_biz', scorePerformance: 61, email: 'x@y.z', ipAddress: '1.2.3.xxx' },
    other: { id: 'other', urlSite: 'https://b.example', status: 'completed', clerkUserId: 'user_autre' },
  };
  let n = 0;
  let apiCount = 0;
  const db = {
    findUserByClerkId: jest.fn(async () => ({ subscriptionPlan: opts.plan ?? 'business', subscriptionStatus: 'active' })),
    listApiKeys: jest.fn(async (owner: string) => keys.filter((k) => k.ownerClerkUserId === owner)
      .map(({ id, name, prefix, revokedAt }) => ({ id, name, prefix, revokedAt: revokedAt ?? null }))),
    insertApiKey: jest.fn(async (k: any) => { keys.push(k); }),
    findActiveApiKeyByHash: jest.fn(async (hash: string) => {
      const k = keys.find((x) => x.keyHash === hash && !x.revokedAt);
      return k ? { id: k.id, ownerClerkUserId: k.ownerClerkUserId } : null;
    }),
    touchApiKey: jest.fn(async () => undefined),
    revokeApiKey: jest.fn(async (id: string, owner: string) => {
      const k = keys.find((x) => x.id === id && x.ownerClerkUserId === owner && !x.revokedAt);
      if (k) k.revokedAt = new Date();
      return !!k;
    }),
    countAnalysesBySourceSince: jest.fn(async () => apiCount),
    createAnalysis: jest.fn(async (d: any) => ({ id: `c${++n}`, status: 'pending', createdAt: new Date(), completedAt: null, ...d })),
    findAnalysisById: jest.fn(async (id: string) => analyses[id] ?? null),
  };
  const queue = { add: jest.fn(async () => undefined) };
  const plans = { get: jest.fn(async () => ({ apiDailyLimit: 50 })) };
  const service = new ApiKeysService(db as any, queue as any, plans as any);
  return { db, queue, keys, service, setApiCount: (c: number) => { apiCount = c; } };
}

describe('ApiKeysService — gestion', () => {
  it('création Business : clé complète renvoyée une fois, seule l’empreinte est stockée ; la liste ne l’expose jamais', async () => {
    const { service, keys } = setup();
    const created = await service.create('user_biz', '  Intégration  CRM ');
    expect(created.key).toMatch(API_KEY_PATTERN);
    expect(created.name).toBe('Intégration CRM');
    expect(keys[0].keyHash).toBe(hashApiKey(created.key));
    expect(JSON.stringify(keys[0])).not.toContain(created.key);
    const listed = await service.list('user_biz');
    expect(JSON.stringify(listed)).not.toContain(created.key);
    expect(JSON.stringify(listed)).not.toContain(keys[0].keyHash);
  });

  it('refus : non connecté, plan non Business, nom vide, plus de 5 clés actives', async () => {
    await expect(setup().service.create(null, 'x')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(setup({ plan: 'pro' }).service.create('user_biz', 'x')).rejects.toThrow('api_requires_business');
    await expect(setup().service.create('user_biz', '   ')).rejects.toBeInstanceOf(BadRequestException);
    const { service } = setup();
    for (let i = 0; i < MAX_ACTIVE_KEYS; i++) await service.create('user_biz', `k${i}`);
    await expect(service.create('user_biz', 'k6')).rejects.toThrow('keys_limit');
  });

  it('révocation : seulement ses propres clés ; une clé révoquée ne s’authentifie plus', async () => {
    const { service, keys } = setup();
    const { key } = await service.create('user_biz', 'k');
    await expect(service.revoke('user_autre', keys[0].id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.authenticate(`Bearer ${key}`, undefined)).resolves.toBe('user_biz');
    await service.revoke('user_biz', keys[0].id);
    await expect(service.authenticate(`Bearer ${key}`, undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('ApiKeysService — API publique', () => {
  it('authentification : clé inconnue ou mal formée → 401 ; titulaire plus Business → 403', async () => {
    const { service } = setup();
    await expect(service.authenticate(undefined, generateApiKey().key)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.authenticate('Bearer pas-une-cle', undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    const expired = setup();
    const { key } = await expired.service.create('user_biz', 'k');
    expired.db.findUserByClerkId.mockResolvedValue({ subscriptionPlan: 'business', subscriptionStatus: 'expired' } as any);
    await expect(expired.service.authenticate(undefined, key)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('création d’audit : source api, au nom du titulaire, sans email, en file ; URL interne → 400', async () => {
    const { service, db, queue } = setup();
    const res = await service.createAudit('user_biz', { url: 'https://shop.example', locale: 'ar' });
    expect(res).toMatchObject({ id: 'c1', url: 'https://shop.example', status: 'pending', scores: null });
    expect(db.createAnalysis).toHaveBeenCalledWith(expect.objectContaining({ source: 'api', clerkUserId: 'user_biz', email: '', locale: 'ar' }));
    expect(queue.add).toHaveBeenCalledWith('run', expect.objectContaining({ analysisId: 'c1' }), expect.objectContaining({ jobId: 'c1' }));
    await expect(service.createAudit('user_biz', { url: 'https://interne.example' })).rejects.toThrow('url_invalid');
  });

  it('plafond quotidien du plan Business (backoffice) → 429', async () => {
    const { service, setApiCount } = setup();
    setApiCount(50);
    const err = await service.createAudit('user_biz', { url: 'https://shop.example' }).catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
  });

  it('lecture : ses audits uniquement, sans donnée personnelle', async () => {
    const { service } = setup();
    const a = await service.getAudit('user_biz', 'mine');
    expect(a).toMatchObject({ id: 'mine', status: 'completed', scores: { performance: 61 } });
    expect(JSON.stringify(a)).not.toMatch(/x@y\.z|1\.2\.3|clerkUserId|email/);
    await expect(service.getAudit('user_biz', 'other')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getAudit('user_biz', 'absent')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('toApiAudit : résultats masqués tant que l’audit n’est pas terminé ; échec signalé', () => {
    expect(toApiAudit({ id: 'x', status: 'processing', scorePerformance: 10 } as any)).toMatchObject({ scores: null, lab: null, error: null });
    expect(toApiAudit({ id: 'x', status: 'failed' } as any).error).toBe('audit_failed');
  });
});
