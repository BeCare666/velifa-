'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Loader2, Shield, Server, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, Panel, Skeleton, ErrorNote, Badge } from '@/components/ui';

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0 first:pt-0 last:pb-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className={`truncate text-sm font-medium text-text ${mono ? 'font-mono text-xs' : ''}`} dir={mono ? 'ltr' : undefined}>{value}</span>
    </div>
  );
}

const title = (Icon: React.ElementType, text: string) => (
  <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-text-muted" strokeWidth={1.75} />{text}</span>
);

export default function AdminSettingsPage() {
  const { getToken } = useAuth();
  const [sysData, setSysData]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult]   = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) { setError('Session expirée, reconnectez-vous'); return; }
        const res = await api.admin.getSystem(token);
        setSysData(res?.data ?? res);
      } catch (e: any) { setError(e.message ?? 'Chargement impossible'); }
      finally { setLoading(false); }
    })();
  }, [getToken]);

  async function sendTestEmail() {
    setEmailSending(true);
    setEmailResult(null);
    try {
      const token = await getToken();
      if (!token) return;
      // Envoyé au premier email de ADMIN_EMAILS (route admin dédiée)
      const res = await api.admin.testEmail(token);
      const result = res?.data ?? res;
      setEmailResult(result?.sent ? { ok: true, text: 'Email de test envoyé' } : { ok: false, text: `Échec : ${result?.reason ?? 'inconnu'}` });
    } catch {
      setEmailResult({ ok: false, text: 'Échec de l\'envoi' });
    } finally { setEmailSending(false); }
  }

  const uptimeH = sysData ? Math.floor(sysData.uptimeSeconds / 3600) : 0;
  const uptimeM = sysData ? Math.floor((sysData.uptimeSeconds % 3600) / 60) : 0;
  const admins: string[] = sysData?.adminEmails ?? [];

  return (
    <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="Administration" title="Paramètres admin" description="Configuration et diagnostics du serveur." />

        {error && <ErrorNote>{error}</ErrorNote>}

        {loading ? (
          <div className="space-y-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-velifa-lg" />)}</div>
        ) : sysData && (
          <div className="space-y-5">
            <Panel title={title(Shield, 'Emails administrateurs')} actions={<Badge>{admins.length}</Badge>}>
              {admins.length === 0 ? (
                <p className="text-sm score-poor">Aucun administrateur configuré.</p>
              ) : (
                <ul className="space-y-2">
                  {admins.map((email) => (
                    <li key={email} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--velifa-score-good)' }} />
                      <span className="truncate font-mono text-xs text-text" dir="ltr">{email}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-text-subtle">
                Modifiable via la variable d&apos;environnement <span className="font-mono">ADMIN_EMAILS</span> sur l&apos;hébergeur.
              </p>
            </Panel>

            <Panel title={title(Server, 'Informations système')}>
              <InfoRow label="Node.js" value={sysData.nodeVersion} mono />
              <InfoRow label="Plateforme" value={sysData.platform} mono />
              <InfoRow label="Cœurs CPU" value={sysData.cpuCores} />
              <InfoRow label="Mémoire RSS" value={`${sysData.memoryMb} Mo`} />
              <InfoRow label="Disponibilité" value={`${uptimeH} h ${uptimeM} min`} />
              <InfoRow label="Base de données" value={sysData.dbConnected ? <Badge tone="good">Connectée</Badge> : <Badge tone="poor">Hors ligne</Badge>} />
              <InfoRow label="Redis" value={sysData.redisConnected ? <Badge tone="good">Joignable</Badge> : <Badge tone="poor">En panne</Badge>} />
              <InfoRow label="Démarré le" value={sysData.startedAt ? new Date(sysData.startedAt).toLocaleString('fr-FR') : '—'} />
            </Panel>

            <Panel title={title(Mail, 'Actions')}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-text">Email de test Brevo</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Envoie un rapport de test au premier email de <span className="font-mono">ADMIN_EMAILS</span>.
                  </p>
                </div>
                <button type="button" onClick={sendTestEmail} disabled={emailSending} className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2 self-start disabled:opacity-50 sm:self-auto">
                  {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {emailSending ? 'Envoi…' : 'Envoyer un test'}
                </button>
              </div>
              {emailResult && (
                <p className="mt-3 text-xs" style={{ color: emailResult.ok ? 'var(--velifa-score-good)' : 'var(--velifa-score-poor)' }}>
                  {emailResult.text}
                </p>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
