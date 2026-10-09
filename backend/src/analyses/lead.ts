import { BadRequestException } from '@nestjs/common';
import { normalizePhone } from '../prospects/prospect-csv';

/** Demande « Je veux corriger » envoyée depuis un rapport. */
export interface LeadInput {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

export interface LeadContact {
  name: string | null;
  email: string | null;
  /** Format international, chiffres seulement (wa.me). */
  phone: string | null;
  message: string | null;
}

const clean = (v: string | undefined, max: number): string | null => {
  const s = (v ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
};

/**
 * Au moins un moyen de contact. Le téléphone doit être international (+966…, 00971…) :
 * sans pays connu, un numéro local ne peut pas être converti sans risque d'erreur.
 */
export function normalizeLeadContact(input: LeadInput): LeadContact {
  const email = clean(input.email, 255)?.toLowerCase() ?? null;
  const rawPhone = clean(input.phone, 32);
  let phone: string | null = null;
  if (rawPhone) {
    if (!/^\s*(\+|00)/.test(rawPhone)) throw new BadRequestException('phone_international');
    phone = normalizePhone(rawPhone, null);
    if (!phone) throw new BadRequestException('phone_invalid');
  }
  if (!email && !phone) throw new BadRequestException('contact_required');
  return { name: clean(input.name, 120), email, phone, message: clean(input.message, 1000) };
}

/** Texte de la notification admin (le détail complet est dans la table `leads`). */
export function leadNotificationMessage(urlSite: string, score: number | null, c: LeadContact): string {
  const contact = [c.email, c.phone ? `+${c.phone}` : null].filter(Boolean).join(' / ');
  const who = c.name ? `${c.name} — ` : '';
  return `Demande de correction : ${urlSite} (score ${score ?? '?'}/100) — ${who}${contact}`;
}
