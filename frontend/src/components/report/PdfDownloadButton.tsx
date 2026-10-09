'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import { FileDown, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const ERROR_KEYS = ['pdf_requires_business', 'pdf_unavailable', 'pdf_failed'] as const;

/** Téléchargement du rapport en PDF à la marque d'un espace agence (affiché aux membres d'un espace). */
export default function PdfDownloadButton({ analysisId }: { analysisId: string }) {
  const t = useTranslations('reportPage.pdf');
  const locale = useLocale();
  const { isSignedIn, getToken } = useAuth();
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const list = (await api.workspaces.listMine(token)).data ?? [];
        setWorkspaces(list);
        if (list[0]) setWorkspaceId(list[0].id);
      } catch { /* pas d'espace agence : pas de bouton */ }
    })();
  }, [isSignedIn, getToken]);

  if (!isSignedIn || workspaces.length === 0) return null;

  async function download() {
    setBusy(true); setError('');
    try {
      const token = await getToken();
      if (token) await api.downloadReportPdf(token, analysisId, workspaceId, locale);
    } catch (e: any) {
      const key = ERROR_KEYS.find((k) => e?.message === k);
      setError(key ? t(`errors.${key}`) : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {workspaces.length > 1 && (
          <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} aria-label={t('workspace')}
            className="rounded-[8px] border border-border bg-transparent px-2 py-1 text-xs text-text">
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        <button type="button" onClick={download} disabled={busy}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition disabled:opacity-50">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {t('button')}
        </button>
      </div>
      {error && <p className="text-xs score-poor">{error}</p>}
    </div>
  );
}
