'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Server, Database, Mail, Trash2, RefreshCw, Activity, Layers, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { ToastContainer, toast } from '@/components/admin/AdminToast';
import { PageHeader, Panel, Badge, Skeleton, ErrorNote } from '@/components/ui';

const REFRESH_S = 30;

const fmtUptime = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d} j ${h} h ${m} min` : `${h} h ${m} min`;
};

/** État d'un service : `null` = inconnu (réponse du backend absente). */
type State = boolean | null;

function Dot({ ok }: { ok: State }) {
  const color = ok == null ? 'var(--text-subtle)' : ok ? 'var(--velifa-score-good)' : 'var(--velifa-score-poor)';
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ background: color }} />}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0 first:pt-0 last:pb-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="truncate text-end font-mono text-xs text-text" dir="ltr">{value}</span>
    </div>
  );
}

function ActionRow({
  title, description, label, doneLabel, icon: Icon, state, onClick,
}: {
  title: string; description: string; label: string; doneLabel: string; icon: React.ElementType;
  state: 'idle' | 'loading' | 'ok' | 'err'; onClick: () => void;
}) {
  const style =
    state === 'ok' ? { color: 'var(--velifa-score-good)', background: 'var(--velifa-score-good-bg)', borderColor: 'transparent' }
    : state === 'err' ? { color: 'var(--velifa-score-poor)', background: 'var(--velifa-score-poor-bg)', borderColor: 'transparent' }
    : undefined;
  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="mt-0.5 text-xs text-text-muted">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={state === 'loading'}
        className="inline-flex h-9 flex-shrink-0 items-center gap-2 self-start rounded-velifa-md border border-border bg-[color:var(--surface)] px-4 text-xs font-medium text-text transition-colors hover:border-[color:var(--border-strong)] disabled:opacity-60 sm:self-auto"
        style={style}
      >
        {state === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
        {state === 'ok' ? doneLabel : state === 'err' ? 'Échec' : label}
      </button>
    </div>
  );
}

export default function AdminSystemPage() {
  const { getToken } = useAuth();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [emailSt, setEmailSt] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [cacheSt, setCacheSt] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [nextRefresh, setNextRefresh] = useState(REFRESH_S);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load(silent = false) {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const token = await getToken().catch(() => null);
      const res = await api.admin.getSystem(token);
      setData(res?.data ?? res);
      if (silent) setError('');
    } catch (e: any) {
      if (!silent) setError(e.message);
      else setData(null);   // backend injoignable : les statuts passent à « inconnu »
    }
    finally { if (!silent) setLoading(false); }
  }

  useEffect(() => {
    load();
    timerRef.current = setInterval(() => { load(true); setNextRefresh(REFRESH_S); }, REFRESH_S * 1000);
    const countdown = setInterval(() => setNextRefresh((n) => Math.max(0, n - 1)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(countdown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTestEmail() {
    setEmailSt('loading');
    try {
      const token = await getToken();
      if (!token) { toast('Session expirée, reconnectez-vous', 'error'); setEmailSt('err'); return; }
      const res = await api.admin.testEmail(token);
      const d = res?.data ?? res;
      if (d?.sent) { toast('Email de test envoyé', 'success'); setEmailSt('ok'); }
      else { toast(`Échec : ${d?.reason ?? 'inconnu'}`, 'error'); setEmailSt('err'); }
    } catch (e: any) { toast(e.message, 'error'); setEmailSt('err'); }
    setTimeout(() => setEmailSt('idle'), 4000);
  }

  async function handleClearCache() {
    setCacheSt('loading');
    try {
      const token = await getToken();
      if (!token) { toast('Session expirée, reconnectez-vous', 'error'); setCacheSt('err'); return; }
      const res = await api.admin.clearCache(token);
      const d = res?.data ?? res;
      if (d?.cleared) {
        toast(`Historique nettoyé : ${d.removedCompleted ?? 0} terminées, ${d.removedFailed ?? 0} échouées`, 'success');
        setCacheSt('ok');
        load(true);
      } else { toast(`Échec : ${d?.reason ?? 'inconnu'}`, 'error'); setCacheSt('err'); }
    } catch (e: any) { toast(e.message, 'error'); setCacheSt('err'); }
    setTimeout(() => setCacheSt('idle'), 4000);
  }

  // Uniquement des états mesurés par GET /admin/system (aucun « OK » codé en dur)
  const services: { label: string; ok: State; hint: string }[] = [
    { label: 'API NestJS',     ok: loading ? null : !!data,                         hint: data ? 'Répond' : 'Injoignable' },
    { label: 'Base TiDB',      ok: data ? !!data.dbConnected : null,                hint: data?.dbConnected ? 'Connectée' : 'Déconnectée' },
    { label: 'Redis (file)',   ok: data ? !!data.redisConnected : null,             hint: data?.redisConnected ? 'Joignable' : 'En panne' },
    { label: 'Brevo (emails)', ok: data ? !!data.brevoConfigured : null,            hint: data?.brevoConfigured ? 'Clé configurée' : 'Clé absente' },
    { label: 'Clerk (comptes)', ok: data ? !!data.clerkConfigured : null,           hint: data?.clerkConfigured ? 'Clé configurée' : 'Clé absente' },
  ];
  const down = services.filter((s) => s.ok === false).length;
  const q = data?.queue;

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-bg px-5 pb-16 pt-8 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <PageHeader
            eyebrow="Administration"
            title="Système"
            description={`État de l'infrastructure — actualisation automatique dans ${nextRefresh} s`}
            actions={
              <button type="button" onClick={() => { load(); setNextRefresh(REFRESH_S); }} className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
              </button>
            }
          />

          {error && <ErrorNote>{error}</ErrorNote>}

          {/* Bandeau d'état global */}
          {!loading && (
            <div
              className="mb-5 flex items-center gap-3 rounded-velifa-lg px-5 py-4 text-sm font-medium"
              style={down === 0 && data
                ? { color: 'var(--velifa-score-good)', background: 'var(--velifa-score-good-bg)' }
                : { color: 'var(--velifa-score-poor)', background: 'var(--velifa-score-poor-bg)' }}
            >
              <Activity className="h-4 w-4" />
              {!data ? 'API injoignable : statuts inconnus' : down === 0 ? 'Tous les services répondent' : `${down} service${down > 1 ? 's' : ''} en panne ou non configuré${down > 1 ? 's' : ''}`}
            </div>
          )}

          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {services.map((s) => (
              <div key={s.label} className="rounded-velifa-lg border border-border bg-[color:var(--surface)] p-4">
                <div className="flex items-center gap-2">
                  <Dot ok={s.ok} />
                  <span className="truncate text-sm font-medium text-text">{s.label}</span>
                </div>
                <p className="mt-2 text-xs text-text-muted">{s.ok == null ? '—' : s.hint}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-velifa-lg" />)}
            </div>
          ) : data && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel
                title={<span className="inline-flex items-center gap-2"><Server className="h-4 w-4 text-text-muted" strokeWidth={1.75} />Serveur NestJS</span>}
                actions={<Badge tone="good">En marche</Badge>}
              >
                <Row label="Node" value={data.nodeVersion ?? '—'} />
                <Row label="Disponibilité" value={fmtUptime(data.uptimeSeconds ?? 0)} />
                <Row label="Mémoire RSS" value={`${data.memoryMb ?? 0} Mo`} />
                <Row label="Cœurs CPU" value={data.cpuCores ?? 0} />
                <Row label="Plateforme" value={data.platform ?? '—'} />
                <Row label="Démarré" value={data.startedAt ? new Date(data.startedAt).toLocaleString('fr-FR') : '—'} />
              </Panel>

              <Panel
                title={<span className="inline-flex items-center gap-2"><Layers className="h-4 w-4 text-text-muted" strokeWidth={1.75} />File d&apos;audits (Redis)</span>}
                actions={data.redisConnected ? <Badge tone="good">Joignable</Badge> : <Badge tone="poor">En panne</Badge>}
              >
                {q ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { k: 'waiting', l: 'En attente' }, { k: 'active', l: 'En cours' }, { k: 'delayed', l: 'Programmées' },
                      { k: 'completed', l: 'Terminées' }, { k: 'failed', l: 'Échouées' },
                    ].map(({ k, l }) => (
                      <div key={k} className="rounded-velifa-md border border-border bg-[color:var(--bg-subtle)] px-3 py-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-subtle">{l}</p>
                        <p className="mt-1 font-heading text-xl font-semibold tabular-nums"
                          style={{ color: k === 'failed' && (q[k] ?? 0) > 0 ? 'var(--velifa-score-poor)' : 'var(--text)' }}>
                          {q[k] ?? 0}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">
                    Redis ne répond pas : les audits restent en attente. Vérifiez <span className="font-mono text-text">REDIS_URL</span> sur l&apos;hébergeur.
                  </p>
                )}
              </Panel>

              <Panel
                title={<span className="inline-flex items-center gap-2"><Database className="h-4 w-4 text-text-muted" strokeWidth={1.75} />Base de données TiDB</span>}
                actions={data.dbConnected ? <Badge tone="good">Connectée</Badge> : <Badge tone="poor">Déconnectée</Badge>}
              >
                <Row label="Connexion" value={data.dbConnected ? 'OK (SELECT 1)' : 'Erreur'} />
                <Row label="Admins configurés" value={(data.adminEmails ?? []).length || 'Aucun'} />
              </Panel>

              <Panel title={<span className="inline-flex items-center gap-2"><Activity className="h-4 w-4 text-text-muted" strokeWidth={1.75} />Actions</span>}>
                <ActionRow
                  title="Tester l'envoi d'email"
                  description="Envoie un email de test via Brevo à l'adresse admin."
                  label="Envoyer un test" doneLabel="Envoyé" icon={Mail}
                  state={emailSt} onClick={handleTestEmail}
                />
                <ActionRow
                  title="Nettoyer l'historique de la file"
                  description="Supprime de Redis les tâches d'audit terminées et échouées. Les audits en attente ne sont pas touchés."
                  label="Nettoyer" doneLabel="Nettoyé" icon={Trash2}
                  state={cacheSt} onClick={handleClearCache}
                />
              </Panel>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
