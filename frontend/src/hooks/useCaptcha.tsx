'use client';

import { useCallback, useState } from 'react';
import Turnstile from 'react-turnstile';

// Clés Cloudflare : « 0x… » (production) ou « 1x/2x/3x… » (clés de test officielles).
// Une valeur d'exemple comme « your_turnstile_site_key » est ignorée.
const RAW_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const SITE_KEY = /^[0-3]x[A-Za-z0-9_-]+$/.test(RAW_SITE_KEY) ? RAW_SITE_KEY : '';

/** Jeton attendu par le backend en développement quand aucune clé n'est configurée. */
export const DEV_BYPASS_TOKEN = 'dev-bypass';

/**
 * CAPTCHA Cloudflare Turnstile pour les visiteurs anonymes.
 * - Sans clé de site (développement) : renvoie le jeton de contournement, aucun widget.
 * - Avec clé : affiche le widget ; `token` vaut null tant que la vérification n'est pas faite.
 * - `failed` : le widget a échoué (ex. domaine non autorisé pour la clé, code 110200) →
 *   le formulaire l'explique au lieu de laisser un bouton grisé sans raison.
 */
export function useCaptcha(enabled: boolean, language: string) {
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const active = enabled && !!SITE_KEY;

  const reset = useCallback(() => {
    setToken(null);
    setFailed(false);
    setResetKey((k) => k + 1);
  }, []);

  const widget = active ? (
    <Turnstile
      key={resetKey}
      sitekey={SITE_KEY}
      theme="dark"
      language={(language as any) || 'auto'}
      onVerify={(t) => { setToken(t); setFailed(false); }}
      onExpire={() => setToken(null)}
      onError={(code) => {
        setToken(null);
        setFailed(true);
        console.warn('[Turnstile] échec de la vérification', code);
      }}
    />
  ) : null;

  return {
    widget,
    /** Jeton à envoyer : undefined si non requis, null si en attente. */
    token: !enabled ? undefined : active ? token : DEV_BYPASS_TOKEN,
    ready: !enabled || !active || !!token,
    /** Vérification en attente (widget affiché, pas encore validé ni en échec). */
    pending: active && !token && !failed,
    failed: active && failed,
    reset,
  };
}
