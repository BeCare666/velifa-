import Link from 'next/link';
import { MessageCircle, Mail, ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function ContactPage() {
  const t = await getTranslations('contact');

  const contacts = [
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      description: t('whatsappDesc'),
      href: 'https://wa.me/2290162026418',
      external: true,
    },
    {
      icon: Mail,
      label: 'Email',
      description: t('emailDesc'),
      href: 'mailto:contact@velifa.io',
      external: false,
    },
  ];

  return (
    <main className="min-h-screen bg-bg">
      <section className="max-w-2xl mx-auto px-6 pt-16 pb-12 text-center">
        <p className="velifa-eyebrow mb-5">{t('eyebrow')}</p>
        <h1 className="font-heading text-4xl md:text-5xl font-bold text-text mb-5">
          {t('title')}
        </h1>
        <p className="text-text-muted text-base md:text-lg leading-relaxed">
          {t('subtitle')}
        </p>
      </section>

      <section className="max-w-2xl mx-auto px-6 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {contacts.map((contact) => {
            const Icon = contact.icon;
            return (
              <a
                key={contact.label}
                href={contact.href}
                target={contact.external ? '_blank' : undefined}
                rel={contact.external ? 'noopener noreferrer' : undefined}
                className="velifa-card flex flex-col items-center text-center p-8 hover:border-accent transition-colors group"
              >
                <div className="w-14 h-14 rounded-velifa-lg flex items-center justify-center mb-5 transition-colors"
                  style={{ background: 'var(--accent-soft)' }}>
                  <Icon className="w-7 h-7 text-accent" />
                </div>
                <h2 className="font-heading font-semibold text-text text-lg mb-2 group-hover:text-accent transition-colors">
                  {contact.label}
                </h2>
                <p className="text-text-muted text-sm leading-relaxed mb-4">
                  {contact.description}
                </p>
              </a>
            );
          })}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 pb-20">
        <div className="velifa-card text-center py-8 px-6">
          <p className="text-text-muted text-sm mb-5">{t('auditCta')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/" className="velifa-btn">
              {t('launchAudit')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/faq" className="velifa-btn velifa-btn--ghost">
              {t('seeFaq')}
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-6 pb-16 text-center">
        <p className="text-text-subtle text-xs">{t('footerNote')}</p>
      </div>
    </main>
  );
}
