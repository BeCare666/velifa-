'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Upload, RefreshCw, ExternalLink, ChevronLeft, ChevronRight, Download, Loader2, FileSpreadsheet, CheckCircle2, Store } from 'lucide-react';
import { api } from '@/lib/api';
import { scoreBucket, SCORE_COLOR } from '@/lib/score';
import { PageHeader, Panel, Badge, TableShell, Th, Td, SkeletonRows, IconButton, ErrorNote, EmptyState } from '@/components/ui';

const PAGE_SIZE = 50;

/** Libellés des problèmes renvoyés par POST /admin/prospects/import. */
const ISSUE_LABEL: Record<string, string> = {
  invalid_url:      'URL invalide ou non autorisée',
  duplicate:        'Doublon dans le fichier',
  phone_invalid:    'Téléphone non reconnu (ligne gardée sans téléphone)',
  too_many_rows:    'Limite de lignes atteinte, lignes suivantes ignorées',
  host_rejected:    'Domaine introuvable ou réseau interne',
  already_imported: 'Déjà importé',
  no_url_column:    'Aucune colonne URL dans l’en-tête',
  empty:            'Fichier vide',
};

const STATUS: Record<string, { label: string; tone: 'good' | 'poor' | 'average' | 'neutral' }> = {
  completed:  { label: 'Terminé',   tone: 'good' },
  failed:     { label: 'Échec',     tone: 'poor' },
  processing: { label: 'En cours',  tone: 'neutral' },
  pending:    { label: 'Programmé', tone: 'average' },
};

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const ghostBtn = 'inline-flex h-10 items-center gap-2 rounded-velifa-md border border-border bg-[color:var(--surface)] px-3.5 text-xs font-medium text-text transition-colors hover:border-[color:var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-50';

export default function AdminProspectsPage() {
  const { getToken } = useAuth();

  const [csv, setCsv]           = useState('');
  const [fileName, setFileName] = useState('');
  const [reportLocale, setReportLocale] = useState<'ar' | 'en' | 'fr'>('ar');
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState<any>(null);

  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [page, setPage]       = useState(1);
  const [batch, setBatch]     = useState('');

  const load = useCallback(async (p = page, b = batch) => {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getProspects(token, { page: String(p), limit: String(PAGE_SIZE), ...(b ? { batch: b } : {}) });
      setData(res?.data ?? res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [getToken, page, batch]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, batch]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setCsv(await file.text());
  };

  const runImport = async () => {
    setImporting(true); setError(''); setResult(null);
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.importProspects(token, csv, reportLocale);
      const r = res?.data ?? res;
      setResult(r);
      setPage(1);
      setBatch(r.batchId);
    } catch (e: any) { setError(e.message ?? 'Import impossible'); }
    finally { setImporting(false); }
  };

  const prospects: any[] = data?.prospects ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          eyebrow="Administration"
          title="Prospects"
          description="Audit en lot : importez un CSV de boutiques, les audits sont lancés un par un à débit limité."
        />

        {/* Import */}
        <Panel title={<span className="inline-flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-text-muted" strokeWidth={1.75} />Importer un fichier</span>} className="mb-6">
          <p className="mb-4 text-xs leading-relaxed text-text-muted">
            Colonnes reconnues (FR/EN/AR) : <b className="text-text">url</b> (obligatoire), nom, téléphone/whatsapp, pays (SA, AE, QA…).
            Sans en-tête : url, nom, téléphone, pays. Séparateur « , » ou « ; ». 500 lignes max.
          </p>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <textarea
              value={csv}
              onChange={(e) => { setCsv(e.target.value); setFileName(''); }}
              placeholder={'url;nom;téléphone;pays\nexemple-boutique.sa;Ma boutique;0501234567;SA'}
              rows={6}
              dir="ltr"
              className="w-full resize-y rounded-velifa-md border border-border bg-[color:var(--bg-subtle)] p-3 font-mono text-xs text-text placeholder:text-text-subtle focus:border-[color:var(--border-strong)] focus:outline-none"
            />
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-velifa-md border border-dashed border-[color:var(--border-strong)] px-4 py-5 text-center text-xs text-text-muted transition-colors hover:bg-[color:var(--surface-raised)]">
                <Upload className="h-5 w-5 text-text" strokeWidth={1.75} />
                <span className="max-w-full truncate font-medium text-text">{fileName || 'Choisir un fichier CSV'}</span>
                <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <select
                value={reportLocale}
                onChange={(e) => setReportLocale(e.target.value as any)}
                aria-label="Langue des rapports"
                className="h-10 rounded-velifa-md border border-border bg-[color:var(--surface)] px-3 text-xs text-text focus:outline-none"
              >
                <option value="ar">Rapports en arabe</option>
                <option value="en">Rapports en anglais</option>
                <option value="fr">Rapports en français</option>
              </select>
              <button type="button" disabled={!csv.trim() || importing} onClick={runImport} className="velifa-btn inline-flex items-center justify-center gap-2 disabled:opacity-50">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {importing ? 'Import…' : 'Importer et programmer'}
              </button>
            </div>
          </div>

          {result && (
            <div className="mt-5 rounded-velifa-md border border-border bg-[color:var(--bg-subtle)] p-4 text-sm text-text">
              <p>
                <b style={{ color: 'var(--velifa-score-good)' }}>{result.queued}</b> audit(s) programmé(s)
                {result.lastAuditAt && <span className="text-text-muted"> — dernier prévu vers {fmtDate(result.lastAuditAt)}</span>}
              </p>
              {result.issues?.length > 0 && (
                <ul className="mt-2 max-h-[180px] list-disc space-y-0.5 overflow-y-auto ps-5 text-xs text-text-muted">
                  {result.issues.map((i: any, k: number) => (
                    <li key={k}>Ligne {i.line} : {ISSUE_LABEL[i.code] ?? i.code}{i.detail ? ` (${i.detail})` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Panel>

        {error && <ErrorNote>{error}</ErrorNote>}

        {/* Liste */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="me-auto text-sm text-text-muted">
            {loading ? 'Chargement…' : `${data?.total ?? 0} prospect(s)`}{batch && ' — dernier import'}
          </span>
          {batch && <button type="button" className={ghostBtn} onClick={() => { setBatch(''); setPage(1); }}>Tous les prospects</button>}
          <button
            type="button"
            className={ghostBtn}
            title="Lien WhatsApp pré-rempli (langue de l’import) pour chaque audit terminé"
            onClick={async () => {
              try { await api.admin.exportProspects(await getToken(), batch || undefined); }
              catch (e: any) { setError(e.message ?? 'Export impossible'); }
            }}
          >
            <Download className="h-3.5 w-3.5" /> Exporter CSV{batch ? ' (dernier import)' : ''}
          </button>
          <IconButton icon={RefreshCw} label="Rafraîchir" onClick={() => load()} spinning={loading} />
        </div>

        {!loading && !error && prospects.length === 0 ? (
          <EmptyState icon={Store} title="Aucun prospect" description="Importez un fichier CSV pour lancer un audit en lot." />
        ) : (
          <TableShell minWidth={1040}>
            <thead>
              <tr>{['Boutique', 'Téléphone', 'Pays', 'Plateforme', 'Score', 'Points Golfe', 'Statut', 'Importé', ''].map((h, i) => <Th key={i}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows rows={8} cols={9} /> : prospects.map((p: any) => {
                const st = STATUS[p.status ?? ''];
                return (
                  <tr key={p.id} className="transition-colors hover:bg-[color:var(--surface-raised)]">
                    <Td className="max-w-[320px]">
                      <p className="truncate text-xs text-text" dir="ltr">{p.urlSite}</p>
                      {p.name && <p className="truncate text-[11px] text-text-muted">{p.name}</p>}
                    </Td>
                    <Td className="whitespace-nowrap text-xs tabular-nums text-text-muted"><span dir="ltr">{p.phone ? `+${p.phone}` : '—'}</span></Td>
                    <Td className="text-xs text-text-muted">{p.country ?? '—'}</Td>
                    <Td className="text-xs text-text-muted">{p.platform ?? '—'}</Td>
                    <Td className="text-sm font-semibold tabular-nums">
                      <span style={{ color: SCORE_COLOR[scoreBucket(p.scorePerformance)] }}>{p.scorePerformance ?? '—'}</span>
                    </Td>
                    <Td className="text-xs text-text-muted">
                      {p.siteChecks ? (p.siteChecks.blocked ? <Badge tone="poor">Page bloquée</Badge> : p.siteChecks.issues?.length ?? 0) : '—'}
                    </Td>
                    <Td>
                      <span title={p.errorMessage ?? undefined}>
                        {st ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge>{p.status ?? '—'}</Badge>}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-text-muted">{fmtDate(p.createdAt)}</Td>
                    <Td className="text-end">
                      {p.status === 'completed' && p.reportUrl && (
                        <a href={p.reportUrl} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le rapport" title="Ouvrir le rapport"
                          className="inline-grid h-8 w-8 place-items-center rounded-[8px] text-text-subtle transition-colors hover:bg-[color:var(--surface)] hover:text-text">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
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
