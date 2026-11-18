import { Globe, Search, Gauge, Sparkles, Eye, Target } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { MarketingHero, SectionHeading, FeatureGrid, CtaBand } from '@/components/marketing';

export default async function AProposPage() {
  const t = await getTranslations('about');
  const locale = await getLocale();

  const whyPoints = [
    { icon: Globe,  title: t('why1Title'), description: t('why1Desc') },
    { icon: Search, title: t('why2Title'), description: t('why2Desc') },
    { icon: Gauge,  title: t('why3Title'), description: t('why3Desc') },
  ];

  const values = [
    { icon: Sparkles, title: t('val1Title'), description: t('val1Desc') },
    { icon: Eye,      title: t('val2Title'), description: t('val2Desc') },
    { icon: Target,   title: t('val3Title'), description: t('val3Desc') },
  ];

  return (
    <main className="min-h-screen bg-bg">
      <MarketingHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      {/* Mission : citation éditoriale */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
          <div>
            <p className="velifa-eyebrow mb-4">{t('missionEyebrow')}</p>
            <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-text md:text-[40px]">
              {t('missionTitle')}
            </h2>
          </div>
          <blockquote className="border-s-2 border-[color:var(--border-strong)] ps-6 text-lg leading-relaxed text-text-muted md:text-xl">
            {t('missionDesc')}
          </blockquote>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-6">
        <SectionHeading eyebrow={t('whyEyebrow')} title={t('whyTitle')} />
        <FeatureGrid items={whyPoints} columns={3} />
      </section>

      <section className="border-y border-border bg-bg-subtle">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow={t('valuesEyebrow')} title={t('valuesTitle')} />
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {values.map(({ icon: Icon, title, description }, i) => (
              <div key={title} className="border-t border-[color:var(--border-strong)] pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <Icon className="h-5 w-5 text-text" strokeWidth={1.75} />
                  <span className="font-heading text-sm tabular-nums text-text-subtle">0{i + 1}</span>
                </div>
                <h3 className="mb-2 font-heading text-lg font-semibold text-text">{title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="pt-20">
        <CtaBand
          title={t('ctaTitle')}
          subtitle={t('ctaSubtitle')}
          primary={{ href: `/${locale}#audit`, label: t('ctaButton') }}
          secondary={{ href: `/${locale}/tarifs`, label: t('ctaSecondary') }}
        />
      </div>

      <p className="mx-auto max-w-5xl px-6 pb-16 text-center text-xs text-text-subtle">{t('footerNote')}</p>
    </main>
  );
}
