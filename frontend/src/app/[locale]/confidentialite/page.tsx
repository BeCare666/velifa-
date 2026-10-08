import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function ConfidentialitePage() {
  const t = await getTranslations('privacy');

  const sections = [
    {
      title: t('s1Title'),
      content: (
        <p>
          {t('s1Intro')}<br />
          <strong>[{t('s1CompanyPlaceholder')}]</strong><br />
          [{t('s1AddressPlaceholder')}]<br />
          {t('s1Email')} <strong>[adresse@email.com — à compléter]</strong>
        </p>
      ),
    },
    {
      title: t('s2Title'),
      content: (
        <>
          <p className="mb-3">{t('s2Intro')}</p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>{t('s2Item1Bold')}</strong> — {t('s2Item1')}</li>
            <li><strong>{t('s2Item2Bold')}</strong> — {t('s2Item2')}</li>
            <li><strong>{t('s2Item3Bold')}</strong> — {t('s2Item3')}</li>
            <li><strong>{t('s2Item4Bold')}</strong> — {t('s2Item4')}</li>
          </ul>
        </>
      ),
    },
    {
      title: t('s3Title'),
      content: (
        <>
          <p className="mb-3">{t('s3Intro')}</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>{t('s3Item1')}</li>
            <li>{t('s3Item2')}</li>
            <li>{t('s3Item3')}</li>
            <li>{t('s3Item4')}</li>
          </ul>
          <p className="mt-4">{t('s3Footer')}</p>
        </>
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
        <>
          <p className="mb-4">{t('s5Intro')}</p>
          <ul className="space-y-3 list-disc list-inside">
            <li>
              <strong>Velifa</strong> — {t('s5Item1')}
              <span className="text-text-subtle text-xs block mt-1 ml-4">{t('s5Item1Policy')} <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline">https://policies.google.com/privacy</a></span>
            </li>
            <li>
              <strong>Brevo</strong> — {t('s5Item2')}
              <span className="text-text-subtle text-xs block mt-1 ml-4">{t('s5Item2Policy')} <a href="https://www.brevo.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline">https://www.brevo.com/legal/privacy/</a></span>
            </li>
            <li>
              <strong>[{t('s5Item3')}]</strong> — {t('s5Item3Desc')}
            </li>
          </ul>
        </>
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
        <>
          <ul className="space-y-2 list-disc list-inside mb-4">
            <li>{t('s7Item1')}</li>
            <li>{t('s7Item2')}</li>
          </ul>
          <p>{t('s7Footer')}</p>
        </>
      ),
    },
    {
      title: t('s8Title'),
      content: (
        <>
          <p className="mb-4">{t('s8Intro')}</p>
          <ul className="space-y-2 list-disc list-inside mb-4">
            <li><strong>{t('s8Right1Bold')}</strong> — {t('s8Right1')}</li>
            <li><strong>{t('s8Right2Bold')}</strong> — {t('s8Right2')}</li>
            <li><strong>{t('s8Right3Bold')}</strong> — {t('s8Right3')}</li>
            <li><strong>{t('s8Right4Bold')}</strong> — {t('s8Right4')}</li>
            <li><strong>{t('s8Right5Bold')}</strong> — {t('s8Right5')}</li>
          </ul>
          <p>{t('s8Footer')}</p>
        </>
      ),
    },
    {
      title: t('s9Title'),
      content: (
        <p>{t('s9Content')}</p>
      ),
    },
    {
      title: t('s10Title'),
      content: (
        <p>{t('s10Content')}</p>
      ),
    },
    {
      title: t('s11Title'),
      content: (
        <p>{t('s11Content')}</p>
      ),
    },
    {
      title: t('s12Title'),
      content: (
        <p>
          {t('s12Content')}<br />
          <strong>{t('s12Email')}</strong> [adresse@email.com — à compléter]<br />
          <strong>{t('s12Whatsapp')}</strong> [https://wa.me/22900000000 — à remplacer]
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
          {sections.map((section, i) => (
            <section key={i}>
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
