import { createHash } from 'crypto';

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
  normalized?: string;
}

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'internal',
];
const BLOCKED_RANGES = ['192.168.', '10.0.', '172.16.', '169.254.'];
const BLOCKED_EXTENSIONS = ['.exe', '.zip', '.dmg', '.apk', '.pdf', '.mp4'];

export function validateUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, reason: 'URL manquante' };
  }
  if (rawUrl.length > 2048) {
    return { valid: false, reason: 'URL trop longue (max 2048 caractères)' };
  }
  if (!rawUrl.startsWith('https://') && !rawUrl.startsWith('http://')) {
    return { valid: false, reason: 'URL doit commencer par https://' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: 'URL invalide' };
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.some((b) => host.includes(b))) {
    return { valid: false, reason: 'URL non autorisée' };
  }
  if (BLOCKED_RANGES.some((r) => host.startsWith(r))) {
    return { valid: false, reason: 'URL réseau privé non autorisée' };
  }
  if (BLOCKED_EXTENSIONS.some((ext) => parsed.pathname.endsWith(ext))) {
    return { valid: false, reason: 'Type de fichier non supporté' };
  }

  const normalized = rawUrl.toLowerCase().replace(/\/+$/, '');
  return { valid: true, normalized };
}

export function hashUrl(normalizedUrl: string): string {
  return createHash('sha256').update(normalizedUrl).digest('hex');
}
