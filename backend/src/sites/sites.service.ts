import {
  Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../prisma/database.service';
import { validateUrl, hashUrl, assertPublicHost } from '../common/validators/url.validator';
import { effectivePlan, parseSiteLimits, PlanName } from '../payments/plan-limits';

export interface SiteScope {
  scope: string;
  workspaceId: string | null;
  /** Titulaire de l'abonnement dont la limite s'applique. */
  owner: string;
  /** Comptes dont les audits sont rattachés aux sites (titulaire, ou membres de l'espace). */
  auditors: string[];
}

export interface SiteUsage {
  plan: PlanName;
  used: number;
  limit: number;
}

@Injectable()
export class SitesService {
  constructor(private readonly db: DatabaseService, private readonly config: ConfigService) {}

  private requireUser(clerkUserId: string | null): string {
    if (!clerkUserId) throw new UnauthorizedException('Valid Clerk token required');
    return clerkUserId;
  }

  /** Personnel (pas de workspaceId) ou espace agence dont l'appelant est membre (sinon 404). */
  async resolveScope(callerId: string, workspaceId?: string | null): Promise<SiteScope> {
    if (!workspaceId) return { scope: `user:${callerId}`, workspaceId: null, owner: callerId, auditors: [callerId] };
    const workspace = await this.db.findWorkspaceById(workspaceId);
    const members = workspace ? await this.db.findWorkspaceMembers(workspaceId) : [];
    if (!workspace || !members.some((m) => m.clerkUserId === callerId)) throw new NotFoundException('Workspace not found');
    return { scope: workspaceId, workspaceId, owner: workspace.ownerClerkUserId, auditors: members.map((m) => m.clerkUserId) };
  }

  /** Limite du titulaire, tous scopes confondus (créer plusieurs espaces ne contourne pas la limite). */
  async usage(owner: string): Promise<SiteUsage> {
    const user = await this.db.findUserByClerkId(owner);
    const plan = effectivePlan(user?.subscriptionPlan, user?.subscriptionStatus);
    const limits = parseSiteLimits(this.config.get<string>('plans.siteLimits'));
    return { plan, used: await this.db.countTrackedSitesByOwner(owner), limit: limits[plan] };
  }

  async list(callerId: string | null, workspaceId?: string) {
    const scope = await this.resolveScope(this.requireUser(callerId), workspaceId);
    const [sites, usage] = await Promise.all([this.db.listTrackedSites(scope.scope, scope.auditors), this.usage(scope.owner)]);
    return { sites, usage };
  }

  async add(callerId: string | null, input: { url: string; label?: string; workspaceId?: string }) {
    const caller = this.requireUser(callerId);
    const scope = await this.resolveScope(caller, input.workspaceId);

    const v = validateUrl((input.url ?? '').trim());
    if (!v.valid) throw new BadRequestException('url_invalid');
    try {
      await assertPublicHost(new URL(v.normalized!).hostname);
    } catch {
      throw new BadRequestException('url_invalid');
    }

    const usage = await this.usage(scope.owner);
    if (usage.used >= usage.limit) throw new ForbiddenException('site_limit');

    const label = (input.label ?? '').replace(/\s+/g, ' ').trim().slice(0, 120) || null;
    const inserted = await this.db.insertTrackedSite({
      id: randomUUID(), scope: scope.scope, workspaceId: scope.workspaceId, ownerClerkUserId: scope.owner,
      urlSite: v.normalized!, urlHash: hashUrl(v.normalized!), label, createdBy: caller,
    });
    if (!inserted) throw new ConflictException('already_tracked');
    return this.list(caller, input.workspaceId);
  }

  async remove(callerId: string | null, siteId: string) {
    const caller = this.requireUser(callerId);
    const site = await this.db.findTrackedSiteById(siteId);
    if (!site) throw new NotFoundException('Site not found');
    // Même contrôle d'accès que la lecture du scope (404 pour un tiers)
    await this.resolveScope(caller, site.workspaceId).then((s) => {
      if (s.scope !== site.scope) throw new NotFoundException('Site not found');
    });
    await this.db.deleteTrackedSite(siteId);
    return this.list(caller, site.workspaceId ?? undefined);
  }
}
