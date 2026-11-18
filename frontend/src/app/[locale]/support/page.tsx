'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  HelpCircle, Mail, MessageCircle, BookOpen, ChevronDown, Gem, Sparkles,
  ArrowUpRight, LayoutGrid, CreditCard, MessagesSquare,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { PageHeader, Panel, Badge } from '@/components/ui';

const SUPPORT_EMAIL = 'support@velifa.com';
const FAQ_KEYS = ['1', '2', '3', '4', '5'] as const;

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between gap-4 py-4 text-start"
      >
        <span className="text-sm font-medium text-text">{q}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-text-subtle transition-transform duration-200 group-hover:text-text ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <p className="pb-4 text-sm leading-relaxed text-text-muted">{a}</p>
        </div>
      </div>
    </div>
  );
}

function ContactCard({
  icon: Icon, title, detail, href, disabled,
}: { icon: React.ElementType; title: string; detail: string; href?: string; disabled?: boolean }) {
  const body = (
    <>
      <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px] border border-border bg-[color:var(--bg-subtle)] text-text">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text">{title}</span>
        <span className="block truncate text-xs text-text-muted" dir="auto">{detail}</span>
      </span>
      {!disabled && <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-text-subtle transition-colors group-hover:text-text rtl:-scale-x-100" />}
    </>
  );
  const cls = 'group flex items-center gap-3 rounded-velifa-md border border-border bg-[color:var(--surface-raised)] p-4 transition-colors';
  if (disabled || !href) return <div className={`${cls} cursor-not-allowed opacity-55`} aria-disabled="true">{body}</div>;
  return <a href={href} className={`${cls} hover:border-[color:var(--border-strong)]`}>{body}</a>;
}

export default function SupportPage() {
  const t = useTranslations('support');
  const locale = useLocale();
  const { plan } = useSubscription();
  const isBusiness = plan === 'business';
  const isPro = plan === 'pro';

  const links = [
    { icon: LayoutGrid,     label: t('linkFeatures'), desc: t('linkFeaturesDesc'), href: `/${locale}/fonctionnalites` },
    { icon: CreditCard,     label: t('linkPricing'),  desc: t('linkPricingDesc'),  href: `/${locale}/tarifs` },
    { icon: MessagesSquare, label: t('linkFaq'),      desc: t('linkFaqDesc'),      href: `/${locale}/faq` },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <PageHeader
          title={t('title')}
          description={isBusiness ? t('subtitleBusiness') : isPro ? t('subtitlePro') : t('subtitleFree')}
          actions={
            isBusiness ? <Badge><Gem className="h-3 w-3" />{t('badgeBusiness')}</Badge>
            : isPro ? <Badge><Sparkles className="h-3 w-3" />{t('badgePro')}</Badge>
            : undefined
          }
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel title={<span className="inline-flex items-center gap-2"><HelpCircle className="h-4 w-4 text-text-muted" strokeWidth={1.75} />{t('faqTitle')}</span>}>
            <div className="-my-4">
              {FAQ_KEYS.map((k) => <FaqItem key={k} q={t(`q${k}`)} a={t(`a${k}`)} />)}
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel title={<span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-text-muted" strokeWidth={1.75} />{t('contactTitle')}</span>}>
              <div className="space-y-3">
                <ContactCard
                  icon={Mail}
                  title={t('email')}
                  detail={SUPPORT_EMAIL}
                  href={`mailto:${SUPPORT_EMAIL}${isBusiness ? '?subject=BUSINESS' : ''}`}
                />
                <ContactCard icon={MessageCircle} title={t('whatsapp')} detail={t('soon')} disabled />
              </div>
              {isBusiness && (
                <p className="mt-4 flex items-start gap-2 rounded-velifa-md border border-border bg-[color:var(--bg-subtle)] px-3.5 py-3 text-xs leading-relaxed text-text-muted">
                  <Gem className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-text" />
                  {t('businessNote')}
                </p>
              )}
            </Panel>

            <Panel title={<span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-text-muted" strokeWidth={1.75} />{t('linksTitle')}</span>} padded={false}>
              <ul className="divide-y divide-[color:var(--border)]">
                {links.map(({ icon: Icon, label, desc, href }) => (
                  <li key={href}>
                    <Link href={href} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[color:var(--surface-raised)]">
                      <Icon className="h-4 w-4 flex-shrink-0 text-text-subtle group-hover:text-text" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-text">{label}</span>
                        <span className="block truncate text-xs text-text-muted">{desc}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-text-subtle group-hover:text-text rtl:-scale-x-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
