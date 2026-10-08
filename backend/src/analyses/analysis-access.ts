import { ForbiddenException } from '@nestjs/common';
import type { Analysis } from '../prisma/database.service';

/** Champs jamais renvoyés par l'API publique d'une analyse. */
const PRIVATE_FIELDS = ['email', 'ipAddress', 'userAgent', 'clerkUserId', 'deletedAt', 'anonymizedAt'] as const;

export type PublicAnalysis = Omit<Analysis, (typeof PRIVATE_FIELDS)[number]>;

/** Version d'une analyse sans données personnelles, pour `GET /analyses/:id` (lien partageable). */
export function toPublicAnalysis(a: Analysis): PublicAnalysis {
  const copy: Record<string, unknown> = { ...a };
  for (const f of PRIVATE_FIELDS) delete copy[f];
  return copy as PublicAnalysis;
}

/**
 * Qui peut envoyer un rapport par email, et à qui :
 * - Rapport d'un utilisateur connecté → seulement son propriétaire (vers n'importe quelle adresse).
 * - Rapport anonyme → une seule adresse : la première saisie (capturée comme contact).
 *   Impossible d'utiliser un rapport pour arroser d'autres adresses.
 * Retourne 'capture' quand l'adresse doit être enregistrée sur l'analyse.
 */
export function checkEmailSend(
  a: Pick<Analysis, 'clerkUserId' | 'email'>,
  callerId: string | null,
  toEmail: string,
): 'allowed' | 'capture' {
  const target = toEmail.trim().toLowerCase();
  if (a.clerkUserId) {
    if (a.clerkUserId !== callerId) throw new ForbiddenException('Ce rapport appartient à un autre compte.');
    return 'allowed';
  }
  const existing = (a.email ?? '').trim().toLowerCase();
  if (!existing) return 'capture';
  if (existing !== target) {
    throw new ForbiddenException('Ce rapport a déjà été envoyé à une autre adresse.');
  }
  return 'allowed';
}
