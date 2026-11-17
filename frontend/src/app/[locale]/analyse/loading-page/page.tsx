'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2, Loader2, Gauge, ScanSearch, FileText, Hourglass,
  Activity, Users, Store, Languages, ShieldCheck, ListChecks,
} from 'lucide-react';
import { useAnalysisStatus } from '@/hooks/useAnalysisStatus';
import type { AnalysisStatus, AnalysisStep } from '@/types/analysis';

/**
 * Écran d'audit plein écran.
 * Tout ce qui est affiché est réel : étape envoyée par le worker (SSE), domaine audité,
 * temps écoulé, et la liste des contrôles effectivement réalisés par le backend.
 * Aucune progression ni chiffre simulé.
 */
export default function LoadingPage() {
  return (
    <Suspense fallback={<Shell />}>
      <LoadingContent />
    </Suspense>
  );
}

const STAGES = [
  { key: 'Queued',      icon: Hourglass },
  { key: 'Performance', icon: Gauge },
  { key: 'Inspection',  icon: ScanSearch },
  { key: 'Report',      icon: FileText },
] as const;

const CHECKS = [
  { key: 'checkVitals',     icon: Activity },
  { key: 'checkField',      icon: Users },
  { key: 'checkPlatform',   icon: Store },
  { key: 'checkArabic',     icon: Languages },
  { key: 'checkPrivacy',    icon: ShieldCheck },
  { key: 'checkPriorities', icon: ListChecks },
] as const;

/** Index de l'étape en cours (0–3), 4 = terminé. */
function stageIndex(status: AnalysisStatus, step: AnalysisStep | null): number {
  if (status === 'completed') return STAGES.length;
  if (status === 'pending') return 0;
  if (step === 'inspection') return 2;
  if (step === 'report') return 3;
  return 1; // processing : la première étape du worker est la performance
}

function domainOf(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function useElapsed(running: boolean) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  const s = Math.max(0, Math.floor((now - start) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Fond plein écran : couvre l'en-tête et tout le site pendant l'audit. */
function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="fixed inset-0 z-[60] overflow-y-auto bg-bg text-text">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(var(--accent-rgb)/0.6) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--accent-rgb)/0.6) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }}
        />
        <div
          className="absolute left-1/2 top-[38%] h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgb(var(--accent-rgb)/0.16) 0%, rgb(var(--accent-rgb)/0.04) 40%, transparent 70%)' }}
        />
      </div>
      <div className="relative min-h-full flex flex-col">{children}</div>
    </main>
  );
}

/** Anneaux de balayage autour du domaine ; l'arc doré suit l'étape réelle. */
function Scanner({ index, done }: { index: number; done: boolean }) {
  const R = 130;
  const C = 2 * Math.PI * R;
  const ratio = Math.min(index, STAGES.length) / STAGES.length;
  return (
    <div className="relative mx-auto h-[220px] w-[220px] sm:h-[300px] sm:w-[300px]">
      <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full -rotate-90">
        <defs>
          <linearGradient id="velifa-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="45%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx="150" cy="150" r={R} fill="none" stroke="rgb(var(--accent-rgb)/0.06)" strokeWidth="2" />
        <circle
          cx="150" cy="150" r={R} fill="none" stroke="url(#velifa-arc)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)', filter: 'drop-shadow(0 0 8px rgb(var(--accent-rgb)/0.15))' }}
        />
        <circle cx="150" cy="150" r="104" fill="none" stroke="rgb(var(--accent-rgb)/0.14)" strokeWidth="1" strokeDasharray="2 8" />
        <circle cx="150" cy="150" r="78" fill="none" stroke="rgb(var(--accent-rgb)/0.05)" strokeWidth="1" />
      </svg>

      {!done && (
        <div
          aria-hidden
          className="absolute inset-[14%] rounded-full animate-[spin_4s_linear_infinite] motion-reduce:animate-none"
          style={{ background: 'conic-gradient(from 0deg, rgb(var(--accent-rgb)/0.28), transparent 22%, transparent)' }}
        />
      )}

      <div className="absolute inset-[30%] flex items-center justify-center rounded-full border border-[rgb(var(--accent-rgb)/0.25)] bg-[#0b0b0b] shadow-[0_0_60px_rgb(var(--accent-rgb)/0.15)_inset]">
        {done
          ? <CheckCircle2 className="h-10 w-10 text-accent" />
          : <ScanSearch className="h-9 w-9 text-accent" />}
      </div>
    </div>
  );
}

function LoadingContent() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { status, step, url, failed } = useAnalysisStatus(id || null);
  const t = useTranslations('loading');

  const done = status === 'completed';
  const index = stageIndex(status, step);
  const elapsed = useElapsed(!done && !failed);
  const domain = domainOf(url);

  return (
    <Shell>
      {/* ── Barre supérieure ─────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-5 sm:px-10">
        <Link href="/" className="velifa-wordmark text-lg sm:text-xl">VELIFA</Link>
        {!failed && (
          <div className="flex items-center gap-4 text-xs">
            <span className="hidden sm:inline text-text-subtle tracking-eyebrow uppercase">{t('elapsed')}</span>
            <span className="font-mono text-sm text-text tabular-nums">{elapsed}</span>
            <span className="flex items-center gap-2 rounded-full border border-[rgb(var(--accent-rgb)/0.35)] px-3 py-1 text-accent">
              <span className="relative flex h-2 w-2">
                {!done && <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-70 animate-ping motion-reduce:animate-none" />}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              {t('live')}
            </span>
          </div>
        )}
      </header>

      {failed ? (
        /* ── Échec ───────────────────────────────────────────────── */
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="velifa-card max-w-md w-full text-center p-8">
            <h1 className="font-heading text-2xl text-text mb-3">{t('errorTitle')}</h1>
            {domain && <p className="text-accent text-sm mb-3" dir="ltr">{domain}</p>}
            <p className="text-text-muted text-sm mb-6 leading-relaxed">{t('errorDesc')}</p>
            <Link href="/" className="velifa-btn">{t('retry')}</Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center px-5 pb-12 sm:px-10">
          {/* ── Titre ─────────────────────────────────────────────── */}
          <div className="text-center mt-2 sm:mt-6 animate-velifa-rise">
            <p className="text-[11px] text-text-subtle tracking-eyebrow uppercase mb-4">{t('eyebrow')}</p>
            <h1 className="font-heading text-3xl sm:text-5xl text-text leading-tight">
              {t('title')}{' '}
              <span
                dir="ltr"
                className="inline-block bg-clip-text text-transparent"
                style={{ backgroundImage: 'var(--brand-gradient)' }}
              >
                {domain ?? '…'}
              </span>
            </h1>
            <p className="mt-3 text-sm text-text-muted">{done ? t('ready') : t('duration')}</p>
          </div>

          {/* ── Scanner + étapes ──────────────────────────────────── */}
          <div className="mt-10 grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-16">
            <Scanner index={index} done={done} />

            <ol className="space-y-3">
              {STAGES.map((stage, i) => {
                const Icon = stage.icon;
                const isDone = i < index;
                const active = i === index;
                return (
                  <li
                    key={stage.key}
                    className={`flex items-start gap-4 rounded-velifa-lg border px-5 py-4 transition-all duration-500 ${
                      active
                        ? 'border-[rgb(var(--accent-rgb)/0.45)] bg-[rgb(var(--accent-rgb)/0.07)] shadow-[0_0_40px_rgb(var(--accent-rgb)/0.10)]'
                        : isDone
                        ? 'border-border bg-white/[0.02]'
                        : 'border-white/[0.06] bg-transparent opacity-45'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-velifa-md ${
                      isDone ? 'bg-score-good/15' : active ? 'bg-accent-soft' : 'bg-white/[0.04]'
                    }`}>
                      {isDone
                        ? <CheckCircle2 className="h-4 w-4 score-good" />
                        : active
                        ? <Loader2 className="h-4 w-4 text-accent animate-spin motion-reduce:animate-none" />
                        : <Icon className="h-4 w-4 text-text-subtle" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${active ? 'text-accent' : isDone ? 'text-text' : 'text-text-subtle'}`}>
                        <span className="me-2 font-mono text-xs text-text-subtle">{String(i + 1).padStart(2, '0')}</span>
                        {t(`stage${stage.key}`)}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-text-muted">{t(`stage${stage.key}Desc`)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* ── Contrôles réalisés ────────────────────────────────── */}
          <div className="mt-12 w-full max-w-5xl">
            <p className="mb-4 text-center text-[11px] text-text-subtle tracking-eyebrow uppercase">{t('checksTitle')}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {CHECKS.map(({ key, icon: Icon }) => (
                <div key={key} className="flex items-center gap-2.5 rounded-velifa-md border border-white/[0.07] bg-white/[0.02] px-3 py-3">
                  <Icon className="h-4 w-4 flex-shrink-0 text-accent" />
                  <span className="text-xs text-text-muted leading-snug">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
