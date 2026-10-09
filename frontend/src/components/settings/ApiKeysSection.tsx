'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Copy, Check, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

const ERROR_KEYS = ['api_requires_business', 'name_invalid', 'keys_limit', 'key_not_found'] as const;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const input = 'w-full rounded-[8px] border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent';

/** Clés de l'API publique v1 : la clé complète n'est affichée qu'une fois, à la création. */
export default function ApiKeysSection() {
  const t = useTranslations('settings.apiKeys');
  const locale = useLocale();
  const { getToken } = useAuth();
  const [data, setData]   = useState<{ keys: any[]; available: boolean } | null>(null);
  const [name, setName]   = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  const showError = (e: any) => {
    const key = ERROR_KEYS.find((k) => e?.message === k);
    setError(key ? t(`errors.${key}`) : t('errors.generic'));
  };

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (token) setData((await api.apiKeys.list(token)).data);
    } catch (e) { showError(e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  async function run(action: (token: string) => Promise<void>) {
    setBusy(true); setError('');
    try {
      const token = await getToken();
      if (token) await action(token);
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  }

  if (!data) return <Loader2 className="w-5 h-5 text-accent animate-spin" />;
  if (!data.available && data.keys.length === 0) return <p className="text-sm text-text-muted">{t('businessOnly')}</p>;

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale) : '—');
  const curl = `curl -X POST ${API_URL}/public/audits \\\n  -H "Authorization: Bearer ${newKey ?? 'vlf_…'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://example.com","locale":"${locale}"}'`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">{t('intro')}</p>

      {newKey && (
        <div className="p-3 rounded-[8px] space-y-2" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.35)' }}>
          <p className="text-xs flex items-center gap-1.5 text-text"><AlertTriangle className="w-3.5 h-3.5 text-accent" /> {t('showOnce')}</p>
          <div className="flex items-center gap-2">
            <code dir="ltr" className="text-xs break-all flex-1">{newKey}</code>
            <button type="button" className="inline-flex items-center gap-1 text-xs text-accent flex-shrink-0"
              onClick={() => { navigator.clipboard?.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? t('copied') : t('copy')}
            </button>
          </div>
        </div>
      )}

      {data.keys.length > 0 && (
        <ul className="divide-y divide-border border border-border rounded-[8px] text-sm">
          {data.keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className="text-text font-medium">{k.name}</span>
              <code dir="ltr" className="text-xs text-text-muted">{k.prefix}…</code>
              <span className="text-xs text-text-subtle ms-auto">{t('lastUsed', { date: fmt(k.lastUsedAt) })}</span>
              {k.revokedAt ? (
                <span className="text-xs text-text-subtle">{t('revoked')}</span>
              ) : (
                <button type="button" disabled={busy} aria-label={t('revoke')} title={t('revoke')}
                  className="text-text-subtle hover:text-[var(--velifa-score-poor)]"
                  onClick={() => run(async (token) => { setData((await api.apiKeys.revoke(token, k.id)).data); setNewKey(null); })}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {data.available && (
        <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => {
          e.preventDefault();
          run(async (token) => {
            const created = (await api.apiKeys.create(token, name.trim())).data;
            setNewKey(created.key);
            setName('');
            await load();
          });
        }}>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')}
            aria-label={t('name')} maxLength={80} />
          <button type="submit" className="velifa-btn flex-shrink-0" disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {t('create')}
          </button>
        </form>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle mb-1">{t('example')}</p>
        <pre dir="ltr" className="text-xs p-3 rounded-[8px] overflow-x-auto" style={{ background: 'var(--surface-raised)' }}>{curl}</pre>
        <p className="text-xs text-text-subtle mt-1">{t('exampleNote')}</p>
      </div>

      {error && <p className="text-sm score-poor">{error}</p>}
    </div>
  );
}
