'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronLeft, BarChart2, Ban, CheckCircle2, Loader2, Globe, UserX } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import {
  ScoreBadge, Panel, StatCard, Badge, Skeleton, EmptyState, TableShell, Th, Td, ErrorNote, ConfirmDialog,
} from '@/components/ui';
import { ToastContainer, toast } from '@/components/admin/AdminToast';

const scoreColor = (s: number) =>
  s >= 80 ? 'var(--velifa-score-good)' : s >= 50 ? 'var(--velifa-score-average)' : 'var(--velifa-score-poor)';

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDay = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

const STATUS: Record<string, { label: string; tone: 'good' | 'poor' | 'average' }> = {
  completed:  { label: 'Terminé',  tone: 'good' },
  failed:     { label: 'Échoué',   tone: 'poor' },
  pending:    { label: 'En attente', tone: 'average' },
  processing: { label: 'En cours', tone: 'average' },
};

function PlanBadge({ plan }: { plan: string | null }) {
  const p = plan ?? 'free';
  if (p === 'free') return <Badge>Gratuit</Badge>;
  return (
    <span className="inline-flex items-center rounded-full bg-[color:var(--surface-raised)] px-2 py-0.5 text-[11px] font-semibold text-text ring-1 ring-inset ring-[color:var(--border-strong)]">
      {p === 'business' ? 'Business' : 'Pro'}
    </span>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-border bg-[color:var(--surface-raised)] px-3 py-2 text-xs shadow-velifa-md">
      <p className="mb-1 text-text-muted">{fmtDay(label)}</p>
      <p className="text-text">Score : <strong className="tabular-nums">{payload[0]?.value}</strong></p>
    </div>
  );
};

export default function UserDetailPage() {
  const { clerkId } = useParams<{ clerkId: string }>();
  const { getToken } = useAuth();
  const locale = useLocale();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [askSuspend, setAskSuspend] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getUserDetails(token, clerkId);
      setData(res?.data ?? res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [clerkId]);

  async function handleSuspend() {
    setAskSuspend(false);
    setActionLoading(true);
    try {
      const token = await getToken();
      if (!token) { toast('Session expirée, reconnectez-vous', 'error'); return; }
      await api.admin.suspendUser(token, clerkId);
      toast('Compte suspendu', 'success');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setActionLoading(false); }
  }

  async function handleUnsuspend() {
    setActionLoading(true);
    try {
      const token = await getToken();
      if (!token) { toast('Session expirée, reconnectez-vous', 'error'); return; }
      await api.admin.unsuspendUser(token, clerkId);
      toast('Compte réactivé', 'success');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setActionLoading(false); }
  }

  const user   = data?.user;
  const stats  = data?.stats;
  const sites  = data?.sites ?? [];
  const audits = data?.recentAudits ?? [];
  const history = data?.scoreHistory ?? [];

  return (
    <>
      <ToastContainer />
      {askSuspend && (
        <ConfirmDialog
          message="Suspendre ce compte ? L'utilisateur ne pourra plus lancer d'audits."
          confirmLabel="Suspendre" cancelLabel="Annuler"
          onConfirm={handleSuspend} onCancel={() => setAskSuspend(false)}
        />
      )}
      <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <Link href={`/${locale}/admin/users`} className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text">
            <ChevronLeft className="h-3.5 w-3.5 rtl:-scale-x-100" /> Retour aux utilisateurs
          </Link>

          {error && <ErrorNote>{error}</ErrorNote>}

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-velifa-lg" />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-velifa-lg" />)}</div>
              <Skeleton className="h-64 w-full rounded-velifa-lg" />
            </div>
          ) : user ? (
            <div className="space-y-5">
              {/* En-tête utilisateur */}
              <section className="flex flex-col gap-5 rounded-velifa-xl border border-border bg-[color:var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-full border border-border bg-[color:var(--bg-subtle)] font-heading text-lg font-semibold text-text">
                    {clerkId.slice(-2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-mono text-sm font-semibold text-text" dir="ltr">{clerkId}</p>
                      {user.suspended && <Badge tone="poor">Suspendu</Badge>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <PlanBadge plan={user.plan} />
                      <span className="text-xs text-text-muted">Dernière activité : {fmtDate(user.updatedAt)}</span>
                      {user.suspended && user.suspendedAt && (
                        <span className="text-xs score-poor">Suspendu le {fmtDate(user.suspendedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/${locale}/admin/audits?user=${clerkId}`} className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" /> Voir audits
                  </Link>
                  {user.suspended ? (
                    <button type="button" onClick={handleUnsuspend} disabled={actionLoading}
                      className="inline-flex h-10 items-center gap-2 rounded-velifa-md px-4 text-sm font-semibold disabled:opacity-50"
                      style={{ color: 'var(--velifa-score-good)', background: 'var(--velifa-score-good-bg)' }}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Réactiver
                    </button>
                  ) : (
                    <button type="button" onClick={() => setAskSuspend(true)} disabled={actionLoading}
                      className="inline-flex h-10 items-center gap-2 rounded-velifa-md px-4 text-sm font-semibold disabled:opacity-50"
                      style={{ color: 'var(--velifa-score-poor)', background: 'var(--velifa-score-poor-bg)' }}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Suspendre
                    </button>
                  )}
                </div>
              </section>

              {/* Indicateurs */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <StatCard label="Total audits" value={stats?.totalAudits ?? 0} />
                <StatCard label="Réussis" value={<span style={{ color: 'var(--velifa-score-good)' }}>{stats?.completedAudits ?? 0}</span>} />
                <StatCard label="Échoués" value={<span style={{ color: (stats?.failedAudits ?? 0) > 0 ? 'var(--velifa-score-poor)' : undefined }}>{stats?.failedAudits ?? 0}</span>} />
                <StatCard label="Score moyen" value={stats?.avgScore ? <span style={{ color: scoreColor(stats.avgScore) }}>{stats.avgScore}</span> : '—'} sub={stats?.avgScore ? '/ 100' : undefined} />
                <StatCard label="Sites analysés" value={sites.length} />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Panel title="Sites analysés" padded={false}>
                  {sites.length === 0 ? (
                    <div className="p-5"><EmptyState icon={Globe} title="Aucun site analysé" /></div>
                  ) : (
                    <ul className="divide-y divide-[color:var(--border)]">
                      {sites.slice(0, 10).map((site: any) => (
                        <li key={site.url} className="flex items-center gap-3 px-5 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-text" title={site.url} dir="ltr">{site.url}</p>
                            <p className="mt-0.5 text-[11px] text-text-subtle">
                              {site.count} audit{site.count > 1 ? 's' : ''} — dernière fois le {fmtDate(site.lastDate)}
                            </p>
                          </div>
                          <ScoreBadge score={site.avgScore} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title="Évolution des scores (30 j)">
                  {history.length < 2 ? (
                    <EmptyState title="Pas assez de données" description="Au moins deux audits sont nécessaires pour tracer une évolution." />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: 'var(--text-subtle)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtDay} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-subtle)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
                        <Line dataKey="score" stroke="var(--text)" strokeWidth={2} dot={{ fill: 'var(--text)', r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Panel>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-text">Historique des audits</h2>
                {audits.length === 0 ? (
                  <EmptyState title="Aucun audit" />
                ) : (
                  <TableShell minWidth={640}>
                    <thead>
                      <tr>{['URL', 'Score', 'SEO', 'Statut', 'Date'].map((h) => <Th key={h}>{h}</Th>)}</tr>
                    </thead>
                    <tbody>
                      {audits.map((a: any) => {
                        const st = STATUS[a.status];
                        return (
                          <tr key={a.id} className="transition-colors hover:bg-[color:var(--surface-raised)]">
                            <Td className="max-w-[260px] truncate text-xs text-text"><span dir="ltr">{a.url}</span></Td>
                            <Td><ScoreBadge score={a.score} /></Td>
                            <Td><ScoreBadge score={a.scoreSeo} /></Td>
                            <Td>{st ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge>{a.status}</Badge>}</Td>
                            <Td className="whitespace-nowrap text-xs text-text-muted">{fmtDate(a.createdAt)}</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </TableShell>
                )}
              </div>
            </div>
          ) : (
            <EmptyState icon={UserX} title="Utilisateur introuvable" />
          )}
        </div>
      </div>
    </>
  );
}
