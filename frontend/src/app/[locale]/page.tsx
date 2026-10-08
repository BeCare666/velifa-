'use client';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Loader2, Zap, BarChart2, Mail, MessageCircle, ArrowRight,
  Shield, Clock, Globe, CheckCircle2, ArrowUpRight, ChevronLeft, ChevronRight, Camera,
  RefreshCw, Eye, X, Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useAuth, useUser } from '@clerk/nextjs';

// ── Formulaire d'audit ───────────────────────────────────────────────────────
function AuditForm() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const t = useTranslations('hero');
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
        url,
        email: clerkEmail,   // undefined si non connecté → modal email après
        cfTurnstileToken: 'dev-bypass',
        locale: 'fr',
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
    }
  }

  function handleDismiss() {
    setCachedInfo(null);
    setUrl('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="velifa-card text-start space-y-4"
      style={{ background: 'var(--surface)', maxWidth: '600px', margin: '0 auto' }}
    >
      {cachedInfo && (
        <div
          className="rounded-velifa-lg border p-5 space-y-4"
          style={{ background: 'var(--velifa-ink-900)', borderColor: 'var(--accent)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text">
                  {t('cachedTitle')}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {t('cachedDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-text-subtle hover:text-text transition p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.push(`/analyse/${cachedInfo.id}`)}
              className="velifa-btn flex-1 flex items-center justify-center gap-2"
            >
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

      <div>
        <label className="block text-sm font-medium text-text mb-1.5">
          {t('urlLabel')}
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('inputPlaceholder')}
          required
          disabled={loading}
          className="w-full px-4 py-3 border border-border rounded-velifa-md text-text bg-surface placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-transparent transition disabled:opacity-50"
        />
      </div>
      {/* ── Erreur 429 : message incitatif doux ───────────── */}
      {rateLimited && (
        <div
          className="rounded-velifa-lg border p-5 space-y-3"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(168,123,30,0.06) 100%)',
            borderColor: 'rgba(212,175,55,0.40)',
          }}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                {t('rateLimitTitle')}
              </p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {t('rateLimitDesc')}
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Link
              href="/tarifs"
              className="velifa-btn flex items-center gap-2 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('upgradePro')}
            </Link>
            <button
              type="button"
              onClick={() => setRateLimited(false)}
              className="text-xs text-text-muted hover:text-text transition"
            >
              {t('retryTomorrow')}
            </button>
          </div>
        </div>
      )}

      {/* ── Erreur générique ──────────────────────────────── */}
      {error && (
        <div className="text-sm text-score-poor bg-score-poor-bg border border-score-poor rounded-velifa-md px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="velifa-btn w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> {t('analyzing')}</>
        ) : (
          <>{t('analyzeNow')} <ArrowRight className="w-4 h-4" /></>
        )}
      </button>

      <p className="text-xs text-center text-text-subtle">
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
          background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.15) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }} />

      {/* Card frame */}
      <div className="relative rounded-velifa-xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.1)',
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

// ── Carrousel fonctionnalités ───────────────────────────────────────────────────
const carouselSlides = [
  {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    icon: BarChart2,
    accent: '#0CCE6B',
    title: 'Score de performance complet',
    description: '4 dimensions analysées en profondeur : Performance, Accessibilité, SEO et Bonnes Pratiques. Chaque score est calculé par Velifa et expliqué clairement.',
    detail: 'Score Velifa · Métriques Core Web Vitals',
  },
  {
    image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&q=80',
    icon: Globe,
    accent: '#D4AF37',
    title: 'Core Web Vitals mesurés',
    description: 'LCP, CLS, TBT et FCP — les métriques officielles de Google qui influencent directement votre classement dans les résultats de recherche.',
    detail: 'Métriques Core Web Vitals Google · Critères de classement SEO',
  },
  {
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80',
    icon: Mail,
    accent: '#6478FF',
    title: 'Rapport par email',
    description: 'Un email HTML designé Velifa est envoyé automatiquement après chaque audit. Contenu complet, screenshot, scores et recommandations.',
    detail: 'HTML responsive · Compatible Gmail, Outlook, Apple Mail',
  },
  {
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    icon: Camera,
    accent: '#FF6464',
    title: 'Capture d\'écran intégrée',
    description: 'Un aperçu visuel de votre page est inclus dans le rapport. Capture réelle via Chrome headless — pas de miniature approximative.',
    detail: 'Capture Chrome headless · Cloudinary CDN',
  },
];

function FeatureCarousel() {
  const [current, setCurrent] = useState(0);
  const total = carouselSlides.length;

  function prev() { setCurrent(c => (c - 1 + total) % total); }
  function next() { setCurrent(c => (c + 1) % total); }

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % total), 6000);
    return () => clearInterval(timer);
  }, [total]);

  const slide = carouselSlides[current];
  const Icon = slide.icon;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Slide card with background image */}
      <div
        className="rounded-velifa-xl overflow-hidden relative transition-all duration-500"
        style={{ minHeight: 400 }}
      >
        {/* Background image */}
        <Image
          src={slide.image}
          alt={slide.title}
          fill
          className="object-cover"
          sizes="(max-width: 1280px) 100vw, 1280px"
          priority={current === 0}
        />

        {/* Dark overlay gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.75) 60%, rgba(10,10,10,0.60) 100%)',
          }}
        />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-10 md:p-14"
          style={{ minHeight: 400 }}>
          {/* Icon */}
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: `${slide.accent}20`, border: `2px solid ${slide.accent}60` }}>
            <Icon className="w-8 h-8" style={{ color: slide.accent }} />
          </div>

          <h3 className="font-heading font-bold text-xl md:text-2xl text-text mb-4 max-w-lg">
            {slide.title}
          </h3>
          <p className="text-text-muted text-base leading-relaxed mb-6 max-w-md">
            {slide.description}
          </p>
          <p className="text-xs" style={{ color: `${slide.accent}90` }}>
            {slide.detail}
          </p>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 backdrop-blur-sm"
          style={{ background: 'rgba(26,26,26,0.8)', border: '1px solid var(--border)' }}
          aria-label="Slide précédent"
        >
          <ChevronLeft className="w-5 h-5 text-text-muted" />
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 backdrop-blur-sm"
          style={{ background: 'rgba(26,26,26,0.8)', border: '1px solid var(--border)' }}
          aria-label="Slide suivant"
        >
          <ChevronRight className="w-5 h-5 text-text-muted" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {carouselSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: i === current ? 28 : 8,
              background: i === current ? 'var(--accent)' : 'var(--border)',
            }}
            aria-label={`Aller à la slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Data — built inside component with translations (see HomePage) ────────────
const KEY_FEATURE_ICONS = [BarChart2, Mail, MessageCircle, Shield];
const KEY_FEATURE_KEYS = ['detailedScore', 'emailReport', 'whatsapp', 'dataProtected'] as const;
const STEP_KEYS = ['step1', 'step2', 'step3'] as const;
const PLAN_KEYS = ['free', 'pro', 'business'] as const;
const PLAN_PRICES = ['0', '9', '29'] as const;

// ── Hero Background Carousel ─────────────────────────────────────────────────────
const heroImages = [
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80',   // circuits / tech abstraits
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1600&q=80',   // network / data flows
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80',   // digital globe / analytics
];

function HeroBackground() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % heroImages.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {heroImages.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image
            src={src}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority={i === 0}
          />
          {/* Ken Burns slow zoom */}
          <div
            className="absolute inset-0"
            style={{
              background: i === current ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 5s ease-out',
              transformOrigin: 'center',
            }}
          />
        </div>
      ))}
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.70) 50%, rgba(10,10,10,0.92) 100%)',
        }}
      />
      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {heroImages.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === current ? 28 : 8,
              background: i === current ? 'var(--accent)' : 'rgba(255,255,255,0.25)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const tHero  = useTranslations('hero');
  const tTrust = useTranslations('trust');
  const tFeat  = useTranslations('features');
  const tKF    = useTranslations('keyFeatures');
  const tHiW   = useTranslations('howItWorks');
  const tPP    = useTranslations('pricingPreview');
  const tCta   = useTranslations('cta');

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
    price:   PLAN_PRICES[i],
    badge:   key === 'pro' ? tPP(`${key}.badge`) : undefined,
    features: [] as string[],
  }));

  return (
    <main className="min-h-screen bg-bg">

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HERO */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: '85vh' }}>
        {/* Animated background carousel */}
        <HeroBackground />

        {/* Content — stays fixed, does NOT scroll with images */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: text + form */}
            <div className="text-center lg:text-start">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 text-sm text-accent bg-accent-soft border border-border rounded-full px-4 py-1.5 mb-8">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                {tHero('badge')}
              </div>

              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-text leading-tight mb-6 tracking-tight">
                {tHero('title')}<br className="hidden md:block" />
                <span className="velifa-gold-text">{tHero('titleHighlight')}</span>
              </h1>

              <p className="text-xl text-text-muted mb-12 leading-relaxed max-w-lg mx-auto lg:mx-0">
                {tHero('subtitle')}
              </p>

              {/* Formulaire inchangé */}
              <AuditForm />
            </div>

            {/* Right: report mockup */}
            <div className="hidden lg:flex items-center justify-center">
              <ReportMockup />
            </div>
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
      {/* CARROUSEL FONCTIONNALITÉS */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <RevealSection>
          <div className="text-center mb-12">
            <p className="velifa-eyebrow mb-4">{tFeat('eyebrow')}</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-text">
              {tFeat('sectionTitle')}
            </h2>
          </div>
        </RevealSection>
        <RevealSection delay={100}>
          <FeatureCarousel />
        </RevealSection>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FONCTIONNALITÉS CLÉS */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <RevealSection>
          <div className="text-center mb-14">
            <p className="velifa-eyebrow mb-4">{tFeat('eyebrow')}</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-text mb-4">
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
              <div className="velifa-card hover:border-accent transition-all duration-300 hover:shadow-gold group cursor-default h-full">
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
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-text">
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
              <a href="#" className="velifa-btn inline-flex items-center gap-2">
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
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-text mb-4">
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
                className={`velifa-card relative flex flex-col hover:border-accent transition-all duration-300 hover:shadow-gold ${plan.badge ? 'border-accent' : ''}`}
                style={plan.badge ? { borderWidth: '2px', boxShadow: 'var(--shadow-gold)' } : {}}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-velifa-black"
                      style={{ background: 'var(--velifa-gradient-gold)' }}>
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="text-center mb-4 pt-2">
                  <h3 className={`font-heading font-bold text-lg mb-1 ${plan.badge ? 'velifa-gold-text' : 'text-text'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-heading text-4xl font-bold text-text">{plan.price}</span>
                    <span className="text-text-muted text-sm">€{tPP('perMonth')}</span>
                  </div>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 score-good flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-text-muted">{f}</span>
                    </li>
                  ))}
                </ul>
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
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-text mb-5">
              {tCta('title')}
            </h2>
            <p className="text-text-muted mb-10 text-base">
              {tCta('subtitle')}
            </p>
            <a href="#" className="velifa-btn inline-flex items-center gap-2">
              {tCta('button')}
              <ArrowRight className="w-4 h-4" />
            </a>
          </RevealSection>
        </div>
      </section>

    </main>
  );
}