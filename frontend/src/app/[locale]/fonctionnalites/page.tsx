import {
  BarChart2, Gauge, Camera, Mail, Clock, Calendar, Users, FileText, Code2,
  Store, Languages, ShieldCheck, ListChecks, GitCompare,
} from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { MarketingHero, SectionHeading, FeatureGrid, Steps, CtaBand, type FeatureItem } from '@/components/marketing';

export default async function FonctionnalitesPage() {
  const t = await getTranslations('featurePage');
  const tCap = await getTranslations('capabilities');
  const locale = await getLocale();

  // Plan requis = celui des tarifs (pricing.*.features) : historique Pro ; programmés, multi-sites, PDF, API Business
  const included: FeatureItem[] = [
    { icon: BarChart2, title: t('f1Title'), description: t('f1Desc') },
    { icon: Gauge,     title: t('f2Title'), description: t('f2Desc') },
    { icon: Camera,    title: t('f3Title'), description: t('f3Desc') },
    { icon: Mail,      title: t('f4Title'), description: t('f4Desc') },
  ];
  const plans: FeatureItem[] = [
    { icon: Clock,    title: t('f5Title'), description: t('f5Desc'), tag: 'Pro' },
    { icon: Calendar, title: t('f6Title'), description: t('f6Desc'), tag: 'Business' },
    { icon: Users,    title: t('f7Title'), description: t('f7Desc'), tag: 'Business' },
    { icon: FileText, title: t('f8Title'), description: t('f8Desc'), tag: 'Business' },
    { icon: Code2,    title: t('f9Title'), description: t('f9Desc'), tag: 'Business', wide: true },
  ];

  // Contrôles propres à VELIFA (textes déjà validés de l'accueil, namespace `capabilities`)
  const gulf: FeatureItem[] = (['field', 'platforms', 'arabic', 'privacy', 'priorities', 'compare'] as const).map((k) => ({
    icon: { field: Users, platforms: Store, arabic: Languages, privacy: ShieldCheck, priorities: ListChecks, compare: GitCompare }[k],
    title: tCap(`${k}.title`),
    description: tCap(`${k}.desc`),
  }));

  const steps = [
    { number: '01', title: t('step1Title'), description: t('step1Desc') },
    { number: '02', title: t('step2Title'), description: t('step2Desc') },
    { number: '03', title: t('step3Title'), description: t('step3Desc') },
  ];

  return (
    <main className="min-h-screen bg-bg">
      <MarketingHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <FeatureGrid items={included} columns={2} />
        <div className="mt-6">
          <FeatureGrid items={plans} columns={3} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-6">
        <SectionHeading eyebrow={tCap('eyebrow')} title={tCap('title')} subtitle={tCap('subtitle')} />
        <FeatureGrid items={gulf} columns={3} />
      </section>

      <section className="border-y border-border bg-bg-subtle">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow={t('howEyebrow')} title={t('howTitle')} />
          <Steps steps={steps} />
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
