'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Copy, Check, RefreshCw, Save } from 'lucide-react';
import { api } from '@/lib/api';

const ERROR_KEYS = ['origin_invalid', 'origins_count', 'widget_requires_business', 'owner_only'] as const;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const input = 'w-full rounded-[8px] border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent';

/** Widget d'audit à intégrer sur le site de l'agence : domaines autorisés, code à copier, prospects reçus. */
export default function WidgetSettings({ workspaceId, isOwner }: { workspaceId: string; isOwner: boolean }) {
  const t = useTranslations('settings.workspace.widget');
  const locale = useLocale();
  const { getToken } = useAuth();
  const [cfg, setCfg]         = useState<any>(null);
  const [origins, setOrigins] = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);

  const showError = (e: any) => {
    const key = ERROR_KEYS.find((k) => e?.message === k);
    setError(key ? t(`errors.${key}`) : t('errors.generic'));
  };

  const apply = (c: any) => { setCfg(c); setOrigins((c.origins ?? []).join('\n')); };

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (token) apply((await api.workspaces.getWidget(token, workspaceId)).data);
    } catch (e) { showError(e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, workspaceId]);

  useEffect(() => { load(); }, [load]);

  async function save(regenerateKey = false) {
    setBusy(true); setError('');
    try {
      const token = await getToken();
      if (!token) return;
      const list = origins.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      apply((await api.workspaces.configureWidget(token, workspaceId, list, regenerateKey)).data);
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  }

  if (!cfg) return <Loader2 className="w-5 h-5 text-accent animate-spin" />;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const snippet = cfg.widgetKey
    ? `<div id="velifa-audit"></div>\n<script src="${origin}/widget.js" data-key="${cfg.widgetKey}" data-api="${API_URL}" async></script>`
    : '';

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">{t('intro')}</p>
      {!cfg.available && <p className="text-sm text-text-muted">{t('businessOnly')}</p>}

      {isOwner && cfg.available && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-subtle" htmlFor="widget-origins">{t('origins')}</label>
          <textarea id="widget-origins" className={input} rows={3} dir="ltr" value={origins} onChange={(e) => setOrigins(e.target.value)}
            placeholder={'https://www.votre-agence.com'} />
          <p className="text-xs text-text-subtle">{t('originsHelp')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="velifa-btn" disabled={busy} onClick={() => save(false)}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('save')}
            </button>
            {cfg.widgetKey && (
              <button type="button" disabled={busy} onClick={() => save(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs border border-border text-text-muted hover:text-text">
                <RefreshCw className="w-3.5 h-3.5" /> {t('regenerate')}
              </button>
            )}
          </div>
        </div>
      )}

      {snippet && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{t('snippet')}</span>
            <button type="button" className="inline-flex items-center gap-1 text-xs text-accent"
              onClick={() => { navigator.clipboard?.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? t('copied') : t('copy')}
            </button>
          </div>
          <pre dir="ltr" className="text-xs p-3 rounded-[8px] overflow-x-auto" style={{ background: 'var(--surface-raised)' }}>{snippet}</pre>
          <p className="text-xs text-text-subtle mt-1">{t('limitNote')}</p>
        </div>
      )}

      {cfg.prospects?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-text mb-2">{t('prospects')}</h4>
          <ul className="divide-y divide-border border border-border rounded-[8px] text-sm">
            {cfg.prospects.map((p: any) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span dir="ltr" className="text-text truncate max-w-[220px]">{p.urlSite}</span>
                <span dir="ltr" className="text-text-muted text-xs">{[p.name, p.email, p.phone ? `+${p.phone}` : null].filter(Boolean).join(' · ')}</span>
                <span className="ms-auto text-xs text-text-subtle">{new Date(p.createdAt).toLocaleDateString(locale)}</span>
                <span className="font-bold w-8 text-center">{p.scorePerformance ?? '—'}</span>
                {p.status === 'completed' && (
                  <a href={`/${locale}/analyse/${p.analysisId}`} className="text-xs text-accent hover:underline">{t('report')}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm score-poor">{error}</p>}
    </div>
  );
}
