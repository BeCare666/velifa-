'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import {
  Loader2, CreditCard, Sparkles, Gem, ArrowRight, Calendar, History, ExternalLink, ShieldCheck,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { PageHeader, Panel, EmptyState } from '@/components/ui';

export default function BillingPage() {
  const router = useRouter();
  const locale = useLocale();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { plan, isActive } = useSubscription();
  const t = useTranslations('billing');
  const tP = useTranslations('pricing');

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const isPaid = plan === 'pro' || plan === 'business';
  const planKey = plan === 'pro' ? 'pro' : plan === 'business' ? 'business' : 'free';
  const planLabel = plan === 'pro' ? 'Pro' : plan === 'business' ? 'Business' : t('freePlan');
  const PlanIcon = plan === 'business' ? Gem : plan === 'pro' ? Sparkles : CreditCard;
  const features = tP.raw(`${planKey}.features`) as string[];
  const cancelHref = `mailto:support@velifa.com?subject=${encodeURIComponent(t('cancelTitle'))}&body=${encodeURIComponent(`Email: ${email}`)}`;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <PageHeader title={t('title')} description={t('subtitle')} />

        {/* Plan actuel */}
        <section
          className={`relative overflow-hidden rounded-velifa-xl border p-6 sm:p-8 ${
            isPaid ? 'border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]' : 'border-border bg-[color:var(--surface)]'
          }`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 end-[-10%] h-72 w-72 rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgb(var(--accent-rgb)/0.10), transparent 70%)' }}
          />
          <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="velifa-eyebrow mb-4">{t('currentPlan')}</p>
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-[13px] border border-border bg-[color:var(--bg-subtle)] text-text">
                  <PlanIcon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <span className="font-heading text-2xl font-semibold tracking-tight text-text">{planLabel}</span>
                  {isPaid && isActive && <p className="mt-0.5 text-xs text-text-muted">{tP('activeSubscription')}</p>}
                </div>
              </div>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-text-muted">{tP(`${planKey}.desc`)}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {isPaid ? (
                  <Link href={`/${locale}/tarifs`} className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2">
                    {t('managePlan')}
                    <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                ) : (
                  <Link href={`/${locale}/tarifs`} className="velifa-btn inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t('changePlan')}
                    <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                )}
              </div>
            </div>

            <ul className="space-y-2.5 self-center border-t border-border pt-6 md:border-s md:border-t-0 md:ps-8 md:pt-0">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-text">
                  <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[color:var(--text-subtle)]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {isPaid && isActive && (
            <div className="relative mt-8 flex items-center gap-2 border-t border-border pt-5 text-sm text-text-muted">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              {t('renewalNote')}
            </div>
          )}
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel title={<span className="inline-flex items-center gap-2"><History className="h-4 w-4 text-text-muted" strokeWidth={1.75} />{t('historyTitle')}</span>}>
            <EmptyState icon={History} title={t('historyEmpty')} description={t('historyEmptyDesc')} />
          </Panel>

          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-velifa-lg border border-border bg-[color:var(--surface)] p-5 text-xs leading-relaxed text-text-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-text" strokeWidth={1.75} />
              {tP('securePayment')}
            </div>

            {isPaid && (
              <Panel title={t('cancelTitle')}>
                <p className="text-sm text-text-muted">{t('cancelDesc')}</p>
                <a
                  href={cancelHref}
                  className="mt-4 inline-flex items-center gap-2 rounded-velifa-md border px-4 py-2 text-xs font-medium transition-colors"
                  style={{ color: 'var(--velifa-score-poor)', background: 'var(--velifa-score-poor-bg)', borderColor: 'transparent' }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('contactSupport')}
                </a>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
