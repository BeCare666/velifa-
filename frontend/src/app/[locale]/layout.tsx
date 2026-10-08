import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import Providers from '@/components/Providers';
import { fontVariables } from '../fonts';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import ClientLayout from '@/components/layout/ClientLayout';
import ClientFooter from '@/components/layout/ClientFooter';
import { HtmlDirectionSetter } from '@/components/HtmlDirectionSetter';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} data-theme="dark" className={fontVariables}>
      <body className="antialiased">
        <Providers>
          <NextIntlClientProvider messages={messages}>
            <HtmlDirectionSetter />
            <ClientLayout>{children}</ClientLayout>
            <ClientFooter />
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
