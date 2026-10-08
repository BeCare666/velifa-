import Link from 'next/link';
import { Globe, Search, Gauge, ArrowRight, Sparkles, Eye, Target } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function AProposPage() {
  const t = await getTranslations('about');

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
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <p className="velifa-eyebrow mb-5">{t('eyebrow')}</p>
        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-text mb-6 leading-tight">
          {t('title')}
        </h1>
        <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          {t('subtitle')}
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="velifa-card py-10 px-8 md:py-14 md:px-16 text-center">
          <p className="velifa-eyebrow mb-6">{t('missionEyebrow')}</p>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-text mb-6">
            {t('missionTitle')}
          </h2>
          <p className="text-text-muted leading-relaxed text-base md:text-lg max-w-2xl mx-auto">
            {t('missionDesc')}
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <p className="velifa-eyebrow mb-4">{t('whyEyebrow')}</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text">
            {t('whyTitle')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {whyPoints.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title} className="velifa-card">
                <div className="w-12 h-12 rounded-velifa-md flex items-center justify-center mb-5"
                  style={{ background: 'var(--accent-soft)' }}>
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-heading font-semibold text-text mb-3">{point.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{point.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <p className="velifa-eyebrow mb-4">{t('valuesEyebrow')}</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text">
            {t('valuesTitle')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <div key={value.title} className="velifa-card text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'var(--accent-soft)', border: '2px solid var(--accent)' }}>
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-heading font-semibold text-text mb-3">{value.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{value.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="velifa-card text-center py-12 px-6">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-text mb-4">
            {t('ctaTitle')}
          </h2>
          <p className="text-text-muted mb-8 max-w-md mx-auto text-sm leading-relaxed">
            {t('ctaSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/" className="velifa-btn">
              {t('ctaButton')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/tarifs" className="velifa-btn velifa-btn--ghost">
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 pb-16 text-center">
        <p className="text-text-subtle text-xs">{t('footerNote')}</p>
      </div>
    </main>
  );
}
