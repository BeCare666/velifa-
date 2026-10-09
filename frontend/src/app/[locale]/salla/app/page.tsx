'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, RefreshCw, ExternalLink, Gauge } from 'lucide-react';
import { api } from '@/lib/api';

type Dashboard = {
  store: { name: string | null; domain: string | null };
  tracked: boolean;
  lastAudit: null | {
    id: string; createdAt: string; scorePerformance: number | null;
    recommendations: { id: string; impact: 'high' | 'medium' | 'low' }[];
    siteIssues: string[];
  };
  audits: { usedToday: number; limitPerDay: number };
};

const ERROR_KEYS = ['invalid_token', 'invalid_session', 'app_not_installed', 'salla_not_configured', 'store_not_tracked', 'daily_limit'] as const;
const scoreColor = (s: number | null) =>
  s == null ? 'var(--text-subtle)' : s >= 90 ? 'var(--velifa-score-good)' : s >= 50 ? 'var(--velifa-score-average)' : 'var(--velifa-score-poor)';

/**
 * Tableau de bord VELIFA intégré dans l'espace marchand Salla (Embedded SDK, ROADMAP 3.4).
 * Séquence officielle : embedded.init() → embedded.auth.getToken() → vérification du jeton par notre backend.
 */
export default function SallaAppPage() {
  const t = useTranslations('sallaApp');
  const tr = useTranslations('reportPage');
  const locale = useLocale();
  const [session, setSession] = useState<string | null>(null);
  const [data, setData]       = useState<Dashboard | null>(null);
  const [error, setError]     = useState('');
  const [running, setRunning] = useState(false);
  const started = useRef(false);

  const showError = (e: any) => {
    const key = ERROR_KEYS.find((k) => e?.message === k);
    setError(key ? t(`errors.${key}`) : t('errors.generic'));
  };

  const load = useCallback(async (s: string) => {
    setData((await api.salla.dashboard(s)).data);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      let token: string | null = null;
      try {
        const { embedded } = await import('@salla.sa/embedded-sdk');
        await embedded.init();
        token = embedded.auth.getToken();
      } catch {
        // Hors de l'espace marchand (ou SDK indisponible) : le jeton reste lisible dans l'URL (paramètre « token »)
      }
      token = token ?? new URLSearchParams(window.location.search).get('token');
      if (!token) { setError(t('errors.open_from_salla')); return; }
      try {
        const { session: s } = (await api.salla.session(token)).data;
        setSession(s);
        await load(s);
      } catch (e) { showError(e); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAudit() {
    if (!session) return;
    setRunning(true); setError('');
    try {
      const { id } = (await api.salla.runAudit(session, locale)).data;
      // Suivi jusqu'à la fin de l'audit (≈ 30–60 s), puis rechargement du tableau de bord
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const status = (await api.getAnalysis(id)).data.status;
        if (status === 'completed' || status === 'failed') break;
      }
      await load(session);
    } catch (e) { showError(e); }
    finally { setRunning(false); }
  }

  if (error && !data) {
    return <main className="min-h-screen bg-bg p-6"><p className="text-sm score-poor">{error}</p></main>;
  }
  if (!data) {
    return <main className="min-h-screen bg-bg p-6 flex justify-center"><Loader2 className="w-6 h-6 text-accent animate-spin" /></main>;
  }

  const a = data.lastAudit;
  const left = Math.max(0, data.audits.limitPerDay - data.audits.usedToday);
  const recTitle = (id: string) => (tr.has(`recs.list.${id}.title`) ? tr(`recs.list.${id}.title`) : id);
  const issue = (code: string) => (tr.has(`gulf.issues.${code}`) ? tr(`gulf.issues.${code}`) : code);

  return (
    <main className="min-h-screen bg-bg p-4 sm:p-6 space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <Gauge className="w-5 h-5 text-accent" />
        <h1 className="font-heading font-bold text-lg text-text">{t('title')}</h1>
        {data.store.domain && <span dir="ltr" className="text-xs text-text-muted truncate">{data.store.domain}</span>}
      </header>

      <section className="velifa-card">
        {a ? (
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-heading font-bold" style={{ color: scoreColor(a.scorePerformance) }}>{a.scorePerformance ?? '—'}</div>
              <div className="text-xs text-text-muted">{t('scoreLabel')}</div>
            </div>
            <div className="text-sm text-text-muted space-y-1">
              <p>{t('lastAudit', { date: new Date(a.createdAt).toLocaleDateString(locale) })}</p>
              <a href={`/${locale}/analyse/${a.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                {t('fullReport')} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">{data.tracked ? t('noAuditYet') : t('notTracked')}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="velifa-btn" onClick={runAudit} disabled={running || left === 0 || !data.tracked}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {running ? t('running') : t('runAudit')}
          </button>
          <span className="text-xs text-text-subtle">{t('quota', { left, limit: data.audits.limitPerDay })}</span>
        </div>
        {error && <p className="text-sm score-poor mt-3">{error}</p>}
      </section>

      {a && a.recommendations.length > 0 && (
        <section className="velifa-card">
          <h2 className="font-heading font-semibold text-text mb-3">{t('topFixes')}</h2>
          <ol className="space-y-2 text-sm">
            {a.recommendations.map((r, i) => (
              <li key={r.id} className="flex gap-2"><span className="font-bold text-accent">{i + 1}.</span><span className="text-text">{recTitle(r.id)}</span>
                <span className="text-xs text-text-subtle">({tr(`recs.impact.${r.impact}`)})</span></li>
            ))}
          </ol>
        </section>
      )}

      {a && a.siteIssues.length > 0 && (
        <section className="velifa-card">
          <h2 className="font-heading font-semibold text-text mb-3">{tr('gulf.title')}</h2>
          <ul className="space-y-1 text-sm text-text list-disc ps-5">{a.siteIssues.map((c) => <li key={c}>{issue(c)}</li>)}</ul>
          <p className="text-xs text-text-subtle mt-3">{tr('gulf.disclaimer')}</p>
        </section>
      )}

      <section className="velifa-card text-sm text-text-muted">
        {t('plansNote')}{' '}
        <a href={`/${locale}/tarifs`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{t('seePlans')}</a>
      </section>
    </main>
  );
}
