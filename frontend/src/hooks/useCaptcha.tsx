'use client';

import { useCallback, useState } from 'react';
import Turnstile from 'react-turnstile';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

/** Jeton attendu par le backend en développement quand aucune clé n'est configurée. */
export const DEV_BYPASS_TOKEN = 'dev-bypass';

/**
 * CAPTCHA Cloudflare Turnstile pour les visiteurs anonymes.
 * - Sans clé de site (développement) : renvoie le jeton de contournement, aucun widget.
 * - Avec clé : affiche le widget ; `token` vaut null tant que la vérification n'est pas faite.
 */
export function useCaptcha(enabled: boolean, language: string) {
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const active = enabled && !!SITE_KEY;

  const reset = useCallback(() => {
    setToken(null);
    setResetKey((k) => k + 1);
  }, []);

  const widget = active ? (
    <Turnstile
      key={resetKey}
      sitekey={SITE_KEY}
      theme="dark"
      language={(language as any) || 'auto'}
      onVerify={(t) => setToken(t)}
      onExpire={() => setToken(null)}
      onError={() => setToken(null)}
    />
  ) : null;

  return {
    widget,
    /** Jeton à envoyer : undefined si non requis, null si en attente. */
    token: !enabled ? undefined : active ? token : DEV_BYPASS_TOKEN,
    ready: !enabled || !active || !!token,
    reset,
  };
}
