'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Loader2, Shield, Server, Database, Cpu, Clock, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

function InfoRow({ label, value, mono = false, ok }: { label: string; value: React.ReactNode; mono?: boolean; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}
        style={{ color: ok === true ? '#0CCE6B' : ok === false ? '#FF4E42' : 'rgba(255,255,255,0.80)' }}>
        {ok === true ? '✓ ' : ok === false ? '✗ ' : ''}{value}
      </span>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Icon className="w-4 h-4" style={{ color: '#ef4444' }} strokeWidth={1.75} />
        <h2 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.80)' }}>{title}</h2>
      </div>
      <div className="px-5 pb-2">{children}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { getToken } = useAuth();
  const [sysData, setSysData]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.admin.getSystem(token);
        setSysData(res.data ?? res);
      } finally { setLoading(false); }
    })();
  }, [getToken]);

  async function sendTestEmail() {
    setEmailSending(true);
    setEmailResult(null);
    try {
      const token = await getToken();
      if (!token) return;
      // Utilise le premier audit disponible pour tester
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyses/cOuX8eAQWC0u8pIKYPBLWu8Z4G/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: 'academytechs3@gmail.com' }),
      });
      setEmailResult('✓ Email de test envoyé');
    } catch {
      setEmailResult('✗ Échec de l\'envoi');
    } finally { setEmailSending(false); }
  }

  const uptimeH = sysData ? Math.floor(sysData.uptimeSeconds / 3600) : 0;
  const uptimeM = sysData ? Math.floor((sysData.uptimeSeconds % 3600) / 60) : 0;

  return (
    <div className="min-h-screen p-6 sm:p-8" style={{ background: '#0a0a0a' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl" style={{ color: 'rgba(255,255,255,0.90)' }}>Paramètres admin</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.40)' }}>Configuration et diagnostics système</p>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#ef4444' }} /></div>
        ) : (
          <>
            {/* Emails admin */}
            <Section title="Emails administrateurs" icon={Shield}>
              <div className="py-2">
                {(sysData?.adminEmails ?? []).map((email: string) => (
                  <div key={email} className="flex items-center gap-2 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#0CCE6B' }} />
                    <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.75)' }}>{email}</span>
                  </div>
                ))}
                <p className="text-xs py-3" style={{ color: 'rgba(255,255,255,0.30)' }}>
                  Modifiable via la variable d'environnement ADMIN_EMAILS
                </p>
              </div>
            </Section>

            {/* Système */}
            <Section title="Informations système" icon={Server}>
              <InfoRow label="Node.js"       value={sysData?.nodeVersion}  mono />
              <InfoRow label="Plateforme"    value={sysData?.platform}     mono />
              <InfoRow label="CPU cores"     value={sysData?.cpuCores}          />
              <InfoRow label="Mémoire RSS"   value={`${sysData?.memoryMb} MB`}  />
              <InfoRow label="Uptime"        value={`${uptimeH}h ${uptimeM}m`}  />
              <InfoRow label="Base de données" value={sysData?.dbConnected ? 'Connectée' : 'Hors ligne'}
                ok={sysData?.dbConnected} />
              <InfoRow label="Démarré le"    value={sysData?.startedAt ? new Date(sysData.startedAt).toLocaleString('fr-FR') : '—'} />
            </Section>

            {/* Actions */}
            <Section title="Actions" icon={Mail}>
              <div className="py-3 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.80)' }}>Email de test Brevo</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Envoie un rapport de test à academytechs3@gmail.com
                    </p>
                  </div>
                  <button
                    onClick={sendTestEmail}
                    disabled={emailSending}
                    className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.28)', color: '#D4AF37' }}>
                    {emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    {emailSending ? 'Envoi…' : 'Envoyer test'}
                  </button>
                </div>
                {emailResult && (
                  <p className="text-xs px-1" style={{ color: emailResult.startsWith('✓') ? '#0CCE6B' : '#FF4E42' }}>
                    {emailResult}
                  </p>
                )}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
