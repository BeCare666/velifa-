import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';

jest.mock('../common/validators/url.validator', () => {
  const actual = jest.requireActual('../common/validators/url.validator');
  return {
    ...actual,
    assertPublicHost: jest.fn(async (host: string) => {
      if (host === 'interne.example') throw new Error('URL réseau privé non autorisée');
    }),
  };
});

import { SitesService } from './sites.service';
import { parseSiteLimits, effectivePlan, DEFAULT_SITE_LIMITS } from '../payments/plan-limits';

describe('plan-limits', () => {
  it('valeurs par défaut et surcharge partielle par variable d’environnement', () => {
    expect(parseSiteLimits(undefined)).toEqual(DEFAULT_SITE_LIMITS);
    expect(parseSiteLimits('pro:12, business:100')).toEqual({ free: DEFAULT_SITE_LIMITS.free, pro: 12, business: 100 });
    expect(parseSiteLimits('pro:abc,inconnu:5')).toEqual(DEFAULT_SITE_LIMITS);
  });
  it('plan effectif : abonnement expiré → free ; résilié mais période en cours → conservé', () => {
    expect(effectivePlan('business', 'active')).toBe('business');
    expect(effectivePlan('pro', 'cancelled')).toBe('pro');
    expect(effectivePlan('business', 'expired')).toBe('free');
    expect(effectivePlan(null, null)).toBe('free');
  });
});

function setup(opts: { plans?: Record<string, [string, string]> } = {}) {
  const sites: any[] = [];
  const workspaces: Record<string, any> = { ws1: { id: 'ws1', ownerClerkUserId: 'user_agence' } };
  const members: Record<string, string[]> = { ws1: ['user_agence', 'user_sara'] };
  const plans = opts.plans ?? {};
  const db = {
    findWorkspaceById: jest.fn(async (id: string) => workspaces[id] ?? null),
    findWorkspaceMembers: jest.fn(async (id: string) => (members[id] ?? []).map((clerkUserId) => ({ clerkUserId }))),
    findUserByClerkId: jest.fn(async (id: string) =>
      plans[id] ? { subscriptionPlan: plans[id][0], subscriptionStatus: plans[id][1] } : null),
    countTrackedSitesByOwner: jest.fn(async (owner: string) => sites.filter((s) => s.ownerClerkUserId === owner).length),
    insertTrackedSite: jest.fn(async (s: any) => {
      if (sites.some((x) => x.scope === s.scope && x.urlHash === s.urlHash)) return false;
      sites.push(s);
      return true;
    }),
    findTrackedSiteById: jest.fn(async (id: string) => sites.find((s) => s.id === id) ?? null),
    deleteTrackedSite: jest.fn(async (id: string) => { sites.splice(sites.findIndex((s) => s.id === id), 1); }),
    listTrackedSites: jest.fn(async (scope: string, _auditors: string[]) => sites.filter((s) => s.scope === scope)),
  };
  const config = { get: jest.fn(() => 'free:1,pro:2,business:3') };
  return { db, sites, service: new SitesService(db as any, config as any) };
}

describe('SitesService', () => {
  it('non connecté → 401', async () => {
    const { service } = setup();
    await expect(service.list(null)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('ajout personnel : URL normalisée, libellé nettoyé, usage renvoyé', async () => {
    const { service, sites } = setup();
    const res = await service.add('user_a', { url: 'https://Shop.example/', label: '  Ma   boutique ' });
    expect(sites[0]).toMatchObject({
      scope: 'user:user_a', workspaceId: null, ownerClerkUserId: 'user_a', urlSite: 'https://shop.example',
      label: 'Ma boutique', createdBy: 'user_a',
    });
    expect(res.usage).toEqual({ plan: 'free', used: 1, limit: 1 });
  });

  it('URL invalide, interne ou résolue vers le réseau interne → 400', async () => {
    const { service, sites } = setup();
    for (const url of ['pas une url', 'http://localhost', 'http://10.0.0.1', 'https://interne.example']) {
      await expect(service.add('user_a', { url })).rejects.toThrow('url_invalid');
    }
    expect(sites).toHaveLength(0);
  });

  it('limite du plan appliquée côté serveur (free = 1)', async () => {
    const { service } = setup();
    await service.add('user_a', { url: 'https://a.example' });
    await expect(service.add('user_a', { url: 'https://b.example' })).rejects.toThrow('site_limit');
    await expect(service.add('user_a', { url: 'https://b.example' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('abonnement Pro actif → limite Pro ; expiré → retour à la limite free', async () => {
    const pro = setup({ plans: { user_a: ['pro', 'active'] } });
    await pro.service.add('user_a', { url: 'https://a.example' });
    await expect(pro.service.add('user_a', { url: 'https://b.example' })).resolves.toMatchObject({ usage: { plan: 'pro', used: 2, limit: 2 } });
    const expired = setup({ plans: { user_a: ['pro', 'expired'] } });
    await expired.service.add('user_a', { url: 'https://a.example' });
    await expect(expired.service.add('user_a', { url: 'https://b.example' })).rejects.toThrow('site_limit');
  });

  it('doublon dans le même scope → 409', async () => {
    const { service } = setup({ plans: { user_a: ['business', 'active'] } });
    await service.add('user_a', { url: 'https://a.example' });
    await expect(service.add('user_a', { url: 'https://A.example/' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('espace agence : un membre ajoute, la limite est celle du propriétaire (tous scopes confondus)', async () => {
    const { service, sites } = setup({ plans: { user_agence: ['business', 'active'] } });
    await service.add('user_agence', { url: 'https://perso.example' });                     // personnel du propriétaire
    await service.add('user_sara', { url: 'https://client1.example', workspaceId: 'ws1' });  // membre → compte du propriétaire
    expect(sites[1]).toMatchObject({ scope: 'ws1', workspaceId: 'ws1', ownerClerkUserId: 'user_agence', createdBy: 'user_sara' });
    await service.add('user_sara', { url: 'https://client2.example', workspaceId: 'ws1' });
    await expect(service.add('user_sara', { url: 'https://client3.example', workspaceId: 'ws1' })).rejects.toThrow('site_limit');
    // Les sites personnels de Sara ne consomment pas la limite de l'agence
    await expect(service.add('user_sara', { url: 'https://sara.example' })).resolves.toMatchObject({ usage: { used: 1, limit: 1 } });
  });

  it('un non-membre ne voit ni ne modifie les sites de l’espace (404)', async () => {
    const { service, sites } = setup({ plans: { user_agence: ['business', 'active'] } });
    await service.add('user_agence', { url: 'https://client1.example', workspaceId: 'ws1' });
    await expect(service.list('user_intrus', 'ws1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.add('user_intrus', { url: 'https://x.example', workspaceId: 'ws1' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('user_intrus', sites[0].id)).rejects.toBeInstanceOf(NotFoundException);
    expect(sites).toHaveLength(1);
  });

  it('suppression : site personnel d’un autre → 404 ; propriétaire ou membre de l’espace → supprimé', async () => {
    const { service, sites } = setup({ plans: { user_agence: ['business', 'active'] } });
    await service.add('user_a', { url: 'https://a.example' });
    await expect(service.remove('user_b', sites[0].id)).rejects.toBeInstanceOf(NotFoundException);
    await service.remove('user_a', sites[0].id);
    await service.add('user_agence', { url: 'https://client.example', workspaceId: 'ws1' });
    await service.remove('user_sara', sites[0].id);
    expect(sites).toHaveLength(0);
  });
});
