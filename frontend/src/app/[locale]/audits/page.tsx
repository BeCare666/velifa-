'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  BarChart3, Globe, FileSearch, RefreshCw, ArrowRight,
  Loader2, Zap, ChevronLeft, ChevronRight, Filter, Calendar,
  Gauge, Search,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { api } from '@/lib/api';
import type { MyAudit } from '@/types/analysis';

// ── Helpers ─────────────────────────────────────────────────────────────────
function useFormatDate() {
  const locale = useLocale();
  return (iso: string): string =>
    new Date(iso).toLocaleDateString(locale, {
      day: 'numeric', month: 'short', year: 'numeric',
    });
}

function stripUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch { return url; }
}

type ScoreBucket = 'good' | 'average' | 'poor' | 'unknown';
function bucket(score: number | null): ScoreBucket {
  if (score == null) return 'unknown';
  if (score >= 90) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
}

const SCORE_COLOR: Record<ScoreBucket, string> = {
  good: '#0CCE6B', average: '#FFA400', poor: '#FF4E42', unknown: 'var(--text-subtle)',
};

type DateFilter  = '7d' | '30d' | 'all';
type ScoreFilter = 'all' | 'good' | 'average' | 'poor';
const PAGE_SIZE = 10;

// ── Score pill ───────────────────────────────────────────────────────────────
function ScorePill({ score }: { score: number | null }) {
  const b = bucket(score);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: score != null
          ? `${SCORE_COLOR[b]}18`
          : 'var(--surface-raised)',
        color: SCORE_COLOR[b],
        border: `1px solid ${score != null ? `${SCORE_COLOR[b]}40` : 'var(--border)'}`,
      }}
    >
      {score ?? '—'}
    </span>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, gold = false }: {
  label: string; value: React.ReactNode; icon: React.ElementType; gold?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: gold
          ? 'linear-gradient(135deg, rgba(212,175,55,0.13) 0%, rgba(26,26,26,0.95) 60%)'
          : 'linear-gradient(135deg, rgba(36,36,36,0.9) 0%, rgba(18,18,18,0.95) 100%)',
        border: gold ? '1px solid rgba(212,175,55,0.35)' : '1px solid var(--border)',
        borderRadius: 'var(--velifa-radius-lg)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
      }}
    >
      <Icon className="w-4 h-4" style={{ color: gold ? 'var(--accent)' : 'var(--text-subtle)' }} strokeWidth={1.75} />
      <div>
        <p className="text-[10px] font-semibold tracking-widest uppercase text-text-subtle mb-1">{label}</p>
        <p className="font-heading font-bold text-3xl" style={{ color: gold ? 'var(--accent)' : 'var(--text)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Row skeleton ─────────────────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded" style={{ background: 'var(--surface-raised)', width: i === 0 ? '60%' : '40%' }} />
        </td>
      ))}
    </tr>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ filtered, noResultsTitle, noResultsDesc, noAuditsTitle, noAuditsDesc, launchLabel }: {
  filtered: boolean;
  noResultsTitle: string;
  noResultsDesc: string;
  noAuditsTitle: string;
  noAuditsDesc: string;
  launchLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: 'var(--surface-raised)' }}
      >
        <FileSearch className="w-6 h-6 text-text-subtle" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="font-heading font-semibold text-text text-lg mb-1">
          {filtered ? noResultsTitle : noAuditsTitle}
        </h3>
        <p className="text-text-muted text-sm max-w-xs">
          {filtered ? noResultsDesc : noAuditsDesc}
        </p>
      </div>
      {!filtered && (
        <Link href="/" className="velifa-btn inline-flex items-center gap-2 mt-2">
          <Zap className="w-4 h-4" />
          {launchLabel}
        </Link>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AuditsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const t = useTranslations('audits');
  const formatDate = useFormatDate();

  const SCORE_LABEL: Record<ScoreBucket, string> = {
    good: t('scoreGood'),
    average: t('scoreAverage'),
    poor: t('scorePoor'),
    unknown: '—',
  };

  const [audits, setAudits]       = useState<MyAudit[] | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [relaunching, setRelaunch] = useState<string | null>(null);
  const [dateFilter, setDate]     = useState<DateFilter>('all');
  const [scoreFilter, setScore]   = useState<ScoreFilter>('all');
  const [page, setPage]           = useState(1);

  // Auth guard
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  // Fetch
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

  // Stats
  const stats = useMemo(() => {
    if (!audits?.length) return { total: 0, avg: null as number | null, best: null as number | null };
    const scored = audits.filter((a) => a.scorePerformance != null) as Array<MyAudit & { scorePerformance: number }>;
    if (!scored.length) return { total: audits.length, avg: null, best: null };
    const avg = Math.round(scored.reduce((s, a) => s + a.scorePerformance, 0) / scored.length);
    const best = Math.max(...scored.map((a) => a.scorePerformance));
    return { total: audits.length, avg, best };
  }, [audits]);

  // Filtering
  const filtered = useMemo(() => {
    if (!audits) return [];
    let res = [...audits];
    const now = Date.now();
    if (dateFilter === '7d')  res = res.filter((a) => now - new Date(a.createdAt).getTime() < 7  * 86_400_000);
    if (dateFilter === '30d') res = res.filter((a) => now - new Date(a.createdAt).getTime() < 30 * 86_400_000);
    if (scoreFilter === 'good')    res = res.filter((a) => bucket(a.scorePerformance) === 'good');
    if (scoreFilter === 'average') res = res.filter((a) => bucket(a.scorePerformance) === 'average');
    if (scoreFilter === 'poor')    res = res.filter((a) => bucket(a.scorePerformance) === 'poor');
    return res;
  }, [audits, dateFilter, scoreFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [dateFilter, scoreFilter]);

  async function relaunch(audit: MyAudit) {
    setRelaunch(audit.id);
    try {
      const token = await getToken();
      await api.createAnalysis({ url: audit.url, email: '', cfTurnstileToken: '', force: true }, token);
      const res = await api.getMine(token!);
      setAudits(res.data);
    } catch {
      // silent — user can retry
    } finally {
      setRelaunch(null);
    }
  }

  const isLoading = audits === null && !error;

  if (!isLoaded || (isLoaded && !isSignedIn)) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 sm:py-16">

          {/* Header */}
          <div className="fade-up mb-10">
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text tracking-tight">
              {t('title')}
            </h1>
            <p className="text-text-muted mt-2 text-sm">
              {t('subtitle')}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 fade-up" style={{ animationDelay: '60ms' }}>
            <StatCard label={t('statTotal')}  value={stats.total}        icon={BarChart3} />
            <StatCard label={t('statAvg')}    value={stats.avg ?? '—'}   icon={Gauge} />
            <StatCard label={t('statBest')}   value={stats.best ?? '—'}  icon={Search} gold />
          </div>

          {/* Filters */}
          <div
            className="fade-up flex flex-wrap items-center gap-3 mb-6 p-4 rounded-[var(--velifa-radius-lg)]"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              animationDelay: '100ms',
            }}
          >
            <div className="flex items-center gap-2 text-text-subtle">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-widest uppercase">{t('period')}</span>
            </div>
            {(['all', '7d', '30d'] as DateFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setDate(f)}
                className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all"
                style={dateFilter === f
                  ? { background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.35)', color: 'var(--accent)' }
                  : { background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                {f === 'all' ? t('filterAll') : f === '7d' ? t('filter7d') : t('filter30d')}
              </button>
            ))}

            <div className="w-px h-4 hidden sm:block" style={{ background: 'var(--border)' }} />

            <div className="flex items-center gap-2 text-text-subtle">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-widest uppercase">{t('score')}</span>
            </div>
            {(['all', 'good', 'average', 'poor'] as ScoreFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setScore(f)}
                className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all"
                style={scoreFilter === f
                  ? { background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.35)', color: 'var(--accent)' }
                  : { background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                {f === 'all' ? t('scoreAll') : f === 'good' ? t('scoreGood') : f === 'average' ? t('scoreAverage') : t('scorePoor')}
              </button>
            ))}
          </div>

          {/* Table */}
          <div
            className="fade-up rounded-[var(--velifa-radius-lg)] overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
              animationDelay: '140ms',
            }}
          >
            {error ? (
              <div className="py-16 text-center">
                <p className="text-sm font-medium" style={{ color: '#FF4E42' }}>{t('loadError')}</p>
                <p className="text-text-muted text-xs mt-1">{error}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {[t('colUrl'), t('colPerf'), t('colSeo'), t('colDate'), t('colStatus'), t('colActions')].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-start text-[10px] font-semibold tracking-widest uppercase text-text-subtle"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading
                        ? [...Array(5)].map((_, i) => <RowSkeleton key={i} />)
                        : paged.length === 0
                          ? (
                            <tr>
                              <td colSpan={6}>
                                <EmptyState
                                  filtered={dateFilter !== 'all' || scoreFilter !== 'all'}
                                  noResultsTitle={t('noResults')}
                                  noResultsDesc={t('noResultsDesc')}
                                  noAuditsTitle={t('noAudits')}
                                  noAuditsDesc={t('noAuditsDesc')}
                                  launchLabel={t('launchAudit')}
                                />
                              </td>
                            </tr>
                          )
                          : paged.map((audit, i) => (
                            <tr
                              key={audit.id}
                              className="group transition-colors"
                              style={{
                                borderBottom: i < paged.length - 1 ? '1px solid var(--border)' : 'none',
                                animationDelay: `${i * 40}ms`,
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.025)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                              }}
                            >
                              {/* URL */}
                              <td className="px-4 py-3.5 max-w-[200px]">
                                <div className="flex items-center gap-2">
                                  <Globe className="w-3.5 h-3.5 text-text-subtle flex-shrink-0" />
                                  <span className="text-text font-medium truncate">{stripUrl(audit.url)}</span>
                                </div>
                              </td>
                              {/* Perf */}
                              <td className="px-4 py-3.5">
                                <ScorePill score={audit.scorePerformance} />
                              </td>
                              {/* SEO */}
                              <td className="px-4 py-3.5">
                                <ScorePill score={(audit as any).scoreSeo ?? null} />
                              </td>
                              {/* Date */}
                              <td className="px-4 py-3.5 text-text-muted whitespace-nowrap">
                                {formatDate(audit.createdAt)}
                              </td>
                              {/* Statut */}
                              <td className="px-4 py-3.5">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                                  style={{
                                    background: 'rgba(12,206,107,0.12)',
                                    color: '#0CCE6B',
                                    border: '1px solid rgba(12,206,107,0.30)',
                                  }}
                                >
                                  {t('completed')}
                                </span>
                              </td>
                              {/* Actions */}
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/analyse/${audit.id}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all"
                                    style={{
                                      background: 'rgba(212,175,55,0.10)',
                                      border: '1px solid rgba(212,175,55,0.28)',
                                      color: 'var(--accent)',
                                    }}
                                  >
                                    <FileSearch className="w-3 h-3" />
                                    {t('report')}
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                  <button
                                    onClick={() => relaunch(audit)}
                                    disabled={relaunching === audit.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all disabled:opacity-50"
                                    style={{
                                      background: 'var(--surface-raised)',
                                      border: '1px solid var(--border)',
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    {relaunching === audit.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <RefreshCw className="w-3 h-3" />
                                    }
                                    {t('relaunch')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      }
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    <p className="text-xs text-text-muted">
                      {filtered.length} {t('results')} · {t('page')} {page}/{totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all disabled:opacity-40"
                        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        {t('prev')}
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all disabled:opacity-40"
                        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                      >
                        {t('next')}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
