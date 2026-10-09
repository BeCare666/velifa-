import {
  Injectable, Logger, BadRequestException, ForbiddenException, HttpException, HttpStatus, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { randomUUID } from 'crypto';
import { DatabaseService, Analysis } from '../prisma/database.service';
import { BULL_ANALYSES_QUEUE } from '../redis/redis.module';
import { validateUrl, hashUrl, assertPublicHost } from '../common/validators/url.validator';
import { effectivePlan } from '../payments/plan-limits';
import { toReportLocale } from '../i18n/report-texts';
import { PlansService } from '../plans/plans.service';
import { MAX_ACTIVE_KEYS, extractApiKey, generateApiKey, hashApiKey } from './api-key';

const DAY_MS = 24 * 3_600_000;

/** Représentation publique (API v1) d'un audit : aucune donnée personnelle. */
export function toApiAudit(a: Analysis) {
  const done = a.status === 'completed';
  return {
    id: a.id,
    url: a.urlSite,
    status: a.status,
    createdAt: a.createdAt,
    completedAt: a.completedAt,
    scores: done ? {
      performance: a.scorePerformance, accessibility: a.scoreAccessibility,
      seo: a.scoreSeo, bestPractices: a.scoreBestPractices,
    } : null,
    lab: done ? { lcpMs: a.lcpMobile, cls: a.clsMobile, tbtMs: a.tbtMobile, fcpMs: a.fcpMobile } : null,
    fieldData: done ? a.fieldData : null,
    recommendations: done ? a.recommendations : null,
    siteChecks: done ? a.siteChecks : null,
    platform: done ? a.platform : null,
    reportUrl: done ? a.reportUrl : null,
    error: a.status === 'failed' ? 'audit_failed' : null,
  };
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    private readonly db: DatabaseService,
    @InjectQueue(BULL_ANALYSES_QUEUE) private readonly queue: Queue,
    private readonly plans: PlansService,
  ) {}

  private async isBusiness(clerkUserId: string): Promise<boolean> {
    const u = await this.db.findUserByClerkId(clerkUserId);
    return effectivePlan(u?.subscriptionPlan, u?.subscriptionStatus) === 'business';
  }

  // ── Gestion des clés (utilisateur Clerk) ───────────────────────────────

  async list(callerId: string | null) {
    if (!callerId) throw new UnauthorizedException('Valid Clerk token required');
    return { keys: await this.db.listApiKeys(callerId), available: await this.isBusiness(callerId) };
  }

  /** La clé complète n'est renvoyée qu'ici, une seule fois. */
  async create(callerId: string | null, rawName: string) {
    if (!callerId) throw new UnauthorizedException('Valid Clerk token required');
    if (!(await this.isBusiness(callerId))) throw new ForbiddenException('api_requires_business');
    const name = (rawName ?? '').replace(/\s+/g, ' ').trim();
    if (name.length < 1 || name.length > 80) throw new BadRequestException('name_invalid');
    const active = (await this.db.listApiKeys(callerId)).filter((k) => !k.revokedAt).length;
    if (active >= MAX_ACTIVE_KEYS) throw new BadRequestException('keys_limit');

    const { key, prefix, hash } = generateApiKey();
    await this.db.insertApiKey({ id: randomUUID(), ownerClerkUserId: callerId, name, prefix, keyHash: hash });
    return { key, prefix, name };
  }

  async revoke(callerId: string | null, keyId: string) {
    if (!callerId) throw new UnauthorizedException('Valid Clerk token required');
    if (!(await this.db.revokeApiKey(keyId, callerId))) throw new NotFoundException('key_not_found');
    return this.list(callerId);
  }

  // ── API publique v1 (clé) ──────────────────────────────────────────────

  /** Titulaire de la clé ; 401 si absente/inconnue/révoquée, 403 si le titulaire n'est plus Business. */
  async authenticate(authorization: string | undefined, xApiKey: string | undefined): Promise<string> {
    const key = extractApiKey(authorization, xApiKey);
    const found = key ? await this.db.findActiveApiKeyByHash(hashApiKey(key)) : null;
    if (!found) throw new UnauthorizedException('invalid_api_key');
    if (!(await this.isBusiness(found.ownerClerkUserId))) throw new ForbiddenException('api_requires_business');
    this.db.touchApiKey(found.id).catch(() => undefined);
    return found.ownerClerkUserId;
  }

  async createAudit(owner: string, input: { url: string; locale?: string }) {
    const limit = (await this.plans.get('business')).apiDailyLimit;
    if (await this.db.countAnalysesBySourceSince(owner, 'api', new Date(Date.now() - DAY_MS)) >= limit) {
      throw new HttpException({ statusCode: 429, message: 'daily_limit', error: 'Too Many Requests' }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const v = validateUrl((input.url ?? '').trim());
    if (!v.valid) throw new BadRequestException('url_invalid');
    try {
      await assertPublicHost(new URL(v.normalized!).hostname);
    } catch {
      throw new BadRequestException('url_invalid');
    }
    const locale = toReportLocale(input.locale ?? 'en');
    const analysis = await this.db.createAnalysis({
      urlSite: v.normalized!, urlHash: hashUrl(v.normalized!), email: '', locale, source: 'api',
      clerkUserId: owner, ipAddress: null,
    });
    await this.queue.add('run', { analysisId: analysis.id, url: v.normalized!, email: '', locale }, { jobId: analysis.id, timeout: 60_000 });
    this.logger.log(`API audit ${analysis.id} queued`);
    return toApiAudit(analysis);
  }

  /** Uniquement les audits du titulaire de la clé (404 sinon, sans révéler leur existence). */
  async getAudit(owner: string, id: string) {
    const a = await this.db.findAnalysisById(id);
    if (!a || a.clerkUserId !== owner) throw new NotFoundException('audit_not_found');
    return toApiAudit(a);
  }
}
