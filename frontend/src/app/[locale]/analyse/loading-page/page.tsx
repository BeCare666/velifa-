'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAnalysisStatus } from '@/hooks/useAnalysisStatus';
import { Loader2, Globe, BarChart2, Mail, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function LoadingPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LoadingContent />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="mb-12 text-center">
        <p className="velifa-wordmark text-2xl mb-1">VELIFA</p>
        <p className="text-text-subtle text-xs tracking-eyebrow uppercase">Performance Beyond Limits</p>
      </div>
      <div className="relative w-20 h-20 mb-8">
        <div className="w-20 h-20 rounded-full border-[3px] border-border border-t-accent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <BarChart2 className="w-7 h-7 text-accent" />
        </div>
      </div>
      <div className="h-8 w-52 mx-auto mb-2 rounded-velifa-md bg-surface animate-pulse" />
      <div className="h-4 w-36 mx-auto rounded bg-surface animate-pulse" />
    </main>
  );
}

function LoadingContent() {
  const params    = useSearchParams();
  const id        = params.get('id') ?? '';
  const { status, error } = useAnalysisStatus(id || null);
  const t = useTranslations('loading');

  const STEPS = [
    { icon: Globe,    label: t('step1') },
    { icon: BarChart2, label: t('step2') },
    { icon: BarChart2, label: t('step3') },
    { icon: Mail,      label: t('step4') },
  ];

  const stepIndex =
    status === 'pending'    ? 0 :
    status === 'processing' ? 2 : 3;

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      {/* ── Header wordmark ─────────────────────────────────────── */}
      <div className="mb-12 text-center">
        <p className="velifa-wordmark text-2xl mb-1">VELIFA</p>
        <p className="text-text-subtle text-xs tracking-eyebrow uppercase">Performance Beyond Limits</p>
      </div>

      {error ? (
        /* ── Error state ─────────────────────────────────────── */
        <div className="velifa-card max-w-sm w-full text-center p-8">
          <div className="w-16 h-16 bg-score-poor/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="font-heading text-xl text-text mb-2">{t('errorTitle')}</h1>
          <p className="text-text-muted text-sm mb-6">{error}</p>
          <Link href="/" className="velifa-btn">
            {t('retry')}
          </Link>
        </div>
      ) : (
        <>
          {/* ── Spinner ──────────────────────────────────────────── */}
          <div className="relative w-20 h-20 mb-8">
            <div className="w-20 h-20 rounded-full border-[3px] border-border border-t-accent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart2 className="w-7 h-7 text-accent" />
            </div>
          </div>

          {/* ── Titre ────────────────────────────────────────────── */}
          <h1 className="font-heading text-2xl text-text mb-2">{t('title')}</h1>
          <p className="text-text-muted mb-10 text-sm">{t('duration')}</p>

          {/* ── Barre de progression ─────────────────────────────── */}
          <div className="w-full max-w-sm mb-8">
            <div className="h-1.5 rounded-full overflow-hidden bg-surface">
              <div
                className="h-full rounded-full animate-velifa-glow"
                style={{
                  width: `${((stepIndex) / STEPS.length) * 100}%`,
                  background: 'var(--velifa-gradient-gold)',
                  transition: 'width 0.5s ease',
                  boxShadow: '0 0 12px rgba(212,175,55,0.4)',
                }}
              />
            </div>
          </div>

          {/* ── Étapes ───────────────────────────────────────────── */}
          <div className="space-y-3 w-full max-w-sm text-start">
            {STEPS.map((step, i) => {
              const Icon    = step.icon;
              const done    = i < stepIndex;
              const active  = i === stepIndex;

              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 rounded-velifa-lg border transition-all ${
                    active
                      ? 'border-accent/40 bg-accent-soft shadow-gold'
                      : done
                      ? 'border-border bg-surface/50 opacity-60'
                      : 'border-border bg-surface/30 opacity-30'
                  }`}
                >
                  {/* Icon badge */}
                  <div
                    className={`w-8 h-8 rounded-velifa-md flex items-center justify-center flex-shrink-0 ${
                      done
                        ? 'bg-score-good/15'
                        : active
                        ? 'bg-accent-soft'
                        : 'bg-surface'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 score-good" />
                    ) : active ? (
                      <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4 text-text-subtle" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-sm font-medium ${
                      active
                        ? 'text-accent'
                        : done
                        ? 'text-text-muted line-through'
                        : 'text-text-subtle'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Indicateur d'étape ──────────────────────────────── */}
          <p className="text-text-subtle text-xs mt-8 tracking-eyebrow uppercase">
            {t('stepIndicator', { current: stepIndex + 1, total: STEPS.length })}
          </p>
        </>
      )}
    </main>
  );
}
