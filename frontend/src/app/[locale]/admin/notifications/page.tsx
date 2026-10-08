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
    <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 32px 64px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Notifications</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
            Notifications administrateur
          </p>
        </div>

        {loading ? (
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '24px 20px', color: 'rgba(255,255,255,0.30)', fontSize: 13 }}>
            Chargement...
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.40)' }} strokeWidth={1.75} />
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Notifications admin</p>
                {(notifs?.unread ?? 0) > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
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
                  style={{ fontSize: 11, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6, padding: '4px 10px', color: 'rgba(255,255,255,0.50)' }}>
                  Tout marquer comme lu
                </button>
              )}
            </div>
            {(notifs?.notifications ?? []).length === 0 ? (
              <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>
                <BellOff style={{ width: 14, height: 14 }} /> Aucune notification
              </div>
            ) : (
              <div>
                {(notifs.notifications ?? []).map((n: any) => {
                  const typeColors: Record<string, { color: string; bg: string }> = {
                    suspension: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                    info:       { color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
                    warning:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                    critical:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                  };
                  const { color, bg } = typeColors[n.type] ?? typeColors.info;
                  return (
                    <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: n.read ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.read ? 'rgba(255,255,255,0.15)' : color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: bg, color, flexShrink: 0 }}>{n.type}</span>
                      <p style={{ flex: 1, fontSize: 12, color: n.read ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.75)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
