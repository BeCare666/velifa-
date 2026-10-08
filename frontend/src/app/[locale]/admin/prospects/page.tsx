'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Upload, RefreshCw, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

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

const scoreColor = (s: number) => s >= 90 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';

function StatusBadge({ status }: { status: string | null }) {
  const cfg: Record<string, { color: string; bg: string; label: string }> = {
    completed:  { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  label: 'terminé' },
    failed:     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  label: 'échec' },
    processing: { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)', label: 'en cours' },
    pending:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'programmé' },
  };
  const c = cfg[status ?? ''] ?? { color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.05)', label: status ?? '—' };
  return <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '2px 8px', color: c.color, background: c.bg }}>{c.label}</span>;
}

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const box = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 } as const;
const btn = { height: 36, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.60)' } as const;

export default function AdminProspectsPage() {
  const { getToken } = useAuth();

  const [csv, setCsv]           = useState('');
  const [fileName, setFileName] = useState('');
  const [locale, setLocale]     = useState<'ar' | 'en' | 'fr'>('ar');
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
      const res = await api.admin.importProspects(token, csv, locale);
      const r = res?.data ?? res;
      setResult(r);
      setPage(1);
      setBatch(r.batchId);
    } catch (e: any) { setError(e.message ?? 'Import impossible'); }
    finally { setImporting(false); }
  };

  const prospects = data?.prospects ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 32px 64px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Prospects</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4, marginBottom: 24 }}>
          Audit en lot : importez un CSV de boutiques, les audits sont lancés un par un à débit limité.
        </p>

        {/* Import */}
        <div style={{ ...box, padding: 20, marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '0 0 12px', lineHeight: 1.6 }}>
            Colonnes reconnues (FR/EN/AR) : <b>url</b> (obligatoire), nom, téléphone/whatsapp, pays (SA, AE, QA…).
            Sans en-tête : url, nom, téléphone, pays. Séparateur « , » ou « ; ». 500 lignes max.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ ...btn, color: '#D4AF37', borderColor: 'rgba(212,175,55,0.30)' }}>
              <Upload style={{ width: 13, height: 13 }} /> {fileName || 'Choisir un fichier CSV'}
              <input type="file" accept=".csv,text/csv,text/plain" style={{ display: 'none' }}
                onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <select value={locale} onChange={(e) => setLocale(e.target.value as any)}
              style={{ ...btn, appearance: 'auto' }} aria-label="Langue des rapports">
              <option value="ar">Rapports en arabe</option>
              <option value="en">Rapports en anglais</option>
              <option value="fr">Rapports en français</option>
            </select>
            <button type="button" disabled={!csv.trim() || importing} onClick={runImport}
              style={{ ...btn, background: 'rgba(212,175,55,0.12)', borderColor: 'rgba(212,175,55,0.35)', color: '#D4AF37', opacity: !csv.trim() || importing ? 0.5 : 1 }}>
              {importing ? 'Import…' : 'Importer et programmer les audits'}
            </button>
          </div>
          <textarea value={csv} onChange={(e) => { setCsv(e.target.value); setFileName(''); }}
            placeholder={'url;nom;téléphone;pays\nexemple-boutique.sa;Ma boutique;0501234567;SA'}
            rows={5} dir="ltr"
            style={{ width: '100%', marginTop: 12, padding: 10, boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, color: 'rgba(255,255,255,0.80)', fontSize: 12, fontFamily: 'monospace' }} />

          {result && (
            <div style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
              <p style={{ margin: 0 }}>
                <b style={{ color: '#22c55e' }}>{result.queued}</b> audit(s) programmé(s)
                {result.lastAuditAt && <> — dernier prévu vers {fmtDate(result.lastAuditAt)}</>}
              </p>
              {result.issues?.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: 'rgba(255,255,255,0.55)', maxHeight: 180, overflowY: 'auto' }}>
                  {result.issues.map((i: any, k: number) => (
                    <li key={k}>Ligne {i.line} : {ISSUE_LABEL[i.code] ?? i.code}{i.detail ? ` (${i.detail})` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '10px 16px', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Liste */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            {loading ? '…' : `${data?.total ?? 0} prospect(s)`}{batch && ' — dernier import'}
          </span>
          {batch && <button type="button" style={btn} onClick={() => { setBatch(''); setPage(1); }}>Tous les prospects</button>}
          <button type="button" style={{ ...btn, width: 36, padding: 0, justifyContent: 'center' }} onClick={() => load()} aria-label="Rafraîchir">
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div style={{ ...box, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Boutique', 'Téléphone', 'Pays', 'Plateforme', 'Score', 'Points Golfe', 'Statut', 'Importé', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && prospects.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Aucun prospect.</td></tr>
              )}
              {prospects.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.80)', maxWidth: 320 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="ltr">{p.urlSite}</div>
                    {p.name && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>{p.name}</div>}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.60)' }} dir="ltr">{p.phone ? `+${p.phone}` : '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.60)' }}>{p.country ?? '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.60)' }}>{p.platform ?? '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: p.scorePerformance != null ? scoreColor(p.scorePerformance) : 'rgba(255,255,255,0.35)' }}>
                    {p.scorePerformance ?? '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.60)' }}>
                    {p.siteChecks ? (p.siteChecks.blocked ? 'page bloquée' : p.siteChecks.issues?.length ?? 0) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }} title={p.errorMessage ?? undefined}><StatusBadge status={p.status} /></td>
                  <td style={{ padding: '10px 16px', fontSize: 11, color: 'rgba(255,255,255,0.40)', whiteSpace: 'nowrap' }}>{fmtDate(p.createdAt)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    {p.status === 'completed' && p.reportUrl && (
                      <a href={p.reportUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37' }} aria-label="Ouvrir le rapport">
                        <ExternalLink style={{ width: 14, height: 14 }} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', marginTop: 12 }}>
            <button type="button" style={btn} disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Page précédente"><ChevronLeft style={{ width: 14, height: 14 }} /></button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{page} / {totalPages}</span>
            <button type="button" style={btn} disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Page suivante"><ChevronRight style={{ width: 14, height: 14 }} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
