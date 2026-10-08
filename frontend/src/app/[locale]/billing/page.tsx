'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  Loader2, CreditCard, Sparkles, Gem, ArrowRight,
  Calendar, History, ExternalLink,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTranslations } from 'next-intl';

// ── Plan badge ────────────────────────────────────────────────────────────────
function PlanBadge({ plan, freeLabel }: { plan: 'pro' | 'business' | null; freeLabel: string }) {
  if (plan === 'pro') return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase"
      style={{
        background: 'rgba(212,175,55,0.15)',
        border: '1px solid rgba(212,175,55,0.40)',
        color: 'var(--accent)',
      }}
    >
      <Sparkles className="w-3 h-3" />
      Pro
    </span>
  );
  if (plan === 'business') return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase"
      style={{
        background: 'rgba(200,200,200,0.12)',
        border: '1px solid rgba(200,200,200,0.40)',
        color: '#E8E8E8',
      }}
    >
      <Gem className="w-3 h-3" />
      Business
    </span>
  );
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-subtle)' }}
    >
      {freeLabel}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { plan, isActive } = useSubscription();
  const t = useTranslations('billing');

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const isPaid = plan === 'pro' || plan === 'business';
  const planLabel = plan === 'pro' ? 'Pro' : plan === 'business' ? 'Business' : t('freePlan');

  return (
    <>
      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 sm:py-16 space-y-6">

          {/* Header */}
          <div className="fade-up">
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text tracking-tight">
              {t('title')}
            </h1>
            <p className="text-text-muted mt-2 text-sm">{t('subtitle')}</p>
          </div>

          {/* Plan actuel */}
          <div
            className="fade-up rounded-[var(--velifa-radius-lg)] p-6"
            style={{
              background: isPaid
                ? plan === 'business'
                  ? 'linear-gradient(135deg, rgba(200,200,200,0.07) 0%, rgba(26,26,26,0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(26,26,26,0.95) 100%)'
                : 'var(--surface)',
              border: isPaid
                ? plan === 'business' ? '1px solid rgba(200,200,200,0.38)' : '1px solid rgba(212,175,55,0.35)'
                : '1px solid var(--border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
              animationDelay: '60ms',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: plan === 'business' ? 'rgba(200,200,200,0.12)' : 'rgba(212,175,55,0.12)',
                    border: plan === 'business' ? '1px solid rgba(200,200,200,0.30)' : '1px solid rgba(212,175,55,0.28)',
                  }}
                >
                  {plan === 'business'
                    ? <Gem className="w-5 h-5" style={{ color: '#E8E8E8' }} />
                    : plan === 'pro'
                      ? <Sparkles className="w-5 h-5 text-accent" />
                      : <CreditCard className="w-5 h-5 text-text-subtle" />
                  }
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-text-subtle mb-1">
                    {t('currentPlan')}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-xl text-text">{planLabel}</span>
                    <PlanBadge plan={plan} freeLabel={t('freePlan')} />
                  </div>
                </div>
              </div>

              {!isPaid && (
                <Link
                  href="/tarifs"
                  className="velifa-btn inline-flex items-center gap-2 self-start sm:self-auto"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('changePlan')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              {isPaid && (
                <Link
                  href="/tarifs"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--velifa-radius-md)] text-xs font-medium transition-all"
                  style={{
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t('managePlan')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Renouvellement */}
            {isPaid && isActive && (
              <div
                className="mt-5 flex items-center gap-2 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>
                  {t('renewalNote')}
                </span>
              </div>
            )}
          </div>

          {/* Historique */}
          <div
            className="fade-up rounded-[var(--velifa-radius-lg)] overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
              animationDelay: '100ms',
            }}
          >
            <div
              className="flex items-center gap-2 px-6 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <History className="w-4 h-4 text-accent" strokeWidth={1.75} />
              <h2 className="font-heading font-semibold text-sm text-text">{t('historyTitle')}</h2>
            </div>
            <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
              <History className="w-8 h-8 text-text-subtle" strokeWidth={1.25} />
              <p className="text-sm font-medium text-text-muted">
                {t('historyEmpty')}
              </p>
              <p className="text-xs text-text-subtle max-w-xs">
                {t('historyEmptyDesc')}
              </p>
            </div>
          </div>

          {/* Annuler */}
          {isPaid && (
            <div
              className="fade-up rounded-[var(--velifa-radius-lg)] p-6"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
                animationDelay: '140ms',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-text mb-0.5">{t('cancelTitle')}</p>
                  <p className="text-xs text-text-muted">
                    {t('cancelDesc')}
                  </p>
                </div>
                <a
                  href={`mailto:support@velifa.com?subject=Annulation abonnement&body=Email: ${email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--velifa-radius-md)] text-xs font-medium transition-all self-start sm:self-auto"
                  style={{
                    background: 'rgba(255,78,66,0.08)',
                    border: '1px solid rgba(255,78,66,0.25)',
                    color: '#FF4E42',
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t('contactSupport')}
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
