'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { MarketingHero } from '@/components/marketing';

function AccordionItem({ question, answer }: { question: string; answer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center justify-between gap-6 py-6 text-start"
        aria-expanded={open}
      >
        <span className="font-heading text-base font-medium leading-relaxed text-text md:text-lg">
          {question}
        </span>
        <span className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-border text-text-muted transition-all duration-200 group-hover:text-text ${open ? 'rotate-180 border-[color:var(--border-strong)]' : ''}`}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="max-w-3xl pb-6 text-sm leading-relaxed text-text-muted md:text-[15px]">{answer}</div>
        </div>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const t = useTranslations('faq');
  const locale = useLocale();

  const faqs = [
    { question: t('q1'), answer: t('a1') },
    { question: t('q2'), answer: t('a2') },
    { question: t('q3'), answer: t('a3') },
    { question: t('q4'), answer: t('a4') },
    { question: t('q5'), answer: t('a5') },
    { question: t('q6'), answer: t('a6') },
    { question: t('q7'), answer: t('a7') },
    { question: t('q8'), answer: t('a8') },
    {
      question: t('q9'),
      answer: (
        <span>
          {t('a9_free')} <strong>{t('a9_freePlan')}</strong> {t('a9_mid')}{' '}
          <strong>{t('a9_proPlan')}</strong> {t('a9_proDesc')}{' '}
          {t('a9_business')} <strong>{t('a9_businessPlan')}</strong> {t('a9_businessDesc')}{' '}
          <Link href={`/${locale}/tarifs`} className="font-medium text-text underline underline-offset-4">
            {t('a9_link')}
          </Link>
        </span>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-bg">
      <MarketingHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-6 sm:py-20">
        <div className="border-t border-border">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-20 sm:px-6">
        <div className="flex flex-col items-start gap-5 rounded-velifa-xl border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full border border-border bg-[color:var(--bg)] text-text">
              <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="font-heading text-lg font-semibold text-text">{t('ctaTitle')}</h2>
              <p className="mt-0.5 text-sm text-text-muted">{t('ctaDesc')}</p>
            </div>
          </div>
          <Link href={`/${locale}/contact`} className="velifa-btn inline-flex flex-shrink-0 items-center gap-2">
            {t('ctaButton')}
          </Link>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <p className="text-text-subtle text-xs">{t('footerNote')}</p>
      </div>
    </main>
  );
}
