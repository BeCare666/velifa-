'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLocale } from 'next-intl';
import { Search, ChevronLeft, ChevronRight, RefreshCw, ExternalLink, Download, BarChart2, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { scoreBucket, SCORE_COLOR } from '@/lib/score';
import {
  PageHeader, ScoreBadge, Badge, StatCard, TableShell, Th, Td, SkeletonRows, Segmented, IconButton, ErrorNote, EmptyState,
} from '@/components/ui';

const PAGE_SIZE = 20;
type StatusF = 'all' | 'completed' | 'processing' | 'pending' | 'failed';
type ScoreF = 'all' | 'good' | 'average' | 'poor';

const STATUS: Record<string, { label: string; tone: 'good' | 'poor' | 'average' }> = {
  completed:  { label: 'Terminé',    tone: 'good' },
  failed:     { label: 'Échoué',     tone: 'poor' },
  pending:    { label: 'En attente', tone: 'average' },
  processing: { label: 'En cours',   tone: 'average' },
};

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function AdminAuditsPage() {
  const { getToken }  = useAuth();
  const locale        = useLocale();
  const searchParams  = useSearchParams();
  const userFilter    = searchParams.get('user') ?? '';

  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState(userFilter);
  const [statusF, setStatusF] = useState<StatusF>('all');
  const [scoreF, setScoreF]   = useState<ScoreF>('all');

  const load = useCallback(async (p = page, s = search, st: string = statusF, sc: string = scoreF) => {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getAudits(token, { page: String(p), search: s, status: st, score: sc, limit: String(PAGE_SIZE) });
      setData(res?.data ?? res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [getToken, page, search, statusF, scoreF]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, statusF, scoreF]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const audits: any[] = data?.audits ?? [];
  const completed = audits.filter((a) => a.status === 'completed').length;
  const failed    = audits.filter((a) => a.status === 'failed').length;
  const scored    = audits.filter((a) => a.score != null);
  const avgScore  = scored.length ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length) : null;

  return (
    <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          eyebrow="Administration"
          title="Audits"
          description={loading ? 'Chargement…' : `${data?.total ?? 0} audits au total`}
          actions={
            <button
              type="button"
              onClick={async () => {
                try { await api.admin.exportAudits(await getToken()); }
                catch (e: any) { setError(e.message ?? 'Export impossible'); }
              }}
              className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Exporter CSV
            </button>
          }
        />

        {userFilter && (
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-[color:var(--surface)] py-1 pe-1 ps-3 text-xs text-text-muted">
            Utilisateur : <span className="font-mono text-text" dir="ltr">…{userFilter.slice(-12)}</span>
            <a href={`/${locale}/admin/audits`} aria-label="Retirer le filtre" className="grid h-6 w-6 place-items-center rounded-full hover:bg-[color:var(--surface-raised)] hover:text-text">
              <X className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* Indicateurs de la page affichée */}
        <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard icon={BarChart2} label="Sur cette page" value={audits.length} loading={loading} />
          <StatCard label="Terminés" value={<span style={{ color: 'var(--velifa-score-good)' }}>{completed}</span>} loading={loading} />
          <StatCard
            label="Score moyen"
            value={avgScore != null ? <span style={{ color: SCORE_COLOR[scoreBucket(avgScore)] }}>{avgScore}</span> : '—'}
            sub={avgScore != null ? '/ 100' : undefined}
            loading={loading}
          />
          <StatCard label="Échoués" value={<span style={{ color: failed > 0 ? 'var(--velifa-score-poor)' : undefined }}>{failed}</span>} loading={loading} />
        </div>

        {/* Barre d'outils */}
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
          <form
            className="relative w-full xl:max-w-sm xl:flex-1"
            onSubmit={(e) => { e.preventDefault(); setPage(1); load(1, search, statusF, scoreF); }}
          >
            <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="URL ou Clerk ID… (Entrée)"
              dir="ltr"
              className="h-10 w-full rounded-velifa-md border border-border bg-[color:var(--surface)] pe-3 ps-9 text-sm text-text placeholder:text-text-subtle focus:border-[color:var(--border-strong)] focus:outline-none"
            />
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<StatusF>
              label="Filtrer par statut"
              value={statusF}
              onChange={(v) => { setStatusF(v); setPage(1); }}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'completed', label: 'Terminés' },
                { value: 'processing', label: 'En cours' },
                { value: 'pending', label: 'En attente' },
                { value: 'failed', label: 'Échoués' },
              ]}
            />
            <Segmented<ScoreF>
              label="Filtrer par score"
              value={scoreF}
              onChange={(v) => { setScoreF(v); setPage(1); }}
              options={[
                { value: 'all', label: 'Tous scores' },
                { value: 'good', label: '≥ 90' },
                { value: 'average', label: '50–89' },
                { value: 'poor', label: '< 50' },
              ]}
            />
            <IconButton icon={RefreshCw} label="Rafraîchir" onClick={() => load()} spinning={loading} />
          </div>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        {!loading && !error && audits.length === 0 ? (
          <EmptyState icon={BarChart2} title="Aucun audit" description="Aucun audit ne correspond à ces filtres." />
        ) : (
          <TableShell minWidth={860}>
            <thead>
              <tr>{['URL', 'Performance', 'SEO', 'Utilisateur', 'Date', 'Statut', ''].map((h, i) => <Th key={i}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows rows={8} cols={7} /> : audits.map((a: any) => {
                const st = STATUS[a.status];
                return (
                  <tr key={a.id} className="transition-colors hover:bg-[color:var(--surface-raised)]">
                    <Td className="max-w-[280px] truncate text-xs text-text"><span dir="ltr" title={a.url}>{a.url}</span></Td>
                    <Td><ScoreBadge score={a.score} /></Td>
                    <Td><ScoreBadge score={a.scoreSeo} /></Td>
                    <Td className="font-mono text-[11px] text-text-muted">
                      {a.clerkUserId ? (
                        <a href={`/${locale}/admin/users/${a.clerkUserId}`} className="hover:text-text hover:underline" dir="ltr">…{a.clerkUserId.slice(-8)}</a>
                      ) : <span className="font-sans text-text-subtle">Anonyme</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-text-muted">{fmtDate(a.createdAt)}</Td>
                    <Td>{st ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge>{a.status ?? '—'}</Badge>}</Td>
                    <Td className="text-end">
                      <a href={`/${locale}/analyse/${a.id}`} target="_blank" rel="noopener noreferrer" title="Ouvrir le rapport" aria-label="Ouvrir le rapport"
                        className="inline-grid h-8 w-8 place-items-center rounded-[8px] text-text-subtle transition-colors hover:bg-[color:var(--surface)] hover:text-text">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-text-muted tabular-nums">Page {page} / {totalPages} — {data?.total} audits</p>
            <div className="flex gap-2">
              <IconButton icon={ChevronLeft} label="Page précédente" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
              <IconButton icon={ChevronRight} label="Page suivante" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
