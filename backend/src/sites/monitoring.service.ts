import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { DatabaseService, TrackedSite } from '../prisma/database.service';
import { BULL_ANALYSES_QUEUE } from '../redis/redis.module';
import { BrevoService } from '../brevo/brevo.service';
import { fetchVerifiedClerkEmails } from '../admin/admin-auth';
import { buildReportUrl, toReportLocale } from '../i18n/report-texts';
import { effectivePlan } from '../payments/plan-limits';
import { canSchedule, dueBefore, shouldAlert } from './monitoring';

/** Sites traités au plus par passage du planificateur (passage horaire). */
export const MAX_SITES_PER_TICK = 50;
/** Tâche Bull répétée qui déclenche le planificateur. */
export const MONITORING_TICK_JOB = 'monitoring-tick';
const TICK_CRON = '0 * * * *';

@Injectable()
export class MonitoringService implements OnModuleInit {
  private readonly logger = new Logger(MonitoringService.name);
  /** Email du titulaire (remplaçable dans les tests). */
  ownerEmail: (clerkUserId: string) => Promise<string | null> = async (id) => (await fetchVerifiedClerkEmails(id))[0] ?? null;

  constructor(
    private readonly db: DatabaseService,
    @InjectQueue(BULL_ANALYSES_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
    private readonly brevo: BrevoService,
  ) {}

  /**
   * Enregistre la tâche horaire (idempotent : Bull dédoublonne les tâches répétées par nom + cron + jobId).
   * Non attendu : sans Redis, la commande reste en file d'attente et bloquerait le démarrage de l'API.
   */
  onModuleInit(): void {
    this.queue
      .add(MONITORING_TICK_JOB, {}, { repeat: { cron: TICK_CRON }, jobId: MONITORING_TICK_JOB, removeOnComplete: true })
      .then(() => this.logger.log('Planificateur des audits programmés enregistré (toutes les heures)'))
      .catch((err: any) => this.logger.warn(`Planificateur non enregistré : ${err?.message}`));
  }

  private get spacingMs(): number {
    return this.config.get<number>('prospects.auditIntervalMs', 30_000);
  }

  /**
   * Passage du planificateur : lance les audits dus, espacés, pour les titulaires Business.
   * Un site dont le titulaire n'est plus Business est marqué comme traité (pas de relance à chaque heure).
   */
  async tick(now = new Date()): Promise<{ queued: number; skipped: number }> {
    const due = dueBefore(now);
    const sites = await this.db.findDueTrackedSites(due.daily, due.weekly, MAX_SITES_PER_TICK);
    const planCache = new Map<string, boolean>();
    let queued = 0;
    let skipped = 0;

    for (const site of sites) {
      if (!planCache.has(site.ownerClerkUserId)) {
        const u = await this.db.findUserByClerkId(site.ownerClerkUserId);
        planCache.set(site.ownerClerkUserId, canSchedule(effectivePlan(u?.subscriptionPlan, u?.subscriptionStatus)));
      }
      await this.db.markTrackedSiteScheduled(site.id, now);
      if (!planCache.get(site.ownerClerkUserId)) { skipped++; continue; }

      const locale = toReportLocale(site.locale);
      const analysis = await this.db.createAnalysis({
        urlSite: site.urlSite, urlHash: site.urlHash, email: '', locale, source: 'scheduled',
        clerkUserId: site.ownerClerkUserId, ipAddress: null,
      });
      await this.queue.add(
        'run',
        { analysisId: analysis.id, url: site.urlSite, email: '', locale, trackedSiteId: site.id },
        { jobId: analysis.id, timeout: 60_000, delay: queued * this.spacingMs },
      );
      queued++;
    }
    if (sites.length) this.logger.log(`Planificateur : ${queued} audit(s) programmé(s), ${skipped} ignoré(s) (plan)`);
    return { queued, skipped };
  }

  /** Après un audit programmé : met à jour le dernier score et envoie l'alerte si le seuil est franchi. */
  async onScheduledAuditCompleted(trackedSiteId: string, analysisId: string): Promise<{ alerted: boolean }> {
    const [site, analysis] = await Promise.all([
      this.db.findTrackedSiteById(trackedSiteId),
      this.db.findAnalysisById(analysisId),
    ]);
    if (!site || !analysis || analysis.status !== 'completed') return { alerted: false };

    const score = analysis.scorePerformance;
    const due = shouldAlert(site.alertThreshold ?? null, site.lastScore ?? null, score);
    const alertedAt = due ? await this.sendAlert(site, analysis.id, score!) : null;
    // Alerte due mais non envoyée : on garde l'ancien score de référence pour retenter au prochain audit.
    const reference = due && !alertedAt ? site.lastScore ?? null : score;
    await this.db.recordTrackedSiteAudit(site.id, reference, analysis.id, alertedAt);
    return { alerted: !!alertedAt };
  }

  private async sendAlert(site: TrackedSite, analysisId: string, score: number): Promise<Date | null> {
    const to = await this.ownerEmail(site.ownerClerkUserId).catch(() => null);
    if (!to) {
      this.logger.warn(`Alerte ${site.id} : aucun email vérifié pour le titulaire`);
      return null;
    }
    const locale = toReportLocale(site.locale);
    const front = this.config.get<string>('frontendUrl', '').replace(/\/+$/, '');
    try {
      await this.brevo.sendAlertEmail(to, locale, {
        urlSite: site.urlSite,
        label: site.label,
        previousScore: site.lastScore ?? null,
        newScore: score,
        threshold: site.alertThreshold!,
        reportUrl: buildReportUrl(front, locale, analysisId),
        compareUrl: site.lastAnalysisId ? `${front}/${locale}/analyse/${analysisId}/compare/${site.lastAnalysisId}` : null,
        sitesUrl: `${front}/${locale}/dashboard`,
      });
      return new Date();
    } catch (err: any) {
      this.logger.error(`Alerte ${site.id} non envoyée : ${err?.message}`);
      return null;
    }
  }
}
