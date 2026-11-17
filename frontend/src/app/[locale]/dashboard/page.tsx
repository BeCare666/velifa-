'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Loader2, ArrowRight, BarChart3, Gauge, Trophy, Award,
  FileSearch, Plus, TrendingUp, Sparkles, X, Lock, Gem, ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { MyAudit } from '@/types/analysis';
import { useSubscription } from '@/context/SubscriptionContext';
import NewAuditModal from '@/components/audit/NewAuditModal';
import TrackedSites from '@/components/dashboard/TrackedSites';
import { PageHeader, Panel, StatCard, ScoreRing, ScoreBadge, Skeleton, EmptyState, Badge } from '@/components/ui';
import { displayHost } from '@/lib/score';

const FREE_AUDIT_LIMIT = 3;

function useDateFormat() {
  const locale = useLocale();
  const tag = locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';
  return {
    long:  (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(tag, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'),
    short: (iso: string) => new Date(iso).toLocaleDateString(tag, { day: 'numeric', month: 'short' }),
  };
}

// ── Graphique d'évolution ────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-velifa-md border border-border bg-[color:var(--surface-raised)] px-3 py-2 shadow-velifa-md">
      <p className="text-[11px] text-text-subtle">{label}</p>
      <p className="font-heading text-lg font-semibold text-text tabular-nums">
        {payload[0].value}<span className="ms-1 text-xs font-normal text-text-subtle">/100</span>
      </p>
    </div>
  );
}

function EvolutionChart({ audits }: { audits: MyAudit[] }) {
  const t = useTranslations('dashboard');
  const fmt = useDateFormat();
  const data = useMemo(
    () =>
      [...audits]
        .filter((a) => a.scorePerformance != null && a.createdAt)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((a) => ({ date: fmt.short(a.createdAt), score: a.scorePerformance as number })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [audits],
  );

  return (
    <Panel eyebrow={t('overview')} title={t('chartTitle')} actions={<TrendingUp className="h-4 w-4 text-text-subtle" />}>
      {data.length < 2 ? (
        <p className="py-10 text-center text-sm text-text-muted">{t('chartEmpty')}</p>
      ) : (
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="accentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 90, 100]} tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} />
              <Area
                type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} fill="url(#accentGradient)"
                dot={{ fill: 'var(--bg)', stroke: 'var(--accent)', strokeWidth: 2, r: 3.5 }}
                activeDot={{ fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 2, r: 5 }}
                isAnimationActive animationDuration={900} animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

// ── Ligne d'audit ────────────────────────────────────────────────────────────
function AuditRow({ audit }: { audit: MyAudit }) {
  const t = useTranslations('dashboard');
  const fmt = useDateFormat();
  return (
    <Link
      href={`/analyse/${audit.id}`}
      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[color:var(--accent-soft)]"
    >
      <ScoreRing score={audit.scorePerformance} size={52} stroke={4} />
      <div className="min-w-0 flex-1">
        <p dir="ltr" className="truncate text-sm font-medium text-text rtl:text-right">{displayHost(audit.url)}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
          <span>{fmt.long(audit.createdAt)}</span>
          <ScoreBadge score={audit.scorePerformance} withLabel />
        </div>
      </div>
      <span className="hidden items-center gap-1 text-xs font-medium text-text-muted transition-colors group-hover:text-text sm:flex">
        {t('viewReport')}
      </span>
      <ChevronRight className="h-4 w-4 text-text-subtle transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}

function AuditRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <Skeleton className="h-[52px] w-[52px] !rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: 'pro' | 'business' | null }) {
  const t = useTranslations('dashboard');
  if (plan === 'business') return <Badge><Gem className="h-3 w-3" /> Business</Badge>;
  if (plan === 'pro') return <Badge><Sparkles className="h-3 w-3" /> Pro</Badge>;
  return <Badge>{t('planFree')}</Badge>;
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const { plan: subPlan, isActive: isPro, refresh: refreshPlan } = useSubscription();
  const t = useTranslations('dashboard');
  const [audits, setAudits] = useState<MyAudit[] | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeBanner, setUpgradeBanner] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  // Re-fetch le plan à chaque visite du dashboard (évite le stale data du Provider)
  useEffect(() => {
    if (isSignedIn) refreshPlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Bandeau ?upgraded=true
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      setUpgradeBanner(true);
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Token Clerk introuvable');
        const res = await api.getMine(token);
        if (!cancelled) setAudits(res.data);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Erreur de chargement');
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  const stats = useMemo(() => {
    if (!audits || audits.length === 0) {
      return { count: 0, avg: null as number | null, max: null as number | null, best: null as MyAudit | null };
    }
    const scored = audits.filter((a) => a.scorePerformance != null) as Array<MyAudit & { scorePerformance: number }>;
    if (scored.length === 0) return { count: audits.length, avg: null, max: null, best: null };
    const avg = Math.round(scored.reduce((s, a) => s + a.scorePerformance, 0) / scored.length);
    const max = Math.max(...scored.map((a) => a.scorePerformance));
    const best = scored.find((a) => a.scorePerformance === max) ?? null;
    return { count: audits.length, avg, max, best };
  }, [audits]);

  if (!isLoaded || (isLoaded && !isSignedIn)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </main>
    );
  }

  const isLoading = audits === null && error === null;
  const hasAudits = !!audits && audits.length > 0;
  const firstName = user?.firstName ?? user?.username ?? null;
  const isBusiness = subPlan === 'business' && isPro;
  const visibleAudits = hasAudits ? (isPro ? audits! : audits!.slice(0, FREE_AUDIT_LIMIT)) : [];
  const lockedAudits = hasAudits && !isPro ? audits!.slice(FREE_AUDIT_LIMIT) : [];

  return (
    <>
      {auditModalOpen && <NewAuditModal onClose={() => setAuditModalOpen(false)} />}

      <main className="min-h-screen bg-bg">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">

          {/* ── Bandeaux ──────────────────────────────────────────────── */}
          {upgradeBanner && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-velifa-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-5 py-4 animate-velifa-rise">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 flex-shrink-0 text-text" />
                <div>
                  <p className="text-sm font-semibold text-text">{t('welcomePro', { plan: subPlan === 'business' ? 'Business' : 'Pro' })}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{t('welcomeProDesc')}</p>
                </div>
              </div>
              <button onClick={() => setUpgradeBanner(false)} className="text-text-subtle transition-colors hover:text-text" aria-label={t('close')}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {isBusiness && (
            <div className="mb-6 flex items-center gap-3 rounded-velifa-lg border border-border bg-[color:var(--surface)] px-5 py-4">
              <Gem className="h-5 w-5 flex-shrink-0 text-text" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">{t('businessAccess')}</p>
                <p className="mt-0.5 text-xs text-text-muted">{t('businessDesc')}</p>
              </div>
            </div>
          )}

          {/* ── En-tête ───────────────────────────────────────────────── */}
          <PageHeader
            eyebrow={t('eyebrow')}
            title={
              <span className="flex flex-wrap items-center gap-3">
                {firstName ? `${t('hello')}, ${firstName}` : t('hello')}
                <PlanBadge plan={subPlan} />
              </span>
            }
            description={t('subtitle')}
            actions={
              <button onClick={() => setAuditModalOpen(true)} className="velifa-btn">
                <Plus className="h-4 w-4" />
                {t('newAudit')}
              </button>
            }
          />

          {/* ── Indicateurs ───────────────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={BarChart3} label={t('statAudits')} value={hasAudits ? stats.count : '—'} loading={isLoading} />
            <StatCard icon={Gauge} label={t('statAvgScore')} value={stats.avg ?? '—'} sub={stats.avg != null ? t('outOf') : undefined} loading={isLoading} />
            <StatCard icon={Trophy} label={t('statBestScore')} value={stats.max ?? '—'} sub={stats.max != null ? t('outOf') : undefined} loading={isLoading} />
            <StatCard
              icon={Award}
              label={t('statTopSite')}
              value={<span dir="ltr" className="block truncate text-xl">{stats.best ? displayHost(stats.best.url) : '—'}</span>}
              sub={stats.best?.scorePerformance != null ? <ScoreBadge score={stats.best.scorePerformance} /> : undefined}
              loading={isLoading}
              highlight
            />
          </div>

          {/* ── Graphique + sites suivis ──────────────────────────────── */}
          {!isLoading && !error && audits && (
            <div className="mb-6">
              <EvolutionChart audits={audits} />
            </div>
          )}

          {!isLoading && (
            <div className="mb-6">
              <TrackedSites />
            </div>
          )}

          {/* ── Erreur ────────────────────────────────────────────────── */}
          {error && (
            <div className="mb-6 rounded-velifa-lg border px-5 py-6 text-center" style={{ borderColor: 'var(--velifa-score-poor)', background: 'var(--velifa-score-poor-bg)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--velifa-score-poor)' }}>{t('loadError')}</p>
              <p className="mt-1 text-xs text-text-muted">{error}</p>
            </div>
          )}

          {/* ── Audits ────────────────────────────────────────────────── */}
          {isLoading && (
            <Panel padded={false}>
              <div className="divide-y divide-[color:var(--border)]">
                <AuditRowSkeleton /><AuditRowSkeleton /><AuditRowSkeleton />
              </div>
            </Panel>
          )}

          {!isLoading && !error && !hasAudits && (
            <EmptyState
              icon={FileSearch}
              title={t('noAudits')}
              description={t('noAuditsDesc')}
              action={
                <button onClick={() => setAuditModalOpen(true)} className="velifa-btn">
                  {t('startFirstAction')}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              }
            />
          )}

          {!isLoading && !error && hasAudits && (
            <Panel
              padded={false}
              title={t('yourAudits')}
              actions={
                <span className="text-xs text-text-subtle tabular-nums">
                  {isPro
                    ? `${audits!.length} ${t('total')}`
                    : `${Math.min(audits!.length, FREE_AUDIT_LIMIT)} ${t('shown')} · ${audits!.length} ${t('total')}`}
                </span>
              }
            >
              <div className="divide-y divide-[color:var(--border)]">
                {visibleAudits.map((audit) => <AuditRow key={audit.id} audit={audit} />)}
              </div>

              {lockedAudits.length > 0 && (
                <div className="relative border-t border-border">
                  <div className="pointer-events-none divide-y divide-[color:var(--border)] opacity-30 blur-[3px]" aria-hidden>
                    {lockedAudits.slice(0, 2).map((audit) => <AuditRow key={audit.id} audit={audit} />)}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'linear-gradient(to bottom, transparent, var(--surface) 55%)' }}>
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-[color:var(--surface-raised)]">
                      <Lock className="h-4 w-4 text-text" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text">{lockedAudits.length} {t('hiddenAudits')}</p>
                      <p className="mt-1 text-xs text-text-muted">{t('unlockedHistory')}</p>
                    </div>
                    <Link href="/tarifs" className="velifa-btn !py-2 text-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t('goPro')}
                    </Link>
                  </div>
                </div>
              )}
            </Panel>
          )}
        </div>
      </main>
    </>
  );
}
