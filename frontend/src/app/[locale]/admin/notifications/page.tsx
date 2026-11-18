'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Bell, BellOff, CheckCheck, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Panel, Skeleton, EmptyState, ErrorNote, IconButton } from '@/components/ui';

const TYPES: Record<string, { label: string; color: string; bg: string }> = {
  suspension: { label: 'Suspension',    color: 'var(--velifa-score-poor)',    bg: 'var(--velifa-score-poor-bg)' },
  critical:   { label: 'Critique',      color: 'var(--velifa-score-poor)',    bg: 'var(--velifa-score-poor-bg)' },
  warning:    { label: 'Avertissement', color: 'var(--velifa-score-average)', bg: 'var(--velifa-score-average-bg)' },
  info:       { label: 'Info',          color: 'var(--velifa-score-good)',    bg: 'var(--velifa-score-good-bg)' },
  lead:       { label: 'Demande',       color: 'var(--text)',                 bg: 'var(--surface-raised)' },
};

const fmtDate = (v: any) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export default function AdminNotificationsPage() {
  const { getToken } = useAuth();
  const [notifs, setNotifs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingRead, setMarkingRead] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getNotifications(token);
      setNotifs(res?.data ?? res);
    } catch (e: any) { setError(e.message ?? 'Chargement impossible'); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  async function markAll() {
    setMarkingRead(true);
    try {
      const token = await getToken();
      if (token) await api.admin.markAllRead(token);
      await load();
    } catch (e: any) { setError(e.message ?? 'Action impossible'); }
    finally { setMarkingRead(false); }
  }

  const list: any[] = notifs?.notifications ?? [];
  const unread = notifs?.unread ?? 0;

  return (
    <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Administration"
          title="Notifications"
          description={loading ? 'Chargement…' : unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''} sur ${list.length}` : 'Tout est lu'}
          actions={
            <>
              <IconButton icon={RefreshCw} label="Rafraîchir" onClick={load} spinning={loading} />
              {unread > 0 && (
                <button type="button" disabled={markingRead} onClick={markAll} className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2 disabled:opacity-50">
                  {markingRead ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                  Tout marquer comme lu
                </button>
              )}
            </>
          }
        />

        {error && <ErrorNote>{error}</ErrorNote>}

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-velifa-md" />)}</div>
        ) : !error && list.length === 0 ? (
          <EmptyState icon={BellOff} title="Aucune notification" />
        ) : list.length > 0 && (
          <Panel padded={false} title={<span className="inline-flex items-center gap-2"><Bell className="h-4 w-4 text-text-muted" strokeWidth={1.75} />Notifications administrateur</span>}>
            <ul className="divide-y divide-[color:var(--border)]">
              {list.map((n: any) => {
                const t = TYPES[n.type] ?? { label: n.type, color: 'var(--text-muted)', bg: 'var(--surface-raised)' };
                return (
                  <li key={n.id} className={`flex gap-3 px-5 py-4 ${n.read ? '' : 'bg-[color:var(--bg-subtle)]'}`}>
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: n.read ? 'var(--border-strong)' : t.color }} aria-label={n.read ? 'Lue' : 'Non lue'} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: t.color, background: t.bg }}>{t.label}</span>
                        <span className="text-[11px] text-text-subtle">{fmtDate(n.createdAt)}</span>
                      </div>
                      <p className={`break-words text-sm leading-relaxed ${n.read ? 'text-text-muted' : 'text-text'}`} dir="auto">{n.message}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
