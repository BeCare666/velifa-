'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { RefreshCw, ExternalLink, MessageCircle, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

const PAGE_SIZE = 50;

const scoreColor = (s: number) => s >= 90 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const btn = { height: 36, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.60)' } as const;
const cell = { padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.70)', verticalAlign: 'top' } as const;

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

  useEffect(() => { load(); }, [page]);

  const leads = data?.leads ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 32px 64px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Demandes</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
              {loading ? '…' : `${data?.total ?? 0} demande(s) « Je veux corriger » reçue(s) depuis les rapports`}
            </p>
          </div>
          <button type="button" style={{ ...btn, width: 36, padding: 0, justifyContent: 'center' }} onClick={() => load()} aria-label="Rafraîchir">
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '10px 16px', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Reçue', 'Site', 'Score', 'Contact', 'Message', 'Langue', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && leads.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Aucune demande pour l’instant.</td></tr>
              )}
              {leads.map((l: any) => (
                <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ ...cell, whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.45)' }}>{fmtDate(l.createdAt)}</td>
                  <td style={{ ...cell, maxWidth: 280 }}>
                    <div dir="ltr" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.85)' }}>{l.urlSite}</div>
                    {l.platform && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>{l.platform}</div>}
                  </td>
                  <td style={{ ...cell, fontWeight: 700, color: l.scorePerformance != null ? scoreColor(l.scorePerformance) : 'rgba(255,255,255,0.35)' }}>{l.scorePerformance ?? '—'}</td>
                  <td style={cell}>
                    {l.name && <div style={{ color: 'rgba(255,255,255,0.85)' }}>{l.name}</div>}
                    {l.email && (
                      <a href={`mailto:${l.email}`} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#D4AF37', textDecoration: 'none' }}>
                        <Mail style={{ width: 12, height: 12 }} /> {l.email}
                      </a>
                    )}
                    {l.phone && (
                      <a href={`https://wa.me/${l.phone}`} target="_blank" rel="noopener noreferrer" dir="ltr"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#22c55e', textDecoration: 'none' }}>
                        <MessageCircle style={{ width: 12, height: 12 }} /> +{l.phone}
                      </a>
                    )}
                  </td>
                  <td style={{ ...cell, maxWidth: 360, whiteSpace: 'pre-wrap' }} dir="auto">{l.message ?? '—'}</td>
                  <td style={cell}>{l.locale}</td>
                  <td style={cell}>
                    {l.reportUrl && (
                      <a href={l.reportUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37' }} aria-label="Ouvrir le rapport">
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
