'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { DollarSign, TrendingUp, Users, RefreshCw, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { PageHeader, Panel, StatCard, Skeleton, EmptyState, IconButton, ErrorNote } from '@/components/ui';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const usd = (n: number) => `$${fmt(n)}`;
const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  return (
    <div className="rounded-[8px] border border-border bg-[color:var(--surface-raised)] px-3 py-2 text-xs shadow-velifa-md">
      <p className="mb-1 font-semibold text-text">{label}</p>
      <p className="text-text-muted">Revenu : <strong className="tabular-nums text-text">{usd(p?.montant ?? 0)}</strong></p>
      <p className="text-text-muted">Abonnés : <strong className="tabular-nums text-text">{p?.nb ?? 0}</strong></p>
    </div>
  );
};

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const proCount = data?.proCount ?? 0;
  const bizCount = data?.businessCount ?? 0;
  const pricePro = data?.priceProUsd ?? 0;
  const priceBiz = data?.priceBusinessUsd ?? 0;
  const mrr = data?.estimatedMonthly ?? 0;
  const proShare = mrr > 0 ? Math.round((proCount * pricePro / mrr) * 100) : 0;

  // Montants calculés à partir des champs réellement renvoyés par GET /admin/revenue (USD)
  const chartData = [
    { name: 'Pro', montant: proCount * pricePro, nb: proCount },
    { name: 'Business', montant: bizCount * priceBiz, nb: bizCount },
  ];
  const subs: any[] = data?.subscriptions ?? [];

  return (
    <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          eyebrow="Administration"
          title="Revenus"
          description="Revenu mensuel estimé à partir des abonnements actifs et des prix du back-office."
          actions={<IconButton icon={RefreshCw} label="Rafraîchir" onClick={load} spinning={loading} />}
        />

        {error && <ErrorNote>{error}</ErrorNote>}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-velifa-xl" />
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-velifa-lg" />)}</div>
          </div>
        ) : data && (
          <div className="space-y-5">
            {/* Revenu mensuel récurrent */}
            <section className="relative overflow-hidden rounded-velifa-xl border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-6 sm:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 end-[-5%] h-64 w-64 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgb(var(--accent-rgb)/0.10), transparent 70%)' }}
              />
              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="velifa-eyebrow mb-3">Revenu mensuel récurrent (estimation)</p>
                  <p className="font-heading text-5xl font-semibold tracking-tight text-text tabular-nums sm:text-6xl" dir="ltr">
                    {usd(mrr)}<span className="ms-2 text-xl font-medium text-text-muted">/ mois</span>
                  </p>
                </div>
                <div className="grid min-w-[280px] grid-cols-2 gap-6">
                  {[
                    { label: 'Pro', amount: proCount * pricePro, detail: `${proCount} × $${pricePro}` },
                    { label: 'Business', amount: bizCount * priceBiz, detail: `${bizCount} × $${priceBiz}` },
                  ].map((p) => (
                    <div key={p.label}>
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle">{p.label}</p>
                      <p className="text-xl font-semibold tabular-nums text-text" dir="ltr">{usd(p.amount)}</p>
                      <p className="mt-0.5 text-xs text-text-muted tabular-nums" dir="ltr">{p.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              {mrr > 0 && (
                <div className="relative mt-8">
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-[color:var(--border)]">
                    <span className="bg-[color:var(--text)]" style={{ width: `${proShare}%` }} />
                    <span className="bg-[color:var(--text-subtle)]" style={{ width: `${100 - proShare}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-text-muted tabular-nums">Pro {proShare} % · Business {100 - proShare} %</p>
                </div>
              )}
            </section>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard icon={TrendingUp} label="Abonnés Pro" value={fmt(proCount)} sub={`$${pricePro} / mois par abonné`} />
              <StatCard icon={Users} label="Abonnés Business" value={fmt(bizCount)} sub={`$${priceBiz} / mois par abonné`} />
              <StatCard icon={CreditCard} label="Total abonnés" value={fmt(proCount + bizCount)} />
              <StatCard icon={DollarSign} label="Revenu annuel projeté" value={usd(mrr * 12)} sub="Estimation × 12 mois" />
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Panel title="Revenu par plan">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--accent-soft)' }} />
                    <Bar dataKey="montant" fill="var(--text)" radius={[6, 6, 0, 0]} maxBarSize={72} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title={`Abonnements actifs (${subs.length})`} padded={false}>
                {subs.length === 0 ? (
                  <div className="p-5"><EmptyState icon={CreditCard} title="Aucun abonnement actif" /></div>
                ) : (
                  <ul className="max-h-[300px] divide-y divide-[color:var(--border)] overflow-y-auto">
                    {subs.map((s: any) => (
                      <li key={s.clerkUserId} className="flex items-center gap-3 px-5 py-3">
                        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-border bg-[color:var(--bg-subtle)] text-[10px] font-semibold text-text-muted">
                          {(s.clerkUserId ?? 'U').slice(-2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-[11px] text-text" dir="ltr">{s.clerkUserId}</p>
                          <p className="mt-0.5 text-[11px] text-text-subtle">Compte mis à jour le {fmtDate(s.since)}</p>
                        </div>
                        <div className="flex-shrink-0 text-end">
                          <span className="inline-flex rounded-full bg-[color:var(--surface-raised)] px-2 py-0.5 text-[11px] font-semibold text-text ring-1 ring-inset ring-[color:var(--border-strong)]">
                            {s.plan === 'business' ? 'Business' : 'Pro'}
                          </span>
                          <p className="mt-1 text-[11px] font-semibold tabular-nums text-text-muted" dir="ltr">
                            ${s.plan === 'business' ? priceBiz : pricePro}/mois
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
