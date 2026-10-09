import { createHash, randomBytes } from 'crypto';

/** Format : « vlf_ » + 40 caractères hexadécimaux (160 bits aléatoires). */
export const API_KEY_PATTERN = /^vlf_[0-9a-f]{40}$/;
export const MAX_ACTIVE_KEYS = 5;
/** Audits par jour et par titulaire via l'API. ⚠️ Hypothèse, réglable par API_DAILY_LIMIT. */
export const DEFAULT_API_DAILY_LIMIT = 200;

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `vlf_${randomBytes(20).toString('hex')}`;
  return { key, prefix: key.slice(0, 12), hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Clé lue dans « Authorization: Bearer vlf_… » ou « X-API-Key: vlf_… » ; null si absente ou mal formée. */
export function extractApiKey(authorization: string | undefined, xApiKey: string | undefined): string | null {
  const fromBearer = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : undefined;
  const candidate = (xApiKey ?? fromBearer ?? '').trim();
  return API_KEY_PATTERN.test(candidate) ? candidate : null;
}
