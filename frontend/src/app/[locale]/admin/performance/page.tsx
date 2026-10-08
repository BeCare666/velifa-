'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { TrendingUp, TrendingDown, Minus, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

const scoreColor = (s: number) =>
  s >= 80 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';

const scoreBg = (s: number) =>
  s >= 80 ? 'rgba(34,197,94,0.10)' : s >= 50 ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

const scoreBorder = (s: number) =>
  s >= 80 ? 'rgba(34,197,94,0.25)' : s >= 50 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)';

const ISSUE_ICONS: Record<string, string> = {
  'LCP lent':               '⏱',
  'Instabilite visuelle':   '📐',
  'Page peu reactive':      '🐢',
  'Problemes SEO':          '🔍',
  'Problemes accessibilite': '♿',
  'Mauvaises pratiques':    '⚠️',
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up')   return <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#22c55e', fontSize: 11 }}><TrendingUp style={{ width: 12, height: 12 }} /> Amelioration</span>;
  if (trend === 'down') return <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#ef4444', fontSize: 11 }}><TrendingDown style={{ width: 12, height: 12 }} /> Degradation</span>;
  return <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}><Minus style={{ width: 12, height: 12 }} /> Stable</span>;
}

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AdminPerformancePage() {
  const { getToken } = useAuth();
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState<'all' | 'critical' | 'average' | 'good'>('all');

  async function load() {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getPerformance(token);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setData(list);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = data.filter(r => {
    if (filter === 'critical') return r.avgScore < 50;
    if (filter === 'average')  return r.avgScore >= 50 && r.avgScore < 80;
    if (filter === 'good')     return r.avgScore >= 80;
    return true;
  });

  const criticalCount = data.filter(r => r.avgScore < 50).length;
  const avgCount      = data.filter(r => r.avgScore >= 50 && r.avgScore < 80).length;
  const goodCount     = data.filter(r => r.avgScore >= 80).length;

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 32px 64px' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Performance des sites</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
              {loading ? '...' : `${data.length} sites analyses — tries du moins performant au plus performant`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => load()} style={{ height: 34, width: 34, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.40)' }}>
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
            <a href={api.admin.exportPerformance()} download
              style={{ height: 34, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
              <Download style={{ width: 13, height: 13 }} /> Exporter CSV
            </a>
          </div>
        </div>

        {/* Summary cards */}
        {!loading && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total sites', value: data.length, color: 'rgba(255,255,255,0.80)' },
              { label: 'Critiques < 50', value: criticalCount, color: '#ef4444' },
              { label: 'A ameliorer 50-79', value: avgCount, color: '#f59e0b' },
              { label: 'Bons >= 80', value: goodCount, color: '#22c55e' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 18px', minWidth: 120 }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { v: 'all',      l: 'Tous' },
            { v: 'critical', l: 'Critiques < 50' },
            { v: 'average',  l: 'A ameliorer 50-79' },
            { v: 'good',     l: 'Bons >= 80' },
          ].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v as any)}
              style={{ height: 34, padding: '0 14px', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                background: filter === f.v ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filter === f.v ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.09)'}`,
                color: filter === f.v ? '#ef4444' : 'rgba(255,255,255,0.50)' }}>
              {f.l}
            </button>
          ))}
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
                {['Rang', 'URL du site', 'Score moyen', 'Nb audits', 'Derniere analyse', 'Problemes detectes', 'Tendance'].map(h => (
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
                          <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: j === 1 ? '70%' : '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.30)', fontSize: 13 }}>
                        Aucun site dans cette categorie
                      </td>
                    </tr>
                  )
                  : filtered.map((r, i) => (
                      <tr key={r.url}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition: 'background 150ms' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'; }}>

                        {/* Rang */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 12, fontWeight: 700,
                            color: i === 0 ? '#ef4444' : i === 1 ? '#f97316' : i === 2 ? '#f59e0b' : 'rgba(255,255,255,0.40)',
                          }}>#{i + 1}</span>
                        </td>

                        {/* URL */}
                        <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.80)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }} title={r.url}>
                            {r.url}
                          </p>
                        </td>

                        {/* Score moyen */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(r.avgScore), background: scoreBg(r.avgScore), border: `1px solid ${scoreBorder(r.avgScore)}`, borderRadius: 7, padding: '3px 10px' }}>
                            {r.avgScore}/100
                          </span>
                        </td>

                        {/* Nb audits */}
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.60)', fontWeight: 600 }}>
                          {r.auditCount}
                        </td>

                        {/* Derniere analyse */}
                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                          {fmtDate(r.lastDate)}
                        </td>

                        {/* Problemes */}
                        <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                          {r.issues.length === 0
                            ? <span style={{ fontSize: 11, color: '#22c55e' }}>Aucun probleme</span>
                            : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {r.issues.map((issue: string) => (
                                  <span key={issue} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#ef4444', whiteSpace: 'nowrap' }}>
                                    {ISSUE_ICONS[issue] ?? '⚠'} {issue}
                                  </span>
                                ))}
                              </div>
                            )
                          }
                        </td>

                        {/* Tendance */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <TrendIcon trend={r.trend} />
                          {r.lastScore != null && r.prevScore != null && (
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '2px 0 0' }}>
                              {r.prevScore} → {r.lastScore}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>

        {!loading && data.length > 0 && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 12, textAlign: 'right' }}>
            {filtered.length} site{filtered.length > 1 ? 's' : ''} affiches sur {data.length}
          </p>
        )}
      </div>
    </div>
  );
}
