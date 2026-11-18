'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { X, Loader2, ArrowRight, Sparkles, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useCaptcha } from '@/hooks/useCaptcha';
import { normalizeSiteUrl } from '@/lib/site-url';
import CaptchaStatus from '@/components/audit/CaptchaStatus';

interface Props {
  onClose: () => void;
}

/** Lancement d'un audit depuis l'espace client (tableau de bord, barre latérale). */
export default function NewAuditModal({ onClose }: Props) {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const locale = useLocale();
  const t = useTranslations('hero');
  const tErr = useTranslations('errors');
  const tCommon = useTranslations('common');
  const captcha = useCaptcha(!isSignedIn, locale);

  const [url, setUrl]                 = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [rateLimited, setRateLimited] = useState(false);

  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? undefined;

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setRateLimited(false);
    setLoading(true);
    try {
      const authToken = isSignedIn ? await getToken() : undefined;
      const res = await api.createAnalysis({
        url:              normalizeSiteUrl(url),   // « boutique.sa » accepté, comme sur l'accueil
        email:            clerkEmail,
        cfTurnstileToken: captcha.token ?? undefined,
        locale,
      }, authToken);
      const { id, cached } = res.data;
      onClose();
      router.push(cached ? `/${locale}/analyse/${id}` : `/${locale}/analyse/loading-page?id=${id}`);
    } catch (err: any) {
      if (err?.statusCode === 429) setRateLimited(true);
      else setError(err?.message ?? tErr('generic'));
    } finally {
      setLoading(false);
      captcha.reset();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-audit-title"
        className="relative w-full max-w-lg overflow-hidden rounded-t-velifa-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-velifa-lg sm:rounded-velifa-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgb(var(--accent-rgb)/0.10), transparent)' }} />

        <div className="relative p-6 sm:p-7">
          <button type="button" onClick={onClose} aria-label={tCommon('close')}
            className="absolute end-4 top-4 grid h-8 w-8 place-items-center rounded-full text-text-muted transition-colors hover:bg-[color:var(--surface-raised)] hover:text-text">
            <X className="h-4 w-4" />
          </button>

          <p className="velifa-eyebrow mb-3">VELIFA</p>
          <h2 id="new-audit-title" className="font-heading text-2xl font-semibold tracking-tight text-text">{t('newAuditTitle')}</h2>
          <p className="mt-1.5 text-sm text-text-muted">{t('newAuditSubtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="new-audit-url" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                {t('urlLabel')}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                <input
                  id="new-audit-url"
                  ref={inputRef}
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  dir="ltr"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(''); setRateLimited(false); }}
                  placeholder={t('inputPlaceholder')}
                  required
                  disabled={loading}
                  className={`h-12 w-full rounded-velifa-md border bg-[color:var(--bg)] pe-4 ps-10 text-[15px] text-text placeholder:text-text-subtle transition-colors focus:outline-none disabled:opacity-60 ${
                    error ? 'border-[color:var(--velifa-score-poor)]' : 'border-border focus:border-[color:var(--border-strong)]'
                  }`}
                />
              </div>
            </div>

            {rateLimited && (
              <div className="rounded-velifa-md border border-border bg-[color:var(--bg-subtle)] p-4">
                <p className="text-sm font-semibold text-text">{t('rateLimitTitle')}</p>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">{t('rateLimitDesc')}</p>
                <button type="button" onClick={() => { onClose(); router.push(`/${locale}/tarifs`); }}
                  className="velifa-btn mt-3 inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> {t('upgradePro')}
                </button>
              </div>
            )}

            {error && <p role="alert" className="text-sm score-poor">{error}</p>}

            {!rateLimited && (
              <>
                {captcha.widget && <div className="flex justify-center">{captcha.widget}</div>}
                <CaptchaStatus pending={captcha.pending} failed={captcha.failed} onRetry={captcha.reset} />
                <button type="submit" disabled={loading || !url.trim() || !captcha.ready}
                  className="velifa-btn inline-flex h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('analyzing')}</>
                    : <>{t('analyzeNow')} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></>}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
