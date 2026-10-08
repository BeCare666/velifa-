'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { Check, Zap, Loader2, CheckCircle2, Sparkles, Gem } from 'lucide-react';
import { api } from '@/lib/api';
import { useSubscription } from '@/context/SubscriptionContext';

// ── Checkout button ───────────────────────────────────────────────────────
function CheckoutButton({
  plan,
  label,
  variant,
  userEmail,
  platinum,
  isUpgrade,
}: {
  plan: 'pro' | 'business';
  label: string;
  variant: 'gold' | 'ghost';
  userEmail: string | null;
  platinum?: boolean;
  /** true = l'utilisateur a déjà un abonnement actif → upgrade direct sans checkout */
  isUpgrade?: boolean;
}) {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);

    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/tarifs`);
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Token introuvable');

      const res = await api.createCheckout(
        { plan, email: userEmail ?? undefined },
        token,
      );

      // ── Upgrade direct (Pro → Business) : pas de checkout, déjà mis à jour ──
      if (res.data?.upgraded) {
        window.location.href = '/dashboard?upgraded=true';
        return;
      }

      // ── Nouveau checkout ──────────────────────────────────────────────────
      const url = res.data?.checkoutUrl;
      if (!url) throw new Error('URL de paiement introuvable');
      window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? 'Une erreur est survenue');
      setLoading(false);
    }
  }

  const platinumStyle: React.CSSProperties = platinum
    ? {
        background: 'linear-gradient(135deg, rgba(200,200,200,0.18) 0%, rgba(140,140,140,0.10) 100%)',
        border: '1px solid rgba(200,200,200,0.55)',
        color: '#E8E8E8',
        boxShadow: '0 4px 16px rgba(200,200,200,0.10)',
      }
    : {};

  const t = useTranslations('pricing');
  const loadingLabel = isUpgrade ? t('upgrading') : t('redirecting');

  return (
    <div className="flex flex-col gap-2">
      {isUpgrade && !loading && (
        <p className="text-center text-[11px] text-text-muted mb-1">
          {t('upgradeNote')}
        </p>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className={`velifa-btn w-full flex items-center justify-center gap-2 ${!platinum && variant === 'ghost' ? 'velifa-btn--ghost' : ''} ${loading ? 'opacity-70 cursor-wait' : ''}`}
        style={platinumStyle}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : platinum ? (
          <Gem className="w-4 h-4" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        {loading ? loadingLabel : label}
      </button>
      {error && (
        <p className="text-center text-xs" style={{ color: 'var(--velifa-score-poor)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function TarifsPage() {
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const { plan: currentPlan, isActive, refresh: refreshPlan } = useSubscription();
  const { isSignedIn } = useAuth();
  const t = useTranslations('pricing');

  const plans = [
    {
      key: null as null,
      name: t('free.name'),
      price: '0',
      period: `€${t('perMonth')}`,
      description: t('free.desc'),
      cta: t('ctaFree'),
      ctaHref: '/' as const,
      ctaVariant: 'ghost' as const,
      badge: null,
      featured: false,
      features: (t.raw('free.features') as string[]),
    },
    {
      key: 'pro' as const,
      name: t('pro.name'),
      price: '9',
      period: `€${t('perMonth')}`,
      description: t('pro.desc'),
      cta: t('ctaPro'),
      ctaHref: null,
      ctaVariant: 'gold' as const,
      badge: t('pro.badge'),
      featured: true,
      features: (t.raw('pro.features') as string[]),
    },
    {
      key: 'business' as const,
      name: t('business.name'),
      price: '29',
      period: `€${t('perMonth')}`,
      description: t('business.desc'),
      cta: t('ctaBusiness'),
      ctaHref: null,
      ctaVariant: 'ghost' as const,
      badge: t('business.badge'),
      featured: false,
      features: (t.raw('business.features') as string[]),
    },
  ] as const;

  // Re-fetch le plan à chaque visite (évite le stale data)
  useEffect(() => {
    if (isSignedIn) refreshPlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  return (
    <main className="min-h-screen bg-bg">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <p className="velifa-eyebrow mb-4">{t('eyebrow')}</p>
        <h1 className="font-heading text-4xl md:text-5xl font-bold text-text mb-4">
          {t('heroTitle')}
        </h1>
        <p className="text-text-muted text-lg max-w-xl mx-auto">
          {t('heroSubtitle')}
        </p>
      </section>

      {/* ── Plans ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        {/* Badge plan actuel visible si abonné */}
        {isActive && currentPlan && (
          <div className="flex justify-center mb-8">
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(168,123,30,0.10) 100%)',
                border: '1px solid rgba(212,175,55,0.40)',
                color: 'var(--accent)',
              }}
            >
              <Sparkles className="w-4 h-4" />
              {t('currentPlanBadge')}&nbsp;<strong className="capitalize">{currentPlan}</strong>
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isBizCard = plan.key === 'business';
            const cardStyle = isBizCard
              ? {
                  borderWidth: '2px',
                  borderColor: 'rgba(200,200,200,0.55)',
                  boxShadow: '0 0 0 1px rgba(200,200,200,0.12), 0 16px 48px rgba(0,0,0,0.55), 0 8px 24px rgba(200,200,200,0.08)',
                  background: 'linear-gradient(160deg, rgba(48,48,48,0.95) 0%, rgba(18,18,18,0.99) 60%)',
                }
              : plan.featured
                ? { borderWidth: '2px', boxShadow: 'var(--shadow-gold)' }
                : { boxShadow: '0 4px 20px rgba(0,0,0,0.45)' };
            return (
            <div
              key={plan.name}
              className={`velifa-card relative flex flex-col transition-all duration-300 hover:-translate-y-1 ${plan.featured ? 'border-accent' : ''} ${isBizCard ? 'md:scale-[1.03]' : ''}`}
              style={cardStyle}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {isBizCard ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-bold tracking-wide"
                      style={{
                        background: 'linear-gradient(135deg, #3a3a3a 0%, #1a1a1a 100%)',
                        border: '1px solid rgba(200,200,200,0.55)',
                        color: '#E8E8E8',
                        boxShadow: '0 2px 12px rgba(200,200,200,0.15)',
                      }}
                    >
                      <Gem className="w-3 h-3" />
                      {plan.badge}
                    </span>
                  ) : (
                    <span
                      className="inline-block px-4 py-1 rounded-full text-xs font-bold text-velifa-black tracking-wide"
                      style={{ background: 'var(--velifa-gradient-gold)' }}
                    >
                      {plan.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Plan name */}
              <div className="text-center mb-6 pt-2">
                <h2
                  className={`font-heading font-bold text-lg mb-1 ${plan.featured ? 'velifa-gold-text' : 'text-text'}`}
                  style={isBizCard ? { color: '#E8E8E8' } : undefined}
                >
                  {plan.name}
                </h2>
                <div className="flex items-baseline justify-center gap-1">
                  <span
                    className="font-heading font-bold text-text"
                    style={isBizCard ? { fontSize: '3.25rem', color: '#E8E8E8' } : { fontSize: '3rem' }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-text-muted text-sm">{plan.period}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-text-muted text-sm text-center mb-6 leading-relaxed">
                {plan.description}
              </p>

              <div
                className="velifa-divider mb-6"
                style={isBizCard ? { background: 'linear-gradient(90deg, transparent, rgba(200,200,200,0.30), transparent)' } : undefined}
              />

              {/* Features */}
              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: isBizCard ? '#C8C8C8' : '#0CCE6B' }}
                    />
                    <span className="text-sm text-text">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.ctaHref !== null ? (
                <Link href={plan.ctaHref} className="velifa-btn velifa-btn--ghost w-full text-center">
                  {plan.cta}
                </Link>
              ) : isActive && currentPlan === plan.key ? (
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--velifa-radius-md)] font-heading font-semibold text-sm tracking-wide"
                    style={isBizCard
                      ? {
                          background: 'rgba(200,200,200,0.10)',
                          border: '1px solid rgba(200,200,200,0.45)',
                          color: '#E8E8E8',
                        }
                      : {
                          background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(168,123,30,0.18) 100%)',
                          border: '1px solid rgba(212,175,55,0.45)',
                          color: 'var(--accent)',
                        }
                    }
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t('currentPlanLabel')}
                  </div>
                  <p className="text-xs text-text-subtle">{t('activeSubscription')}</p>
                </div>
              ) : (
                (() => {
                  // Upgrade Pro → Business : l'utilisateur a un abo actif et veut changer
                  const isUpgrade =
                    isBizCard &&
                    isActive &&
                    currentPlan === 'pro';

                  const ctaLabel = isUpgrade
                    ? t('upgradeToBusiness')
                    : plan.cta;

                  return (
                    <CheckoutButton
                      plan={plan.key!}
                      label={ctaLabel}
                      variant={plan.ctaVariant}
                      userEmail={userEmail}
                      platinum={isBizCard}
                      isUpgrade={isUpgrade}
                    />
                  );
                })()
              )}
            </div>
            );
          })}
        </div>

        {/* Note sécurité */}
        <p className="text-center text-text-subtle text-xs mt-10">
          {t('securePayment')}
        </p>
      </section>

      <div className="max-w-5xl mx-auto px-6 pb-16 text-center">
        <p className="text-text-subtle text-sm">
          {t('footerNote')}
        </p>
      </div>
    </main>
  );
}
