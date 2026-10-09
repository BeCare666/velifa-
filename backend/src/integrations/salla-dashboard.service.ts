import { Injectable, Logger, ForbiddenException, HttpException, HttpStatus, NotFoundException, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../prisma/database.service';
import { BULL_ANALYSES_QUEUE } from '../redis/redis.module';
import { toReportLocale } from '../i18n/report-texts';
import { SALLA, sallaOwner } from './salla.service';
import { introspectSallaToken, signMerchantSession, verifyMerchantSession } from './salla-session';

/** Même limite que les comptes gratuits (analyses.service : FREE_USER_LIMIT) : 3 audits / 24 h. */
export const MERCHANT_FREE_AUDITS_PER_DAY = 3;
const DAY_MS = 24 * 3_600_000;

/** Tableau de bord intégré dans l'espace marchand Salla (ROADMAP 3.4). */
@Injectable()
export class SallaDashboardService {
  private readonly logger = new Logger(SallaDashboardService.name);
  /** Remplaçable dans les tests. */
  introspect: (token: string, appId: string) => Promise<{ merchantId: string; userId: string | null } | null> = introspectSallaToken;

  constructor(
    private readonly db: DatabaseService,
    @InjectQueue(BULL_ANALYSES_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  private get key(): string {
    return this.config.get<string>('marketplace.tokenKey', '');
  }

  /** Jeton Salla (iframe) vérifié auprès de Salla → session VELIFA d'une heure. */
  async openSession(sallaToken: string) {
    const appId = this.config.get<string>('salla.appId', '');
    if (!appId || !this.key) throw new ServiceUnavailableException('salla_not_configured');
    if (!sallaToken || sallaToken.length > 4096) throw new UnauthorizedException('invalid_token');
    let who: { merchantId: string } | null = null;
    try {
      who = await this.introspect(sallaToken, appId);
    } catch (err: any) {
      this.logger.warn(`Introspection Salla refusée : ${err?.response?.status ?? err?.message}`);
    }
    if (!who) throw new UnauthorizedException('invalid_token');
    const inst = await this.db.findInstallation(SALLA, who.merchantId);
    if (!inst || inst.status !== 'installed') throw new ForbiddenException('app_not_installed');
    return signMerchantSession(who.merchantId, this.key);
  }

  private merchantFrom(session: string | undefined): string {
    const m = verifyMerchantSession(session, this.key);
    if (!m) throw new UnauthorizedException('invalid_session');
    return m;
  }

  async dashboard(session: string | undefined) {
    const merchantId = this.merchantFrom(session);
    const inst = await this.db.findInstallation(SALLA, merchantId);
    if (!inst || inst.status !== 'installed') throw new ForbiddenException('app_not_installed');
    const owner = sallaOwner(merchantId);
    const [site] = await this.db.listTrackedSites(`user:${owner}`, [owner]);
    const last = site?.lastAnalysisId ? await this.db.findAnalysisById(site.lastAnalysisId) : null;
    const used = await this.db.countRecentAnalysesByUser(owner, new Date(Date.now() - DAY_MS));
    return {
      store: { name: inst.store_name ?? null, domain: inst.store_domain ?? null },
      tracked: !!site,
      lastAudit: last ? {
        id: last.id,
        createdAt: last.createdAt,
        scorePerformance: last.scorePerformance,
        recommendations: (last.recommendations ?? []).slice(0, 3).map((r: any) => ({ id: r.id, impact: r.impact })),
        siteIssues: last.siteChecks && !last.siteChecks.blocked ? (last.siteChecks.issues ?? []).map((i: any) => i.code) : [],
      } : null,
      audits: { usedToday: used, limitPerDay: MERCHANT_FREE_AUDITS_PER_DAY },
    };
  }

  /** Nouvel audit de la boutique (domaine enregistré à l'autorisation), dans la limite gratuite. */
  async runAudit(session: string | undefined, locale?: string): Promise<{ id: string }> {
    const merchantId = this.merchantFrom(session);
    const inst = await this.db.findInstallation(SALLA, merchantId);
    if (!inst || inst.status !== 'installed') throw new ForbiddenException('app_not_installed');
    const owner = sallaOwner(merchantId);
    const [site] = await this.db.listTrackedSites(`user:${owner}`, [owner]);
    if (!site) throw new NotFoundException('store_not_tracked');
    if (await this.db.countRecentAnalysesByUser(owner, new Date(Date.now() - DAY_MS)) >= MERCHANT_FREE_AUDITS_PER_DAY) {
      throw new HttpException({ statusCode: 429, message: 'daily_limit', error: 'Too Many Requests' }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const lang = toReportLocale(locale ?? 'ar');
    const analysis = await this.db.createAnalysis({
      urlSite: site.urlSite, urlHash: site.urlHash, email: '', locale: lang, source: 'salla', clerkUserId: owner, ipAddress: null,
    });
    await this.queue.add('run', { analysisId: analysis.id, url: site.urlSite, email: '', locale: lang }, { jobId: analysis.id, timeout: 60_000 });
    return { id: analysis.id };
  }
}
