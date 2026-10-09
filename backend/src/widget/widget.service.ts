import {
  Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException, HttpException, HttpStatus, UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { randomBytes, randomUUID } from 'crypto';
import { DatabaseService, Workspace } from '../prisma/database.service';
import { BULL_ANALYSES_QUEUE } from '../redis/redis.module';
import { validateUrl, hashUrl, assertPublicHost } from '../common/validators/url.validator';
import { effectivePlan } from '../payments/plan-limits';
import { toReportLocale } from '../i18n/report-texts';
import { normalizeLeadContact } from '../analyses/lead';
import { PlansService } from '../plans/plans.service';
import { MAX_WIDGET_ORIGINS, isOriginAllowed, normalizeOrigin, parseOrigins } from './widget-rules';

const DAY_MS = 24 * 3_600_000;

/** Widget = fonction agence (offre B) : plan Business du titulaire. */
@Injectable()
export class WidgetService {
  private readonly logger = new Logger(WidgetService.name);

  constructor(
    private readonly db: DatabaseService,
    @InjectQueue(BULL_ANALYSES_QUEUE) private readonly queue: Queue,
    private readonly plans: PlansService,
  ) {}

  private async ownerIsBusiness(workspace: Workspace): Promise<boolean> {
    const u = await this.db.findUserByClerkId(workspace.ownerClerkUserId);
    return effectivePlan(u?.subscriptionPlan, u?.subscriptionStatus) === 'business';
  }

  private async memberAccess(callerId: string | null, workspaceId: string): Promise<{ workspace: Workspace; isOwner: boolean }> {
    if (!callerId) throw new UnauthorizedException('Valid Clerk token required');
    const workspace = await this.db.findWorkspaceById(workspaceId);
    const members = workspace ? await this.db.findWorkspaceMembers(workspaceId) : [];
    const me = members.find((m) => m.clerkUserId === callerId);
    if (!workspace || !me) throw new NotFoundException('Workspace not found');
    return { workspace, isOwner: me.role === 'owner' };
  }

  // ── Configuration (propriétaire de l'espace) ───────────────────────────

  async getConfig(callerId: string | null, workspaceId: string) {
    const { workspace } = await this.memberAccess(callerId, workspaceId);
    return {
      widgetKey: workspace.widgetKey ?? null,
      origins: parseOrigins(workspace.widgetOrigins ?? null),
      available: await this.ownerIsBusiness(workspace),
      prospects: await this.db.listWorkspaceProspects(workspaceId, 100),
    };
  }

  /** Domaines autorisés ; la clé est créée au premier enregistrement (ou renouvelée sur demande). */
  async configure(callerId: string | null, workspaceId: string, rawOrigins: string[], regenerateKey = false) {
    const { workspace, isOwner } = await this.memberAccess(callerId, workspaceId);
    if (!isOwner) throw new ForbiddenException('owner_only');
    if (!(await this.ownerIsBusiness(workspace))) throw new ForbiddenException('widget_requires_business');

    const origins: string[] = [];
    for (const raw of rawOrigins ?? []) {
      const o = normalizeOrigin(raw);
      if (!o) throw new BadRequestException('origin_invalid');
      if (!origins.includes(o)) origins.push(o);
    }
    if (origins.length === 0 || origins.length > MAX_WIDGET_ORIGINS) throw new BadRequestException('origins_count');

    const key = !workspace.widgetKey || regenerateKey ? randomBytes(16).toString('hex') : workspace.widgetKey;
    await this.db.setWorkspaceWidget(workspaceId, key, JSON.stringify(origins));
    return this.getConfig(callerId, workspaceId);
  }

  // ── Routes publiques (site de l'agence) ────────────────────────────────

  /** Espace du widget si la clé existe, l'origine est déclarée et le titulaire est Business ; sinon 403/404. */
  private async publicAccess(key: string, origin: string | undefined): Promise<Workspace> {
    const workspace = /^[0-9a-f]{32}$/.test(key ?? '') ? await this.db.findWorkspaceByWidgetKey(key) : null;
    if (!workspace) throw new NotFoundException('widget_not_found');
    if (!isOriginAllowed(origin, parseOrigins(workspace.widgetOrigins ?? null))) throw new ForbiddenException('origin_not_allowed');
    if (!(await this.ownerIsBusiness(workspace))) throw new ForbiddenException('widget_disabled');
    return workspace;
  }

  /** Marque affichée dans le widget. */
  async publicConfig(key: string, origin: string | undefined) {
    const w = await this.publicAccess(key, origin);
    return { name: w.name, brandColor: w.brandColor, locale: w.defaultLocale };
  }

  async publicAudit(
    key: string,
    origin: string | undefined,
    ipAddress: string,
    input: { url: string; name?: string; email?: string; phone?: string; locale?: string },
  ): Promise<{ id: string }> {
    const workspace = await this.publicAccess(key, origin);

    const limit = (await this.plans.get('business')).widgetDailyLimit;
    if (await this.db.countWorkspaceProspectsSince(workspace.id, new Date(Date.now() - DAY_MS)) >= limit) {
      throw new HttpException({ statusCode: 429, message: 'daily_limit', error: 'Too Many Requests' }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const contact = normalizeLeadContact({ name: input.name, email: input.email, phone: input.phone });
    const v = validateUrl((input.url ?? '').trim());
    if (!v.valid) throw new BadRequestException('url_invalid');
    try {
      await assertPublicHost(new URL(v.normalized!).hostname);
    } catch {
      throw new BadRequestException('url_invalid');
    }

    const locale = toReportLocale(input.locale ?? workspace.defaultLocale);
    const maskedIp = ipAddress.includes('.') ? ipAddress.split('.').slice(0, 3).join('.') + '.xxx' : ipAddress.slice(0, -4) + 'xxxx';
    // Audit au nom du titulaire (visible dans ses audits), sans email VELIFA : c'est l'agence qui recontacte.
    const analysis = await this.db.createAnalysis({
      urlSite: v.normalized!, urlHash: hashUrl(v.normalized!), email: '', locale, source: 'widget',
      clerkUserId: workspace.ownerClerkUserId, ipAddress: maskedIp,
    });
    await this.db.insertWorkspaceProspect({
      id: randomUUID(), workspaceId: workspace.id, urlSite: v.normalized!, name: contact.name, email: contact.email,
      phone: contact.phone, analysisId: analysis.id, origin: origin!.toLowerCase(), ipAddress: maskedIp,
    });
    await this.queue.add('run', { analysisId: analysis.id, url: v.normalized!, email: '', locale }, { jobId: analysis.id, timeout: 60_000 });
    this.logger.log(`Widget ${workspace.id}: audit ${analysis.id} queued`);
    return { id: analysis.id };
  }

  /** Statut et score d'un audit lancé par CE widget (pas d'accès aux autres audits). */
  async publicStatus(key: string, origin: string | undefined, analysisId: string) {
    const workspace = await this.publicAccess(key, origin);
    if (!(await this.db.isWorkspaceProspectAnalysis(workspace.id, analysisId))) throw new NotFoundException('analysis_not_found');
    const a = await this.db.findAnalysisById(analysisId);
    if (!a) throw new NotFoundException('analysis_not_found');
    return {
      status: a.status,
      scorePerformance: a.status === 'completed' ? a.scorePerformance : null,
      lcpMs: a.status === 'completed' ? a.lcpMobile : null,
    };
  }
}
