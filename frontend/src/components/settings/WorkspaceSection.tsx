'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { Loader2, UserPlus, X, Save } from 'lucide-react';
import { api } from '@/lib/api';

/** Codes d'erreur renvoyés par l'API /workspaces (traduits dans settings.workspace.errors). */
const ERROR_KEYS = [
  'name_invalid', 'logo_invalid', 'color_invalid', 'locale_invalid', 'email_invalid',
  'members_limit', 'user_not_found', 'owner_only', 'cannot_remove_owner',
] as const;

const input = 'w-full rounded-[8px] border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent';
const label = 'block text-xs font-semibold uppercase tracking-wide text-text-subtle mb-1.5';

/** « Mon agence » : marque (nom, logo, couleur, langue des rapports) et membres. */
export default function WorkspaceSection() {
  const t = useTranslations('settings.workspace');
  const { getToken, userId } = useAuth();

  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState('');
  const [saved, setSaved]         = useState(false);
  const [form, setForm]           = useState({ name: '', logoUrl: '', brandColor: '#D4AF37', defaultLocale: 'ar' });
  const [memberEmail, setMemberEmail] = useState('');

  const showError = (e: any) => {
    const key = ERROR_KEYS.find((k) => e?.message === k);
    setError(key ? t(`errors.${key}`) : t('errors.generic'));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const mine = (await api.workspaces.listMine(token)).data;
      if (mine.length) {
        const w = (await api.workspaces.get(token, mine[0].id)).data;
        setWorkspace(w);
        setForm({ name: w.name, logoUrl: w.logoUrl ?? '', brandColor: w.brandColor, defaultLocale: w.defaultLocale });
      }
    } catch (e) { showError(e); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  async function run(action: (token: string) => Promise<void>) {
    setBusy(true); setError(''); setSaved(false);
    try {
      const token = await getToken();
      if (!token) return;
      await action(token);
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  }

  const isOwner = workspace?.role === 'owner';

  if (loading) return <Loader2 className="w-5 h-5 text-accent animate-spin" />;

  // Pas encore d'espace : création
  if (!workspace) {
    return (
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async (token) => {
        await api.workspaces.create(token, { name: form.name });
        await load();
      }); }}>
        <p className="text-sm text-text-muted">{t('intro')}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('namePlaceholder')} maxLength={80} aria-label={t('name')} />
          <button type="submit" className="velifa-btn flex-shrink-0" disabled={busy || form.name.trim().length < 2}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {t('create')}
          </button>
        </div>
        {error && <p className="text-sm score-poor">{error}</p>}
      </form>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aperçu de la marque */}
      <div className="flex items-center gap-3 p-3 rounded-[8px]" style={{ background: 'var(--surface-raised)', borderInlineStart: `4px solid ${form.brandColor}` }}>
        {form.logoUrl ? <img src={form.logoUrl} alt="" className="h-8 w-auto max-w-[120px] object-contain" /> : null}
        <span className="font-heading font-semibold" style={{ color: form.brandColor }}>{form.name || '—'}</span>
        <span className="text-xs text-text-subtle ms-auto">{t('preview')}</span>
      </div>

      {/* Marque */}
      <form className="grid sm:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); run(async (token) => {
        const w = (await api.workspaces.update(token, workspace.id, form)).data;
        setWorkspace({ ...workspace, ...w });
        setSaved(true);
      }); }}>
        <div>
          <label className={label} htmlFor="ws-name">{t('name')}</label>
          <input id="ws-name" className={input} value={form.name} disabled={!isOwner} maxLength={80}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className={label} htmlFor="ws-logo">{t('logoUrl')}</label>
          <input id="ws-logo" className={input} dir="ltr" value={form.logoUrl} disabled={!isOwner} placeholder="https://…" maxLength={2048}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
        </div>
        <div>
          <label className={label} htmlFor="ws-color">{t('brandColor')}</label>
          <div className="flex gap-2 items-center">
            <input id="ws-color" type="color" value={form.brandColor} disabled={!isOwner}
              onChange={(e) => setForm({ ...form, brandColor: e.target.value.toUpperCase() })}
              className="h-9 w-12 rounded border border-border bg-transparent" />
            <span dir="ltr" className="text-sm text-text-muted">{form.brandColor}</span>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="ws-locale">{t('defaultLocale')}</label>
          <select id="ws-locale" className={input} value={form.defaultLocale} disabled={!isOwner}
            onChange={(e) => setForm({ ...form, defaultLocale: e.target.value })}>
            <option value="ar">العربية</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
        {isOwner && (
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" className="velifa-btn" disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('save')}
            </button>
            {saved && <span className="text-sm score-good">{t('saved')}</span>}
          </div>
        )}
      </form>

      {/* Membres */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">{t('members')}</h3>
        <ul className="divide-y divide-border border border-border rounded-[8px]">
          {workspace.members.map((m: any) => (
            <li key={m.clerkUserId} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span dir="ltr" className="text-text truncate">{m.email ?? m.clerkUserId}</span>
              {m.clerkUserId === userId && <span className="text-xs text-text-subtle">({t('you')})</span>}
              <span className="ms-auto text-xs text-text-muted">{t(`role.${m.role}`)}</span>
              {m.role !== 'owner' && (isOwner || m.clerkUserId === userId) && (
                <button type="button" aria-label={m.clerkUserId === userId ? t('leave') : t('remove')} title={m.clerkUserId === userId ? t('leave') : t('remove')}
                  className="text-text-subtle hover:text-[var(--velifa-score-poor)]" disabled={busy}
                  onClick={() => run(async (token) => {
                    const members = (await api.workspaces.removeMember(token, workspace.id, m.clerkUserId)).data;
                    if (m.clerkUserId === userId) { setWorkspace(null); await load(); }
                    else setWorkspace({ ...workspace, members });
                  })}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {isOwner && (
          <form className="flex flex-col sm:flex-row gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); run(async (token) => {
            const members = (await api.workspaces.addMember(token, workspace.id, memberEmail)).data;
            setWorkspace({ ...workspace, members });
            setMemberEmail('');
          }); }}>
            <input className={input} type="email" dir="ltr" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)}
              placeholder={t('memberEmail')} aria-label={t('memberEmail')} maxLength={255} />
            <button type="submit" className="velifa-btn flex-shrink-0" disabled={busy || !memberEmail.trim()}>
              <UserPlus className="w-4 h-4" /> {t('addMember')}
            </button>
          </form>
        )}
        {isOwner && <p className="text-xs text-text-subtle mt-2">{t('memberNote')}</p>}
      </div>

      {error && <p className="text-sm score-poor">{error}</p>}
    </div>
  );
}
