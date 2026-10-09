import { ForbiddenException, HttpException, NotFoundException, UnauthorizedException } from '@nestjs/common';

jest.mock('../common/validators/url.validator', () => {
  const actual = jest.requireActual('../common/validators/url.validator');
  return {
    ...actual,
    assertPublicHost: jest.fn(async (host: string) => {
      if (host === 'interne.example') throw new Error('URL réseau privé non autorisée');
    }),
  };
});

import { normalizeOrigin, isOriginAllowed, parseOrigins } from './widget-rules';
import { corsOptionsFor } from '../common/security/cors';
import { WidgetService } from './widget.service';

describe('normalizeOrigin / isOriginAllowed', () => {
  it.each([
    ['agence.ae', 'https://agence.ae'],
    ['https://WWW.Agence.ae/contact?x=1', 'https://www.agence.ae'],
    ['https://agence.ae:8443', 'https://agence.ae:8443'],
    ['http://agence.ae', null],          // https uniquement
    ['https://user:pw@agence.ae', null],
    ['localhost', null],
    ['pas une url', null],
    ['', null],
  ])('%p → %p', (raw, expected) => {
    expect(normalizeOrigin(raw)).toBe(expected);
  });

  it('comparaison exacte de l’origine du navigateur', () => {
    const allowed = ['https://agence.ae'];
    expect(isOriginAllowed('https://agence.ae', allowed)).toBe(true);
    expect(isOriginAllowed('https://AGENCE.ae', allowed)).toBe(true);
    expect(isOriginAllowed('https://www.agence.ae', allowed)).toBe(false);
    expect(isOriginAllowed('https://agence.ae.attaquant.com', allowed)).toBe(false);
    expect(isOriginAllowed('http://agence.ae', allowed)).toBe(false);
    expect(isOriginAllowed(undefined, allowed)).toBe(false);
  });

  it('parseOrigins tolère une valeur absente ou corrompue', () => {
    expect(parseOrigins(null)).toEqual([]);
    expect(parseOrigins('{pas du json')).toEqual([]);
    expect(parseOrigins('["https://a.ae", 3]')).toEqual(['https://a.ae']);
  });
});

describe('corsOptionsFor', () => {
  const front = ['https://velifa.io'];
  it('routes du widget : toute origine, sans cookies ni Authorization', () => {
    expect(corsOptionsFor('/api/v1/widget/abc/audit', front)).toMatchObject({ origin: true, credentials: false, allowedHeaders: ['Content-Type'] });
  });
  it('reste de l’API : frontend VELIFA uniquement, avec authentification', () => {
    expect(corsOptionsFor('/api/v1/workspaces', front)).toMatchObject({ origin: front, credentials: true });
    expect(corsOptionsFor('/api/v1/widgetX', front)).toMatchObject({ origin: front });
  });
});

const KEY = 'a'.repeat(32);

function setup(opts: { plan?: string; count?: number; widgetKey?: string | null; role?: string } = {}) {
  const workspace: any = {
    id: 'ws1', name: 'Agence', brandColor: '#1A73E8', defaultLocale: 'ar', ownerClerkUserId: 'user_owner',
    widgetKey: opts.widgetKey === undefined ? KEY : opts.widgetKey, widgetOrigins: '["https://agence.ae"]',
  };
  const prospects: any[] = [];
  let n = 0;
  const db = {
    findWorkspaceById: jest.fn(async (id: string) => (id === 'ws1' ? workspace : null)),
    findWorkspaceMembers: jest.fn(async () => [{ clerkUserId: 'user_owner', role: 'owner' }, { clerkUserId: 'user_sara', role: 'member' }]),
    findUserByClerkId: jest.fn(async () => ({ subscriptionPlan: opts.plan ?? 'business', subscriptionStatus: 'active' })),
    setWorkspaceWidget: jest.fn(async (_id: string, key: string, origins: string) => { workspace.widgetKey = key; workspace.widgetOrigins = origins; }),
    listWorkspaceProspects: jest.fn(async () => prospects),
    findWorkspaceByWidgetKey: jest.fn(async (k: string) => (k === workspace.widgetKey ? workspace : null)),
    countWorkspaceProspectsSince: jest.fn(async () => opts.count ?? 0),
    createAnalysis: jest.fn(async (d: any) => ({ id: `c${++n}`, ...d })),
    insertWorkspaceProspect: jest.fn(async (p: any) => { prospects.push(p); }),
    isWorkspaceProspectAnalysis: jest.fn(async (_ws: string, id: string) => prospects.some((p) => p.analysisId === id)),
    findAnalysisById: jest.fn(async (id: string) => ({ id, status: 'completed', scorePerformance: 47, lcpMobile: 3900 })),
  };
  const queue = { add: jest.fn(async () => undefined) };
  const config = { get: jest.fn((_k: string, def: any) => def) };
  return { db, queue, workspace, prospects, service: new WidgetService(db as any, queue as any, config as any) };
}

describe('WidgetService — configuration', () => {
  it('propriétaire Business : domaines normalisés et dédoublonnés, clé créée une fois', async () => {
    const { service, workspace } = setup({ widgetKey: null });
    const res = await service.configure('user_owner', 'ws1', ['agence.ae', 'https://agence.ae/', 'www.agence.ae']);
    expect(res.origins).toEqual(['https://agence.ae', 'https://www.agence.ae']);
    expect(res.widgetKey).toMatch(/^[0-9a-f]{32}$/);
    const key = workspace.widgetKey;
    await service.configure('user_owner', 'ws1', ['agence.ae']);
    expect(workspace.widgetKey).toBe(key);
    await service.configure('user_owner', 'ws1', ['agence.ae'], true);
    expect(workspace.widgetKey).not.toBe(key);
  });

  it('refus : non connecté, membre non propriétaire, plan non Business, domaine invalide, aucun ou trop de domaines', async () => {
    await expect(setup().service.configure(null, 'ws1', ['agence.ae'])).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(setup().service.configure('user_sara', 'ws1', ['agence.ae'])).rejects.toThrow('owner_only');
    await expect(setup({ plan: 'pro' }).service.configure('user_owner', 'ws1', ['agence.ae'])).rejects.toThrow('widget_requires_business');
    await expect(setup().service.configure('user_owner', 'ws1', ['http://agence.ae'])).rejects.toThrow('origin_invalid');
    await expect(setup().service.configure('user_owner', 'ws1', [])).rejects.toThrow('origins_count');
    await expect(setup().service.configure('user_owner', 'ws1', ['a1.ae', 'a2.ae', 'a3.ae', 'a4.ae', 'a5.ae', 'a6.ae'])).rejects.toThrow('origins_count');
    await expect(setup().service.getConfig('user_intrus', 'ws1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('WidgetService — routes publiques', () => {
  const input = { url: 'https://boutique.example', email: 'Client@Boutique.example', name: 'Ali' };

  it('domaine autorisé : audit au nom du titulaire, sans email VELIFA, prospect enregistré pour l’agence', async () => {
    const { service, db, queue, prospects } = setup();
    expect(await service.publicAudit(KEY, 'https://agence.ae', '203.0.113.9', input)).toEqual({ id: 'c1' });
    expect(db.createAnalysis).toHaveBeenCalledWith(expect.objectContaining({
      urlSite: 'https://boutique.example', email: '', source: 'widget', clerkUserId: 'user_owner', locale: 'ar', ipAddress: '203.0.113.xxx',
    }));
    expect(prospects[0]).toMatchObject({ workspaceId: 'ws1', email: 'client@boutique.example', name: 'Ali', analysisId: 'c1', origin: 'https://agence.ae' });
    expect(queue.add).toHaveBeenCalledWith('run', { analysisId: 'c1', url: 'https://boutique.example', email: '', locale: 'ar' }, { jobId: 'c1', timeout: 60_000 });
  });

  it('refus : clé inconnue ou mal formée (404), origine non déclarée ou absente (403), titulaire plus Business (403)', async () => {
    await expect(setup().service.publicAudit('b'.repeat(32), 'https://agence.ae', '1.2.3.4', input)).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup().service.publicAudit("x' OR 1=1", 'https://agence.ae', '1.2.3.4', input)).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup().service.publicAudit(KEY, 'https://autre-site.com', '1.2.3.4', input)).rejects.toThrow('origin_not_allowed');
    await expect(setup().service.publicAudit(KEY, undefined, '1.2.3.4', input)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(setup({ plan: 'pro' }).service.publicAudit(KEY, 'https://agence.ae', '1.2.3.4', input)).rejects.toThrow('widget_disabled');
  });

  it('plafond quotidien atteint → 429 ; contact absent ou URL interne → 400, rien créé', async () => {
    const capped = setup({ count: 50 });
    const err = await capped.service.publicAudit(KEY, 'https://agence.ae', '1.2.3.4', input).catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    const { service, db } = setup();
    await expect(service.publicAudit(KEY, 'https://agence.ae', '1.2.3.4', { url: 'https://boutique.example' })).rejects.toThrow('contact_required');
    await expect(service.publicAudit(KEY, 'https://agence.ae', '1.2.3.4', { ...input, url: 'https://interne.example' })).rejects.toThrow('url_invalid');
    expect(db.createAnalysis).not.toHaveBeenCalled();
  });

  it('statut : uniquement pour un audit lancé par ce widget', async () => {
    const { service } = setup();
    await service.publicAudit(KEY, 'https://agence.ae', '1.2.3.4', input);
    expect(await service.publicStatus(KEY, 'https://agence.ae', 'c1')).toEqual({ status: 'completed', scorePerformance: 47, lcpMs: 3900 });
    await expect(service.publicStatus(KEY, 'https://agence.ae', 'audit-d-un-autre')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.publicStatus(KEY, 'https://autre-site.com', 'c1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('config publique : nom, couleur et langue de l’agence uniquement', async () => {
    expect(await setup().service.publicConfig(KEY, 'https://agence.ae')).toEqual({ name: 'Agence', brandColor: '#1A73E8', locale: 'ar' });
  });
});
