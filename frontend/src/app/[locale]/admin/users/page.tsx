'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, RefreshCw, Download, BarChart2, Ban, CheckCircle2, User, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { ToastContainer, toast } from '@/components/admin/AdminToast';
import SubscribersTable from '@/components/admin/SubscribersTable';
import {
  PageHeader, Badge, TableShell, Th, Td, SkeletonRows, Segmented, IconButton, ErrorNote, ConfirmDialog, EmptyState,
} from '@/components/ui';

const PAGE_SIZE = 20;
const PLAN_LABEL: Record<string, string> = { free: 'Gratuit', pro: 'Pro', business: 'Business' };
type PlanFilter = 'all' | 'free' | 'pro' | 'business';

function PlanBadge({ plan }: { plan: string | null }) {
  const p = plan ?? 'free';
  if (p === 'free') return <Badge>{PLAN_LABEL.free}</Badge>;
  return (
    <span className="inline-flex items-center rounded-full bg-[color:var(--surface-raised)] px-2 py-0.5 text-[11px] font-semibold text-text ring-1 ring-inset ring-[color:var(--border-strong)]">
      {PLAN_LABEL[p] ?? p}
    </span>
  );
}

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AdminUsersPage() {
  const { getToken } = useAuth();
  const locale = useLocale();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [planFilter, setPlan]   = useState<PlanFilter>('all');
  const [changing, setChanging]   = useState<string | null>(null);
  const [suspending, setSuspending] = useState<string | null>(null);
  const [confirm, setConfirm]   = useState<{ clerkId: string; plan: string; msg: string } | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<{ clerkId: string; action: 'suspend' | 'unsuspend'; msg: string } | null>(null);

  const load = useCallback(async (p = page, s = search, pl: string = planFilter) => {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getUsers(token, { page: String(p), search: s, plan: pl, limit: String(PAGE_SIZE) });
      setData(res?.data ?? res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [getToken, page, search, planFilter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, planFilter]);

  function requestPlanChange(clerkId: string, newPlan: string, currentPlan: string) {
    if (newPlan === (currentPlan ?? 'free')) return;
    setConfirm({
      clerkId, plan: newPlan,
      msg: `Changer le plan de cet utilisateur de « ${PLAN_LABEL[currentPlan ?? 'free']} » vers « ${PLAN_LABEL[newPlan]} » ?`,
    });
  }

  async function executePlanChange() {
    if (!confirm) return;
    const { clerkId, plan } = confirm;
    setConfirm(null);
    setChanging(clerkId);
    try {
      const token = await getToken();
      if (!token) { toast('Session expirée, reconnectez-vous', 'error'); return; }
      await api.admin.updatePlan(token, clerkId, plan);
      toast(`Plan mis à jour : ${PLAN_LABEL[plan] ?? plan}`, 'success');
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
      if (!token) { toast('Session expirée, reconnectez-vous', 'error'); return; }
      if (action === 'suspend') {
        await api.admin.suspendUser(token, clerkId);
        toast('Compte suspendu', 'success');
      } else {
        await api.admin.unsuspendUser(token, clerkId);
        toast('Compte réactivé', 'success');
      }
      await load();
    } catch (e: any) { toast(e.message ?? 'Erreur', 'error'); }
    finally { setSuspending(null); }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const users: any[] = data?.users ?? [];

  return (
    <>
      <ToastContainer />
      {confirm && (
        <ConfirmDialog message={confirm.msg} confirmLabel="Confirmer" cancelLabel="Annuler" danger={false}
          onConfirm={executePlanChange} onCancel={() => setConfirm(null)} />
      )}
      {confirmSuspend && (
        <ConfirmDialog message={confirmSuspend.msg} confirmLabel="Confirmer" cancelLabel="Annuler" danger={confirmSuspend.action === 'suspend'}
          onConfirm={executeSuspend} onCancel={() => setConfirmSuspend(null)} />
      )}

      <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <PageHeader
            eyebrow="Administration"
            title="Utilisateurs"
            description={data ? `${data.total} utilisateurs au total` : 'Chargement…'}
            actions={
              <button
                type="button"
                onClick={async () => {
                  try { await api.admin.exportUsers(await getToken()); }
                  catch (e: any) { toast(e.message ?? 'Export impossible', 'error'); }
                }}
                className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" /> Exporter CSV
              </button>
            }
          />

          <SubscribersTable />

          {/* Barre d'outils */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <form
              className="relative w-full sm:max-w-sm sm:flex-1"
              onSubmit={(e) => { e.preventDefault(); setPage(1); load(1, search, planFilter); }}
            >
              <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-subtle" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par Clerk ID… (Entrée)"
                dir="ltr"
                className="h-10 w-full rounded-velifa-md border border-border bg-[color:var(--surface)] pe-3 ps-9 text-sm text-text placeholder:text-text-subtle focus:border-[color:var(--border-strong)] focus:outline-none"
              />
            </form>
            <Segmented<PlanFilter>
              label="Filtrer par plan"
              value={planFilter}
              onChange={(p) => { setPlan(p); setPage(1); }}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'free', label: 'Gratuit' },
                { value: 'pro', label: 'Pro' },
                { value: 'business', label: 'Business' },
              ]}
            />
            <IconButton icon={RefreshCw} label="Rafraîchir" onClick={() => load()} spinning={loading} />
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}

          {!loading && !error && users.length === 0 ? (
            <EmptyState icon={User} title="Aucun utilisateur" description="Aucun compte ne correspond à ces critères." />
          ) : (
            <TableShell minWidth={900}>
              <thead>
                <tr>
                  {['Utilisateur', 'Plan', 'Statut', 'Audits', 'Dernière activité', 'Suspension', 'Actions'].map((h) => <Th key={h}>{h}</Th>)}
                </tr>
              </thead>
              <tbody>
                {loading ? <SkeletonRows rows={8} cols={7} /> : users.map((u: any) => (
                  <tr key={u.clerkUserId} className="transition-colors hover:bg-[color:var(--surface-raised)]">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-border bg-[color:var(--bg-subtle)] text-[10px] font-semibold text-text-muted">
                          {(u.clerkUserId ?? 'U').slice(-2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/${locale}/admin/users/${u.clerkUserId}`}
                            className="block max-w-[200px] truncate font-mono text-xs text-text hover:underline"
                            dir="ltr"
                          >
                            {u.clerkUserId}
                          </Link>
                          {u.suspended && <span className="mt-1 inline-block"><Badge tone="poor">Suspendu</Badge></span>}
                        </div>
                      </div>
                    </Td>
                    <Td><PlanBadge plan={u.plan} /></Td>
                    <Td>
                      {u.status === 'active' ? <Badge tone="good">Actif</Badge> : <Badge>{u.status ?? 'inactif'}</Badge>}
                    </Td>
                    <Td className="font-semibold tabular-nums text-text">{u.auditCount}</Td>
                    <Td className="whitespace-nowrap text-xs text-text-muted">{fmtDate(u.updatedAt)}</Td>
                    <Td>
                      {u.suspended ? (
                        <button
                          type="button"
                          onClick={() => setConfirmSuspend({ clerkId: u.clerkUserId, action: 'unsuspend', msg: `Réactiver le compte …${u.clerkUserId.slice(-8)} ?` })}
                          disabled={suspending === u.clerkUserId}
                          className="inline-flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-[11px] font-semibold disabled:opacity-50"
                          style={{ color: 'var(--velifa-score-good)', background: 'var(--velifa-score-good-bg)' }}
                        >
                          {suspending === u.clerkUserId ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Réactiver
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmSuspend({ clerkId: u.clerkUserId, action: 'suspend', msg: `Suspendre …${u.clerkUserId.slice(-8)} ? Ce compte ne pourra plus lancer d'audits.` })}
                          disabled={suspending === u.clerkUserId}
                          className="inline-flex h-7 items-center gap-1.5 rounded-[7px] border border-border px-2.5 text-[11px] font-medium text-text-muted transition-colors hover:text-[color:var(--velifa-score-poor)] disabled:opacity-50"
                        >
                          {suspending === u.clerkUserId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />} Suspendre
                        </button>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            aria-label="Changer le plan"
                            value={u.plan ?? 'free'}
                            disabled={changing === u.clerkUserId}
                            onChange={(e) => requestPlanChange(u.clerkUserId, e.target.value, u.plan)}
                            className="h-8 cursor-pointer rounded-[8px] border border-border bg-[color:var(--surface)] px-2 text-xs text-text focus:outline-none disabled:opacity-50"
                          >
                            <option value="free">Gratuit</option>
                            <option value="pro">Pro</option>
                            <option value="business">Business</option>
                          </select>
                        </div>
                        {changing === u.clerkUserId && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />}
                        <Link href={`/${locale}/admin/users/${u.clerkUserId}`} title="Profil utilisateur" aria-label="Profil utilisateur"
                          className="grid h-8 w-8 place-items-center rounded-[8px] border border-border text-text-muted transition-colors hover:border-[color:var(--border-strong)] hover:text-text">
                          <User className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </Link>
                        <Link href={`/${locale}/admin/audits?user=${u.clerkUserId}`} title="Voir ses audits" aria-label="Voir ses audits"
                          className="grid h-8 w-8 place-items-center rounded-[8px] border border-border text-text-muted transition-colors hover:border-[color:var(--border-strong)] hover:text-text">
                          <BarChart2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </Link>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-text-muted tabular-nums">Page {page} / {totalPages} — {data?.total} utilisateurs</p>
              <div className="flex gap-2">
                <IconButton icon={ChevronLeft} label="Page précédente" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
                <IconButton icon={ChevronRight} label="Page suivante" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
