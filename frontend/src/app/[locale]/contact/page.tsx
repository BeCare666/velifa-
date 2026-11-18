import Link from 'next/link';
import { MessageCircle, Mail, ArrowUpRight, ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { MarketingHero } from '@/components/marketing';

export default async function ContactPage() {
  const t = await getTranslations('contact');
  const locale = await getLocale();

  // Coordonnées inchangées (déjà publiées sur le site)
  const contacts = [
    { icon: MessageCircle, label: 'WhatsApp', description: t('whatsappDesc'), detail: '+229 01 62 02 64 18', href: 'https://wa.me/2290162026418', external: true },
    { icon: Mail,          label: 'Email',    description: t('emailDesc'),    detail: 'contact@velifa.io',   href: 'mailto:contact@velifa.io', external: false },
  ];

  return (
    <main className="min-h-screen bg-bg">
      <MarketingHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-px overflow-hidden rounded-velifa-xl border border-border bg-[color:var(--border)] sm:grid-cols-2">
          {contacts.map(({ icon: Icon, label, description, detail, href, external }) => (
            <a
              key={label}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className="group flex flex-col bg-[color:var(--bg)] p-7 transition-colors hover:bg-[color:var(--bg-subtle)] sm:p-8"
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-[12px] border border-border bg-[color:var(--surface)] text-text">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <ArrowUpRight className="h-5 w-5 text-text-subtle transition-all group-hover:-translate-y-0.5 group-hover:text-text rtl:-scale-x-100" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-text">{label}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{description}</p>
              <p className="mt-5 font-mono text-sm text-text" dir="ltr">{detail}</p>
            </a>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-start gap-4 rounded-velifa-lg border border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">{t('auditCta')}</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${locale}#audit`} className="velifa-btn inline-flex items-center gap-2">
              {t('launchAudit')}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
            <Link href={`/${locale}/faq`} className="velifa-btn velifa-btn--ghost">{t('seeFaq')}</Link>
          </div>
        </div>
      </section>

      <p className="mx-auto max-w-4xl px-6 pb-16 text-center text-xs text-text-subtle">{t('footerNote')}</p>
    </main>
  );
}
