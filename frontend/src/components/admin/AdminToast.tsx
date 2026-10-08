'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

let toastId = 0;
let globalAdd: ((msg: string, type: ToastType) => void) | null = null;

export function toast(msg: string, type: ToastType = 'success') {
  globalAdd?.(msg, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    globalAdd = (msg, type) => {
      const id = ++toastId;
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    return () => { globalAdd = null; };
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 10, minWidth: 260,
          background: t.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${t.type === 'success' ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)'}`,
          backdropFilter: 'blur(8px)',
          animation: 'slideIn 0.25s cubic-bezier(.22,1,.36,1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}>
          {t.type === 'success'
            ? <CheckCircle2 style={{ width: 15, height: 15, color: '#22c55e', flexShrink: 0 }} />
            : <XCircle style={{ width: 15, height: 15, color: '#ef4444', flexShrink: 0 }} />
          }
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 }}>{t.msg}</span>
          <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      ))}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}
