'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { BrandMark } from './Header';

export default function Footer() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const href = (path: string) => `/${locale}${path}`;

  const columns = [
    {
      title: t('product'),
      links: [
        { label: t('features'), path: '/fonctionnalites' },
        { label: t('pricing'),  path: '/tarifs' },
        { label: t('faq'),      path: '/faq' },
      ],
    },
    {
      title: t('company'),
      links: [
        { label: t('about'),   path: '/a-propos' },
        { label: t('contact'), path: '/contact' },
      ],
    },
    {
      title: t('legal'),
      links: [
        { label: t('legalNotice'), path: '/mentions-legales' },
        { label: t('privacy'),     path: '/confidentialite' },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-bg-subtle">
      <div className="mx-auto max-w-7xl px-5 pb-8 pt-16 sm:px-6">
        <div className="grid grid-cols-2 gap-10 border-b border-border pb-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 md:col-span-1">
            <Link href={href('')} aria-label="VELIFA" className="inline-flex">
              <BrandMark />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-muted">{t('tagline')}</p>
            <Link href={`${href('')}#audit`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-text hover:underline underline-offset-4">
              {tNav('startAudit')}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-subtle">{col.title}</h3>
              <ul className="space-y-3">
                {col.links.map(({ label, path }) => (
                  <li key={path}>
                    <Link href={href(path)} className="text-sm text-text-muted transition-colors hover:text-text">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-8 text-xs text-text-subtle md:flex-row">
          <p>{t('copyright')}</p>
          <p>{t('madeWith')}</p>
        </div>
      </div>
    </footer>
  );
}
