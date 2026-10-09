import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ZidService, verifyZidBasicAuth, zidOwner } from './zid.service';
import { decryptToken } from './token-crypto';

/** Champs repris de la documentation Zid (Authorization, Get Manager Profile, App Market events). */
const TOKENS = { accessToken: 'jeton-manager-exemple', authorization: 'jeton-authorization-exemple', refreshToken: 'jeton-refresh-exemple', expiresIn: 31_536_000 };
const STORE = { id: '123456', title: 'متجر زد التجريبي', url: 'https://demo-store.zid.store/' };
const uninstall = { app_id: 1, store_id: 123456, store_uuid: 'uuid', store_url: STORE.url, status: 'uninstall', event_name: 'app.market.application.uninstall' };

function setup(opts: { config?: Record<string, string>; storeError?: number } = {}) {
  const key = randomBytes(32).toString('hex');
  const installs = new Map<string, any>();
  const sites: any[] = [];
  const db = {
    upsertInstallation: jest.fn(async (i: any) => {
      const k = `${i.platform}:${i.merchantId}`;
      installs.set(k, { ...(installs.get(k) ?? {}), status: i.status, access_token_enc: i.accessTokenEnc, refresh_token_enc: i.refreshTokenEnc, token_expires_at: i.tokenExpiresAt });
    }),
    setInstallationAuthToken: jest.fn(async (p: string, m: string, enc: string) => { installs.get(`${p}:${m}`).auth_token_enc = enc; }),
    setInstallationStore: jest.fn(async (p: string, m: string, s: any) => Object.assign(installs.get(`${p}:${m}`), { store_name: s.storeName, store_domain: s.storeDomain, tracked_site_id: s.trackedSiteId })),
    findInstallation: jest.fn(async (p: string, m: string) => installs.get(`${p}:${m}`) ?? null),
    markUninstalled: jest.fn(async (p: string, m: string) => Object.assign(installs.get(`${p}:${m}`), { status: 'uninstalled', access_token_enc: null, auth_token_enc: null, tracked_site_id: null })),
    findTrackedSiteByScopeAndHash: jest.fn(async (scope: string, h: string) => sites.find((s) => s.scope === scope && s.urlHash === h) ?? null),
    insertTrackedSite: jest.fn(async (s: any) => { sites.push(s); return true; }),
    deleteTrackedSite: jest.fn(async (id: string) => { sites.splice(sites.findIndex((s) => s.id === id), 1); }),
  };
  const cfg: Record<string, string> = {
    'zid.clientId': '42', 'zid.clientSecret': 'secret', 'zid.redirectUri': 'https://api.velifa.example/api/v1/integrations/zid/callback',
    'marketplace.tokenKey': key, ...(opts.config ?? {}),
  };
  const config = { get: jest.fn((k: string, def: any) => cfg[k] ?? def) };
  const service = new ZidService(db as any, config as any);
  service.exchange = jest.fn(async () => TOKENS);
  service.store = jest.fn(async (t: any) => {
    if (opts.storeError) throw Object.assign(new Error('http'), { response: { status: opts.storeError } });
    expect(t).toMatchObject({ accessToken: TOKENS.accessToken, authorization: TOKENS.authorization });
    return STORE;
  });
  return { db, key, installs, sites, service };
}

describe('Zid — installation (OAuth par code)', () => {
  it('URL d’autorisation documentée (client_id, redirect_uri, response_type=code)', () => {
    const url = new URL(setup().service.authorizeUrl());
    expect(url.origin + url.pathname).toBe('https://oauth.zid.sa/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({ client_id: '42', redirect_uri: 'https://api.velifa.example/api/v1/integrations/zid/callback', response_type: 'code' });
    expect(() => setup({ config: { 'zid.clientId': '' } }).service.authorizeUrl()).toThrow(ServiceUnavailableException);
  });

  it('retour : deux jetons chiffrés, boutique lue, site suivi créé', async () => {
    const { service, installs, sites, key } = setup();
    expect(await service.handleCallback('code-exemple')).toEqual({ storeTitle: 'متجر زد التجريبي' });
    const inst = installs.get('zid:123456');
    expect(inst.status).toBe('installed');
    expect(decryptToken(inst.access_token_enc, key)).toBe(TOKENS.accessToken);
    expect(decryptToken(inst.auth_token_enc, key)).toBe(TOKENS.authorization);
    expect(decryptToken(inst.refresh_token_enc, key)).toBe(TOKENS.refreshToken);
    expect(sites).toHaveLength(1);
    expect(sites[0]).toMatchObject({ ownerClerkUserId: zidOwner('123456'), urlSite: 'https://demo-store.zid.store', label: 'متجر زد التجريبي' });
    expect(inst.tracked_site_id).toBe(sites[0].id);
    await service.handleCallback('code-exemple');
    expect(sites).toHaveLength(1); // réinstallation : pas de doublon
  });

  it('refus : code absent, jetons incomplets, identifiant de boutique invalide', async () => {
    await expect(setup().service.handleCallback(undefined)).rejects.toBeInstanceOf(BadRequestException);
    const noAuth = setup();
    noAuth.service.exchange = jest.fn(async () => ({ ...TOKENS, authorization: '' }));
    await expect(noAuth.service.handleCallback('c')).rejects.toThrow('token_exchange_failed');
    const badStore = setup();
    badStore.service.store = jest.fn(async () => ({ ...STORE, id: '' }));
    await expect(badStore.service.handleCallback('c')).rejects.toThrow('store_unknown');
  });
});

describe('Zid — webhooks App Market', () => {
  it('désinstallation confirmée par Zid (jetons refusés, 401) : jetons effacés, site retiré', async () => {
    const { service, installs, sites } = setup();
    await service.handleCallback('c');
    service.store = jest.fn(async () => { throw Object.assign(new Error('401'), { response: { status: 401 } }); });
    expect(await service.handleEvent(uninstall)).toEqual({ handled: true });
    expect(installs.get('zid:123456')).toMatchObject({ status: 'uninstalled', access_token_enc: null, auth_token_enc: null });
    expect(sites).toHaveLength(0);
  });

  it('faux webhook de désinstallation : les jetons fonctionnent encore → ignoré, rien supprimé', async () => {
    const { service, installs, sites } = setup();
    await service.handleCallback('c');
    expect(await service.handleEvent(uninstall)).toEqual({ handled: false, reason: 'still_authorized' });
    expect(installs.get('zid:123456').status).toBe('installed');
    expect(sites).toHaveLength(1);
  });

  it('erreur réseau ou 5xx lors de la vérification : prudence, rien supprimé', async () => {
    const { service, sites } = setup();
    await service.handleCallback('c');
    service.store = jest.fn(async () => { throw Object.assign(new Error('503'), { response: { status: 503 } }); });
    expect(await service.handleEvent(uninstall)).toEqual({ handled: false, reason: 'still_authorized' });
    expect(sites).toHaveLength(1);
  });

  it('événements ignorés : boutique inconnue, autre événement, store_id invalide', async () => {
    const { service } = setup();
    expect(await service.handleEvent(uninstall)).toEqual({ handled: false, reason: 'not_installed' });
    expect(await service.handleEvent({ ...uninstall, event_name: 'app.market.application.rated' })).toEqual({ handled: false, reason: 'event' });
    expect(await service.handleEvent({ ...uninstall, store_id: 'abc' })).toEqual({ handled: false, reason: 'store_id' });
  });

  it('Basic Auth : en-tête exact accepté, tout autre refusé ; non configurée → refusée', () => {
    const ok = `Basic ${Buffer.from('velifa:mot-de-passe').toString('base64')}`;
    expect(verifyZidBasicAuth(ok, 'velifa', 'mot-de-passe')).toBe(true);
    expect(verifyZidBasicAuth(`Basic ${Buffer.from('velifa:autre').toString('base64')}`, 'velifa', 'mot-de-passe')).toBe(false);
    expect(verifyZidBasicAuth(undefined, 'velifa', 'mot-de-passe')).toBe(false);
    expect(verifyZidBasicAuth(ok, '', '')).toBe(false);
  });
});
