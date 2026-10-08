'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Search, ChevronLeft, ChevronRight, RefreshCw, Download, BarChart2, Ban, CheckCircle2, User } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ToastContainer, toast } from '@/components/admin/AdminToast';
import SubscribersTable from '@/components/admin/SubscribersTable';

function PlanBadge({ plan }: { plan: string | null }) {
  const p = plan ?? 'free';
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    pro:      { label: 'Pro',      color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
    business: { label: 'Business', color: '#a8a8a8', bg: 'rgba(168,168,168,0.10)' },
    free:     { label: 'Gratuit',  color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.05)' },
  };
  const { label, color, bg } = cfg[p] ?? cfg.free;
  return <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, borderRadius: 99, padding: '3px 8px' }}>{label}</span>;
}

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onCancel}>
      <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: 28, maxWidth: 380, width: '90%', animation: 'popIn .2s cubic-bezier(.22,1,.36,1)' }}
        onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: 20, lineHeight: 1.5 }}>{msg}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ height: 34, padding: '0 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}>
            Annuler
          </button>
          <button onClick={onConfirm} style={{ height: 34, padding: '0 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444' }}>
            Confirmer
          </button>
        </div>
      </div>
      <style>{`@keyframes popIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

export default function AdminUsersPage() {
  const { getToken } = useAuth();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [planFilter, setPlan]   = useState('all');
  const [changing, setChanging]   = useState<string | null>(null);
  const [suspending, setSuspending] = useState<string | null>(null);
  const [confirm, setConfirm]   = useState<{ clerkId: string; plan: string; msg: string } | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<{ clerkId: string; action: 'suspend' | 'unsuspend'; msg: string } | null>(null);

  const load = useCallback(async (p = page, s = search, pl = planFilter) => {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getUsers(token, { page: String(p), search: s, plan: pl, limit: '20' });
      setData(res?.data ?? res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [getToken, page, search, planFilter]);

  useEffect(() => { load(); }, [page, planFilter]);

  function requestPlanChange(clerkId: string, newPlan: string, currentPlan: string) {
    if (newPlan === (currentPlan ?? 'free')) return;
    const planLabel: Record<string, string> = { free: 'Gratuit', pro: 'Pro', business: 'Business' };
    setConfirm({
      clerkId, plan: newPlan,
      msg: `Changer le plan de cet utilisateur de "${planLabel[currentPlan ?? 'free']}" vers "${planLabel[newPlan]}" ?`,
    });
  }

  async function executePlanChange() {
    if (!confirm) return;
    const { clerkId, plan } = confirm;
    setConfirm(null);
    setChanging(clerkId);
    try {
      const token = await getToken();
      if (!token) { toast('Token manquant', 'error'); return; }
      await api.admin.updatePlan(token, clerkId, plan);
      toast(`Plan mis a jour : ${plan}`, 'success');
      await load();
    } catch (e: any) { toast(e.message ?? 'Erreur', 'error'); }
    finally { setChanging(null); }
  }

  async function executeSuspend() {
    if (!confirmSuspend) return;
    const { clerkId, action } = confirmSuspend;
    setConfirmSuspend(null);
    setSuspending(clerkId);
    try {
      const token = await getToken();
      if (!token) { toast('Token manquant', 'error'); return; }
      if (action === 'suspend') {
        await api.admin.suspendUser(token, clerkId);
        toast('Compte suspendu', 'success');
      } else {
        await api.admin.unsuspendUser(token, clerkId);
        toast('Compte reactive', 'success');
      }
      await load();
    } catch (e: any) { toast(e.message ?? 'Erreur', 'error'); }
    finally { setSuspending(null); }
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <>
      <ToastContainer />
      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={executePlanChange} onCancel={() => setConfirm(null)} />}
      {confirmSuspend && <ConfirmDialog msg={confirmSuspend.msg} onConfirm={executeSuspend} onCancel={() => setConfirmSuspend(null)} />}

      <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 32px 64px' }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Utilisateurs</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
                {data ? `${data.total} utilisateurs au total` : '...'}
              </p>
            </div>
            <a href={api.admin.exportUsers()} download
              style={{ height: 34, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
              <Download style={{ width: 13, height: 13 }} /> Exporter CSV
            </a>
          </div>

          <SubscribersTable />

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'rgba(255,255,255,0.30)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(1, search, planFilter); } }}
                placeholder="Rechercher par Clerk ID..."
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 36, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, color: 'rgba(255,255,255,0.80)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {['all', 'free', 'pro', 'business'].map(p => (
              <button key={p} onClick={() => { setPlan(p); setPage(1); load(1, search, p); }}
                style={{ height: 36, padding: '0 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: planFilter === p ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${planFilter === p ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.09)'}`, color: planFilter === p ? '#ef4444' : 'rgba(255,255,255,0.55)', transition: 'all 150ms' }}>
                {p === 'all' ? 'Tous' : p.charAt(0).toUpperCase() + p.slice(1)}
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

          {/* Table */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Utilisateur', 'Plan', 'Statut', 'Audits', 'Derniere activite', 'Suspension', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} style={{ padding: '14px 16px' }}>
                            <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: j === 0 ? '70%' : '50%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : (data?.users ?? []).map((u: any, i: number) => (
                      <tr key={u.clerkUserId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition: 'background 150ms' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'; }}>

                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: u.suspended ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.10)', border: `1px solid ${u.suspended ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.18)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#ef4444' }}>
                              {(u.clerkUserId ?? 'U').slice(-2).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                {u.clerkUserId}
                              </span>
                              {u.suspended && (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.30)' }}>SUSPENDU</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '11px 16px' }}><PlanBadge plan={u.plan} /></td>

                        <td style={{ padding: '11px 16px' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '2px 8px', background: u.status === 'active' ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.05)', color: u.status === 'active' ? '#22c55e' : 'rgba(255,255,255,0.35)' }}>
                            {u.status ?? 'inactive'}
                          </span>
                        </td>

                        <td style={{ padding: '11px 16px', fontSize: 13, color: 'rgba(255,255,255,0.60)', fontWeight: 600 }}>{u.auditCount}</td>

                        <td style={{ padding: '11px 16px', fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{fmtDate(u.updatedAt)}</td>

                        {/* Suspension */}
                        <td style={{ padding: '11px 16px' }}>
                          {u.suspended ? (
                            <button onClick={() => setConfirmSuspend({ clerkId: u.clerkUserId, action: 'unsuspend', msg: `Reactiver le compte ${u.clerkUserId.slice(-8)} ?` })}
                              disabled={suspending === u.clerkUserId}
                              style={{ height: 26, padding: '0 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 style={{ width: 10, height: 10 }} /> Reactiver
                            </button>
                          ) : (
                            <button onClick={() => setConfirmSuspend({ clerkId: u.clerkUserId, action: 'suspend', msg: `Suspendre ${u.clerkUserId.slice(-8)} ? Il ne pourra plus lancer d'audits.` })}
                              disabled={suspending === u.clerkUserId}
                              style={{ height: 26, padding: '0 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Ban style={{ width: 10, height: 10 }} /> Suspendre
                            </button>
                          )}
                        </td>

                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {/* Changer plan */}
                            <div style={{ position: 'relative' }}>
                              <select value={u.plan ?? 'free'} disabled={changing === u.clerkUserId}
                                onChange={e => requestPlanChange(u.clerkUserId, e.target.value, u.plan)}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'rgba(255,255,255,0.70)', fontSize: 11, padding: '4px 8px', cursor: 'pointer', outline: 'none' }}>
                                <option value="free">Gratuit</option>
                                <option value="pro">Pro</option>
                                <option value="business">Business</option>
                              </select>
                              {changing === u.clerkUserId && (
                                <div style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(212,175,55,0.30)', borderTopColor: '#D4AF37', animation: 'spin 0.8s linear infinite' }} />
                              )}
                            </div>
                            {/* Profil utilisateur */}
                            <Link href={`/admin/users/${u.clerkUserId}`}
                              style={{ height: 28, width: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.40)', textDecoration: 'none', transition: 'all 150ms', flexShrink: 0 }}
                              title="Profil utilisateur"
                              onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.30)'; e.currentTarget.style.color = '#ef4444'; }}
                              onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}>
                              <User style={{ width: 12, height: 12 }} />
                            </Link>
                            {/* Voir audits */}
                            <Link href={`/admin/audits?user=${u.clerkUserId}`}
                              style={{ height: 28, width: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.40)', textDecoration: 'none', transition: 'all 150ms', flexShrink: 0 }}
                              title="Voir ses audits"
                              onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.30)'; e.currentTarget.style.color = '#D4AF37'; }}
                              onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}>
                              <BarChart2 style={{ width: 12, height: 12 }} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Page {page} / {totalPages} — {data?.total} utilisateurs</p>
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
    </>
  );
}
