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
import { SectionHeading, FeatureGrid, Steps, CtaBand } from '@/components/marketing';

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
  const bars = [
    { label: 'Performance', score: 92 },
    { label: 'Accessibilité', score: 78 },
    { label: 'SEO', score: 95 },
    { label: 'Bonnes pratiques', score: 88 },
  ];
  const color = (n: number) => (n >= 90 ? 'var(--velifa-score-good)' : n >= 50 ? 'var(--velifa-score-average)' : 'var(--velifa-score-poor)');
  return (
    <div className="relative mx-auto max-w-[560px]" aria-hidden>
      <div className="absolute -inset-8 rounded-[40px] opacity-70 blur-3xl" style={{ background: 'radial-gradient(closest-side, rgb(var(--accent-rgb)/0.10), transparent)' }} />
      <div className="relative overflow-hidden rounded-velifa-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] text-start shadow-velifa-lg">
        <div className="flex items-center gap-3 border-b border-border bg-[color:var(--bg-subtle)] px-4 py-3">
          <div className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full bg-[color:var(--border-strong)]" />)}</div>
          <div className="flex h-6 flex-1 items-center justify-center rounded-md border border-border bg-[color:var(--surface)] font-mono text-[11px] text-text-subtle" dir="ltr">
            exemple-boutique.com
          </div>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div className="relative mx-auto h-24 w-24">
            <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
              <circle cx="32" cy="32" r="27" fill="none" stroke="var(--border)" strokeWidth="5" />
              <circle cx="32" cy="32" r="27" fill="none" stroke="var(--velifa-score-good)" strokeWidth="5" strokeLinecap="round" strokeDasharray="169.6" strokeDashoffset="13.6" />
            </svg>
            <span className="absolute inset-0 grid place-items-center font-heading text-2xl font-semibold tabular-nums text-text">92</span>
          </div>
          <div className="space-y-3">
            {bars.map(({ label, score }) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-text-muted">{label}</span>
                  <span className="font-semibold tabular-nums" style={{ color: color(score) }}>{score}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[color:var(--border)]">
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: color(score) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-border">
          {[['LCP', '1,2 s'], ['CLS', '0,01'], ['TBT', '180 ms']].map(([k, v], i) => (
            <div key={k} className={`px-4 py-3.5 text-center ${i < 2 ? 'border-e border-border' : ''}`}>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle">{k}</p>
              <p className="mt-1 font-heading text-sm font-semibold tabular-nums" style={{ color: 'var(--velifa-score-good)' }} dir="ltr">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Capacités (uniquement des fonctions livrées, textes traduits) ───────────────
const CAPABILITIES = [
  { key: 'lighthouse', icon: Gauge,        span: '' },
  { key: 'field',      icon: Users,        span: '' },
  { key: 'platforms',  icon: Store,        span: '' },
  { key: 'arabic',     icon: Languages,    span: '' },
  { key: 'privacy',    icon: ShieldCheck,  span: '' },
  { key: 'priorities', icon: ListChecks,   span: '' },
  { key: 'compare',    icon: GitCompare,   span: '' },
  { key: 'pdf',        icon: FileText,     span: '' },
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
  const locale = useLocale();
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
              { icon: Gauge,  text: tTrust('fast') },
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
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-6 sm:pb-28">
        <RevealSection>
          <SectionHeading eyebrow={tFeat('eyebrow')} title={tKF('sectionTitle')} subtitle={tKF('sectionSubtitle')} />
        </RevealSection>
        <RevealSection delay={100}>
          <FeatureGrid columns={4} items={keyFeatures.map((f) => ({ icon: f.icon, title: f.title, description: f.desc }))} />
        </RevealSection>
        <div className="mt-10 text-center">
          <Link href={`/${locale}/fonctionnalites`} className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2">
            {tKF('seeAll')}
            <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
        </div>
      </section>

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
      <section className="border-y border-border bg-bg-subtle">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
          <RevealSection>
            <SectionHeading eyebrow={tHiW('eyebrow')} title={tHiW('stepsTitle')} />
          </RevealSection>
          <RevealSection delay={100}>
            <Steps steps={steps.map((st) => ({ number: st.number, title: st.title, description: st.desc }))} />
          </RevealSection>
          <div className="mt-12 text-center">
            <a href="#audit" className="velifa-btn inline-flex items-center gap-2">
              {tHiW('ctaButton')} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </a>
          </div>
        </div>
      </section>

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
            <Link href={`/${locale}/tarifs`} className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2">
              {tPP('seeAllPlans')}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CTA FINAL */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-border pt-20 sm:pt-24">
        <CtaBand
          title={tCta('title')}
          subtitle={tCta('subtitle')}
          primary={{ href: '#audit', label: tCta('button') }}
          secondary={{ href: `/${locale}/tarifs`, label: tPP('seeAllPlans') }}
        />
      </div>

    </main>
  );
}