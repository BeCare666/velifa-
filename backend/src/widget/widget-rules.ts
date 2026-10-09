/** Règles du widget d'audit (fonctions pures, testées). */

export const MAX_WIDGET_ORIGINS = 5;

/**
 * Audits par jour et par agence via le widget (protège le quota PageSpeed : le widget ne peut pas avoir de CAPTCHA
 * sur des domaines tiers). ⚠️ Valeur par défaut = hypothèse, réglable par WIDGET_DAILY_LIMIT.
 */
export const DEFAULT_WIDGET_DAILY_LIMIT = 50;

/** Domaine saisi par l'agence → origine normalisée « https://hôte[:port] », ou null si invalide. */
export function normalizeOrigin(raw: string): string | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  let u: URL;
  try {
    u = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.username || u.password || !u.hostname.includes('.')) return null;
  return u.origin.toLowerCase();
}

/** Origine envoyée par le navigateur (en-tête Origin) comparée exactement aux domaines déclarés. */
export function isOriginAllowed(origin: string | undefined, allowed: string[]): boolean {
  if (!origin) return false;
  const o = origin.trim().toLowerCase();
  return allowed.some((a) => a === o);
}

export function parseOrigins(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
