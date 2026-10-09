import { createHmac, randomBytes } from 'crypto';
import { verifySallaSignature } from './salla-signature';
import { encryptToken, decryptToken } from './token-crypto';
import { SallaService, parseSallaDate, sallaOwner } from './salla.service';
import { hashUrl } from '../common/validators/url.validator';

/** Valeurs reprises des exemples officiels (docs.salla.dev : App Events, Store Information). */
const MERCHANT = 1234509876;
const authorize = {
  event: 'app.store.authorize',
  merchant: MERCHANT,
  created_at: '2022-12-31 12:31:25',
  data: {
    access_token: 'jeton-acces-exemple',
    expires: 1634819484,
    refresh_token: 'jeton-renouvellement-exemple',
    scope: 'settings.read branches.read offline_access',
    token_type: 'bearer',
  },
};
const installed = { event: 'app.installed', merchant: MERCHANT, created_at: '2021-09-28 06:06:56', data: { installation_date: '2021-09-28 06:06:56', store_type: 'development' } };
const uninstalled = { event: 'app.uninstalled', merchant: MERCHANT, created_at: '2021-10-07 12:46:07', data: { uninstallation_date: '2021-10-07 12:46:07', refunded: false } };
const STORE = { name: 'متجر تجريبي', domain: 'https://demo.salla.group/ar/merchant-store' };

describe('verifySallaSignature (stratégie Signature)', () => {
  const secret = 'secret-du-portail';
  const body = Buffer.from(JSON.stringify(authorize));
  const sig = createHmac('sha256', secret).update(body).digest('hex');

  it('accepte la signature HMAC-SHA256 hexadécimale du corps brut', () => {
    expect(verifySallaSignature(body, 'Signature', sig, secret)).toBe(true);
    expect(verifySallaSignature(body, 'signature', sig.toUpperCase(), secret)).toBe(true);
  });
  it('refuse : corps modifié, mauvais secret, signature absente, stratégie Token, secret non configuré', () => {
    expect(verifySallaSignature(Buffer.from(body.toString().replace('1234', '9999')), 'Signature', sig, secret)).toBe(false);
    expect(verifySallaSignature(body, 'Signature', createHmac('sha256', 'autre').update(body).digest('hex'), secret)).toBe(false);
    expect(verifySallaSignature(body, 'Signature', undefined, secret)).toBe(false);
    expect(verifySallaSignature(body, 'Token', sig, secret)).toBe(false);
    expect(verifySallaSignature(body, 'Signature', sig, '')).toBe(false);
    expect(verifySallaSignature(undefined, 'Signature', sig, secret)).toBe(false);
  });
});

describe('chiffrement des jetons', () => {
  const key = randomBytes(32).toString('hex');
  it('aller-retour ; deux chiffrements différents (IV aléatoire) ; jeton absent du texte chiffré', () => {
    const a = encryptToken('jeton-acces-exemple', key);
    expect(decryptToken(a, key)).toBe('jeton-acces-exemple');
    expect(encryptToken('jeton-acces-exemple', key)).not.toBe(a);
    expect(Buffer.from(a, 'base64').toString('utf8')).not.toContain('jeton-acces-exemple');
  });
  it('mauvaise clé ou contenu altéré → erreur ; clé mal formée refusée', () => {
    const a = encryptToken('x', key);
    expect(() => decryptToken(a, randomBytes(32).toString('hex'))).toThrow();
    const buf = Buffer.from(a, 'base64'); buf[buf.length - 1] ^= 1;
    expect(() => decryptToken(buf.toString('base64'), key)).toThrow();
    expect(() => encryptToken('x', 'courte')).toThrow('MARKETPLACE_TOKEN_KEY');
  });
});

describe('parseSallaDate', () => {
  it('format des exemples Salla', () => {
    expect(parseSallaDate('2022-12-31 12:31:25')?.toISOString()).toBe('2022-12-31T12:31:25.000Z');
    expect(parseSallaDate('pas une date')).toBeNull();
    expect(parseSallaDate(undefined)).toBeNull();
  });
});

function setup(opts: { storeInfo?: any; storeFails?: boolean } = {}) {
  const key = randomBytes(32).toString('hex');
  const installations = new Map<string, any>();
  const sites: any[] = [];
  const db = {
    upsertInstallation: jest.fn(async (i: any) => {
      const k = `${i.platform}:${i.merchantId}`;
      const prev = installations.get(k) ?? {};
      installations.set(k, {
        ...prev, status: i.status,
        access_token_enc: i.accessTokenEnc ?? prev.access_token_enc ?? null,
        refresh_token_enc: i.refreshTokenEnc ?? prev.refresh_token_enc ?? null,
        token_expires_at: i.tokenExpiresAt ?? prev.token_expires_at ?? null,
        scope: i.scope ?? prev.scope ?? null, installed_at: prev.installed_at ?? i.installedAt,
      });
    }),
    setInstallationStore: jest.fn(async (p: string, m: string, s: any) => {
      Object.assign(installations.get(`${p}:${m}`), { store_name: s.storeName, store_domain: s.storeDomain, tracked_site_id: s.trackedSiteId });
    }),
    findInstallation: jest.fn(async (p: string, m: string) => installations.get(`${p}:${m}`) ?? null),
    markUninstalled: jest.fn(async (p: string, m: string, at: Date) => {
      Object.assign(installations.get(`${p}:${m}`) ?? {}, { status: 'uninstalled', access_token_enc: null, refresh_token_enc: null, tracked_site_id: null, uninstalled_at: at });
    }),
    findTrackedSiteByScopeAndHash: jest.fn(async (scope: string, h: string) => sites.find((s) => s.scope === scope && s.urlHash === h) ?? null),
    insertTrackedSite: jest.fn(async (s: any) => { sites.push(s); return true; }),
    deleteTrackedSite: jest.fn(async (id: string) => { sites.splice(sites.findIndex((s) => s.id === id), 1); }),
  };
  const config = { get: jest.fn((k: string, def: any) => (k === 'marketplace.tokenKey' ? key : def)) };
  const service = new SallaService(db as any, config as any);
  service.storeInfo = jest.fn(async () => { if (opts.storeFails) throw new Error('401'); return opts.storeInfo ?? STORE; });
  return { db, key, installations, sites, service };
}

describe('SallaService — cycle de vie de l’app', () => {
  it('installation puis autorisation : jetons chiffrés, site suivi créé depuis le domaine de la boutique', async () => {
    const { service, installations, sites, key } = setup();
    expect(await service.handle(installed)).toEqual({ handled: true });
    expect(await service.handle(authorize)).toEqual({ handled: true });

    const inst = installations.get(`salla:${MERCHANT}`);
    expect(inst.status).toBe('installed');
    expect(inst.access_token_enc).not.toContain('jeton');
    expect(decryptToken(inst.access_token_enc, key)).toBe('jeton-acces-exemple');
    expect(decryptToken(inst.refresh_token_enc, key)).toBe('jeton-renouvellement-exemple');
    expect(inst.token_expires_at).toEqual(new Date(1634819484 * 1000));
    expect(inst.scope).toBe('settings.read branches.read offline_access');

    expect(sites).toHaveLength(1);
    expect(sites[0]).toMatchObject({
      scope: `user:${sallaOwner(String(MERCHANT))}`, ownerClerkUserId: 'salla:1234509876',
      urlSite: 'https://demo.salla.group/ar/merchant-store', urlHash: hashUrl('https://demo.salla.group/ar/merchant-store'),
      label: 'متجر تجريبي', workspaceId: null,
    });
    expect(inst).toMatchObject({ store_domain: 'https://demo.salla.group/ar/merchant-store', tracked_site_id: sites[0].id });
  });

  it('événement rejoué (Salla réessaie) : pas de doublon de site', async () => {
    const { service, sites } = setup();
    await service.handle(authorize);
    await service.handle(authorize);
    expect(sites).toHaveLength(1);
  });

  it('désinstallation : jetons effacés, site suivi retiré, date enregistrée', async () => {
    const { service, installations, sites } = setup();
    await service.handle(authorize);
    await service.handle(uninstalled);
    const inst = installations.get(`salla:${MERCHANT}`);
    expect(inst).toMatchObject({ status: 'uninstalled', access_token_enc: null, refresh_token_enc: null, tracked_site_id: null });
    expect(inst.uninstalled_at).toEqual(new Date('2021-10-07T12:46:07Z'));
    expect(sites).toHaveLength(0);
  });

  it('boutique injoignable ou domaine invalide : installation et jetons conservés, aucun site créé', async () => {
    const fails = setup({ storeFails: true });
    await fails.service.handle(authorize);
    expect(fails.installations.get(`salla:${MERCHANT}`).access_token_enc).toBeTruthy();
    expect(fails.sites).toHaveLength(0);
    const badDomain = setup({ storeInfo: { name: 'x', domain: 'http://localhost' } });
    await badDomain.service.handle(authorize);
    expect(badDomain.sites).toHaveLength(0);
  });

  it('événements ignorés : marchand invalide, autorisation sans jeton, événement non géré', async () => {
    const { service, db } = setup();
    expect(await service.handle({ ...authorize, merchant: 'abc' })).toEqual({ handled: false });
    await service.handle({ ...authorize, data: {} });
    expect(db.upsertInstallation).not.toHaveBeenCalled();
    expect(await service.handle({ event: 'app.feedback.created', merchant: MERCHANT })).toEqual({ handled: false });
  });
});
