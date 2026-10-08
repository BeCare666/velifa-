import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import axios from 'axios';
import { verifyClerkToken } from '../common/auth/clerk-auth.service';

/** Longueur minimale d'une clé interne pour être acceptée (sinon la clé est désactivée). */
export const MIN_INTERNAL_KEY_LENGTH = 32;

/**
 * Clé interne optionnelle (scripts serveur → API admin). Jamais de valeur par défaut :
 * absente ou trop courte, elle est désactivée. Ne doit jamais être exposée au navigateur.
 */
export function isInternalKey(authHeader: string | undefined, configuredKey = process.env.ADMIN_API_KEY ?? ''): boolean {
  if (!configuredKey || configuredKey.length < MIN_INTERNAL_KEY_LENGTH) return false;
  if (!authHeader?.startsWith('Bearer ')) return false;
  const given = Buffer.from(authHeader.slice(7));
  const expected = Buffer.from(configuredKey);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function parseAdminEmails(raw = process.env.ADMIN_EMAILS ?? ''): string[] {
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/** Emails vérifiés d'un utilisateur Clerk (on n'accepte que les adresses vérifiées). */
export async function fetchVerifiedClerkEmails(clerkUserId: string): Promise<string[]> {
  const { data } = await axios.get(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY ?? ''}` },
    timeout: 5000,
  });
  return (data?.email_addresses ?? [])
    .filter((e: any) => e?.verification?.status === 'verified')
    .map((e: any) => String(e.email_address).toLowerCase());
}

/**
 * Autorise : clé interne valide, ou utilisateur Clerk connecté dont un email vérifié est dans ADMIN_EMAILS.
 * Retourne l'identifiant de l'appelant ('internal' ou l'id Clerk).
 */
export async function requireAdmin(
  authHeader: string | undefined,
  deps = { verifyToken: verifyClerkToken, fetchEmails: fetchVerifiedClerkEmails },
): Promise<string> {
  if (isInternalKey(authHeader)) return 'internal';

  const clerkUserId = await deps.verifyToken(authHeader);
  if (!clerkUserId) throw new UnauthorizedException('Authentication required');

  const adminEmails = parseAdminEmails();
  if (!adminEmails.length) throw new ForbiddenException('Admin access required');

  let emails: string[];
  try {
    emails = await deps.fetchEmails(clerkUserId);
  } catch {
    throw new ForbiddenException('Admin access required');
  }
  if (!emails.some((e) => adminEmails.includes(e))) {
    throw new ForbiddenException('Admin access required');
  }
  return clerkUserId;
}
