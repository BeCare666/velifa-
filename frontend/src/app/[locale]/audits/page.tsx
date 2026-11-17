'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  BarChart3, Globe, FileSearch, RefreshCw, ArrowRight,
  Loader2, ChevronLeft, ChevronRight, Filter, Calendar,
  Gauge, Search, GitCompare,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { api } from '@/lib/api';
import type { MyAudit } from '@/types/analysis';
import { PageHeader, Panel, StatCard, ScoreBadge, Skeleton, EmptyState, Badge } from '@/components/ui';
import { displayHost, scoreBucket } from '@/lib/score';

function useFormatDate() {
  const locale = useLocale();
  return (iso: string): string =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

type DateFilter  = '7d' | '30d' | 'all';
type ScoreFilter = 'all' | 'good' | 'average' | 'poor';
const PAGE_SIZE = 10;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-[color:var(--border-strong)] bg-[color:var(--accent-soft)] text-text'
          : 'border-transparent text-text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

function FilterGroup({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="me-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-subtle">
        <Icon className="h-3.5 w-3.5" />{label}
      </span>
      {children}
    </div>
  );
}

export default function AuditsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const t = useTranslations('audits');
  const tc = useTranslations('comparePage');
  const locale = useLocale();
  const formatDate = useFormatDate();

  const [audits, setAudits]        = useState<MyAudit[] | null>(null);
  const [error, setError]          = useState<string | null>(null);
  const [relaunching, setRelaunch] = useState<string | null>(null);
  const [dateFilter, setDate]      = useState<DateFilter>('all');
  const [scoreFilter, setScore]    = useState<ScoreFilter>('all');
  const [page, setPage]            = useState(1);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Token introuvable');
        const res = await api.getMine(token);
        if (!cancelled) setAudits(res.data);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Erreur');
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  const stats = useMemo(() => {
    if (!audits?.length) return { total: 0, avg: null as number | null, best: null as number | null };
    const scored = audits.filter((a) => a.scorePerformance != null) as Array<MyAudit & { scorePerformance: number }>;
    if (!scored.length) return { total: audits.length, avg: null, best: null };
    const avg = Math.round(scored.reduce((s, a) => s + a.scorePerformance, 0) / scored.length);
    const best = Math.max(...scored.map((a) => a.scorePerformance));
    return { total: audits.length, avg, best };
  }, [audits]);

  // Audit précédent de la même URL (liste triée du plus récent au plus ancien) → lien « Comparer »
  const previousOf = useMemo(() => {
    const map: Record<string, string> = {};
    const lastSeen: Record<string, string> = {};
    for (const a of [...(audits ?? [])].reverse()) {
      if (lastSeen[a.url]) map[a.id] = lastSeen[a.url];
      lastSeen[a.url] = a.id;
    }
    return map;
  }, [audits]);

  const filtered = useMemo(() => {
    if (!audits) return [];
    let res = [...audits];
    const now = Date.now();
    if (dateFilter === '7d')  res = res.filter((a) => now - new Date(a.createdAt).getTime() < 7  * 86_400_000);
    if (dateFilter === '30d') res = res.filter((a) => now - new Date(a.createdAt).getTime() < 30 * 86_400_000);
    if (scoreFilter !== 'all') res = res.filter((a) => scoreBucket(a.scorePerformance) === scoreFilter);
    return res;
  }, [audits, dateFilter, scoreFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [dateFilter, scoreFilter]);

  async function relaunch(audit: MyAudit) {
    setRelaunch(audit.id);
    try {
      const token = await getToken();
      // Utilisateur connecté : pas de CAPTCHA (le serveur vérifie le jeton Clerk)
      await api.createAnalysis({ url: audit.url, locale, force: true }, token);
      const res = await api.getMine(token!);
      setAudits(res.data);
    } catch {
      // silencieux — l'utilisateur peut réessayer
    } finally {
      setRelaunch(null);
    }
  }

  const isLoading = audits === null && !error;

  if (!isLoaded || (isLoaded && !isSignedIn)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <PageHeader title={t('title')} description={t('subtitle')} />

        {/* ── Indicateurs ─────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard icon={BarChart3} label={t('statTotal')} value={stats.total} loading={isLoading} />
          <StatCard icon={Gauge} label={t('statAvg')} value={stats.avg ?? '—'} loading={isLoading} />
          <StatCard icon={Search} label={t('statBest')} value={stats.best ?? '—'} loading={isLoading} highlight />
        </div>

        {/* ── Filtres ─────────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-col gap-3 rounded-velifa-lg border border-border bg-[color:var(--surface)] p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <FilterGroup icon={Calendar} label={t('period')}>
            {(['all', '7d', '30d'] as DateFilter[]).map((f) => (
              <Chip key={f} active={dateFilter === f} onClick={() => setDate(f)}>
                {f === 'all' ? t('filterAll') : f === '7d' ? t('filter7d') : t('filter30d')}
              </Chip>
            ))}
          </FilterGroup>
          <span className="hidden h-5 w-px bg-[color:var(--border)] sm:block" />
          <FilterGroup icon={Filter} label={t('score')}>
            {(['all', 'good', 'average', 'poor'] as ScoreFilter[]).map((f) => (
              <Chip key={f} active={scoreFilter === f} onClick={() => setScore(f)}>
                {f === 'all' ? t('scoreAll') : f === 'good' ? t('scoreGood') : f === 'average' ? t('scoreAverage') : t('scorePoor')}
              </Chip>
            ))}
          </FilterGroup>
        </div>

        {/* ── Tableau ─────────────────────────────────────────────────── */}
        <Panel padded={false}>
          {error ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--velifa-score-poor)' }}>{t('loadError')}</p>
              <p className="mt-1 text-xs text-text-muted">{error}</p>
            </div>
          ) : !isLoading && paged.length === 0 ? (
            <div className="p-5">
              {dateFilter !== 'all' || scoreFilter !== 'all' ? (
                <EmptyState icon={FileSearch} title={t('noResults')} description={t('noResultsDesc')} />
              ) : (
                <EmptyState
                  icon={FileSearch}
                  title={t('noAudits')}
                  description={t('noAuditsDesc')}
                  action={<Link href="/" className="velifa-btn">{t('launchAudit')}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>}
                />
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {[t('colUrl'), t('colPerf'), t('colSeo'), t('colDate'), t('colStatus'), t('colActions')].map((h) => (
                        <th key={h} className="px-5 py-3 text-start text-[11px] font-medium uppercase tracking-[0.12em] text-text-subtle">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {isLoading
                      ? [...Array(5)].map((_, i) => (
                          <tr key={i}>
                            {[...Array(6)].map((__, j) => (
                              <td key={j} className="px-5 py-4"><Skeleton className={`h-4 ${j === 0 ? 'w-3/5' : 'w-2/5'}`} /></td>
                            ))}
                          </tr>
                        ))
                      : paged.map((audit) => (
                          <tr key={audit.id} className="transition-colors hover:bg-[color:var(--accent-soft)]">
                            <td className="max-w-[240px] px-5 py-3.5">
                              <span className="flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5 flex-shrink-0 text-text-subtle" />
                                <span dir="ltr" className="truncate font-medium text-text">{displayHost(audit.url)}</span>
                              </span>
                            </td>
                            <td className="px-5 py-3.5"><ScoreBadge score={audit.scorePerformance} /></td>
                            <td className="px-5 py-3.5"><ScoreBadge score={audit.scoreSeo} /></td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-text-muted">{formatDate(audit.createdAt)}</td>
                            {/* /analyses/mine ne renvoie que les audits terminés */}
                            <td className="px-5 py-3.5"><Badge tone="good">{t('completed')}</Badge></td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <Link href={`/analyse/${audit.id}`} className="velifa-btn !px-3 !py-1.5 text-xs">
                                  <FileSearch className="h-3.5 w-3.5" />
                                  {t('report')}
                                </Link>
                                {previousOf[audit.id] && (
                                  <Link href={`/${locale}/analyse/${audit.id}/compare/${previousOf[audit.id]}`} className="velifa-btn velifa-btn--ghost !px-3 !py-1.5 text-xs">
                                    <GitCompare className="h-3.5 w-3.5" />
                                    {tc('compare')}
                                  </Link>
                                )}
                                <button
                                  onClick={() => relaunch(audit)}
                                  disabled={relaunching === audit.id}
                                  className="velifa-btn velifa-btn--ghost !px-3 !py-1.5 text-xs disabled:opacity-50"
                                >
                                  {relaunching === audit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                  {t('relaunch')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>

              {!isLoading && totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
                  <p className="text-xs text-text-muted tabular-nums">{filtered.length} {t('results')} · {t('page')} {page}/{totalPages}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="velifa-btn velifa-btn--ghost !px-3 !py-1.5 text-xs disabled:opacity-40">
                      <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />{t('prev')}
                    </button>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="velifa-btn velifa-btn--ghost !px-3 !py-1.5 text-xs disabled:opacity-40">
                      {t('next')}<ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
