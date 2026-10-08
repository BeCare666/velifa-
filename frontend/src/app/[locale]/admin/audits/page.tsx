'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Search, ChevronLeft, ChevronRight, RefreshCw, ExternalLink, Download } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

const scoreColor = (s: number) => s >= 90 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';

function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const c = scoreColor(s);
  return <span style={{ fontSize: 12, fontWeight: 700, color: c, background: `${c}18`, border: `1px solid ${c}35`, borderRadius: 6, padding: '2px 8px' }}>{score ?? '—'}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string }> = {
    completed: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
    failed:    { color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
    pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  };
  const { color, bg } = cfg[status] ?? { color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.05)' };
  return <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '2px 8px', color, background: bg }}>{status}</span>;
}

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function AdminAuditsPage() {
  const { getToken }  = useAuth();
  const searchParams  = useSearchParams();
  const userFilter    = searchParams.get('user') ?? '';

  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState(userFilter);
  const [statusF, setStatusF] = useState('all');
  const [scoreF, setScoreF]   = useState('all');

  const load = useCallback(async (p = page, s = search, st = statusF, sc = scoreF) => {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getAudits(token, { page: String(p), search: s, status: st, score: sc, limit: '20' });
      setData(res?.data ?? res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [getToken, page, search, statusF, scoreF]);

  useEffect(() => { load(); }, [page, statusF, scoreF]);

  const totalPages = data ? Math.ceil(data.total / 20) : 1;
  const audits = data?.audits ?? [];
  const completed = audits.filter((a: any) => a.status === 'completed').length;
  const failed    = audits.filter((a: any) => a.status === 'failed').length;
  const avgScore  = audits.filter((a: any) => a.score).length
    ? Math.round(audits.filter((a: any) => a.score).reduce((s: number, a: any) => s + a.score, 0) / audits.filter((a: any) => a.score).length)
    : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 32px 64px' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Audits</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
              {loading ? '...' : `${data?.total ?? 0} audits au total`}
              {userFilter && <span style={{ marginLeft: 8, color: '#D4AF37', fontSize: 11 }}>filtre: {userFilter.slice(-12)}</span>}
            </p>
          </div>
          <a href={api.admin.exportAudits()} download
            style={{ height: 34, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
            <Download style={{ width: 13, height: 13 }} /> Exporter CSV
          </a>
        </div>

        {/* Stats rapides */}
        {!loading && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Cette page',  value: audits.length },
              { label: 'Completes',   value: completed, color: '#22c55e' },
              { label: 'Score moyen', value: avgScore ? `${avgScore}/100` : '—', color: avgScore >= 80 ? '#22c55e' : avgScore >= 50 ? '#f59e0b' : '#ef4444' },
              { label: 'Echoues',     value: failed, color: failed > 0 ? '#ef4444' : undefined },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 18px', minWidth: 120 }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{s.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: (s as any).color ?? 'rgba(255,255,255,0.85)', margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'rgba(255,255,255,0.30)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(1, search, statusF, scoreF); } }}
              placeholder="Rechercher par URL ou Clerk ID..."
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 36, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, color: 'rgba(255,255,255,0.80)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {['all', 'completed', 'failed', 'pending'].map(s => (
            <button key={s} onClick={() => { setStatusF(s); setPage(1); }}
              style={{ height: 36, padding: '0 14px', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: statusF === s ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${statusF === s ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.09)'}`, color: statusF === s ? '#ef4444' : 'rgba(255,255,255,0.50)' }}>
              {s === 'all' ? 'Tous' : s}
            </button>
          ))}
          {[{ v: 'all', l: 'Tous scores' }, { v: 'good', l: '>= 90' }, { v: 'average', l: '50-89' }, { v: 'poor', l: '< 50' }].map(s => (
            <button key={s.v} onClick={() => { setScoreF(s.v); setPage(1); }}
              style={{ height: 36, padding: '0 14px', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: scoreF === s.v ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.04)', border: `1px solid ${scoreF === s.v ? 'rgba(212,175,55,0.28)' : 'rgba(255,255,255,0.09)'}`, color: scoreF === s.v ? '#D4AF37' : 'rgba(255,255,255,0.50)' }}>
              {s.l}
            </button>
          ))}
          <button onClick={() => load()} style={{ height: 36, width: 36, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.40)' }}>
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '10px 16px', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['URL', 'Score', 'SEO', 'Utilisateur', 'Date', 'Statut', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} style={{ padding: '14px 16px' }}>
                          <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: j === 0 ? '80%' : '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : audits.map((a: any, i: number) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition: 'background 150ms' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'; }}>
                      <td style={{ padding: '11px 16px', maxWidth: 220 }}>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{a.url}</p>
                      </td>
                      <td style={{ padding: '11px 16px' }}><ScoreBadge score={a.score} /></td>
                      <td style={{ padding: '11px 16px' }}><ScoreBadge score={a.scoreSeo} /></td>
                      <td style={{ padding: '11px 16px', fontSize: 11, color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>
                        {a.clerkUserId ? a.clerkUserId.slice(-8) : '—'}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{fmtDate(a.createdAt)}</td>
                      <td style={{ padding: '11px 16px' }}><StatusBadge status={a.status ?? 'unknown'} /></td>
                      <td style={{ padding: '11px 16px' }}>
                        <a href={`/analyse/${a.id}`} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', color: 'rgba(255,255,255,0.28)', textDecoration: 'none', transition: 'color 150ms' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#D4AF37'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.28)'; }}>
                          <ExternalLink style={{ width: 12, height: 12 }} />
                        </a>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Page {page} / {totalPages} — {data?.total} audits</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                style={{ height: 32, width: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: page <= 1 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                style={{ height: 32, width: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: page >= totalPages ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
