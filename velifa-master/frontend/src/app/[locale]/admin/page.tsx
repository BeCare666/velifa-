'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Users, BarChart2, TrendingUp, DollarSign,
  AlertTriangle, Activity, CheckCircle2, ArrowUpRight,
  TrendingDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { api } from '@/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDay = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
const scoreColor = (s: number) =>
  s >= 90 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';

// ── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (target === prev.current) return;
    const start = prev.current;
    const diff  = target - start;
    const startTime = performance.now();
    function step(now: number) {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + diff * ease));
      if (p < 1) requestAnimationFrame(step);
      else { prev.current = target; setVal(target); }
    }
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ w = '100%', h = 20, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />;
}

// ── Trend indicator ───────────────────────────────────────────────────────────
function Trend({ delta, label }: { delta: number; label: string }) {
  if (delta === 0) return <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>= {label}</span>;
  const up = delta > 0;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: up ? '#22c55e' : '#ef4444' }}>
      {up ? <TrendingUp style={{ width: 10, height: 10 }} /> : <TrendingDown style={{ width: 10, height: 10 }} />}
      {up ? '+' : ''}{delta} {label}
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, trend, trendLabel, icon: Icon, loading, accent = false, red = false }: {
  label: string; value: number; sub?: string; trend?: number; trendLabel?: string;
  icon: React.ElementType; loading?: boolean; accent?: boolean; red?: boolean;
}) {
  const displayed = useCountUp(loading ? 0 : value);
  const color  = red ? '#ef4444' : accent ? '#D4AF37' : 'rgba(255,255,255,0.45)';
  const bg     = red ? 'rgba(239,68,68,0.07)' : accent ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.03)';
  const border = red ? 'rgba(239,68,68,0.18)' : accent ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.07)';
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px', transition: 'border-color 150ms' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = red ? 'rgba(239,68,68,0.35)' : accent ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.14)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = border; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon style={{ width: 14, height: 14, color, flexShrink: 0 }} strokeWidth={1.75} />
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      </div>
      {loading
        ? <Sk h={28} w="60%" />
        : <p style={{ fontSize: 26, fontWeight: 700, color: red ? '#ef4444' : accent ? '#D4AF37' : 'rgba(255,255,255,0.88)', lineHeight: 1, margin: 0 }}>
            {displayed}
          </p>
      }
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        {sub && !loading && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: 0 }}>{sub}</p>}
        {trend !== undefined && trendLabel && !loading && (
          <Trend delta={trend} label={trendLabel} />
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const c = scoreColor(s);
  return <span style={{ fontSize: 12, fontWeight: 700, color: c, background: `${c}18`, border: `1px solid ${c}35`, borderRadius: 6, padding: '2px 8px' }}>{score ?? '—'}</span>;
}

function PlanBadge({ plan }: { plan: string | null }) {
  const p = plan ?? 'free';
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    pro:      { label: 'Pro',      color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
    business: { label: 'Business', color: '#a8a8a8', bg: 'rgba(168,168,168,0.10)' },
    free:     { label: 'Gratuit',  color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.05)' },
  };
  const { label, color, bg } = cfg[p] ?? cfg.free;
  return <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, borderRadius: 99, padding: '3px 8px', whiteSpace: 'nowrap' }}>{label}</span>;
}

const PIE_COLORS: Record<string, string> = { pro: '#D4AF37', business: '#a8a8a8', free: '#2a2a2a', null: '#2a2a2a' };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 6, margin: '0 0 6px' }}>{fmtDay(label)}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function AdminOverviewPage() {
  const { getToken } = useAuth();
  const [stats, setStats]         = useState<any>(null);
  const [activity, setActivity]   = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  // Polling badge
  const [newAudits, setNewAudits] = useState(0);
  const lastTodayRef = useRef<number | null>(null);

  async function load(silent = false) {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const token = await getToken().catch(() => null);
      const [s, a] = await Promise.all([
        api.admin.getStats(token),
        api.admin.getActivity(token),
      ]);
      const sd = s?.data ?? s;
      const ad = a?.data ?? a;

      // Badge polling
      if (lastTodayRef.current !== null && sd.todayAudits > lastTodayRef.current) {
        setNewAudits(prev => prev + (sd.todayAudits - lastTodayRef.current!));
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
  }, []);

  const trends = stats?.trends ?? {};
  const totalPlan = (stats?.planDistribution ?? []).reduce((s: number, r: any) => s + Number(r.cnt), 0) || 1;

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 32px 64px' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .35s cubic-bezier(.22,1,.36,1) both }
      `}</style>

      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        {/* Header */}
        <div className="fu" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            
              {newAudits > 0 && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.30)' }}>
                  +{newAudits} nouvel{newAudits > 1 ? 's' : ''} audit
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0 }}>Vue generale</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>Statistiques en temps reel — refresh auto 60s</p>
          </div>
          <button onClick={() => load()} style={{ height: 34, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity style={{ width: 13, height: 13 }} /> Actualiser
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', color: '#ef4444', fontSize: 13, marginBottom: 24 }}>
            ⚠️ {error}
          </div>
        )}

        {/* KPI grid */}
        <div className="fu" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12, marginBottom: 28, animationDelay: '40ms' }}>
          <KpiCard label="Utilisateurs"   value={stats?.totalUsers ?? 0}    icon={Users}        loading={loading} />
          <KpiCard label="Total audits"   value={stats?.totalAudits ?? 0}   icon={BarChart2}    loading={loading} trend={trends.weekVsPrevWeek} trendLabel="vs semaine" />
          <KpiCard label="Aujourd'hui"    value={stats?.todayAudits ?? 0}   icon={Activity}     loading={loading} accent trend={trends.todayVsYesterday} trendLabel="vs hier" />
          <KpiCard label="Abonnes Pro"    value={stats?.proUsers ?? 0}      icon={TrendingUp}   loading={loading} accent />
          <KpiCard label="Business"       value={stats?.businessUsers ?? 0} icon={CheckCircle2} loading={loading} />
          <KpiCard label="MRR (EUR)"      value={stats?.estimatedRevenue ?? 0} icon={DollarSign} loading={loading} accent sub={`${stats?.proUsers ?? 0} Pro · ${stats?.businessUsers ?? 0} Biz`} />
          <KpiCard label="Score moyen"    value={Math.round(stats?.avgScore ?? 0)} icon={ArrowUpRight} loading={loading} />
          <KpiCard label="Echecs"         value={stats?.failedAudits ?? 0}  icon={AlertTriangle} loading={loading} red={!loading && (stats?.failedAudits ?? 0) > 0} />
        </div>

        {/* Charts row 1 */}
        <div className="fu" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16, animationDelay: '80ms' }}>
          {/* Area chart audits 30j */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 20px 12px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 20, margin: '0 0 20px' }}>
              Audits — 30 derniers jours
            </p>
            {loading ? <Sk h={160} /> : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={stats?.dailyAudits ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gOk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.20} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtDay} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', paddingTop: 8 }} />
                  <Area dataKey="ok"   stroke="#22c55e" strokeWidth={1.5} fill="url(#gOk)"   name="Reussis" dot={false} />
                  <Area dataKey="fail" stroke="#ef4444" strokeWidth={1.5} fill="url(#gFail)" name="Echoues"  dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie + legend */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 20px' }}>
              Repartition des plans
            </p>
            {loading ? <Sk h={160} /> : (
              <>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie data={stats?.planDistribution ?? []} dataKey="cnt" nameKey="plan" cx="50%" cy="50%" outerRadius={48} innerRadius={28} strokeWidth={0}>
                      {(stats?.planDistribution ?? []).map((e: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[e.plan ?? 'free'] ?? '#444'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                  {(stats?.planDistribution ?? []).map((e: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[e.plan ?? 'free'] ?? '#444', flexShrink: 0 }} />
                      <span style={{ color: 'rgba(255,255,255,0.55)', textTransform: 'capitalize', flex: 1 }}>{e.plan ?? 'Gratuit'}</span>
                      <span style={{ color: 'rgba(255,255,255,0.80)', fontWeight: 600 }}>{e.cnt}</span>
                      <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10 }}>{Math.round(e.cnt / totalPlan * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart row 2 — scores moyens par jour */}
        {!loading && (stats?.scoresByDay ?? []).length > 0 && (
          <div className="fu" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 20px 12px', marginBottom: 16, animationDelay: '100ms' }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 20px' }}>
              Score moyen par jour (7 derniers jours)
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={stats.scoresByDay} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtDay} />
                <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line dataKey="score" stroke="#D4AF37" strokeWidth={2} dot={{ fill: '#D4AF37', r: 3 }} name="Score moyen" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Activity tables */}
        {!loading && activity && (
          <div className="fu" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, animationDelay: '120ms' }}>
            {/* Recent audits */}
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0 }}>10 derniers audits</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['URL', 'Score', 'Date', 'Statut'].map(h => (
                      <th key={h} style={{ padding: '7px 16px', textAlign: 'left', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(activity.recentAudits ?? []).map((a: any, i: number) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 120ms' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}>
                      <td style={{ padding: '9px 16px', maxWidth: 180 }}>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.70)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{a.url}</p>
                      </td>
                      <td style={{ padding: '9px 16px' }}><ScoreBadge score={a.score} /></td>
                      <td style={{ padding: '9px 16px', fontSize: 10, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{fmtDate(a.createdAt)}</td>
                      <td style={{ padding: '9px 16px' }}>
                        <span style={{ fontSize: 9, fontWeight: 600, borderRadius: 99, padding: '2px 7px', background: a.status === 'completed' ? 'rgba(34,197,94,0.10)' : a.status === 'failed' ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.10)', color: a.status === 'completed' ? '#22c55e' : a.status === 'failed' ? '#ef4444' : '#f59e0b' }}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recent users */}
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Derniers utilisateurs</p>
              </div>
              {(activity.recentUsers ?? []).map((u: any) => (
                <div key={u.clerkUserId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 120ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#ef4444' }}>
                    {(u.clerkUserId ?? 'U').slice(-2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{u.clerkUserId}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2, margin: '2px 0 0' }}>{fmtDate(u.updatedAt)}</p>
                  </div>
                  <PlanBadge plan={u.plan} />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
