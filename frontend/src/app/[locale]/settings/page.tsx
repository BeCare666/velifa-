'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  Loader2, User, Bell, AlertTriangle, Mail, Shield,
  ToggleLeft, ToggleRight, Building2, KeyRound,
} from 'lucide-react';
import WorkspaceSection from '@/components/settings/WorkspaceSection';
import ApiKeysSection from '@/components/settings/ApiKeysSection';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, label, description, enableLabel, disableLabel }: {
  on: boolean; onToggle: () => void; label: string; description: string; enableLabel: string; disableLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        aria-label={`${on ? disableLabel : enableLabel} ${label}`}
        className="flex-shrink-0 transition-all"
      >
        {on
          ? <ToggleRight className="w-8 h-8" style={{ color: 'var(--accent)' }} />
          : <ToggleLeft  className="w-8 h-8 text-text-subtle" />
        }
      </button>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[var(--velifa-radius-lg)] overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.45)' }}
    >
      <div
        className="flex items-center gap-2 px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Icon className="w-4 h-4 text-accent" strokeWidth={1.75} />
        <h2 className="font-heading font-semibold text-sm text-text tracking-wide">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
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
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  const fullName = user?.fullName ?? user?.firstName ?? user?.username ?? t('defaultUser');
  const email    = user?.primaryEmailAddress?.emailAddress ?? '';
  const initial  = (user?.firstName?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase();

  return (
    <>
      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 sm:py-16 space-y-6">

          {/* Header */}
          <div className="fade-up">
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text tracking-tight">
              {t('title')}
            </h1>
            <p className="text-text-muted mt-2 text-sm">{t('subtitle')}</p>
          </div>

          {/* Profil */}
          <div className="fade-up" style={{ animationDelay: '60ms' }}>
            <Section title={t('profileTitle')} icon={User}>
              <div className="flex items-center gap-5">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                  style={{
                    background: 'rgba(212,175,55,0.15)',
                    color: 'var(--accent)',
                    border: '2px solid rgba(212,175,55,0.30)',
                  }}
                >
                  {initial}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold tracking-widest uppercase text-text-subtle block mb-1">
                      {t('fullName')}
                    </label>
                    <div
                      className="px-3 py-2 rounded-[var(--velifa-radius-md)] text-sm text-text"
                      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
                    >
                      {fullName}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-widest uppercase text-text-subtle block mb-1">
                      {t('email')}
                    </label>
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-[var(--velifa-radius-md)] text-sm"
                      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    >
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      {email}
                    </div>
                    <p className="text-[11px] text-text-subtle mt-1">
                      {t('emailNote')}
                    </p>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* Notifications (enregistrées côté serveur) */}
          <div className="fade-up" style={{ animationDelay: '80ms' }}>
            <Section title={t('notificationsTitle')} icon={Bell}>
              {!prefs ? (
                prefsError ? <p className="text-sm score-poor">{t('notifError')}</p> : <Loader2 className="w-5 h-5 text-accent animate-spin" />
              ) : (
                <>
                  <Toggle on={prefs.reports} onToggle={() => toggle('reports')} label={t('notif1Label')} description={t('notif1Desc')}
                    enableLabel={t('enable')} disableLabel={t('disable')} />
                  <Toggle on={prefs.alerts} onToggle={() => toggle('alerts')} label={t('notif2Label')} description={t('notif2Desc')}
                    enableLabel={t('enable')} disableLabel={t('disable')} />
                  {prefsError && <p className="text-sm score-poor mt-3">{t('notifError')}</p>}
                </>
              )}
            </Section>
          </div>

          {/* Mon agence (offre B) */}
          <div className="fade-up" style={{ animationDelay: '100ms' }}>
            <Section title={t('workspace.title')} icon={Building2}>
              <WorkspaceSection />
            </Section>
          </div>

          {/* Clés API (API publique v1) */}
          <div className="fade-up" style={{ animationDelay: '120ms' }}>
            <Section title={t('apiKeys.title')} icon={KeyRound}>
              <ApiKeysSection />
            </Section>
          </div>

          {/* Danger zone */}
          <div className="fade-up" style={{ animationDelay: '140ms' }}>
            <Section title={t('dangerTitle')} icon={AlertTriangle}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-text">{t('deleteAccount')}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {t('deleteAccountDesc')}
                  </p>
                </div>
                <div className="relative group">
                  <button
                    disabled
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--velifa-radius-md)] text-xs font-semibold cursor-not-allowed opacity-50"
                    style={{
                      background: 'rgba(255,78,66,0.10)',
                      border: '1px solid rgba(255,78,66,0.30)',
                      color: '#FF4E42',
                    }}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    {t('deleteAccount')}
                  </button>
                  <div
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs rounded-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: 'var(--surface-raised)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.55)',
                    }}
                  >
                    {t('deleteTooltip')}
                  </div>
                </div>
              </div>
            </Section>
          </div>

        </div>
      </div>
    </>
  );
}
