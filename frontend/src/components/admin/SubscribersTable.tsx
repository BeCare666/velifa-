'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import SubscriberModal from './SubscriberModal';

function scoreColor(score: number) {
  if (score >= 80) return 'var(--velifa-score-good)';
  if (score >= 50) return 'var(--velifa-score-average)';
  return 'var(--velifa-score-poor)';
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'business') return <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)', background: 'rgb(var(--accent-rgb)/0.10)', borderRadius: 99, padding: '3px 8px' }}>Business</span>;
  return <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'rgb(var(--accent-rgb)/0.12)', borderRadius: 99, padding: '3px 8px' }}>Pro</span>;
}

type SortKey = 'avgScore' | 'totalProblems' | null;

export default function SubscribersTable() {
  const { getToken } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pro' | 'business' | 'suspended'>('all');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<any>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getSubscribers(token);
      setData(res?.data ?? res ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let rows = [...data];
    if (filter === 'pro') rows = rows.filter(r => r.plan === 'pro');
    else if (filter === 'business') rows = rows.filter(r => r.plan === 'business');
    else if (filter === 'suspended') rows = rows.filter(r => r.suspended);

    if (sortKey) {
      rows.sort((a, b) => {
        const diff = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
        return sortDir === 'asc' ? diff : -diff;
      });
    }
    return rows;
  }, [data, filter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgb(var(--accent-rgb)/0.85)', margin: 0 }}>Utilisateurs abonnés</h2>
        <button onClick={load} style={{ height: 32, width: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgb(var(--accent-rgb)/0.04)', border: '1px solid rgb(var(--accent-rgb)/0.09)', color: 'rgb(var(--accent-rgb)/0.40)' }}>
          <RefreshCw style={{ width: 13, height: 13 }} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {([['all', 'Tous'], ['pro', 'Pro'], ['business', 'Business'], ['suspended', 'Suspendus']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ height: 32, padding: '0 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: filter === key ? 'rgb(var(--accent-rgb)/0.12)' : 'rgb(var(--accent-rgb)/0.04)', border: `1px solid ${filter === key ? 'rgb(var(--accent-rgb)/0.30)' : 'rgb(var(--accent-rgb)/0.09)'}`, color: filter === key ? 'var(--accent)' : 'rgb(var(--accent-rgb)/0.55)' }}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '10px 16px', color: 'var(--velifa-score-poor)', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ background: 'rgb(var(--accent-rgb)/0.02)', border: '1px solid rgb(var(--accent-rgb)/0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgb(var(--accent-rgb)/0.07)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgb(var(--accent-rgb)/0.28)', textTransform: 'uppercase' }}>Utilisateur</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgb(var(--accent-rgb)/0.28)', textTransform: 'uppercase' }}>Plan</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgb(var(--accent-rgb)/0.28)', textTransform: 'uppercase' }}>Sites</th>
              <th onClick={() => toggleSort('avgScore')} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgb(var(--accent-rgb)/0.28)', textTransform: 'uppercase', cursor: 'pointer' }}>
                Score moyen {sortKey === 'avgScore' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => toggleSort('totalProblems')} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgb(var(--accent-rgb)/0.28)', textTransform: 'uppercase', cursor: 'pointer' }}>
                Problèmes {sortKey === 'totalProblems' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgb(var(--accent-rgb)/0.28)', textTransform: 'uppercase' }}>Statut</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgb(var(--accent-rgb)/0.28)', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgb(var(--accent-rgb)/0.04)' }}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} style={{ padding: '14px 16px' }}>
                      <div style={{ height: 14, borderRadius: 4, background: 'rgb(var(--accent-rgb)/0.06)', width: j === 0 ? '70%' : '50%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'rgb(var(--accent-rgb)/0.35)' }}>Aucun abonné trouvé.</td></tr>
            ) : filtered.map((u, i) => (
              <tr key={u.clerkUserId} style={{ borderBottom: '1px solid rgb(var(--accent-rgb)/0.04)', background: i % 2 === 0 ? 'transparent' : 'rgb(var(--accent-rgb)/0.01)', transition: 'background 150ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgb(var(--accent-rgb)/0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? 'transparent' : 'rgb(var(--accent-rgb)/0.01)'; }}>

                <td style={{ padding: '11px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgb(var(--accent-rgb)/0.12)', border: '1px solid rgb(var(--accent-rgb)/0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                      {(u.email ?? u.clerkUserId ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, color: 'rgb(var(--accent-rgb)/0.65)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email ?? u.clerkUserId}
                    </span>
                  </div>
                </td>

                <td style={{ padding: '11px 16px' }}><PlanBadge plan={u.plan} /></td>

                <td style={{ padding: '11px 16px', fontSize: 13, color: 'rgb(var(--accent-rgb)/0.60)', fontWeight: 600 }}>{u.sitesCount}</td>

                <td style={{ padding: '11px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(u.avgScore) }}>{u.avgScore}%</span>
                    <div style={{ width: 50, height: 4, borderRadius: 2, background: 'rgb(var(--accent-rgb)/0.06)', overflow: 'hidden' }}>
                      <div style={{ width: `${u.avgScore}%`, height: '100%', background: scoreColor(u.avgScore) }} />
                    </div>
                  </div>
                </td>

                <td style={{ padding: '11px 16px' }}>
                  {u.totalProblems > 0 ? (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.10)', color: 'var(--velifa-score-poor)' }}>{u.totalProblems}</span>
                  ) : (
                    <span style={{ fontSize: 10, color: 'var(--velifa-score-good)' }}>0</span>
                  )}
                </td>

                <td style={{ padding: '11px 16px' }}>
                  {u.suspended ? (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.10)', color: 'var(--velifa-score-poor)' }}>Suspendu</span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(34,197,94,0.10)', color: 'var(--velifa-score-good)' }}>Actif</span>
                  )}
                </td>

                <td style={{ padding: '11px 16px' }}>
                  <button onClick={() => setSelected(u)}
                    style={{ height: 28, padding: '0 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgb(var(--accent-rgb)/0.10)', border: '1px solid rgb(var(--accent-rgb)/0.25)', color: 'var(--accent)' }}>
                    Détails
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <SubscriberModal subscriber={selected} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  );
}
