'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { RefreshCw, ExternalLink, MessageCircle, Mail, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { api } from '@/lib/api';
import { scoreBucket, SCORE_COLOR } from '@/lib/score';
import { PageHeader, Badge, TableShell, Th, Td, SkeletonRows, IconButton, ErrorNote, EmptyState, Skeleton } from '@/components/ui';

const PAGE_SIZE = 50;
const LOCALE_LABEL: Record<string, string> = { ar: 'Arabe', en: 'Anglais', fr: 'Français' };

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

function Score({ value }: { value: number | null | undefined }) {
  return <span className="text-sm font-semibold tabular-nums" style={{ color: SCORE_COLOR[scoreBucket(value)] }}>{value ?? '—'}</span>;
}

function Contact({ l }: { l: any }) {
  return (
    <div className="space-y-1 text-xs">
      {l.name && <p className="font-medium text-text">{l.name}</p>}
      {l.email && (
        <a href={`mailto:${l.email}`} className="flex items-center gap-1.5 text-text-muted hover:text-text" dir="ltr">
          <Mail className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{l.email}</span>
        </a>
      )}
      {l.phone && (
        <a href={`https://wa.me/${l.phone}`} target="_blank" rel="noopener noreferrer" dir="ltr"
          className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--velifa-score-good)' }}>
          <MessageCircle className="h-3 w-3 flex-shrink-0" /> +{l.phone}
        </a>
      )}
    </div>
  );
}

function ReportLink({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le rapport" title="Ouvrir le rapport"
      className="inline-grid h-8 w-8 place-items-center rounded-[8px] text-text-subtle transition-colors hover:bg-[color:var(--surface)] hover:text-text">
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

/** Demandes « Je veux corriger » reçues depuis les rapports. */
export default function AdminLeadsPage() {
  const { getToken } = useAuth();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [page, setPage]       = useState(1);

  const load = useCallback(async (p = page) => {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getLeads(token, { page: String(p), limit: String(PAGE_SIZE) });
      setData(res?.data ?? res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [getToken, page]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page]);

  const leads: any[] = data?.leads ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          eyebrow="Administration"
          title="Demandes"
          description={loading ? 'Chargement…' : `${data?.total ?? 0} demande(s) « Je veux corriger » reçue(s) depuis les rapports`}
          actions={<IconButton icon={RefreshCw} label="Rafraîchir" onClick={() => load()} spinning={loading} />}
        />

        {error && <ErrorNote>{error}</ErrorNote>}

        {!loading && !error && leads.length === 0 ? (
          <EmptyState icon={Inbox} title="Aucune demande pour l’instant" description="Les demandes envoyées depuis le bouton « Je veux corriger » d’un rapport apparaîtront ici." />
        ) : (
          <>
            {/* Mobile : cartes */}
            <div className="space-y-3 md:hidden">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-velifa-lg" />)
                : leads.map((l: any) => (
                  <article key={l.id} className="rounded-velifa-lg border border-border bg-[color:var(--surface)] p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text" dir="ltr">{l.urlSite}</p>
                        <p className="mt-0.5 text-[11px] text-text-subtle">{fmtDate(l.createdAt)}{l.platform ? ` · ${l.platform}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1"><Score value={l.scorePerformance} /><ReportLink url={l.reportUrl} /></div>
                    </div>
                    <Contact l={l} />
                    {l.message && <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-xs leading-relaxed text-text-muted" dir="auto">{l.message}</p>}
                  </article>
                ))}
            </div>

            {/* Ordinateur : tableau */}
            <div className="hidden md:block">
              <TableShell minWidth={980}>
                <thead>
                  <tr>{['Reçue', 'Site', 'Score', 'Contact', 'Message', 'Langue', ''].map((h, i) => <Th key={i}>{h}</Th>)}</tr>
                </thead>
                <tbody>
                  {loading ? <SkeletonRows rows={6} cols={7} /> : leads.map((l: any) => (
                    <tr key={l.id} className="align-top transition-colors hover:bg-[color:var(--surface-raised)]">
                      <Td className="whitespace-nowrap align-top text-xs text-text-muted">{fmtDate(l.createdAt)}</Td>
                      <Td className="max-w-[280px] align-top">
                        <p className="truncate text-xs text-text" dir="ltr">{l.urlSite}</p>
                        {l.platform && <p className="text-[11px] text-text-subtle">{l.platform}</p>}
                      </Td>
                      <Td className="align-top"><Score value={l.scorePerformance} /></Td>
                      <Td className="max-w-[240px] align-top"><Contact l={l} /></Td>
                      <Td className="max-w-[360px] whitespace-pre-wrap align-top text-xs text-text-muted"><span dir="auto">{l.message ?? '—'}</span></Td>
                      <Td className="align-top"><Badge>{LOCALE_LABEL[l.locale] ?? l.locale}</Badge></Td>
                      <Td className="align-top text-end"><ReportLink url={l.reportUrl} /></Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-3">
            <IconButton icon={ChevronLeft} label="Page précédente" disabled={page <= 1} onClick={() => setPage(page - 1)} />
            <span className="text-xs tabular-nums text-text-muted">{page} / {totalPages}</span>
            <IconButton icon={ChevronRight} label="Page suivante" disabled={page >= totalPages} onClick={() => setPage(page + 1)} />
          </div>
        )}
      </div>
    </div>
  );
}
