import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CheckCircle2, AlertCircle } from 'lucide-react';

/** Page affichée après l'installation de l'app VELIFA depuis Zid (redirection du backend, ROADMAP 3.3). */
export default async function ZidInstalledPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; store?: string }>;
}) {
  const { locale } = await params;
  const { status, store } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'zidApp' });
  const ok = status === 'ok';
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="velifa-card max-w-lg w-full text-center space-y-4">
        {ok ? <CheckCircle2 className="w-10 h-10 mx-auto score-good" /> : <AlertCircle className="w-10 h-10 mx-auto score-poor" />}
        <h1 className="font-heading font-bold text-xl text-text">{ok ? t('okTitle') : t('errorTitle')}</h1>
        <p className="text-sm text-text-muted">
          {ok ? t('okBody', { store: (store ?? '').slice(0, 120) || t('yourStore') }) : t('errorBody')}
        </p>
        <Link href={`/${locale}/tarifs`} className="velifa-btn inline-flex">{t('seePlans')}</Link>
      </div>
    </main>
  );
}
