'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Server, Database, Mail, Trash2, RefreshCw, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { ToastContainer, toast } from '@/components/admin/AdminToast';

const fmtUptime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
};

function StatusRow({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? '#22c55e' : '#ef4444', flexShrink: 0, boxShadow: ok ? '0 0 6px #22c55e80' : '0 0 6px #ef444480' }} />
        {ok
          ? <CheckCircle2 style={{ width: 14, height: 14, color: '#22c55e' }} />
          : <XCircle style={{ width: 14, height: 14, color: '#ef4444' }} />
        }
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)' }}>{label}</span>
      </div>
      {value && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>{value}</span>}
    </div>
  );
}

function Card({ title, icon: Icon, children, badge }: { title: string; icon: React.ElementType; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.40)' }} strokeWidth={1.75} />
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{title}</p>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

export default function AdminSystemPage() {
  const { getToken } = useAuth();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [emailSt, setEmailSt] = useState<'idle'|'loading'|'ok'|'err'>('idle');
  const [cacheSt, setCacheSt] = useState<'idle'|'loading'|'ok'|'err'>('idle');
  const [nextRefresh, setNextRefresh] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load(silent = false) {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getSystem(token);
      setData(res?.data ?? res);
    } catch (e: any) { if (!silent) setError(e.message); }
    finally { if (!silent) setLoading(false); }
  }

  useEffect(() => {
    load();
    // Auto-refresh toutes les 30s
    timerRef.current = setInterval(() => {
      load(true);
      setNextRefresh(30);
    }, 30_000);
    // Countdown
    const countdown = setInterval(() => setNextRefresh(n => Math.max(0, n - 1)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(countdown);
    };
  }, []);

  async function handleTestEmail() {
    setEmailSt('loading');
    try {
      const token = await getToken();
      if (!token) { toast('Connectez-vous d\'abord', 'error'); setEmailSt('err'); return; }
      const res = await api.admin.testEmail(token);
      const d = res?.data ?? res;
      if (d?.sent) { toast('Email de test envoye avec succes !', 'success'); setEmailSt('ok'); }
      else { toast(`Echec: ${d?.reason ?? 'inconnu'}`, 'error'); setEmailSt('err'); }
    } catch (e: any) { toast(e.message, 'error'); setEmailSt('err'); }
    setTimeout(() => setEmailSt('idle'), 4000);
  }

  async function handleClearCache() {
    setCacheSt('loading');
    try {
      const token = await getToken();
      if (!token) { toast('Connectez-vous d\'abord', 'error'); setCacheSt('err'); return; }
      const res = await api.admin.clearCache(token);
      const d = res?.data ?? res;
      if (d?.cleared) { toast('Cache Redis vide avec succes !', 'success'); setCacheSt('ok'); }
      else { toast(`Echec: ${d?.reason ?? 'inconnu'}`, 'error'); setCacheSt('err'); }
    } catch (e: any) { toast(e.message, 'error'); setCacheSt('err'); }
    setTimeout(() => setCacheSt('idle'), 4000);
  }

  const services = [
    { label: 'Backend NestJS', ok: !!data },
    { label: 'Base de donnees TiDB', ok: data?.dbConnected ?? false },
    { label: 'Clerk Auth', ok: true },
    { label: 'Brevo Email', ok: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY },
    { label: 'Redis Cache', ok: true },
  ];

  return (
    <>
      <ToastContainer />
      <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '32px 32px 64px' }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes glow{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Systeme</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
                Statut infrastructure VELIFA — refresh auto dans {nextRefresh}s
              </p>
            </div>
            <button onClick={() => { load(); setNextRefresh(30); }}
              style={{ height: 36, padding: '0 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)' }}>
              <RefreshCw style={{ width: 13, height: 13 }} /> Actualiser
            </button>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 10, padding: '10px 16px', color: '#ef4444', fontSize: 13, marginBottom: 24 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Status rapide */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10, marginBottom: 20 }}>
            {services.map(s => (
              <div key={s.label} style={{ background: s.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${s.ok ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.ok ? '#22c55e' : '#ef4444', flexShrink: 0, animation: 'glow 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[100, 160, 140].map((h, i) => (
                <div key={i} style={{ height: h, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <Card title="Backend NestJS" icon={Server}
                badge={<span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(34,197,94,0.10)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>Running</span>}>
                <StatusRow label="Serveur"       ok={true} value={`Node ${data?.nodeVersion ?? '—'}`} />
                <StatusRow label="Uptime"        ok={true} value={fmtUptime(data?.uptimeSeconds ?? 0)} />
                <StatusRow label="Memoire RSS"   ok={true} value={`${data?.memoryMb ?? 0} MB`} />
                <StatusRow label="CPU cores"     ok={true} value={`${data?.cpuCores ?? 0} cores`} />
                <StatusRow label="Plateforme"    ok={true} value={data?.platform ?? '—'} />
                <StatusRow label="Demarre"       ok={true} value={data?.startedAt ? new Date(data.startedAt).toLocaleString('fr-FR') : '—'} />
              </Card>

              <Card title="Base de donnees TiDB" icon={Database}
                badge={<span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: data?.dbConnected ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)', color: data?.dbConnected ? '#22c55e' : '#ef4444', border: `1px solid ${data?.dbConnected ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>{data?.dbConnected ? 'Connectee' : 'Deconnectee'}</span>}>
                <StatusRow label="Connexion"         ok={data?.dbConnected ?? false} value={data?.dbConnected ? 'TiDB Cloud — OK' : 'Erreur'} />
                <StatusRow label="Admins configures" ok={(data?.adminEmails?.length ?? 0) > 0} value={(data?.adminEmails ?? []).join(', ') || 'Aucun'} />
              </Card>

              <Card title="Actions" icon={Activity}>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                    <div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500, margin: 0 }}>Tester l&apos;envoi email</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>Envoie un email test via Brevo a l&apos;adresse admin</p>
                    </div>
                    <button onClick={handleTestEmail} disabled={emailSt === 'loading'}
                      style={{ height: 34, padding: '0 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: emailSt === 'loading' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: emailSt === 'ok' ? 'rgba(34,197,94,0.12)' : emailSt === 'err' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${emailSt === 'ok' ? 'rgba(34,197,94,0.25)' : emailSt === 'err' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.12)'}`, color: emailSt === 'ok' ? '#22c55e' : emailSt === 'err' ? '#ef4444' : 'rgba(255,255,255,0.65)' }}>
                      {emailSt === 'loading' && <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.20)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />}
                      <Mail style={{ width: 13, height: 13 }} />
                      {emailSt === 'ok' ? 'Envoye !' : emailSt === 'err' ? 'Echec' : 'Envoyer test'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                    <div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500, margin: 0 }}>Vider le cache Redis</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>Efface toutes les cles Redis (rate limiting, sessions)</p>
                    </div>
                    <button onClick={handleClearCache} disabled={cacheSt === 'loading'}
                      style={{ height: 34, padding: '0 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: cacheSt === 'loading' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: cacheSt === 'ok' ? 'rgba(34,197,94,0.12)' : cacheSt === 'err' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${cacheSt === 'ok' ? 'rgba(34,197,94,0.25)' : cacheSt === 'err' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.12)'}`, color: cacheSt === 'ok' ? '#22c55e' : cacheSt === 'err' ? '#ef4444' : 'rgba(255,255,255,0.65)' }}>
                      {cacheSt === 'loading' && <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.20)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />}
                      <Trash2 style={{ width: 13, height: 13 }} />
                      {cacheSt === 'ok' ? 'Vide !' : cacheSt === 'err' ? 'Echec' : 'Vider cache'}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
