import {
  Injectable, BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { DatabaseService, Workspace, WorkspaceMember } from '../prisma/database.service';
import { fetchVerifiedClerkEmails } from '../admin/admin-auth';

export const WORKSPACE_LOCALES = ['ar', 'en', 'fr'] as const;
export const MAX_WORKSPACE_MEMBERS = 10;

export interface BrandingInput {
  name?: string;
  logoUrl?: string | null;
  brandColor?: string;
  defaultLocale?: string;
}

/**
 * Valide la marque d'une agence. `partial` : mise à jour (champs absents ignorés).
 * Logo : URL https uniquement (affiché dans les rapports et les PDF, jamais téléchargé par l'API).
 */
export function validateBranding(input: BrandingInput, partial: boolean): BrandingInput {
  const out: BrandingInput = {};
  if (input.name !== undefined || !partial) {
    const name = (input.name ?? '').replace(/\s+/g, ' ').trim();
    if (name.length < 2 || name.length > 80) throw new BadRequestException('name_invalid');
    out.name = name;
  }
  if (input.logoUrl !== undefined) {
    const raw = (input.logoUrl ?? '').trim();
    if (!raw) out.logoUrl = null;
    else {
      let u: URL;
      try { u = new URL(raw); } catch { throw new BadRequestException('logo_invalid'); }
      if (u.protocol !== 'https:' || raw.length > 2048) throw new BadRequestException('logo_invalid');
      out.logoUrl = u.toString();
    }
  }
  if (input.brandColor !== undefined) {
    if (!/^#[0-9a-fA-F]{6}$/.test(input.brandColor)) throw new BadRequestException('color_invalid');
    out.brandColor = input.brandColor.toUpperCase();
  }
  if (input.defaultLocale !== undefined) {
    if (!(WORKSPACE_LOCALES as readonly string[]).includes(input.defaultLocale)) throw new BadRequestException('locale_invalid');
    out.defaultLocale = input.defaultLocale;
  }
  return out;
}

/** Identifiant Clerk d'un compte existant à partir de son email (null si aucun compte). */
export async function findClerkUserIdByEmail(email: string): Promise<string | null> {
  const { data } = await axios.get('https://api.clerk.com/v1/users', {
    params: { email_address: email },
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY ?? ''}` },
    timeout: 5000,
  });
  return Array.isArray(data) && data[0]?.id ? String(data[0].id) : null;
}

@Injectable()
export class WorkspacesService {
  /** Recherche du compte par email (remplaçable dans les tests). */
  lookupUser: (email: string) => Promise<string | null> = findClerkUserIdByEmail;
  /** Email affiché pour un membre (remplaçable dans les tests). */
  memberEmail: (clerkUserId: string) => Promise<string | null> = async (id) => (await fetchVerifiedClerkEmails(id))[0] ?? null;

  /** Membres avec leur email (au mieux : un échec Clerk laisse l'email vide sans bloquer). */
  private async withEmails(members: WorkspaceMember[]): Promise<(WorkspaceMember & { email: string | null })[]> {
    return Promise.all(members.map(async (m) => ({ ...m, email: await this.memberEmail(m.clerkUserId).catch(() => null) })));
  }

  constructor(private readonly db: DatabaseService) {}

  private requireUser(clerkUserId: string | null): string {
    if (!clerkUserId) throw new UnauthorizedException('Valid Clerk token required');
    return clerkUserId;
  }

  /** Espace + rôle de l'appelant ; 404 si l'appelant n'est pas membre (on ne révèle pas l'existence). */
  private async access(workspaceId: string, clerkUserId: string): Promise<{ workspace: Workspace; role: 'owner' | 'member' }> {
    const workspace = await this.db.findWorkspaceById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');
    const members = await this.db.findWorkspaceMembers(workspaceId);
    const me = members.find((m) => m.clerkUserId === clerkUserId);
    if (!me) throw new NotFoundException('Workspace not found');
    return { workspace, role: me.role };
  }

  private async requireOwner(workspaceId: string, clerkUserId: string): Promise<Workspace> {
    const { workspace, role } = await this.access(workspaceId, clerkUserId);
    if (role !== 'owner') throw new ForbiddenException('owner_only');
    return workspace;
  }

  async create(callerId: string | null, input: BrandingInput): Promise<Workspace> {
    const owner = this.requireUser(callerId);
    const b = validateBranding(input, false);
    const workspace = {
      id: randomUUID(), name: b.name!, logoUrl: b.logoUrl ?? null, brandColor: b.brandColor ?? '#D4AF37',
      defaultLocale: b.defaultLocale ?? 'ar', ownerClerkUserId: owner,
    };
    await this.db.createWorkspace(workspace);
    return (await this.db.findWorkspaceById(workspace.id))!;
  }

  async listMine(callerId: string | null) {
    return this.db.findWorkspacesForUser(this.requireUser(callerId));
  }

  async get(callerId: string | null, workspaceId: string) {
    const { workspace, role } = await this.access(workspaceId, this.requireUser(callerId));
    return { ...workspace, role, members: await this.withEmails(await this.db.findWorkspaceMembers(workspaceId)) };
  }

  async update(callerId: string | null, workspaceId: string, input: BrandingInput): Promise<Workspace> {
    await this.requireOwner(workspaceId, this.requireUser(callerId));
    await this.db.updateWorkspace(workspaceId, validateBranding(input, true));
    return (await this.db.findWorkspaceById(workspaceId))!;
  }

  /** Ajoute un compte VELIFA existant (par email). Pas de compte → message explicite, pas d'invitation fictive. */
  async addMember(callerId: string | null, workspaceId: string, email: string) {
    await this.requireOwner(workspaceId, this.requireUser(callerId));
    const normalized = (email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new BadRequestException('email_invalid');
    const members = await this.db.findWorkspaceMembers(workspaceId);
    if (members.length >= MAX_WORKSPACE_MEMBERS) throw new BadRequestException('members_limit');
    const userId = await this.lookupUser(normalized);
    if (!userId) throw new NotFoundException('user_not_found');
    await this.db.addWorkspaceMember(workspaceId, userId);
    return this.withEmails(await this.db.findWorkspaceMembers(workspaceId));
  }

  /** Le propriétaire retire un membre ; un membre peut se retirer lui-même. Le propriétaire ne peut pas être retiré. */
  async removeMember(callerId: string | null, workspaceId: string, memberId: string) {
    const caller = this.requireUser(callerId);
    const { workspace, role } = await this.access(workspaceId, caller);
    if (memberId === workspace.ownerClerkUserId) throw new BadRequestException('cannot_remove_owner');
    if (role !== 'owner' && memberId !== caller) throw new ForbiddenException('owner_only');
    await this.db.removeWorkspaceMember(workspaceId, memberId);
    return this.withEmails(await this.db.findWorkspaceMembers(workspaceId));
  }
}
