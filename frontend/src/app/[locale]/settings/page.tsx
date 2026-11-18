'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { Loader2, User, Bell, AlertTriangle, Mail, Shield, Building2, KeyRound } from 'lucide-react';
import { PageHeader, Panel, Switch, SettingRow, Skeleton } from '@/components/ui';
import WorkspaceSection from '@/components/settings/WorkspaceSection';
import ApiKeysSection from '@/components/settings/ApiKeysSection';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

// ── Section ancrée (navigation latérale) ─────────────────────────────────────
function Section({ id, title, icon: Icon, children }: {
  id: string; title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <Panel title={<span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-text-muted" strokeWidth={1.75} />{title}</span>}>
        {children}
      </Panel>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  // Préférences enregistrées côté serveur et respectées par le worker et les alertes (ROADMAP 2.9)
  const [prefs, setPrefs] = useState<{ reports: boolean; alerts: boolean } | null>(null);
  const [prefsError, setPrefsError] = useState(false);
  const t = useTranslations('settings');

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const token = await getToken();
        if (token) setPrefs((await api.notifications.get(token)).data);
      } catch { setPrefsError(true); }
    })();
  }, [isSignedIn, getToken]);

  async function toggle(key: 'reports' | 'alerts') {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setPrefsError(false);
    try {
      const token = await getToken();
      if (token) setPrefs((await api.notifications.set(token, next)).data);
    } catch {
      setPrefs(prefs);          // retour à l'état enregistré
      setPrefsError(true);
    }
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
      </div>
    );
  }

  const fullName = user?.fullName ?? user?.firstName ?? user?.username ?? t('defaultUser');
  const email    = user?.primaryEmailAddress?.emailAddress ?? '';
  const initial  = (user?.firstName?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase();

  const sections = [
    { id: 'profile',       label: t('profileTitle'),       icon: User },
    { id: 'notifications', label: t('notificationsTitle'), icon: Bell },
    { id: 'workspace',     label: t('workspace.title'),    icon: Building2 },
    { id: 'api-keys',      label: t('apiKeys.title'),      icon: KeyRound },
    { id: 'danger',        label: t('dangerTitle'),        icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <PageHeader title={t('title')} description={t('subtitle')} />

        <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
          {/* Navigation des sections */}
          <nav aria-label={t('title')} className="hidden lg:block">
            <ul className="sticky top-8 space-y-0.5">
              {sections.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <a href={`#${id}`} className="flex items-center gap-2.5 rounded-velifa-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-[color:var(--surface)] hover:text-text">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-5">
            <Section id="profile" title={t('profileTitle')} icon={User}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {user?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded-full border border-border object-cover" />
                ) : (
                  <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full border border-border bg-[color:var(--surface-raised)] font-heading text-xl font-semibold text-text">
                    {initial}
                  </div>
                )}
                <dl className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">{t('fullName')}</dt>
                    <dd className="truncate rounded-velifa-md border border-border bg-[color:var(--surface-raised)] px-3 py-2 text-sm text-text">{fullName}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">{t('email')}</dt>
                    <dd className="flex items-center gap-2 rounded-velifa-md border border-border bg-[color:var(--surface-raised)] px-3 py-2 text-sm text-text-muted">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate" dir="ltr">{email}</span>
                    </dd>
                  </div>
                  <p className="text-xs text-text-subtle sm:col-span-2">{t('emailNote')}</p>
                </dl>
              </div>
            </Section>

            <Section id="notifications" title={t('notificationsTitle')} icon={Bell}>
              {!prefs ? (
                prefsError
                  ? <p className="text-sm score-poor">{t('notifError')}</p>
                  : <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : (
                <>
                  <SettingRow label={t('notif1Label')} description={t('notif1Desc')}>
                    <Switch checked={prefs.reports} onChange={() => toggle('reports')} label={`${prefs.reports ? t('disable') : t('enable')} ${t('notif1Label')}`} />
                  </SettingRow>
                  <SettingRow label={t('notif2Label')} description={t('notif2Desc')}>
                    <Switch checked={prefs.alerts} onChange={() => toggle('alerts')} label={`${prefs.alerts ? t('disable') : t('enable')} ${t('notif2Label')}`} />
                  </SettingRow>
                  {prefsError && <p className="mt-3 text-sm score-poor">{t('notifError')}</p>}
                </>
              )}
            </Section>

            <Section id="workspace" title={t('workspace.title')} icon={Building2}>
              <WorkspaceSection />
            </Section>

            <Section id="api-keys" title={t('apiKeys.title')} icon={KeyRound}>
              <ApiKeysSection />
            </Section>

            <div id="danger" className="scroll-mt-24 rounded-velifa-lg border p-5 sm:p-6" style={{ borderColor: 'var(--velifa-score-poor-bg)' }}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold score-poor">
                    <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                    {t('dangerTitle')}
                  </p>
                  <p className="mt-2 text-sm font-medium text-text">{t('deleteAccount')}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{t('deleteAccountDesc')}</p>
                </div>
                <div className="flex flex-col items-start gap-1.5 sm:items-end">
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-velifa-md px-4 py-2 text-xs font-semibold opacity-60"
                    style={{ background: 'var(--velifa-score-poor-bg)', color: 'var(--velifa-score-poor)' }}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    {t('deleteAccount')}
                  </button>
                  <p className="text-[11px] text-text-subtle">{t('deleteTooltip')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
