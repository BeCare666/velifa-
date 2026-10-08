import Link from 'next/link';
import {
  BarChart2, Gauge, Camera, Mail,
  Clock, Calendar, Users, FileText, Code2,
  ArrowRight,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return null;
  const color = plan === 'Pro'
    ? 'bg-accent-soft text-accent border border-accent/30'
    : 'bg-surface text-text-muted border border-border';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {plan}
    </span>
  );
}

export default async function FonctionnalitesPage() {
  const t = await getTranslations('featurePage');

  const features = [
    { icon: BarChart2, title: t('f1Title'), description: t('f1Desc'), plan: null },
    { icon: Gauge,    title: t('f2Title'), description: t('f2Desc'), plan: null },
    { icon: Camera,   title: t('f3Title'), description: t('f3Desc'), plan: null },
    { icon: Mail,     title: t('f4Title'), description: t('f4Desc'), plan: null },
    { icon: Clock,    title: t('f5Title'), description: t('f5Desc'), plan: 'Pro' },
    { icon: Calendar, title: t('f6Title'), description: t('f6Desc'), plan: 'Business' },
    { icon: Users,    title: t('f7Title'), description: t('f7Desc'), plan: 'Business' },
    { icon: FileText, title: t('f8Title'), description: t('f8Desc'), plan: 'Business' },
    { icon: Code2,    title: t('f9Title'), description: t('f9Desc'), plan: 'Business' },
  ];

  const steps = [
    { number: '01', title: t('step1Title'), description: t('step1Desc') },
    { number: '02', title: t('step2Title'), description: t('step2Desc') },
    { number: '03', title: t('step3Title'), description: t('step3Desc') },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="velifa-card flex flex-col gap-4">
                <div className="w-12 h-12 rounded-velifa-md flex items-center justify-center"
                  style={{ background: 'var(--accent-soft)' }}>
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-heading font-semibold text-text leading-tight">
                    {feature.title}
                  </h2>
                  <PlanBadge plan={feature.plan} />
                </div>
                <p className="text-text-muted text-sm leading-relaxed flex-1">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-14">
          <p className="velifa-eyebrow mb-4">{t('howEyebrow')}</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text">
            {t('howTitle')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                style={{ background: 'var(--accent-soft)', border: '2px solid var(--accent)' }}>
                <span className="font-heading font-bold text-xl text-accent">{step.number}</span>
              </div>
              <h3 className="font-heading font-semibold text-lg text-text mb-3">{step.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="hidden md:flex justify-center items-center gap-4 mt-[-2rem] mb-[-2rem] relative z-10">
          <div className="velifa-divider w-24" />
          <ArrowRight className="w-5 h-5 text-accent" />
          <div className="velifa-divider w-24" />
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
