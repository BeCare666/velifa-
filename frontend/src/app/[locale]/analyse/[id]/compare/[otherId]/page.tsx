import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Zap, Globe, TrendingUp, TrendingDown, Minus, HelpCircle, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMs } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { AnalysisComparison, ListDiff, MetricDiff, Trend } from '@/types/analysis';

export const revalidate = 0;

const TREND_STYLE: Record<Trend, { color: string; bg: string; Icon: any }> = {
  better:  { color: 'var(--velifa-score-good)',    bg: 'rgba(12,206,107,0.12)', Icon: TrendingUp },
  worse:   { color: 'var(--velifa-score-poor)',    bg: 'rgba(255,78,66,0.12)',  Icon: TrendingDown },
  stable:  { color: 'var(--text-muted)',           bg: 'var(--surface-raised)', Icon: Minus },
  unknown: { color: 'var(--text-subtle)',          bg: 'var(--surface-raised)', Icon: HelpCircle },
};

/** Valeur affichée selon l'indicateur (scores en points, temps en ms/s, CLS sans unité). */
function formatValue(key: string, v: number | null, kind: 'score' | 'metric'): string {
  if (v == null) return '—';
  if (kind === 'score') return String(v);
  if (key === 'cls') return v.toFixed(3);
  return formatMs(v);
}

function formatDelta(m: MetricDiff, kind: 'score' | 'metric'): string {
  if (m.delta == null) return '';
  const sign = m.delta > 0 ? '+' : m.delta < 0 ? '−' : '';
  const abs = Math.abs(m.delta);
  if (kind === 'score') return `${sign}${abs}`;
  if (m.key === 'cls') return `${sign}${abs.toFixed(3)}`;
  return `${sign}${formatMs(abs)}`;
}

function TrendBadge({ trend, label }: { trend: Trend; label: string }) {
  const s = TREND_STYLE[trend];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: s.color, background: s.bg }}>
      <s.Icon className="w-3 h-3" /> {label}
    </span>
  );
}

export default async function ComparePage({ params }: { params: Promise<{ id: string; otherId: string; locale: string }> }) {
  const { id, otherId, locale } = await params;
  const t = await getTranslations({ locale, namespace: 'comparePage' });
  const tr = await getTranslations({ locale, namespace: 'reportPage' });

  let c: AnalysisComparison | null = null;
  let error = '';
  try {
    c = (await api.compareAnalyses(id, otherId)).data;
  } catch (e: any) {
    error = e?.message ?? 'Error';
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  const recTitle  = (rid: string) => (tr.has(`recs.list.${rid}.title`) ? tr(`recs.list.${rid}.title`) : rid);
  const issueText = (code: string) => (tr.has(`gulf.issues.${code}`) ? tr(`gulf.issues.${code}`) : code);

  const MetricTable = ({ rows, kind }: { rows: MetricDiff[]; kind: 'score' | 'metric' }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-text-subtle border-b border-border">
            <th className="text-start font-medium py-2 pe-3">{t('colMetric')}</th>
            <th className="text-end font-medium py-2 px-3">{t('before')}</th>
            <th className="text-end font-medium py-2 px-3">{t('after')}</th>
            <th className="text-end font-medium py-2 ps-3">{t('colChange')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.key} className="border-b border-border last:border-0">
              <td className="py-2.5 pe-3 text-text">{t(`metric.${m.key}`)}</td>
              <td dir="ltr" className="py-2.5 px-3 text-end text-text-muted">{formatValue(m.key, m.before, kind)}</td>
              <td dir="ltr" className="py-2.5 px-3 text-end font-semibold text-text">{formatValue(m.key, m.after, kind)}</td>
              <td className="py-2.5 ps-3 text-end">
                <span className="inline-flex items-center gap-2 justify-end">
                  {m.delta != null && <span dir="ltr" className="text-xs text-text-subtle">{formatDelta(m, kind)}</span>}
                  <TrendBadge trend={m.trend} label={t(`trend.${m.trend}`)} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const DiffLists = ({ diff, label }: { diff: ListDiff | null; label: (k: string) => string }) => {
    if (!diff) return <p className="text-sm text-text-muted">{t('notComparable')}</p>;
    const groups: { key: keyof ListDiff; trend: Trend }[] = [
      { key: 'resolved', trend: 'better' }, { key: 'added', trend: 'worse' }, { key: 'remaining', trend: 'stable' },
    ];
    return (
      <div className="grid md:grid-cols-3 gap-4">
        {groups.map(({ key, trend }) => (
          <div key={key} className="rounded-velifa-lg border border-border p-4">
            <div className="mb-2"><TrendBadge trend={trend} label={`${t(key)} (${diff[key].length})`} /></div>
            {diff[key].length === 0
              ? <p className="text-xs text-text-subtle">{t('noneList')}</p>
              : <ul className="space-y-1.5">{diff[key].map((k) => <li key={k} className="text-xs text-text leading-relaxed">{label(k)}</li>)}</ul>}
          </div>
        ))}
      </div>
    );
  };

  const perf = c?.scores.find((s) => s.key === 'performance');

  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-border sticky top-0 z-10 bg-bg/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Zap className="w-5 h-5 text-accent flex-shrink-0" />
            <Link href={`/${locale}`} className="velifa-wordmark text-sm">VELIFA</Link>
            {c && (<>
              <span className="text-muted text-xs">·</span>
              <Globe className="w-4 h-4 text-text-subtle flex-shrink-0" />
              <span dir="ltr" className="text-sm font-medium text-text truncate">{c.urlSite}</span>
            </>)}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text">{t('title')}</h1>
          <p className="text-sm text-text-muted mt-1">{t('subtitle')}</p>
        </div>

        {!c ? (
          <div className="velifa-card text-sm text-text-muted">{t('error', { message: error })}</div>
        ) : (
          <>
            {/* ── Performance avant → après ─────────────────────────────── */}
            <div className="velifa-card">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
                {([['before', c.before, perf?.before], ['after', c.after, perf?.after]] as const).map(([k, a, score], i) => (
                  <div key={k} className="flex items-center gap-6 md:gap-10">
                    {i === 1 && <ArrowRight className="w-6 h-6 text-text-subtle rtl:rotate-180 hidden md:block" />}
                    <div className="text-center">
                      <div className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{t(k)}</div>
                      <div className="text-5xl font-heading font-bold text-text my-2">{score ?? '—'}</div>
                      <div className="text-xs text-text-muted">{t('auditOf', { date: fmtDate(a.createdAt) })}</div>
                      <Link href={`/${locale}/analyse/${a.id}`} className="text-xs text-accent hover:underline">{t('openReport')}</Link>
                    </div>
                  </div>
                ))}
              </div>
              {perf && (
                <div className="flex justify-center mt-5 gap-2 items-center">
                  <span className="text-sm text-text-muted">{t('performance')}</span>
                  {perf.delta != null && <span dir="ltr" className="text-sm font-semibold text-text">{formatDelta(perf, 'score')}</span>}
                  <TrendBadge trend={perf.trend} label={t(`trend.${perf.trend}`)} />
                </div>
              )}
              <p className="text-[11px] text-text-subtle mt-5 pt-3 border-t border-border flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> {t('noiseNote')}
              </p>
            </div>

            <div className="velifa-card">
              <h2 className="font-heading font-semibold text-text mb-4">{t('labTitle')}</h2>
              <MetricTable rows={c.lab} kind="metric" />
            </div>

            {c.field && (
              <div className="velifa-card">
                <h2 className="font-heading font-semibold text-text mb-1">{t('fieldTitle')}</h2>
                <p className="text-xs text-text-muted mb-4">{t('fieldNote')}</p>
                <MetricTable rows={c.field} kind="metric" />
              </div>
            )}

            <div className="velifa-card">
              <h2 className="font-heading font-semibold text-text mb-4">{t('recsTitle')}</h2>
              <DiffLists diff={c.recommendations} label={recTitle} />
            </div>

            <div className="velifa-card">
              <h2 className="font-heading font-semibold text-text mb-4">{t('issuesTitle')}</h2>
              <DiffLists diff={c.siteIssues} label={issueText} />
            </div>

            <div className="velifa-card">
              <h2 className="font-heading font-semibold text-text mb-4">{t('scoresTitle')}</h2>
              <MetricTable rows={c.scores} kind="score" />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
