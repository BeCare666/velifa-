'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import { Globe, Plus, Trash2, RefreshCw, FileSearch, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const ERROR_KEYS = ['url_invalid', 'site_limit', 'already_tracked'] as const;

const scoreColor = (s: number) =>
  s >= 90 ? 'var(--velifa-score-good)' : s >= 50 ? 'var(--velifa-score-average)' : 'var(--velifa-score-poor)';

const input = 'w-full rounded-[8px] border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent';

/** Sites suivis (personnels ou d'un espace agence), stockés côté serveur avec limite par plan. */
export default function TrackedSites() {
  const t = useTranslations('dashboard.sites');
  const locale = useLocale();
  const router = useRouter();
  const { getToken } = useAuth();

  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [scope, setScope]   = useState('');            // '' = mes sites ; sinon id d'espace agence
  const [data, setData]     = useState<{ sites: any[]; usage: { plan: string; used: number; limit: number } } | null>(null);
  const [url, setUrl]       = useState('');
  const [label, setLabel]   = useState('');
  const [busy, setBusy]     = useState<string | null>(null);
  const [error, setError]   = useState('');

  const showError = (e: any) => {
    const key = ERROR_KEYS.find((k) => e?.message === k);
    setError(key ? t(`errors.${key}`) : t('errors.generic'));
  };

  const load = useCallback(async (s: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.sites.list(token, s || undefined);
      setData(res.data);
    } catch (e) { showError(e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) setWorkspaces((await api.workspaces.listMine(token)).data ?? []);
      } catch { /* sans espace agence : sites personnels seulement */ }
    })();
  }, [getToken]);

  useEffect(() => { setData(null); setError(''); load(scope); }, [scope, load]);

  async function run(key: string, action: (token: string) => Promise<void>) {
    setBusy(key); setError('');
    try {
      const token = await getToken();
      if (token) await action(token);
    } catch (e) { showError(e); }
    finally { setBusy(null); }
  }

  const usage = data?.usage;
  const full = !!usage && usage.used >= usage.limit;

  return (
    <div className="p-5 rounded-[var(--velifa-radius-lg)]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Globe className="w-4 h-4 text-accent" />
        <h2 className="font-heading font-semibold text-sm text-text">{t('title')}</h2>
        {usage && (
          <span className="text-xs text-text-subtle">{t('usage', { used: usage.used, limit: usage.limit })}</span>
        )}
        {workspaces.length > 0 && (
          <select value={scope} onChange={(e) => setScope(e.target.value)} aria-label={t('scope')}
            className="ms-auto rounded-[8px] border border-border bg-transparent px-2 py-1 text-xs text-text">
            <option value="">{t('personal')}</option>
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
      </div>

      {!data ? (
        <Loader2 className="w-5 h-5 text-accent animate-spin" />
      ) : (
        <>
          {data.sites.length === 0 ? (
            <p className="text-sm text-text-muted mb-4">{t('empty')}</p>
          ) : (
            <ul className="divide-y divide-border mb-4">
              {data.sites.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    {s.label && <div className="text-sm font-medium text-text truncate">{s.label}</div>}
                    <div dir="ltr" className="text-xs text-text-muted truncate">{s.urlSite}</div>
                  </div>
                  <span className="text-sm font-bold w-10 text-center" style={{ color: s.lastScore != null ? scoreColor(s.lastScore) : 'var(--text-subtle)' }}
                    title={s.lastAuditAt ? new Date(s.lastAuditAt).toLocaleDateString(locale) : t('neverAudited')}>
                    {s.lastScore ?? '—'}
                  </span>
                  {s.lastAnalysisId && (
                    <Link href={`/${locale}/analyse/${s.lastAnalysisId}`} className="text-text-subtle hover:text-accent" aria-label={t('report')} title={t('report')}>
                      <FileSearch className="w-4 h-4" />
                    </Link>
                  )}
                  <button type="button" className="text-text-subtle hover:text-accent disabled:opacity-50" disabled={!!busy}
                    aria-label={t('audit')} title={t('audit')}
                    onClick={() => run(`audit:${s.id}`, async (token) => {
                      const { id, cached } = (await api.createAnalysis({ url: s.urlSite, locale, force: true }, token)).data;
                      router.push(cached ? `/${locale}/analyse/${id}` : `/${locale}/analyse/loading-page?id=${id}`);
                    })}>
                    {busy === `audit:${s.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </button>
                  <button type="button" className="text-text-subtle hover:text-[var(--velifa-score-poor)] disabled:opacity-50" disabled={!!busy}
                    aria-label={t('remove')} title={t('remove')}
                    onClick={() => run(`del:${s.id}`, async (token) => setData((await api.sites.remove(token, s.id)).data))}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => {
            e.preventDefault();
            run('add', async (token) => {
              setData((await api.sites.add(token, { url: url.trim(), label: label.trim() || undefined, workspaceId: scope || undefined })).data);
              setUrl(''); setLabel('');
            });
          }}>
            <input className={input} dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"
              aria-label={t('url')} maxLength={2048} disabled={full} />
            <input className={`${input} sm:max-w-[200px]`} value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder={t('label')} aria-label={t('label')} maxLength={120} disabled={full} />
            <button type="submit" className="velifa-btn flex-shrink-0" disabled={!!busy || full || !url.trim()}>
              {busy === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {t('add')}
            </button>
          </form>
          {full && (
            <p className="text-xs text-text-muted mt-2">
              {t('limitReached')} <Link href={`/${locale}/tarifs`} className="text-accent hover:underline">{t('seePlans')}</Link>
            </p>
          )}
        </>
      )}
      {error && <p className="text-sm score-poor mt-3">{error}</p>}
    </div>
  );
}
