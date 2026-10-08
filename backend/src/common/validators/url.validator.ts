import { createHash } from 'crypto';
import { BlockList, isIP } from 'net';
import * as dns from 'dns';
import * as http from 'http';
import * as https from 'https';

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
  normalized?: string;
}

const BLOCKED_EXTENSIONS = ['.exe', '.zip', '.dmg', '.apk', '.pdf', '.mp4'];
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa'];

// Plages non routables publiquement (RFC 6890 et suivantes) — tout ce qui n'est pas Internet public.
const PRIVATE_RANGES = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) {
  PRIVATE_RANGES.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
  ['64:ff9b::', 96], ['2001:db8::', 32], ['100::', 64],
] as const) {
  PRIVATE_RANGES.addSubnet(net, prefix, 'ipv6');
}

/** Extrait l'IPv4 embarquée dans une IPv6 « mappée » (::ffff:a.b.c.d ou ::ffff:7f00:1). */
function embeddedIpv4(ipv6: string): string | null {
  const lower = ipv6.toLowerCase();
  const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return dotted[1];
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

/** true si l'adresse IP n'est pas une adresse Internet publique. */
export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return PRIVATE_RANGES.check(ip, 'ipv4');
  if (version === 6) {
    const v4 = embeddedIpv4(ip);
    if (v4) return PRIVATE_RANGES.check(v4, 'ipv4');
    return PRIVATE_RANGES.check(ip, 'ipv6');
  }
  return true; // pas une IP valide → on refuse par sécurité
}

function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

/**
 * Validation syntaxique (sans réseau). Normalise l'URL : schéma + hôte en minuscules,
 * chemin et paramètres conservés tels quels (ils sont sensibles à la casse), fragment supprimé.
 */
export function validateUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, reason: 'URL manquante' };
  }
  if (rawUrl.length > 2048) {
    return { valid: false, reason: 'URL trop longue (max 2048 caractères)' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, reason: 'URL invalide' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, reason: 'URL doit commencer par https://' };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'URL avec identifiants non autorisée' };
  }
  if (parsed.port && !['80', '443'].includes(parsed.port)) {
    return { valid: false, reason: 'Port non autorisé' };
  }

  const host = stripBrackets(parsed.hostname.toLowerCase());
  if (host === 'localhost' || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    return { valid: false, reason: 'URL non autorisée' };
  }
  if (isIP(host)) {
    if (isBlockedIp(host)) return { valid: false, reason: 'URL réseau privé non autorisée' };
  } else if (!host.includes('.')) {
    return { valid: false, reason: 'URL non autorisée' };
  }
  if (BLOCKED_EXTENSIONS.some((ext) => parsed.pathname.toLowerCase().endsWith(ext))) {
    return { valid: false, reason: 'Type de fichier non supporté' };
  }

  parsed.hash = '';
  const normalized = parsed.toString().replace(/\/+$/, '');
  return { valid: true, normalized };
}

/**
 * Résout le nom d'hôte et refuse si une des adresses obtenues est privée/réservée.
 * Empêche les noms publics qui pointent vers le réseau interne (ex. localtest.me → 127.0.0.1).
 */
export async function assertPublicHost(hostname: string): Promise<void> {
  const host = stripBrackets(hostname);
  if (isIP(host)) {
    if (isBlockedIp(host)) throw new Error('URL réseau privé non autorisée');
    return;
  }
  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error('Nom de domaine introuvable');
  }
  if (!addresses.length || addresses.some((a) => isBlockedIp(a.address))) {
    throw new Error('URL réseau privé non autorisée');
  }
}

/**
 * Fonction `lookup` pour agents HTTP : vérifie chaque connexion réelle, y compris
 * après redirection et en cas de changement DNS entre la validation et la requête.
 */
export function safeLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '');
    const list = addresses as dns.LookupAddress[];
    if (!list.length || list.some((a) => isBlockedIp(a.address))) {
      const blocked: NodeJS.ErrnoException = new Error(`SSRF bloqué pour ${hostname}`);
      blocked.code = 'ESSRFBLOCKED';
      return callback(blocked, '');
    }
    if (options?.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

export const safeHttpAgent = new http.Agent({ lookup: safeLookup as any });
export const safeHttpsAgent = new https.Agent({ lookup: safeLookup as any });

export function hashUrl(normalizedUrl: string): string {
  return createHash('sha256').update(normalizedUrl).digest('hex');
}
