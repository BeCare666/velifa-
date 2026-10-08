'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, TrendingUp, AlertTriangle, BarChart2, Ban, CheckCircle2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { ToastContainer, toast } from '@/components/admin/AdminToast';

const scoreColor = (s: number) =>
  s >= 80 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDay = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

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
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, borderRadius: 99, padding: '4px 10px' }}>{label}</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'rgba(255,255,255,0.55)', margin: '0 0 4px' }}>{fmtDay(label)}</p>
      <p style={{ color: '#D4AF37', margin: 0 }}>Score : <strong>{payload[0]?.value}</strong></p>
    </div>
  );
};

export default function UserDetailPage() {
  const { clerkId } = useParams<{ clerkId: string }>();
  const { getToken } = useAuth();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getUserDetails(token, clerkId);
      setData(res?.data ?? res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [clerkId]);

  async function handleSuspend() {
    if (!confirm(`Suspendre ce compte ? L'utilisateur ne pourra plus lancer d'audits.`)) return;
    setActionLoading(true);
    try {
      const token = await getToken();
      if (!token) { toast('Token manquant', 'error'); return; }
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
      if (!token) { toast('Token manquant', 'error'); return; }
      await api.admin.unsuspendUser(token, clerkId);
      toast('Compte reactive', 'success');
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
      <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 32px 64px' }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>

          {/* Back */}
          <Link href="/admin/users" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.40)', fontSize: 12, textDecoration: 'none', marginBottom: 20, transition: 'color 150ms' }}
            onMouseEnter={(e: any) => e.currentTarget.style.color = 'rgba(255,255,255,0.70)'}
            onMouseLeave={(e: any) => e.currentTarget.style.color = 'rgba(255,255,255,0.40)'}>
            <ChevronLeft style={{ width: 14, height: 14 }} /> Retour aux utilisateurs
          </Link>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '12px 16px', color: '#ef4444', fontSize: 13, marginBottom: 20 }}>
              ⚠️ {error}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[100, 120, 200].map((h, i) => (
                <div key={i} style={{ height: h, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Header utilisateur */}
              <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#ef4444', flexShrink: 0 }}>
                      {clerkId.slice(-2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0, fontFamily: 'monospace' }}>{clerkId}</p>
                        {user.suspended && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.30)', letterSpacing: '0.06em' }}>SUSPENDU</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <PlanBadge plan={user.plan} />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                          Derniere activite : {fmtDate(user.updatedAt)}
                        </span>
                        {user.suspended && user.suspendedAt && (
                          <span style={{ fontSize: 11, color: '#ef4444' }}>
                            Suspendu le {fmtDate(user.suspendedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/admin/audits?user=${clerkId}`}
                      style={{ height: 34, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
                      <BarChart2 style={{ width: 13, height: 13 }} /> Voir audits
                    </Link>
                    {user.suspended ? (
                      <button onClick={handleUnsuspend} disabled={actionLoading}
                        style={{ height: 34, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
                        <CheckCircle2 style={{ width: 13, height: 13 }} /> Reactiver
                      </button>
                    ) : (
                      <button onClick={handleSuspend} disabled={actionLoading}
                        style={{ height: 34, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                        <Ban style={{ width: 13, height: 13 }} /> Suspendre
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Total audits',  value: stats?.totalAudits ?? 0,    color: 'rgba(255,255,255,0.80)' },
                  { label: 'Reussis',       value: stats?.completedAudits ?? 0, color: '#22c55e' },
                  { label: 'Echoues',       value: stats?.failedAudits ?? 0,    color: '#ef4444' },
                  { label: 'Score moyen',   value: stats?.avgScore ? `${stats.avgScore}/100` : '—', color: stats?.avgScore ? scoreColor(stats.avgScore) : 'rgba(255,255,255,0.40)' },
                  { label: 'Sites analyses', value: sites.length, color: '#D4AF37' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 18px' }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Sites */}
                <Card title="Sites analyses">
                  {sites.length === 0 ? (
                    <p style={{ padding: '20px', fontSize: 13, color: 'rgba(255,255,255,0.30)', textAlign: 'center' }}>Aucun site analyse</p>
                  ) : (
                    <div>
                      {sites.slice(0, 10).map((site: any, i: number) => (
                        <div key={site.url} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }} title={site.url}>{site.url}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', margin: '2px 0 0' }}>{site.count} audit{site.count > 1 ? 's' : ''} — derniere fois le {fmtDate(site.lastDate)}</p>
                          </div>
                          <ScoreBadge score={site.avgScore} />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Score evolution */}
                <Card title="Evolution des scores (30j)">
                  {history.length < 2 ? (
                    <p style={{ padding: '20px', fontSize: 13, color: 'rgba(255,255,255,0.30)', textAlign: 'center' }}>Pas assez de donnees</p>
                  ) : (
                    <div style={{ padding: '16px 8px 8px' }}>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={history} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtDay} />
                          <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line dataKey="score" stroke="#D4AF37" strokeWidth={2} dot={{ fill: '#D4AF37', r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
              </div>

              {/* Historique audits */}
              <Card title="Historique des audits">
                {audits.length === 0 ? (
                  <p style={{ padding: '20px', fontSize: 13, color: 'rgba(255,255,255,0.30)', textAlign: 'center' }}>Aucun audit</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['URL', 'Score', 'SEO', 'Statut', 'Date'].map(h => (
                          <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {audits.map((a: any, i: number) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 120ms' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.04)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}>
                          <td style={{ padding: '9px 16px', maxWidth: 220 }}>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.70)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{a.url}</p>
                          </td>
                          <td style={{ padding: '9px 16px' }}><ScoreBadge score={a.score} /></td>
                          <td style={{ padding: '9px 16px' }}><ScoreBadge score={a.scoreSeo} /></td>
                          <td style={{ padding: '9px 16px' }}>
                            <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '2px 7px',
                              background: a.status === 'completed' ? 'rgba(34,197,94,0.10)' : a.status === 'failed' ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.10)',
                              color: a.status === 'completed' ? '#22c55e' : a.status === 'failed' ? '#ef4444' : '#f59e0b' }}>
                              {a.status}
                            </span>
                          </td>
                          <td style={{ padding: '9px 16px', fontSize: 10, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{fmtDate(a.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
              Utilisateur introuvable
            </div>
          )}
        </div>
      </div>
    </>
  );
}
