import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, timingSafeEqual } from 'crypto';
import axios from 'axios';
import { DatabaseService } from '../prisma/database.service';
import { validateUrl, hashUrl } from '../common/validators/url.validator';
import { encryptToken, decryptToken } from './token-crypto';

export const ZID = 'zid';
export const zidOwner = (storeId: string) => `zid:${storeId}`;

const OAUTH = 'https://oauth.zid.sa/oauth';
const API = 'https://api.zid.sa/v1';

export interface ZidTokens { accessToken: string; authorization: string; refreshToken: string | null; expiresIn: number | null }
export interface ZidStore { id: string; title: string | null; url: string | null }

/**
 * Échange du code (docs.zid.sa → Authorization) : POST /oauth/token, grant_type=authorization_code, client_id,
 * client_secret, redirect_uri, code. Format du corps non précisé par Zid → formulaire standard OAuth 2.0 (RFC 6749 §4.1.3).
 */
export async function exchangeZidCode(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<ZidTokens> {
  const { data } = await axios.post(`${OAUTH}/token`, new URLSearchParams({
    grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code,
  }), { headers: { Accept: 'application/json' }, timeout: 15_000 });
  return {
    accessToken: data?.access_token, authorization: data?.authorization ?? data?.Authorization,
    refreshToken: data?.refresh_token ?? null, expiresIn: Number.isFinite(Number(data?.expires_in)) ? Number(data.expires_in) : null,
  };
}

/** Profil du gérant (docs.zid.sa → Get Manager Profile) : user.store.id / title / url. */
export async function fetchZidStore(t: { accessToken: string; authorization: string }): Promise<ZidStore> {
  const { data } = await axios.get(`${API}/managers/account/profile`, {
    headers: { Authorization: `Bearer ${t.authorization}`, 'X-Manager-Token': t.accessToken, Accept: 'application/json' },
    timeout: 15_000,
    maxRedirects: 0,   // vérifié : jetons invalides → 401 JSON ; une redirection n'est jamais une réponse valide
  });
  const s = data?.user?.store ?? {};
  return { id: s.id != null ? String(s.id) : '', title: s.title ?? null, url: s.url ?? null };
}

/** Webhooks Zid : en-tête Basic Auth (docs.zid.sa → Create a Webhook, champs username / password). */
export function verifyZidBasicAuth(header: string | undefined, username: string, password: string): boolean {
  if (!username || !password) return false;
  const expected = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  const received = (header ?? '').trim();
  return received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

@Injectable()
export class ZidService {
  private readonly logger = new Logger(ZidService.name);
  /** Remplaçables dans les tests. */
  exchange = exchangeZidCode;
  store = fetchZidStore;

  constructor(private readonly db: DatabaseService, private readonly config: ConfigService) {}

  private cfg() {
    return {
      clientId: this.config.get<string>('zid.clientId', ''),
      clientSecret: this.config.get<string>('zid.clientSecret', ''),
      redirectUri: this.config.get<string>('zid.redirectUri', ''),
      key: this.config.get<string>('marketplace.tokenKey', ''),
    };
  }

  /** URL d'autorisation Zid (docs : /oauth/authorize, client_id, redirect_uri, response_type=code). */
  authorizeUrl(): string {
    const c = this.cfg();
    if (!c.clientId || !c.redirectUri) throw new ServiceUnavailableException('zid_not_configured');
    return `${OAUTH}/authorize?${new URLSearchParams({ client_id: c.clientId, redirect_uri: c.redirectUri, response_type: 'code' })}`;
  }

  /** Retour d'autorisation : jetons chiffrés, boutique lue, site suivi créé. Renvoie le nom de la boutique. */
  async handleCallback(code: string | undefined): Promise<{ storeTitle: string | null }> {
    const c = this.cfg();
    if (!c.clientId || !c.clientSecret || !c.redirectUri || !c.key) throw new ServiceUnavailableException('zid_not_configured');
    if (!code || code.length > 2048) throw new BadRequestException('missing_code');

    const tokens = await this.exchange(code, c.clientId, c.clientSecret, c.redirectUri);
    if (!tokens.accessToken || !tokens.authorization) throw new BadRequestException('token_exchange_failed');
    const store = await this.store(tokens);
    if (!/^\d{1,20}$/.test(store.id)) throw new BadRequestException('store_unknown');

    await this.db.upsertInstallation({
      id: randomUUID(), platform: ZID, merchantId: store.id, status: 'installed',
      accessTokenEnc: encryptToken(tokens.accessToken, c.key),
      refreshTokenEnc: tokens.refreshToken ? encryptToken(tokens.refreshToken, c.key) : null,
      tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
      installedAt: new Date(),
    });
    await this.db.setInstallationAuthToken(ZID, store.id, encryptToken(tokens.authorization, c.key));

    const v = store.url ? validateUrl(/^[a-z]+:\/\//i.test(store.url) ? store.url : `https://${store.url}`) : { valid: false as const };
    if (v.valid && 'normalized' in v && v.normalized) {
      const owner = zidOwner(store.id);
      const scope = `user:${owner}`;
      const urlHash = hashUrl(v.normalized);
      let site = await this.db.findTrackedSiteByScopeAndHash(scope, urlHash);
      if (!site) {
        await this.db.insertTrackedSite({
          id: randomUUID(), scope, workspaceId: null, ownerClerkUserId: owner, urlSite: v.normalized, urlHash,
          label: store.title ? store.title.slice(0, 120) : null, createdBy: owner,
        });
        site = await this.db.findTrackedSiteByScopeAndHash(scope, urlHash);
      }
      await this.db.setInstallationStore(ZID, store.id, { storeName: store.title, storeDomain: v.normalized, trackedSiteId: site?.id ?? null });
    } else {
      this.logger.warn(`Zid : adresse de boutique inutilisable (boutique ${store.id})`);
    }
    this.logger.log(`Zid : app installée (boutique ${store.id})`);
    return { storeTitle: store.title };
  }

  /**
   * Événements de l'App Market (docs.zid.sa → Events) : champs store_id, event_name.
   * Désinstallation appliquée seulement si Zid confirme que nos jetons ne fonctionnent plus (protège contre un
   * faux webhook quand l'authentification Basic n'est pas configurable dans le tableau de bord partenaire).
   */
  async handleEvent(payload: any): Promise<{ handled: boolean; reason?: string }> {
    const storeId = String(payload?.store_id ?? '').trim();
    const event = String(payload?.event_name ?? '');
    if (!/^\d{1,20}$/.test(storeId)) return { handled: false, reason: 'store_id' };
    if (event !== 'app.market.application.uninstall') {
      this.logger.log(`Zid ${event || '(sans nom)'} (boutique ${storeId}) : non traité`);
      return { handled: false, reason: 'event' };
    }
    const inst = await this.db.findInstallation(ZID, storeId);
    if (!inst || inst.status !== 'installed') return { handled: false, reason: 'not_installed' };

    if (await this.tokensStillWork(inst)) {
      this.logger.warn(`Zid uninstall reçu mais les jetons de la boutique ${storeId} fonctionnent encore : ignoré`);
      return { handled: false, reason: 'still_authorized' };
    }
    if (inst.tracked_site_id) await this.db.deleteTrackedSite(inst.tracked_site_id);
    await this.db.markUninstalled(ZID, storeId, new Date());
    this.logger.log(`Zid : app désinstallée (boutique ${storeId})`);
    return { handled: true };
  }

  private async tokensStillWork(inst: any): Promise<boolean> {
    const key = this.cfg().key;
    if (!inst.access_token_enc || !inst.auth_token_enc || !key) return false;
    try {
      await this.store({ accessToken: decryptToken(inst.access_token_enc, key), authorization: decryptToken(inst.auth_token_enc, key) });
      return true;
    } catch (err: any) {
      const status = err?.response?.status;
      // 401 / 403 : accès retiré → désinstallation confirmée. Autre erreur (réseau, 5xx) : prudence, on ne supprime pas.
      return !(status === 401 || status === 403);
    }
  }
}
