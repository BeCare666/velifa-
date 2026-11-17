'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Users, BarChart2, TrendingUp, DollarSign,
  AlertTriangle, Activity, CheckCircle2, Gauge, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { api } from '@/lib/api';
import { PageHeader, Panel, StatCard, ScoreBadge, Skeleton, Badge } from '@/components/ui';
import { displayHost } from '@/lib/score';

// Espace interne au propriétaire : textes en français.
const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDay = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

/** Compteur animé (repris de la version précédente). */
function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (target === prev.current) return;
    const start = prev.current;
    const diff = target - start;
    const startTime = performance.now();
    function step(now: number) {
      const p = Math.min((now - startTime) / duration, 1);
      setVal(Math.round(start + diff * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
      else { prev.current = target; setVal(target); }
    }
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

function CountUp({ value }: { value: number }) {
  return <>{new Intl.NumberFormat('fr-FR').format(useCountUp(value))}</>;
}

const STATUS_TONE: Record<string, 'good' | 'poor' | 'average'> = { completed: 'good', failed: 'poor' };
const STATUS_LABEL: Record<string, string> = { completed: 'Terminé', failed: 'Échoué', processing: 'En cours', pending: 'En attente' };
const PLAN_LABEL: Record<string, string> = { pro: 'Pro', business: 'Business', free: 'Gratuit' };
const PLAN_FILL: Record<string, string> = { business: 'var(--text)', pro: 'var(--text-muted)', free: 'var(--border-strong)' };

const AXIS = { fill: 'var(--text-subtle)', fontSize: 11 };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-velifa-md border border-border bg-[color:var(--surface-raised)] px-3 py-2 text-xs shadow-velifa-md">
      <p className="mb-1 text-text-subtle">{fmtDay(label)}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 text-text">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name} : <strong className="tabular-nums">{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newAudits, setNewAudits] = useState(0);
  const lastTodayRef = useRef<number | null>(null);

  async function load(silent = false) {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const token = await getToken().catch(() => null);
      const [s, a] = await Promise.all([api.admin.getStats(token), api.admin.getActivity(token)]);
      const sd = s?.data ?? s;
      const ad = a?.data ?? a;
      if (lastTodayRef.current !== null && sd.todayAudits > lastTodayRef.current) {
        setNewAudits((prev) => prev + (sd.todayAudits - lastTodayRef.current!));
      }
      lastTodayRef.current = sd.todayAudits;
      setStats(sd);
      setActivity(ad);
    } catch (e: any) { if (!silent) setError(e.message); }
    finally { if (!silent) setLoading(false); }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trends = stats?.trends ?? {};
  const planDist: any[] = stats?.planDistribution ?? [];
  const totalPlan = planDist.reduce((s: number, r: any) => s + Number(r.cnt), 0) || 1;
  const failed = stats?.failedAudits ?? 0;

  return (
    <div className="min-h-screen bg-bg px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <PageHeader
          eyebrow={
            <span className="flex items-center gap-2">
              Administration
              {newAudits > 0 && <Badge tone="average">+{newAudits} nouvel{newAudits > 1 ? 's' : ''} audit{newAudits > 1 ? 's' : ''}</Badge>}
            </span>
          }
          title="Vue générale"
          description="Statistiques en temps réel — actualisation automatique toutes les 60 s."
          actions={
            <button onClick={() => load()} className="velifa-btn velifa-btn--ghost !py-2 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Actualiser
            </button>
          }
        />

        {error && (
          <div className="mb-6 rounded-velifa-md border px-4 py-3 text-sm" style={{ color: 'var(--velifa-score-poor)', borderColor: 'var(--velifa-score-poor)', background: 'var(--velifa-score-poor-bg)' }}>
            {error}
          </div>
        )}

        {/* ── Indicateurs ─────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label="Utilisateurs" value={<CountUp value={stats?.totalUsers ?? 0} />} loading={loading} />
          <StatCard icon={BarChart2} label="Total audits" value={<CountUp value={stats?.totalAudits ?? 0} />} loading={loading}
            trend={trends.weekVsPrevWeek != null ? { delta: trends.weekVsPrevWeek, label: 'vs semaine précédente' } : null} />
          <StatCard icon={Activity} label="Aujourd'hui" value={<CountUp value={stats?.todayAudits ?? 0} />} loading={loading} highlight
            trend={trends.todayVsYesterday != null ? { delta: trends.todayVsYesterday, label: 'vs hier' } : null} />
          <StatCard icon={DollarSign} label="MRR estimé (USD)" value={<CountUp value={stats?.estimatedRevenue ?? 0} />} loading={loading} highlight
            sub={`${stats?.proUsers ?? 0} Pro · ${stats?.businessUsers ?? 0} Business`} />
          <StatCard icon={TrendingUp} label="Abonnés Pro" value={<CountUp value={stats?.proUsers ?? 0} />} loading={loading} />
          <StatCard icon={CheckCircle2} label="Business" value={<CountUp value={stats?.businessUsers ?? 0} />} loading={loading} />
          <StatCard icon={Gauge} label="Score moyen" value={<CountUp value={Math.round(stats?.avgScore ?? 0)} />} loading={loading} sub="/ 100" />
          <StatCard icon={AlertTriangle} label="Échecs" loading={loading}
            value={<span style={{ color: failed > 0 ? 'var(--velifa-score-poor)' : undefined }}><CountUp value={failed} /></span>} />
        </div>

        {/* ── Graphiques ─────────────────────────────────────────────── */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <Panel className="lg:col-span-2" eyebrow="Activité" title="Audits — 30 derniers jours">
            {loading ? <Skeleton className="h-[200px] w-full" /> : (
              <div dir="ltr">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats?.dailyAudits ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gOk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--velifa-score-good)" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="var(--velifa-score-good)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--velifa-score-poor)" stopOpacity={0.16} />
                        <stop offset="95%" stopColor="var(--velifa-score-poor)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={fmtDay} interval="preserveStartEnd" />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
                    <Area dataKey="ok" stroke="var(--velifa-score-good)" strokeWidth={1.75} fill="url(#gOk)" name="Réussis" dot={false} />
                    <Area dataKey="fail" stroke="var(--velifa-score-poor)" strokeWidth={1.75} fill="url(#gFail)" name="Échoués" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Abonnements" title="Répartition des plans">
            {loading ? <Skeleton className="h-[200px] w-full" /> : (
              <div className="flex items-center gap-5">
                <div className="h-[140px] w-[140px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={planDist} dataKey="cnt" nameKey="plan" cx="50%" cy="50%" outerRadius={66} innerRadius={46} strokeWidth={0} paddingAngle={2}>
                        {planDist.map((e: any, i: number) => <Cell key={i} fill={PLAN_FILL[e.plan ?? 'free'] ?? 'var(--border)'} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-2.5">
                  {planDist.map((e: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: PLAN_FILL[e.plan ?? 'free'] ?? 'var(--border)' }} />
                      <span className="flex-1 text-text-muted">{PLAN_LABEL[e.plan ?? 'free'] ?? e.plan}</span>
                      <span className="font-semibold text-text tabular-nums">{e.cnt}</span>
                      <span className="w-10 text-end text-xs text-text-subtle tabular-nums">{Math.round((e.cnt / totalPlan) * 100)} %</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </div>

        {!loading && (stats?.scoresByDay ?? []).length > 0 && (
          <Panel className="mb-6" eyebrow="Qualité" title="Score moyen par jour — 7 derniers jours">
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={stats.scoresByDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={fmtDay} />
                  <YAxis domain={[0, 100]} ticks={[0, 50, 90, 100]} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
                  <Line dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--bg)', stroke: 'var(--accent)', strokeWidth: 2, r: 3 }} name="Score moyen" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}

        {/* ── Activité récente ───────────────────────────────────────── */}
        {!loading && activity && (
          <div className="grid gap-4 lg:grid-cols-5">
            <Panel className="lg:col-span-3" padded={false} title="10 derniers audits">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-start text-[11px] uppercase tracking-[0.12em] text-text-subtle">
                      {['Site', 'Score', 'Date', 'Statut'].map((h) => <th key={h} className="px-5 py-3 text-start font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {(activity.recentAudits ?? []).map((a: any) => (
                      <tr key={a.id} className="transition-colors hover:bg-[color:var(--accent-soft)]">
                        <td className="max-w-[220px] px-5 py-3"><p dir="ltr" className="truncate text-text">{displayHost(a.url)}</p></td>
                        <td className="px-5 py-3"><ScoreBadge score={a.score} /></td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-text-muted">{fmtDate(a.createdAt)}</td>
                        <td className="px-5 py-3"><Badge tone={STATUS_TONE[a.status] ?? 'average'}>{STATUS_LABEL[a.status] ?? a.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel className="lg:col-span-2" padded={false} title="Derniers utilisateurs">
              <ul className="divide-y divide-[color:var(--border)]">
                {(activity.recentUsers ?? []).map((u: any) => (
                  <li key={u.clerkUserId} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[color:var(--accent-soft)]">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-border bg-[color:var(--surface-raised)] text-[10px] font-semibold text-text">
                      {(u.clerkUserId ?? 'U').slice(-2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-text-muted">{u.clerkUserId}</p>
                      <p className="mt-0.5 text-[11px] text-text-subtle">{fmtDate(u.updatedAt)}</p>
                    </div>
                    <Badge>{PLAN_LABEL[u.plan ?? 'free'] ?? u.plan}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
