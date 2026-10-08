import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../prisma/database.service';
import { BULL_ANALYSES_QUEUE } from '../redis/redis.module';
import { assertPublicHost } from '../common/validators/url.validator';
import type { AnalysisJobPayload } from '../analyses/analyses.worker';
import { parseProspectCsv, ProspectCsvIssue, ProspectRow } from './prospect-csv';

export const PROSPECT_LOCALES = ['ar', 'en', 'fr'] as const;
export type ProspectLocale = (typeof PROSPECT_LOCALES)[number];

/** Problèmes détectés à l'import : ceux du CSV + ceux vérifiés côté serveur. */
export type ProspectImportIssue =
  | ProspectCsvIssue
  | { line: number; code: 'host_rejected'; detail?: string }
  | { line: number; code: 'already_imported'; detail?: string };

export interface ProspectImportResult {
  batchId: string;
  queued: number;
  issues: ProspectImportIssue[];
  /** Heure prévue du dernier audit du lot (débit limité). */
  lastAuditAt: string | null;
}

const DNS_CONCURRENCY = 10;

/**
 * Délais (ms) pour `count` audits espacés de `intervalMs`, à la suite des audits de prospects
 * déjà programmés (`lastScheduledAt`), sans jamais commencer dans le passé.
 */
export function scheduleDelays(count: number, now: number, lastScheduledAt: number | null, intervalMs: number): number[] {
  const start = lastScheduledAt == null ? now : Math.max(now, lastScheduledAt + intervalMs);
  return Array.from({ length: count }, (_, i) => start - now + i * intervalMs);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

@Injectable()
export class ProspectsService {
  private readonly logger = new Logger(ProspectsService.name);

  constructor(
    private readonly db: DatabaseService,
    @InjectQueue(BULL_ANALYSES_QUEUE) private readonly queue: Queue<AnalysisJobPayload>,
    private readonly config: ConfigService,
  ) {}

  private get intervalMs(): number {
    return this.config.get<number>('prospects.auditIntervalMs', 30_000);
  }

  /** Heure d'exécution du dernier audit de prospect encore en attente (file Bull « delayed »). */
  private async lastScheduledAt(): Promise<number | null> {
    const delayed = await this.queue.getDelayed();
    let last: number | null = null;
    for (const job of delayed) {
      if (!job?.data?.prospect) continue;
      const at = job.timestamp + (job.opts.delay ?? 0);
      if (last == null || at > last) last = at;
    }
    return last;
  }

  async importCsv(csv: string, locale: ProspectLocale = 'ar'): Promise<ProspectImportResult> {
    if (!PROSPECT_LOCALES.includes(locale)) throw new BadRequestException('Langue non supportée');

    const parsed = parseProspectCsv(csv);
    const issues: ProspectImportIssue[] = [...parsed.issues];
    const blocking = parsed.issues.find((i) => i.code === 'empty' || i.code === 'no_url_column');
    if (blocking) {
      throw new BadRequestException(
        blocking.code === 'empty' ? 'CSV vide' : 'CSV inutilisable : aucune colonne URL dans l\'en-tête',
      );
    }

    // Déjà importés (un prospect = une boutique)
    const existing = await this.db.findExistingProspectHashes(parsed.rows.map((r) => r.urlHash));
    const fresh: ProspectRow[] = [];
    for (const r of parsed.rows) {
      if (existing.has(r.urlHash)) issues.push({ line: r.line, code: 'already_imported', detail: r.url });
      else fresh.push(r);
    }

    // Protection SSRF : même contrôle DNS que pour un audit public
    const hostChecks = await mapLimit(fresh, DNS_CONCURRENCY, async (r) => {
      try {
        await assertPublicHost(new URL(r.url).hostname);
        return null;
      } catch (err: any) {
        return err?.message ?? 'refusé';
      }
    });
    const accepted = fresh.filter((r, i) => {
      if (hostChecks[i] == null) return true;
      issues.push({ line: r.line, code: 'host_rejected', detail: hostChecks[i]! });
      return false;
    });

    const batchId = randomUUID();
    const now = Date.now();
    const delays = scheduleDelays(accepted.length, now, await this.lastScheduledAt(), this.intervalMs);

    for (let i = 0; i < accepted.length; i++) {
      const r = accepted[i];
      const analysis = await this.db.createAnalysis({
        urlSite: r.url, urlHash: r.urlHash, email: '', locale, source: 'prospect',
        clerkUserId: null, ipAddress: null,
      });
      await this.db.insertProspect({
        id: randomUUID(), batchId, urlSite: r.url, urlHash: r.urlHash, name: r.name,
        phone: r.phone, country: r.country, locale, analysisId: analysis.id,
      });
      await this.queue.add(
        'run',
        { analysisId: analysis.id, url: r.url, email: '', locale, prospect: true },
        { jobId: analysis.id, timeout: 60_000, delay: delays[i] },
      );
    }

    issues.sort((a, b) => a.line - b.line);
    const lastAuditAt = accepted.length ? new Date(now + delays[delays.length - 1]).toISOString() : null;
    this.logger.log(`Prospects batch ${batchId}: ${accepted.length} queued, ${issues.length} issue(s)`);
    return { batchId, queued: accepted.length, issues, lastAuditAt };
  }

  async list(opts: { batchId?: string; page: number; limit: number }) {
    const limit = Math.min(Math.max(opts.limit, 1), 200);
    const page = Math.max(opts.page, 1);
    const { rows, total } = await this.db.listProspects({ batchId: opts.batchId, limit, offset: (page - 1) * limit });
    return { prospects: rows, total, page, limit };
  }
}
