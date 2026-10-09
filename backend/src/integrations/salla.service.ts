import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { DatabaseService } from '../prisma/database.service';
import { validateUrl, hashUrl } from '../common/validators/url.validator';
import { encryptToken } from './token-crypto';

export const SALLA = 'salla';

/** Compte VELIFA « technique » d'un marchand Salla (pas de compte Clerk à l'installation). */
export const sallaOwner = (merchantId: string) => `salla:${merchantId}`;

/** Événement Salla (docs.salla.dev, App Events) : event, merchant, created_at, data. */
export interface SallaEvent {
  event: string;
  merchant: number | string;
  created_at?: string;
  data?: any;
}

/** « 2022-12-31 12:31:25 » (format des exemples Salla) → Date ; null si absent / invalide. */
export function parseSallaDate(v: unknown): Date | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const d = new Date(v.trim().replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? '' : 'Z'));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Infos de la boutique — GET https://api.salla.dev/admin/v2/store/info (scope offline_access) :
 * data.id, data.name, data.domain (documentation officielle « Store Information »).
 */
export async function fetchSallaStoreInfo(accessToken: string): Promise<{ name: string | null; domain: string | null }> {
  const { data } = await axios.get('https://api.salla.dev/admin/v2/store/info', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    timeout: 10_000,
  });
  return { name: data?.data?.name ?? null, domain: data?.data?.domain ?? null };
}

@Injectable()
export class SallaService {
  private readonly logger = new Logger(SallaService.name);
  /** Remplaçable dans les tests. */
  storeInfo: (accessToken: string) => Promise<{ name: string | null; domain: string | null }> = fetchSallaStoreInfo;

  constructor(private readonly db: DatabaseService, private readonly config: ConfigService) {}

  async handle(e: SallaEvent): Promise<{ handled: boolean }> {
    const merchantId = String(e?.merchant ?? '').trim();
    if (!/^\d{1,20}$/.test(merchantId)) {
      this.logger.warn(`Salla ${e?.event}: identifiant marchand absent ou invalide — ignoré`);
      return { handled: false };
    }
    switch (e.event) {
      case 'app.store.authorize': await this.onAuthorize(merchantId, e); return { handled: true };
      case 'app.installed':       await this.onInstalled(merchantId, e); return { handled: true };
      case 'app.uninstalled':     await this.onUninstalled(merchantId, e); return { handled: true };
      default:
        this.logger.log(`Salla ${e.event} (marchand ${merchantId}) : non traité`);
        return { handled: false };
    }
  }

  private async onInstalled(merchantId: string, e: SallaEvent): Promise<void> {
    await this.db.upsertInstallation({
      id: randomUUID(), platform: SALLA, merchantId, status: 'installed',
      installedAt: parseSallaDate(e.data?.installation_date) ?? parseSallaDate(e.created_at) ?? new Date(),
    });
    this.logger.log(`Salla : app installée (marchand ${merchantId})`);
  }

  /** Jetons reçus (Easy Mode) : chiffrés en base, puis site suivi créé à partir du domaine de la boutique. */
  private async onAuthorize(merchantId: string, e: SallaEvent): Promise<void> {
    const accessToken: string | undefined = e.data?.access_token;
    const refreshToken: string | undefined = e.data?.refresh_token;
    if (!accessToken) {
      this.logger.warn(`Salla app.store.authorize sans access_token (marchand ${merchantId})`);
      return;
    }
    const key = this.config.get<string>('marketplace.tokenKey', '');
    const expires = Number(e.data?.expires);
    await this.db.upsertInstallation({
      id: randomUUID(), platform: SALLA, merchantId, status: 'installed',
      accessTokenEnc: encryptToken(accessToken, key),
      refreshTokenEnc: refreshToken ? encryptToken(refreshToken, key) : null,
      tokenExpiresAt: Number.isFinite(expires) && expires > 0 ? new Date(expires * 1000) : null,
      scope: typeof e.data?.scope === 'string' ? e.data.scope.slice(0, 1000) : null,
      installedAt: parseSallaDate(e.created_at) ?? new Date(),
    });

    let store: { name: string | null; domain: string | null };
    try {
      store = await this.storeInfo(accessToken);
    } catch (err: any) {
      this.logger.warn(`Salla store/info en échec (marchand ${merchantId}) : ${err?.response?.status ?? err?.message}`);
      return;
    }
    const v = store.domain ? validateUrl(store.domain) : { valid: false as const };
    if (!v.valid || !('normalized' in v) || !v.normalized) {
      this.logger.warn(`Salla : domaine de boutique inutilisable (marchand ${merchantId})`);
      return;
    }

    const owner = sallaOwner(merchantId);
    const scope = `user:${owner}`;
    const urlHash = hashUrl(v.normalized);
    let site = await this.db.findTrackedSiteByScopeAndHash(scope, urlHash);
    if (!site) {
      const id = randomUUID();
      await this.db.insertTrackedSite({
        id, scope, workspaceId: null, ownerClerkUserId: owner, urlSite: v.normalized, urlHash,
        label: store.name ? store.name.slice(0, 120) : null, createdBy: owner,
      });
      site = await this.db.findTrackedSiteByScopeAndHash(scope, urlHash);
    }
    await this.db.setInstallationStore(SALLA, merchantId, {
      storeName: store.name, storeDomain: v.normalized, trackedSiteId: site?.id ?? null,
    });
    this.logger.log(`Salla : boutique ${v.normalized} suivie (marchand ${merchantId})`);
  }

  /** Désinstallation : jetons effacés, site suivi retiré (plus d'accès à la boutique). */
  private async onUninstalled(merchantId: string, e: SallaEvent): Promise<void> {
    const inst = await this.db.findInstallation(SALLA, merchantId);
    if (inst?.tracked_site_id) await this.db.deleteTrackedSite(inst.tracked_site_id);
    await this.db.markUninstalled(SALLA, merchantId, parseSallaDate(e.data?.uninstallation_date) ?? new Date());
    this.logger.log(`Salla : app désinstallée (marchand ${merchantId})`);
  }
}
