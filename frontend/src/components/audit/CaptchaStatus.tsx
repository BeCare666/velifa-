'use client';

import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * État de la vérification anti-robot sous un formulaire (H1.3) : « en cours » ou « échec + Réessayer ».
 * Sans lui, le bouton reste désactivé sans explication (cause réelle observée : domaine non autorisé, 110200).
 * Textes partagés avec l'accueil (namespace `hero`).
 */
export default function CaptchaStatus({ pending, failed, onRetry }: { pending: boolean; failed: boolean; onRetry: () => void }) {
  const t = useTranslations('hero');
  if (failed) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-velifa-md px-4 py-3 text-sm"
        style={{ color: 'var(--velifa-score-poor)', background: 'var(--velifa-score-poor-bg)' }}>
        <span>{t('captchaFailed')}</span>
        <button type="button" onClick={onRetry} className="whitespace-nowrap font-medium underline underline-offset-4">
          {t('captchaRetry')}
        </button>
      </div>
    );
  }
  if (pending) {
    return (
      <p className="flex items-center justify-center gap-2 text-xs text-text-subtle">
        <Shield className="h-3.5 w-3.5" /> {t('captchaPending')}
      </p>
    );
  }
  return null;
}
