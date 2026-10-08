import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function MentionsLegalesPage() {
  const t = await getTranslations('legal');

  const sections = [
    {
      title: t('s1Title'),
      content: (
        <>
          <p className="mb-3"><strong>{t('s1CompanyName')}</strong> [Nom de l&apos;entreprise — à compléter]</p>
          <p className="mb-3"><strong>{t('s1LegalStatus')}</strong> [Statut juridique — à compléter]</p>
          <p className="mb-3"><strong>{t('s1Address')}</strong> [Adresse complète — à compléter]</p>
          <p className="mb-3"><strong>{t('s1RegNumber')}</strong> [Numéro d&apos;immatriculation — à compléter]</p>
          <p className="mb-3"><strong>{t('s1Email')}</strong> [adresse@email.com — à compléter]</p>
          <p><strong>{t('s1Phone')}</strong> [Numéro de téléphone — à compléter]</p>
        </>
      ),
    },
    {
      title: t('s2Title'),
      content: (
        <p><strong>{t('s2Name')}</strong> [Nom et prénom du directeur de publication — à compléter]</p>
      ),
    },
    {
      title: t('s3Title'),
      content: (
        <p>
          {t('s3Content')}
        </p>
      ),
    },
    {
      title: t('s4Title'),
      content: (
        <p>{t('s4Content')}</p>
      ),
    },
    {
      title: t('s5Title'),
      content: (
        <p>{t('s5Content')}</p>
      ),
    },
    {
      title: t('s6Title'),
      content: (
        <p>{t('s6Content')}</p>
      ),
    },
    {
      title: t('s7Title'),
      content: (
        <p>{t('s7Content')}</p>
      ),
    },
    {
      title: t('s8Title'),
      content: (
        <p>
          {t('s8Content')}<br />
          <strong>{t('s8Email')}</strong> [adresse@email.com — à compléter]<br />
          <strong>{t('s8Whatsapp')}</strong> [https://wa.me/22900000000 — à remplacer]
        </p>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-bg">

      {/* ── Notice ──────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 pt-8">
        <div className="bg-score-average/10 border border-score-average/30 rounded-velifa-md px-5 py-4 mb-8">
          <p className="text-score-average text-sm leading-relaxed">
            <strong>{t('noticeStrong')}</strong> {t('noticeText')}
          </p>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 pb-20">
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-text mb-3">
          {t('title')}
        </h1>
        <p className="text-text-muted text-sm mb-10">
          {t('lastUpdated')}
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-heading font-semibold text-text text-lg mb-4 pb-3 border-b border-border">
                {section.title}
              </h2>
              <div className="text-text-muted text-sm leading-relaxed space-y-1">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 pb-16 text-center">
        <Link href="/" className="text-text-subtle text-xs hover:text-accent transition-colors">
          {t('backHome')}
        </Link>
      </div>
    </main>
  );
}
