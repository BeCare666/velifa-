'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

function AccordionItem({ question, answer }: { question: string; answer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="velifa-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 px-6 text-start group"
        aria-expanded={open}
      >
        <span className="font-heading font-semibold text-text text-sm md:text-base leading-relaxed group-hover:text-accent transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 text-accent transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6">
          <div className="velifa-divider mb-5" />
          <div className="text-text-muted text-sm leading-relaxed">{answer}</div>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const t = useTranslations('faq');

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
          <Link href="/tarifs" className="text-accent hover:text-accent-hover underline">
            {t('a9_link')}
          </Link>
        </span>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-bg">
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
        <p className="velifa-eyebrow mb-5">{t('eyebrow')}</p>
        <h1 className="font-heading text-4xl md:text-5xl font-bold text-text mb-5">
          {t('title')}
        </h1>
        <p className="text-text-muted text-base md:text-lg leading-relaxed">
          {t('subtitle')}
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="velifa-card text-center py-10 px-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--accent-soft)' }}>
            <MessageCircle className="w-6 h-6 text-accent" />
          </div>
          <h2 className="font-heading text-xl font-bold text-text mb-3">{t('ctaTitle')}</h2>
          <p className="text-text-muted text-sm mb-6 leading-relaxed">{t('ctaDesc')}</p>
          <a
            href="https://wa.me/2290162026418"
            target="_blank"
            rel="noopener noreferrer"
            className="velifa-btn inline-flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            {t('ctaButton')}
          </a>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <p className="text-text-subtle text-xs">{t('footerNote')}</p>
      </div>
    </main>
  );
}
