'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import SubscriberModal from './SubscriberModal';
import { Badge, TableShell, Th, Td, SkeletonRows, Segmented, IconButton, ErrorNote } from '@/components/ui';
import { scoreBucket, SCORE_COLOR } from '@/lib/score';

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[color:var(--surface-raised)] px-2 py-0.5 text-[11px] font-semibold text-text ring-1 ring-inset ring-[color:var(--border-strong)]">
      {plan === 'business' ? 'Business' : 'Pro'}
    </span>
  );
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

  const sortMark = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div className="mb-10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-text">Utilisateurs abonnés</h2>
          <p className="text-xs text-text-muted">{loading ? '…' : `${data.length} abonnés Pro et Business`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            label="Filtrer les abonnés"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Tous' },
              { value: 'pro', label: 'Pro' },
              { value: 'business', label: 'Business' },
              { value: 'suspended', label: 'Suspendus' },
            ]}
          />
          <IconButton icon={RefreshCw} label="Rafraîchir" onClick={load} spinning={loading} />
        </div>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <TableShell minWidth={820}>
        <thead>
          <tr>
            <Th>Utilisateur</Th>
            <Th>Plan</Th>
            <Th>Sites</Th>
            <Th>
              <button type="button" onClick={() => toggleSort('avgScore')} className="uppercase tracking-[0.14em] hover:text-text">
                Score moyen{sortMark('avgScore')}
              </button>
            </Th>
            <Th>
              <button type="button" onClick={() => toggleSort('totalProblems')} className="uppercase tracking-[0.14em] hover:text-text">
                Problèmes{sortMark('totalProblems')}
              </button>
            </Th>
            <Th>Statut</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows rows={4} cols={7} />
          ) : filtered.length === 0 ? (
            <tr><Td className="py-8 text-center text-sm text-text-muted" colSpan={7}>Aucun abonné trouvé.</Td></tr>
          ) : filtered.map((u) => {
            const b = scoreBucket(u.avgScore);
            return (
              <tr key={u.clerkUserId} className="transition-colors hover:bg-[color:var(--surface-raised)]">
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-border bg-[color:var(--bg-subtle)] text-[11px] font-semibold text-text">
                      {(u.email ?? u.clerkUserId ?? '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="max-w-[220px] truncate text-xs text-text" dir="ltr">{u.email ?? u.clerkUserId}</span>
                  </div>
                </Td>
                <Td><PlanBadge plan={u.plan} /></Td>
                <Td className="font-semibold tabular-nums text-text">{u.sitesCount}</Td>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 text-sm font-semibold tabular-nums" style={{ color: SCORE_COLOR[b] }}>{u.avgScore}%</span>
                    <span className="h-1 w-14 overflow-hidden rounded-full bg-[color:var(--surface-raised)]">
                      <span className="block h-full rounded-full" style={{ width: `${u.avgScore}%`, background: SCORE_COLOR[b] }} />
                    </span>
                  </div>
                </Td>
                <Td>
                  {u.totalProblems > 0 ? <Badge tone="poor">{u.totalProblems}</Badge> : <Badge tone="good">0</Badge>}
                </Td>
                <Td>{u.suspended ? <Badge tone="poor">Suspendu</Badge> : <Badge tone="good">Actif</Badge>}</Td>
                <Td className="text-end">
                  <button
                    type="button"
                    onClick={() => setSelected(u)}
                    className="h-8 rounded-[8px] border border-border px-3 text-xs font-medium text-text transition-colors hover:border-[color:var(--border-strong)]"
                  >
                    Détails
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>

      {selected && <SubscriberModal subscriber={selected} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  );
}
