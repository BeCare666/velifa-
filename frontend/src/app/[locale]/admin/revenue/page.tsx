'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { DollarSign, TrendingUp, Users, RefreshCw, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function KpiCard({ label, value, sub, icon: Icon }: {
  label: string; value: string; sub?: string; icon: React.ElementType;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '18px 20px',
      transition: 'border-color 150ms',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.14)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.40)', flexShrink: 0 }} strokeWidth={1.75} />
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)' }}>{label}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

export default function AdminRevenuePage() {
  const { getToken } = useAuth();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getRevenue(token);
      setData(res?.data ?? res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const chartData = data ? [
    { name: 'Pro', montant: data.proCount * data.priceProEur, nb: data.proCount },
    { name: 'Business', montant: data.businessCount * data.priceBusinessEur, nb: data.businessCount },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 32px 64px' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Revenus</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>MRR estimé basé sur les abonnements actifs</p>
          </div>
          <button onClick={load} style={{ height: 36, width: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.40)', cursor: 'pointer' }}>
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '10px 16px', color: '#ef4444', fontSize: 13, marginBottom: 24 }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <>
            <div style={{ height: 130, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12, marginBottom: 28 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 24px', height: 100, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Hero MRR banner */}
            <div style={{
              position: 'relative', overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.03) 60%)',
              border: '1px solid rgba(212,175,55,0.25)', borderRadius: 16,
              padding: '26px 32px', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(212,175,55,0.08)', filter: 'blur(10px)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Sparkles style={{ width: 14, height: 14, color: '#D4AF37' }} strokeWidth={1.75} />
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.80)' }}>Revenu mensuel récurrent</span>
                </div>
                <p style={{ fontSize: 42, fontWeight: 800, color: '#D4AF37', margin: 0, letterSpacing: '-0.01em' }}>
                  {fmt(data?.estimatedMonthly ?? 0)} <span style={{ fontSize: 22, fontWeight: 600 }}>€ / mois</span>
                </p>
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 6px' }}>Pro</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#D4AF37', margin: 0 }}>{fmt((data?.proCount ?? 0) * (data?.priceProEur ?? 9))} €</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', margin: '4px 0 0' }}>{data?.proCount} × {data?.priceProEur}€</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 6px' }}>Business</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#a8a8a8', margin: 0 }}>{fmt((data?.businessCount ?? 0) * (data?.priceBusinessEur ?? 29))} €</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', margin: '4px 0 0' }}>{data?.businessCount} × {data?.priceBusinessEur}€</p>
                </div>
              </div>
            </div>

            {/* KPI grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12, marginBottom: 28 }}>
              <KpiCard label="Abonnés Pro"      value={fmt(data?.proCount ?? 0)}      icon={TrendingUp} sub={`${data?.priceProEur}€/mois par abonné`} />
              <KpiCard label="Abonnés Business" value={fmt(data?.businessCount ?? 0)} icon={Users}      sub={`${data?.priceBusinessEur}€/mois par abonné`} />
              <KpiCard label="Total abonnés"    value={fmt((data?.proCount ?? 0) + (data?.businessCount ?? 0))} icon={Users} />
              <KpiCard label="Revenu annuel projeté" value={`${fmt((data?.estimatedMonthly ?? 0) * 12)} €`} icon={DollarSign} />
            </div>
          </>
        )}

        {!loading && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 20px 12px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>
                Revenu par plan
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [`${v}€`, 'Revenu']} />
                  <Bar dataKey="montant" fill="#D4AF37" radius={[4, 4, 0, 0]} name="Revenu (€)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                  Abonnements actifs ({data.subscriptions?.length ?? 0})
                </p>
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {(data.subscriptions ?? []).length === 0 ? (
                  <p style={{ padding: '24px', fontSize: 13, color: 'rgba(255,255,255,0.30)', textAlign: 'center' }}>Aucun abonnement actif</p>
                ) : (data.subscriptions ?? []).map((s: any, i: number) => (
                  <div key={s.clerkUserId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.plan === 'business' ? 'rgba(168,168,168,0.10)' : 'rgba(212,175,55,0.10)', border: `1px solid ${s.plan === 'business' ? 'rgba(168,168,168,0.20)' : 'rgba(212,175,55,0.20)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: s.plan === 'business' ? '#a8a8a8' : '#D4AF37', flexShrink: 0 }}>
                      {(s.clerkUserId ?? 'U').slice(-2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.clerkUserId}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>Depuis {fmtDate(s.since)}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '3px 8px', background: s.plan === 'business' ? 'rgba(168,168,168,0.10)' : 'rgba(212,175,55,0.12)', color: s.plan === 'business' ? '#a8a8a8' : '#D4AF37' }}>
                        {s.plan}
                      </span>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.70)', marginTop: 4 }}>
                        {s.plan === 'business' ? `${data.priceBusinessEur}€` : `${data.priceProEur}€`}/mois
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
