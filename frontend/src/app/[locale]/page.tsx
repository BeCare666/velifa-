'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Loader2, Zap, BarChart2, Mail, MessageCircle, ArrowRight,
  Shield, Clock, Globe, ArrowUpRight, RefreshCw, Eye, X, Sparkles, Gauge, Users, Store, Languages, ShieldCheck, ListChecks, GitCompare, FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useAuth, useUser } from '@clerk/nextjs';
import { useCaptcha } from '@/hooks/useCaptcha';
import { normalizeSiteUrl } from '@/lib/site-url';

// ── Formulaire d'audit ───────────────────────────────────────────────────────
function AuditForm() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const t = useTranslations('hero');
  const locale = useLocale();
  const captcha = useCaptcha(!isSignedIn, locale);
  const [url, setUrl]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [cachedInfo, setCachedInfo]   = useState<{ id: string } | null>(null);

  // Email récupéré silencieusement depuis Clerk (non affiché dans le form)
  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? undefined;

  async function handleSubmit(e: React.FormEvent, force = false) {
    e.preventDefault();
    setError('');
    setRateLimited(false);
    setCachedInfo(null);
    setLoading(true);
    try {
      const authToken = isSignedIn ? await getToken() : undefined;
      const res = await api.createAnalysis({
        url: normalizeSiteUrl(url),
        email: clerkEmail,   // undefined si non connecté → modal email après
        cfTurnstileToken: captcha.token ?? undefined,
        locale,
        force,
      }, authToken);
      const { id, cached } = res.data;
      if (cached) {
        setCachedInfo({ id });
      } else {
        router.push(`/analyse/loading-page?id=${id}`);
      }
    } catch (err: any) {
      if ((err as any).statusCode === 429) {
        setRateLimited(true);
      } else {
        setError(err.message ?? 'Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
      captcha.reset();   // un jeton Turnstile n'est valable qu'une fois
    }
  }

  function handleDismiss() {
    setCachedInfo(null);
    setUrl('');
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto text-start" noValidate>
      {/* ── Barre d'audit : un seul champ, large, visible dès l'arrivée ─────── */}
      <label htmlFor="audit-url" className="sr-only">{t('urlLabel')}</label>
      <div
        className="rounded-[22px] p-px shadow-[0_24px_80px_rgba(0,0,0,0.55)] transition-shadow duration-300 focus-within:shadow-[0_0_0_4px_rgb(var(--accent-rgb)/0.18),0_24px_80px_rgba(0,0,0,0.55)]"
        style={{ background: 'linear-gradient(135deg, rgb(var(--accent-rgb)/0.75), rgb(var(--accent-rgb)/0.35) 45%, rgb(var(--accent-rgb)/0.65))' }}
      >
        <div className="flex flex-col sm:flex-row items-stretch gap-2 rounded-[21px] bg-[#0b0b0b]/95 backdrop-blur-md p-2">
          <div className="flex flex-1 min-w-0 items-center gap-3 px-4">
            <Globe className="w-5 h-5 flex-shrink-0 text-accent" aria-hidden />
            <input
              id="audit-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('inputPlaceholder')}
              disabled={loading}
              className="h-14 sm:h-16 w-full min-w-0 bg-transparent text-base sm:text-lg text-text placeholder:text-text-subtle outline-none focus-visible:outline-none disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim() || !captcha.ready}
            className="velifa-btn h-14 sm:h-16 px-8 text-base flex items-center justify-center gap-2 whitespace-nowrap rounded-[16px] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {t('analyzing')}</>
            ) : (
              <>{t('analyzeNow')} <ArrowRight className="w-5 h-5 rtl:rotate-180" /></>
            )}
          </button>
        </div>
      </div>

      {/* ── Vérification anti-robot (visiteurs non connectés) ─────────────── */}
      {captcha.widget && <div className="mt-4 flex justify-center">{captcha.widget}</div>}
      {captcha.pending && (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-text-subtle">
          <Shield className="w-3.5 h-3.5 text-accent" /> {t('captchaPending')}
        </p>
      )}

      {captcha.failed && (
        <div className="mt-4 text-sm text-score-poor bg-score-poor-bg border border-score-poor rounded-velifa-md px-4 py-3 flex items-center justify-between gap-3">
          <span>{t('captchaFailed')}</span>
          <button type="button" onClick={captcha.reset} className="underline whitespace-nowrap">
            {t('captchaRetry')}
          </button>
        </div>
      )}

      {/* ── Erreur générique ──────────────────────────────── */}
      {error && (
        <div className="mt-4 text-sm text-score-poor bg-score-poor-bg border border-score-poor rounded-velifa-md px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Erreur 429 : message incitatif doux ───────────── */}
      {rateLimited && (
        <div
          className="mt-4 rounded-velifa-lg border p-5 space-y-3"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--accent-rgb)/0.10) 0%, rgb(var(--accent-rgb)/0.06) 100%)',
            borderColor: 'rgb(var(--accent-rgb)/0.40)',
          }}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{t('rateLimitTitle')}</p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{t('rateLimitDesc')}</p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Link href="/tarifs" className="velifa-btn flex items-center gap-2 text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              {t('upgradePro')}
            </Link>
            <button type="button" onClick={() => setRateLimited(false)} className="text-xs text-text-muted hover:text-text transition">
              {t('retryTomorrow')}
            </button>
          </div>
        </div>
      )}

      {/* ── Audit récent déjà disponible ──────────────────── */}
      {cachedInfo && (
        <div className="mt-4 rounded-velifa-lg border p-5 space-y-4" style={{ background: 'var(--velifa-ink-900)', borderColor: 'var(--accent)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text">{t('cachedTitle')}</p>
                <p className="text-xs text-text-muted mt-0.5">{t('cachedDesc')}</p>
              </div>
            </div>
            <button type="button" onClick={handleDismiss} className="text-text-subtle hover:text-text transition p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => router.push(`/analyse/${cachedInfo.id}`)} className="velifa-btn flex-1 flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" />
              {t('viewReport')}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
              disabled={loading}
              className="velifa-btn velifa-btn--ghost flex-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('relaunch')}
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-center text-text-subtle">
        {t('privacyNote')}{' '}
        <Link href="/confidentialite" className="text-accent hover:text-accent-hover underline">
          {t('privacyLink')}
        </Link>. {t('noSpam')}
      </p>
    </form>
  );
}

// ── Animations ────────────────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Hero SVG Mockup ───────────────────────────────────────────────────────────
function ReportMockup() {
  return (
    <div className="relative mx-auto" style={{ maxWidth: '520px' }}>
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-velifa-xl opacity-40"
        style={{
          background: 'radial-gradient(ellipse at center, rgb(var(--accent-rgb)/0.15) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }} />

      {/* Card frame */}
      <div className="relative rounded-velifa-xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgb(var(--accent-rgb)/0.1)',
        }}>

        {/* Browser bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border"
          style={{ background: 'var(--velifa-ink-900)' }}>
          {['#FF5F57','#FFBD2E','#28C840'].map((c, i) => (
            <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
          ))}
          <div className="flex-1 mx-4 h-5 rounded-md text-center text-xs flex items-center px-3"
            style={{ background: 'var(--velifa-ink-800)', color: 'var(--text-subtle)' }}>
            velifa.io/analyse/rapport
          </div>
        </div>

        {/* Report content */}
        <div className="p-6 space-y-5">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <div className="w-24 h-3 rounded mb-2" style={{ background: 'var(--accent)', opacity: 0.9 }} />
              <div className="w-16 h-2 rounded" style={{ background: 'var(--border)' }} />
            </div>
            {/* Score ring mini */}
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="6" />
                <circle cx="32" cy="32" r="26" fill="none"
                  stroke="var(--velifa-score-good)" strokeWidth="6"
                  strokeDasharray="163.4" strokeDashoffset="16.3"
                  strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-heading font-bold text-lg"
                style={{ color: 'var(--velifa-score-good)' }}>90</span>
            </div>
          </div>

          {/* Score bars */}
          {[
            { label: 'Performance', score: 92, color: 'var(--velifa-score-good)' },
            { label: 'Accessibilité', score: 78, color: 'var(--velifa-score-average)' },
            { label: 'SEO', score: 95, color: 'var(--velifa-score-good)' },
            { label: 'Bonnes pratiques', score: 88, color: 'var(--velifa-score-good)' },
          ].map(({ label, score, color }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-subtle)' }}>{label}</span>
                <span className="font-bold" style={{ color }}>{score}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
              </div>
            </div>
          ))}

          {/* Divider */}
          <div className="border-t border-border" style={{ borderStyle: 'dashed' }} />

          {/* CWV row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'LCP', value: '1.2s', good: true },
              { label: 'CLS', value: '0.00', good: true },
              { label: 'TBT', value: '180ms', good: true },
            ].map(({ label, value, good }) => (
              <div key={label} className="rounded-lg p-3 text-center"
                style={{ background: 'var(--velifa-score-good-bg)', border: '1px solid rgba(12,206,107,0.2)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>{label}</div>
                <div className="font-heading font-bold text-sm" style={{ color: 'var(--velifa-score-good)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Screenshot placeholder */}
          <div className="rounded-lg overflow-hidden h-20" style={{ background: 'var(--velifa-ink-900)', border: '1px solid var(--border)' }}>
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 rounded mx-auto mb-1 opacity-40" style={{ background: 'var(--accent)' }} />
                <div className="w-16 h-1.5 rounded mx-auto" style={{ background: 'var(--border)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating accent lines */}
      <div className="absolute -top-4 -right-4 w-24 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--accent))' }} />
      <div className="absolute -top-4 -right-4 h-24 w-px" style={{ background: 'linear-gradient(180deg, transparent, var(--accent))' }} />
      <div className="absolute -bottom-4 -left-4 w-24 h-px" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
      <div className="absolute -bottom-4 -left-4 h-24 w-px" style={{ background: 'linear-gradient(180deg, var(--accent), transparent)' }} />
    </div>
  );
}

// ── Capacités (uniquement des fonctions livrées, textes traduits) ───────────────
const CAPABILITIES = [
  { key: 'lighthouse', icon: Gauge,        span: 'lg:col-span-2' },
  { key: 'field',      icon: Users,        span: '' },
  { key: 'platforms',  icon: Store,        span: '' },
  { key: 'arabic',     icon: Languages,    span: '' },
  { key: 'privacy',    icon: ShieldCheck,  span: '' },
  { key: 'priorities', icon: ListChecks,   span: '' },
  { key: 'compare',    icon: GitCompare,   span: '' },
  { key: 'pdf',        icon: FileText,     span: 'lg:col-span-2' },
] as const;

function CapabilitiesGrid() {
  const t = useTranslations('capabilities');
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-velifa-xl border border-border bg-[color:var(--border)] sm:grid-cols-2 lg:grid-cols-4">
      {CAPABILITIES.map(({ key, icon: Icon, span }) => (
        <div key={key} className={`group relative bg-[color:var(--bg)] p-6 transition-colors hover:bg-[color:var(--bg-subtle)] sm:p-7 ${span}`}>
          <span className="mb-5 grid h-10 w-10 place-items-center rounded-[11px] border border-border bg-[color:var(--surface)] text-text">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <h3 className="mb-2 text-[15px] font-semibold text-text">{t(`${key}.title`)}</h3>
          <p className="text-sm leading-relaxed text-text-muted">{t(`${key}.desc`)}</p>
        </div>
      ))}
    </div>
  );
}

// ── Data — built inside component with translations (see HomePage) ────────────
const KEY_FEATURE_ICONS = [BarChart2, Mail, MessageCircle, Shield];
const KEY_FEATURE_KEYS = ['detailedScore', 'emailReport', 'whatsapp', 'dataProtected'] as const;
const STEP_KEYS = ['step1', 'step2', 'step3'] as const;
const PLAN_KEYS = ['free', 'pro', 'business'] as const;

// ── Hero Background Carousel ─────────────────────────────────────────────────────
// Fond du hero : noir profond, trame fine qui s'estompe, lumière zénithale.
// Remplace l'ancien carrousel de photos (images de banque Unsplash : circuits, câbles, globe).
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgb(var(--accent-rgb)/0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--accent-rgb)/0.045) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 75%)',
        }}
      />
      <div
        className="absolute left-1/2 top-0 h-[520px] w-[1100px] max-w-[200%] -translate-x-1/2 -translate-y-1/3 rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgb(var(--accent-rgb)/0.09), transparent)' }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: 'linear-gradient(transparent, var(--bg))' }} />
    </div>
  );
}

export default function HomePage() {
  const tHero  = useTranslations('hero');
  const tTrust = useTranslations('trust');
  const tFeat  = useTranslations('features');
  const tKF    = useTranslations('keyFeatures');
  const tHiW   = useTranslations('howItWorks');
  const tPP    = useTranslations('pricingPreview');
  const tCta   = useTranslations('cta');
  const tCap   = useTranslations('capabilities');

  // Prix mensuels saisis dans le backoffice (GET /plans), en USD
  const [monthly, setMonthly] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    api.getPlans()
      .then((r) => setMonthly(Object.fromEntries(r.data.map((p) => [p.code, p.priceMonthly]))))
      .catch(() => setMonthly({}));
  }, []);

  const keyFeatures = KEY_FEATURE_ICONS.map((icon, i) => ({
    icon,
    title: tKF(`${KEY_FEATURE_KEYS[i]}.title`),
    desc:  tKF(`${KEY_FEATURE_KEYS[i]}.desc`),
  }));

  const steps = STEP_KEYS.map((key) => ({
    number: tHiW(`${key}.num`),
    title:  tHiW(`${key}.title`),
    desc:   tHiW(`${key}.desc`),
  }));

  const plansPreview = PLAN_KEYS.map((key, i) => ({
    name:    tPP(`${key}.name`),
    price:   monthly == null ? '…' : monthly[key] == null ? '—' : `$${monthly[key]}`,
    badge:   key === 'pro' ? tPP(`${key}.badge`) : undefined,
    desc:    tPP(`${key}.desc`),
  }));

  return (
    <main className="min-h-screen bg-bg">

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HERO */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: '85vh' }}>
        {/* Animated background carousel */}
        <HeroBackground />

        {/* Contenu : promesse + barre d'audit centrées, visibles sans défiler */}
        <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-6 pt-10 sm:pt-14 pb-16 text-center">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-accent bg-accent-soft border border-border rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            {tHero('badge')}
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-text leading-[1.08] mb-5 tracking-tight">
            {tHero('title')}{' '}
            <span className="velifa-accent-text">{tHero('titleHighlight')}</span>
          </h1>

          <p className="text-base sm:text-lg text-text-muted mb-8 leading-relaxed max-w-2xl mx-auto">
            {tHero('subtitle')}
          </p>

          <div id="audit" className="scroll-mt-28">
            <AuditForm />
          </div>

          {/* Aperçu d'un rapport, sous le formulaire (grand écran) */}
          <div className="hidden lg:block mt-14 opacity-90">
            <ReportMockup />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TRUST BADGES */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-text-subtle">
            {[
              { icon: Shield, text: tTrust('noData') },
              { icon: Clock,  text: tTrust('fast') },
              { icon: Zap,    text: tTrust('powered') },
              { icon: Globe,  text: tTrust('compatible') },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-accent" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CAPACITÉS (fonctions livrées) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28">
        <RevealSection>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="velifa-eyebrow mb-4">{tCap('eyebrow')}</p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-text md:text-[40px]">{tCap('title')}</h2>
            <p className="mt-4 text-base text-text-muted">{tCap('subtitle')}</p>
          </div>
        </RevealSection>
        <RevealSection delay={100}>
          <CapabilitiesGrid />
        </RevealSection>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FONCTIONNALITÉS CLÉS */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <RevealSection>
          <div className="text-center mb-14">
            <p className="velifa-eyebrow mb-4">{tFeat('eyebrow')}</p>
            <h2 className="font-heading text-3xl md:text-[40px] font-semibold tracking-tight text-text mb-4">
              {tKF('sectionTitle')}
            </h2>
            <p className="text-text-muted max-w-xl mx-auto text-base">
              {tKF('sectionSubtitle')}
            </p>
          </div>
        </RevealSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {keyFeatures.map(({ icon: Icon, title, desc }, i) => (
            <RevealSection key={title} delay={i * 80}>
              <div className="velifa-card hover:border-accent transition-all duration-300 hover:shadow-accent group cursor-default h-full">
                <div className="w-10 h-10 rounded-velifa-md flex items-center justify-center mb-4 transition-colors"
                  style={{ background: 'var(--accent-soft)' }}>
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-heading font-semibold text-text mb-2 group-hover:text-accent transition-colors">{title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>

        <RevealSection delay={200}>
          <div className="text-center mt-10">
            <Link href="/fonctionnalites" className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2">
              {tKF('seeAll')}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* COMMENT ÇA MARCHE */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-bg-subtle border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <RevealSection>
            <div className="text-center mb-14">
              <p className="velifa-eyebrow mb-4">{tHiW('eyebrow')}</p>
              <h2 className="font-heading text-3xl md:text-[40px] font-semibold tracking-tight text-text">
                {tHiW('stepsTitle')}
              </h2>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            {steps.map((step, i) => (
              <RevealSection key={step.number} delay={i * 100}>
                <div className="text-center relative">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-7 right-0 translate-x-1/2 z-10">
                      <ArrowRight className="w-5 h-5 text-accent" />
                    </div>
                  )}
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                    style={{ background: 'var(--accent-soft)', border: '2px solid var(--accent)' }}>
                    <span className="font-heading font-bold text-xl text-accent">{step.number}</span>
                  </div>
                  <h3 className="font-heading font-semibold text-text text-lg mb-3">{step.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{step.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>

          <RevealSection delay={200}>
            <div className="text-center">
              <a href="#audit" className="velifa-btn inline-flex items-center gap-2">
                {tHiW('ctaButton')} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TARIFS APERÇU */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <RevealSection>
          <div className="text-center mb-14">
            <p className="velifa-eyebrow mb-4">{tPP('eyebrow')}</p>
            <h2 className="font-heading text-3xl md:text-[40px] font-semibold tracking-tight text-text mb-4">
              {tPP('previewTitle')}
            </h2>
            <p className="text-text-muted max-w-xl mx-auto text-base">
              {tPP('previewSubtitle')}
            </p>
          </div>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {plansPreview.map((plan, i) => (
            <RevealSection key={plan.name} delay={i * 80}>
              <div
                className={`velifa-card relative flex flex-col hover:border-accent transition-all duration-300 hover:shadow-accent ${plan.badge ? 'border-accent' : ''}`}
                style={plan.badge ? { borderWidth: '2px', boxShadow: 'var(--shadow-accent)' } : {}}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-[color:var(--text-on-accent)]"
                      style={{ background: 'var(--brand-gradient)' }}>
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="text-center mb-4 pt-2">
                  <h3 className={`font-heading font-bold text-lg mb-1 ${plan.badge ? 'velifa-accent-text' : 'text-text'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-heading text-4xl font-bold text-text">{plan.price}</span>
                    <span className="text-text-muted text-sm">{tPP('perMonth')}</span>
                  </div>
                </div>
                <p className="flex-1 pb-2 text-center text-sm text-text-muted">{plan.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>

        <RevealSection delay={200}>
          <div className="text-center">
            <Link href="/tarifs" className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2">
              {tPP('seeAllPlans')}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CTA FINAL */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <RevealSection>
            <h2 className="font-heading text-3xl md:text-[40px] font-semibold tracking-tight text-text mb-5">
              {tCta('title')}
            </h2>
            <p className="text-text-muted mb-10 text-base">
              {tCta('subtitle')}
            </p>
            <a href="#audit" className="velifa-btn inline-flex items-center gap-2">
              {tCta('button')}
              <ArrowRight className="w-4 h-4" />
            </a>
          </RevealSection>
        </div>
      </section>

    </main>
  );
}