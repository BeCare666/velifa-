'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Bell, BellOff } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminNotificationsPage() {
  const { getToken } = useAuth();
  const [notifs, setNotifs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getNotifications(token);
      setNotifs(res?.data ?? res);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-text sm:text-[28px]">Notifications</h1>
          <p style={{ fontSize: 13, color: 'rgb(var(--accent-rgb)/0.38)', marginTop: 4 }}>
            Notifications administrateur
          </p>
        </div>

        {loading ? (
          <div style={{ background: 'rgb(var(--accent-rgb)/0.025)', border: '1px solid rgb(var(--accent-rgb)/0.07)', borderRadius: 12, padding: '24px 20px', color: 'rgb(var(--accent-rgb)/0.30)', fontSize: 13 }}>
            Chargement...
          </div>
        ) : (
          <div style={{ background: 'rgb(var(--accent-rgb)/0.025)', border: '1px solid rgb(var(--accent-rgb)/0.07)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgb(var(--accent-rgb)/0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell style={{ width: 14, height: 14, color: 'rgb(var(--accent-rgb)/0.40)' }} strokeWidth={1.75} />
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgb(var(--accent-rgb)/0.35)', margin: 0 }}>Notifications admin</p>
                {(notifs?.unread ?? 0) > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, background: 'var(--velifa-score-poor)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {notifs.unread}
                  </span>
                )}
              </div>
              {(notifs?.unread ?? 0) > 0 && (
                <button
                  disabled={markingRead}
                  onClick={async () => {
                    setMarkingRead(true);
                    try {
                      const token = await getToken();
                      if (token) await api.admin.markAllRead(token);
                      await load();
                    } catch { /* noop */ }
                    finally { setMarkingRead(false); }
                  }}
                  style={{ fontSize: 11, cursor: 'pointer', background: 'rgb(var(--accent-rgb)/0.04)', border: '1px solid rgb(var(--accent-rgb)/0.09)', borderRadius: 6, padding: '4px 10px', color: 'rgb(var(--accent-rgb)/0.50)' }}>
                  Tout marquer comme lu
                </button>
              )}
            </div>
            {(notifs?.notifications ?? []).length === 0 ? (
              <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 8, color: 'rgb(var(--accent-rgb)/0.28)', fontSize: 13 }}>
                <BellOff style={{ width: 14, height: 14 }} /> Aucune notification
              </div>
            ) : (
              <div>
                {(notifs.notifications ?? []).map((n: any) => {
                  const typeColors: Record<string, { color: string; bg: string }> = {
                    suspension: { color: 'var(--velifa-score-poor)', bg: 'rgba(239,68,68,0.08)' },
                    info:       { color: 'var(--velifa-score-good)', bg: 'rgba(34,197,94,0.08)' },
                    warning:    { color: 'var(--velifa-score-average)', bg: 'rgba(245,158,11,0.08)' },
                    critical:   { color: 'var(--velifa-score-poor)', bg: 'rgba(239,68,68,0.08)' },
                    lead:       { color: 'var(--accent)', bg: 'rgb(var(--accent-rgb)/0.10)' },
                  };
                  const { color, bg } = typeColors[n.type] ?? typeColors.info;
                  return (
                    <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid rgb(var(--accent-rgb)/0.04)', background: n.read ? 'transparent' : 'rgb(var(--accent-rgb)/0.02)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.read ? 'rgb(var(--accent-rgb)/0.15)' : color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: bg, color, flexShrink: 0 }}>{n.type}</span>
                      <p style={{ flex: 1, fontSize: 12, color: n.read ? 'rgb(var(--accent-rgb)/0.40)' : 'rgb(var(--accent-rgb)/0.75)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>
                      <span style={{ fontSize: 10, color: 'rgb(var(--accent-rgb)/0.25)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
