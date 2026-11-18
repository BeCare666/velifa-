'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { TrendingUp, TrendingDown, Minus, Download, RefreshCw, Globe, AlertTriangle, Gauge, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import {
  PageHeader, Badge, StatCard, TableShell, Th, Td, SkeletonRows, Segmented, IconButton, ErrorNote, EmptyState,
} from '@/components/ui';

// Seuils de cette page = ceux du backend (GET /admin/performance) : < 50, 50–79, ≥ 80
const scoreColor = (s: number) =>
  s >= 80 ? 'var(--velifa-score-good)' : s >= 50 ? 'var(--velifa-score-average)' : 'var(--velifa-score-poor)';
const scoreBg = (s: number) =>
  s >= 80 ? 'var(--velifa-score-good-bg)' : s >= 50 ? 'var(--velifa-score-average-bg)' : 'var(--velifa-score-poor-bg)';

// Clés = libellés exacts renvoyés par le backend (sans accents)
const ISSUES: Record<string, { icon: string; label: string }> = {
  'LCP lent':                { icon: '⏱', label: 'LCP lent' },
  'Instabilite visuelle':    { icon: '📐', label: 'Instabilité visuelle' },
  'Page peu reactive':       { icon: '🐢', label: 'Page peu réactive' },
  'Problemes SEO':           { icon: '🔍', label: 'Problèmes SEO' },
  'Problemes accessibilite': { icon: '♿', label: 'Problèmes d’accessibilité' },
  'Mauvaises pratiques':     { icon: '⚠️', label: 'Mauvaises pratiques' },
};

type Filter = 'all' | 'critical' | 'average' | 'good';

function Trend({ trend, prev, last }: { trend: 'up' | 'down' | 'stable'; prev?: number | null; last?: number | null }) {
  const cfg = trend === 'up'
    ? { Icon: TrendingUp, label: 'Amélioration', color: 'var(--velifa-score-good)' }
    : trend === 'down'
      ? { Icon: TrendingDown, label: 'Dégradation', color: 'var(--velifa-score-poor)' }
      : { Icon: Minus, label: 'Stable', color: 'var(--text-subtle)' };
  return (
    <div>
      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: cfg.color }}>
        <cfg.Icon className="h-3.5 w-3.5" /> {cfg.label}
      </span>
      {prev != null && last != null && <p className="mt-0.5 text-[11px] tabular-nums text-text-subtle" dir="ltr">{prev} → {last}</p>}
    </div>
  );
}

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AdminPerformancePage() {
  const { getToken } = useAuth();
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState<Filter>('all');

  async function load() {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getPerformance(token);
      setData(Array.isArray(res) ? res : (res?.data ?? []));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const filtered = data.filter((r) => {
    if (filter === 'critical') return r.avgScore < 50;
    if (filter === 'average')  return r.avgScore >= 50 && r.avgScore < 80;
    if (filter === 'good')     return r.avgScore >= 80;
    return true;
  });

  const criticalCount = data.filter((r) => r.avgScore < 50).length;
  const avgCount      = data.filter((r) => r.avgScore >= 50 && r.avgScore < 80).length;
  const goodCount     = data.filter((r) => r.avgScore >= 80).length;

  return (
    <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          eyebrow="Administration"
          title="Performance des sites"
          description={loading ? 'Chargement…' : `${data.length} sites analysés — classés du moins performant au plus performant`}
          actions={
            <>
              <IconButton icon={RefreshCw} label="Rafraîchir" onClick={load} spinning={loading} />
              <button
                type="button"
                onClick={async () => {
                  try { await api.admin.exportPerformance(await getToken()); }
                  catch (e: any) { setError(e.message ?? 'Export impossible'); }
                }}
                className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" /> Exporter CSV
              </button>
            </>
          }
        />

        <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard icon={Globe} label="Total sites" value={data.length} loading={loading} />
          <StatCard icon={AlertTriangle} label="Critiques (< 50)" value={<span style={{ color: 'var(--velifa-score-poor)' }}>{criticalCount}</span>} loading={loading} />
          <StatCard icon={Gauge} label="À améliorer (50–79)" value={<span style={{ color: 'var(--velifa-score-average)' }}>{avgCount}</span>} loading={loading} />
          <StatCard icon={CheckCircle2} label="Bons (≥ 80)" value={<span style={{ color: 'var(--velifa-score-good)' }}>{goodCount}</span>} loading={loading} />
        </div>

        {/* Répartition visuelle */}
        {!loading && data.length > 0 && (
          <div className="mb-6 flex h-2 overflow-hidden rounded-full bg-[color:var(--surface-raised)]" aria-hidden>
            <span style={{ width: `${(criticalCount / data.length) * 100}%`, background: 'var(--velifa-score-poor)' }} />
            <span style={{ width: `${(avgCount / data.length) * 100}%`, background: 'var(--velifa-score-average)' }} />
            <span style={{ width: `${(goodCount / data.length) * 100}%`, background: 'var(--velifa-score-good)' }} />
          </div>
        )}

        <div className="mb-4">
          <Segmented<Filter>
            label="Filtrer par niveau"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Tous' },
              { value: 'critical', label: 'Critiques' },
              { value: 'average', label: 'À améliorer' },
              { value: 'good', label: 'Bons' },
            ]}
          />
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        {!loading && filtered.length === 0 ? (
          <EmptyState icon={Globe} title="Aucun site dans cette catégorie" />
        ) : (
          <TableShell minWidth={980}>
            <thead>
              <tr>{['Rang', 'Site', 'Score moyen', 'Audits', 'Dernière analyse', 'Problèmes détectés', 'Tendance'].map((h) => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows rows={8} cols={7} /> : filtered.map((r, i) => (
                <tr key={r.url} className="transition-colors hover:bg-[color:var(--surface-raised)]">
                  <Td className="text-xs font-semibold tabular-nums text-text-muted">#{i + 1}</Td>
                  <Td className="max-w-[280px] truncate text-xs text-text"><span dir="ltr" title={r.url}>{r.url}</span></Td>
                  <Td>
                    <span className="inline-flex rounded-[7px] px-2.5 py-1 text-xs font-semibold tabular-nums" style={{ color: scoreColor(r.avgScore), background: scoreBg(r.avgScore) }}>
                      {r.avgScore}/100
                    </span>
                  </Td>
                  <Td className="font-semibold tabular-nums text-text">{r.auditCount}</Td>
                  <Td className="whitespace-nowrap text-xs text-text-muted">{fmtDate(r.lastDate)}</Td>
                  <Td className="max-w-[300px]">
                    {r.issues.length === 0 ? (
                      <Badge tone="good">Aucun problème</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.issues.map((issue: string) => (
                          <span key={issue} className="whitespace-nowrap rounded-[6px] border border-border px-1.5 py-0.5 text-[11px] text-text-muted">
                            {ISSUES[issue]?.icon ?? '⚠'} {ISSUES[issue]?.label ?? issue}
                          </span>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap"><Trend trend={r.trend} prev={r.prevScore} last={r.lastScore} /></Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}

        {!loading && data.length > 0 && (
          <p className="mt-3 text-end text-xs text-text-muted tabular-nums">
            {filtered.length} site{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''} sur {data.length}
          </p>
        )}
      </div>
    </div>
  );
}
