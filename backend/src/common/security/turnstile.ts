import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Jeton envoyé par le frontend quand aucune clé de site n'est configurée (développement uniquement). */
export const DEV_BYPASS_TOKEN = 'dev-bypass';

export type TurnstileOutcome = 'verified' | 'bypassed-dev';

export interface TurnstileOptions {
  secret: string;
  nodeEnv: string;
  /** Injection pour les tests : appel HTTP vers Cloudflare. */
  post?: (url: string, body: string) => Promise<{ success: boolean }>;
}

const defaultPost = async (url: string, body: string) => {
  const { data } = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 5000,
  });
  return data as { success: boolean };
};

/**
 * Règles :
 * - Production : la clé secrète est obligatoire ; tout échec (jeton invalide, Cloudflare injoignable) bloque.
 * - Hors production sans clé : contournement (développement local).
 * - Hors production avec clé : vérification réelle ; seule une panne réseau est tolérée.
 */
export async function verifyTurnstile(token: string, ip: string, opts: TurnstileOptions): Promise<TurnstileOutcome> {
  const isProd = opts.nodeEnv === 'production';
  const secret = opts.secret && opts.secret !== 'your_turnstile_secret' ? opts.secret : '';

  if (!secret) {
    if (isProd) throw new ServiceUnavailableException('Protection anti-robot non configurée');
    return 'bypassed-dev';
  }
  if (!token || token === DEV_BYPASS_TOKEN) {
    throw new BadRequestException('CAPTCHA verification failed');
  }

  const body = new URLSearchParams({ secret, response: token, remoteip: ip }).toString();
  let result: { success: boolean };
  try {
    result = await (opts.post ?? defaultPost)(TURNSTILE_VERIFY_URL, body);
  } catch {
    if (isProd) throw new ServiceUnavailableException('Vérification anti-robot indisponible, réessayez');
    return 'bypassed-dev';
  }
  if (!result?.success) throw new BadRequestException('CAPTCHA verification failed');
  return 'verified';
}
