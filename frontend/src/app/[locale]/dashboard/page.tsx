'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Loader2, Globe, ArrowRight, BarChart3, Gauge, Trophy, Award,
  FileSearch, Zap, Plus, TrendingUp, Sparkles, X, Lock, MapPin,
  Gem, Bell, BellOff, Key, Copy, RefreshCw, CheckCheck,
  ChevronRight, ExternalLink, Pencil, Check as CheckIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { MyAudit } from '@/types/analysis';
import { useSubscription } from '@/context/SubscriptionContext';
import NewAuditModal from '@/components/audit/NewAuditModal';
import TrackedSites from '@/components/dashboard/TrackedSites';

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function stripUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}

type ScoreBucket = 'good' | 'average' | 'poor' | 'unknown';
function getScoreBucket(score: number | null): ScoreBucket {
  if (score == null) return 'unknown';
  if (score >= 90) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
}

const SCORE_COLOR: Record<ScoreBucket, string> = {
  good:    '#0CCE6B',
  average: '#FFA400',
  poor:    '#FF4E42',
  unknown: 'var(--text-subtle)',
};
const SCORE_BG: Record<ScoreBucket, string> = {
  good:    'rgba(12, 206, 107, 0.12)',
  average: 'rgba(255, 164, 0, 0.12)',
  poor:    'rgba(255, 78, 66, 0.12)',
  unknown: 'var(--surface-raised)',
};
const SCORE_LABEL: Record<ScoreBucket, string> = {
  good: 'Excellent', average: 'À améliorer', poor: 'Critique', unknown: '—',
};

// ── Anneau SVG circulaire ──────────────────────────────────────────────────
function ScoreRing({
  score, size = 80,
}: {
  score: number | null;
  size?: number;
}) {
  const bucket = getScoreBucket(score);
  const color = SCORE_COLOR[bucket];
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = score != null ? score / 100 : 0;
  const dash = circ * pct;
  const gap = circ - dash;

  // Animate stroke-dashoffset from 0 to final value
  const circleRef = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.strokeDashoffset = String(circ);
    // Force reflow then animate
    void el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)';
    el.style.strokeDashoffset = String(circ - dash);
  }, [circ, dash]);

  const fontSize = size <= 64 ? size * 0.28 : size * 0.25;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0 }}
      aria-label={`Score ${score ?? '—'}`}
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--surface-raised)"
        strokeWidth={6}
      />
      {/* Progress */}
      {score != null && (
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={circ - dash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      )}
      {/* Label */}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={score != null ? color : 'var(--text-subtle)'}
        fontSize={fontSize}
        fontFamily="var(--velifa-font-heading)"
        fontWeight="700"
      >
        {score ?? '—'}
      </text>
    </svg>
  );
}

// ── Stat card avec dégradé de fond ─────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, isLoading, gold,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  isLoading?: boolean;
  gold?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-4 h-full transition-all duration-300 hover:-translate-y-1"
      style={{
        background: gold
          ? 'linear-gradient(135deg, rgba(212,175,55,0.13) 0%, rgba(26,26,26,0.95) 60%)'
          : 'linear-gradient(135deg, rgba(36,36,36,0.9) 0%, rgba(18,18,18,0.95) 100%)',
        border: gold ? '1px solid rgba(212,175,55,0.35)' : '1px solid var(--border)',
        borderRadius: 'var(--velifa-radius-lg)',
        padding: '1.5rem',
        boxShadow: gold
          ? '0 8px 32px rgba(212,175,55,0.18), 0 2px 8px rgba(0,0,0,0.5)'
          : '0 4px 20px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center justify-between">
        <Icon
          className={gold ? 'w-4 h-4 text-accent' : 'w-4 h-4 text-text-subtle'}
          strokeWidth={1.75}
        />
        {gold && (
          <span
            className="text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--accent)' }}
          >
            Top
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-text-subtle mb-2">
          {label}
        </div>
        {isLoading ? (
          <div className="h-9 w-20 rounded animate-pulse" style={{ background: 'var(--surface-raised)' }} />
        ) : (
          <div
            className="font-heading font-bold text-3xl tracking-tight truncate"
            style={{ color: gold ? 'var(--accent)' : 'var(--text)' }}
          >
            {value}
          </div>
        )}
        {sub && !isLoading && (
          <div className="text-xs text-text-muted mt-1.5 truncate">{sub}</div>
        )}
      </div>
    </div>
  );
}

// ── Tooltip recharts personnalisé ──────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--velifa-ink-800)',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: 10,
        padding: '8px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      }}
    >
      <p style={{ color: 'var(--text-subtle)', fontSize: 11, marginBottom: 2 }}>{label}</p>
      <p style={{ color: '#D4AF37', fontWeight: 700, fontSize: 18, fontFamily: 'var(--velifa-font-heading)' }}>
        {payload[0].value}
        <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3 }}>/100</span>
      </p>
    </div>
  );
}

// ── Graphique évolution ────────────────────────────────────────────────────
function EvolutionChart({ audits }: { audits: MyAudit[] }) {
  const data = useMemo(() => {
    return [...audits]
      .filter((a) => a.scorePerformance != null && a.createdAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((a) => ({
        date: formatDateShort(a.createdAt),
        score: a.scorePerformance as number,
      }));
  }, [audits]);

  if (data.length < 2) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(36,36,36,0.9) 0%, rgba(18,18,18,0.95) 100%)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--velifa-radius-lg)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
        }}
      >
        <TrendingUp className="w-8 h-8 text-text-subtle" strokeWidth={1.5} />
        <p className="text-text-muted text-sm max-w-xs">
          Lancez plus d&apos;audits pour voir l&apos;évolution de votre score dans le temps.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(36,36,36,0.9) 0%, rgba(18,18,18,0.95) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--velifa-radius-lg)',
        padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
        <span className="text-[10px] font-semibold tracking-widest uppercase text-text-subtle">
          Évolution du score de performance
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-subtle)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'var(--text-subtle)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(212,175,55,0.2)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#D4AF37"
            strokeWidth={2.5}
            fill="url(#goldGradient)"
            dot={{ fill: '#D4AF37', strokeWidth: 0, r: 4 }}
            activeDot={{ fill: '#F4D88A', stroke: '#D4AF37', strokeWidth: 2, r: 6 }}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Carte audit ────────────────────────────────────────────────────────────
function AuditCard({ audit }: { audit: MyAudit }) {
  const bucket = getScoreBucket(audit.scorePerformance);
  const t = useTranslations('dashboard');
  return (
    <div
      className="group flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(18,18,18,0.98) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--velifa-radius-lg)',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(212,175,55,0.08)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 4px 20px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
      }}
    >
      {/* Anneau score */}
      <div className="flex-shrink-0">
        <ScoreRing score={audit.scorePerformance} size={76} />
      </div>

      {/* URL + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <Globe className="w-4 h-4 text-text-subtle flex-shrink-0" strokeWidth={1.75} />
          <span className="font-medium text-text truncate text-base">{stripUrl(audit.url)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>{formatDate(audit.createdAt)}</span>
          <span className="opacity-40">·</span>
          <span style={{ color: SCORE_COLOR[bucket] }}>{SCORE_LABEL[bucket]}</span>
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/analyse/${audit.id}`}
        className="velifa-btn flex items-center justify-center gap-2 sm:self-center shrink-0"
      >
        <FileSearch className="w-4 h-4" />
        {t('viewReport')}
        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function AuditCardSkeleton() {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 animate-pulse"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--velifa-radius-lg)',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      }}
    >
      <div className="w-[76px] h-[76px] rounded-full flex-shrink-0" style={{ background: 'var(--surface-raised)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded" style={{ background: 'var(--surface-raised)' }} />
        <div className="h-3 w-1/3 rounded" style={{ background: 'var(--surface-raised)' }} />
      </div>
      <div className="h-10 w-36 rounded-[10px]" style={{ background: 'var(--surface-raised)' }} />
    </div>
  );
}

// ── Badge plan ─────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: 'pro' | 'business' | null }) {
  if (plan === 'pro') return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase"
      style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(168,123,30,0.25) 100%)',
        border: '1px solid rgba(212,175,55,0.45)',
        color: 'var(--accent)',
        boxShadow: '0 2px 12px rgba(212,175,55,0.15)',
      }}
    >
      <Sparkles className="w-3 h-3" />
      Pro
    </span>
  );
  if (plan === 'business') return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase"
      style={{
        background: 'linear-gradient(135deg, rgba(232,232,232,0.15) 0%, rgba(180,180,180,0.08) 100%)',
        border: '1px solid rgba(200,200,200,0.50)',
        color: '#E8E8E8',
        boxShadow: '0 2px 16px rgba(200,200,200,0.12)',
      }}
    >
      <Gem className="w-3 h-3" />
      Business
    </span>
  );
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        color: 'var(--text-subtle)',
      }}
    >
      Gratuit
    </span>
  );
}

// ── Style Business ─────────────────────────────────────────────────────────
const BUSINESS_SILVER = '#C8C8C8';
const BUSINESS_BORDER = 'rgba(200,200,200,0.40)';
const BUSINESS_SURFACE = 'rgba(200,200,200,0.07)';

// Fonctions en cours de construction (Phase 2 du ROADMAP) : affichées comme « bientôt »,
// jamais simulées dans le navigateur.
function UpcomingFeatures() {
  const items = [
    { icon: Bell,  label: 'Audits programmés et alertes email' },
    { icon: Key,   label: 'Clé API personnelle' },
  ];
  return (
    <div
      className="p-5 rounded-[var(--velifa-radius-lg)]"
      style={{ background: BUSINESS_SURFACE, border: `1px solid ${BUSINESS_BORDER}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Gem className="w-4 h-4" style={{ color: BUSINESS_SILVER }} />
        <span className="font-heading font-semibold text-sm" style={{ color: BUSINESS_SILVER }}>
          Bientôt disponible
        </span>
      </div>
      <ul className="space-y-2">
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2 text-sm text-text-muted">
            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BUSINESS_SILVER }} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const { plan: subPlan, isActive: isPro, refresh: refreshPlan } = useSubscription();
  const t = useTranslations('dashboard');
  const FREE_AUDIT_LIMIT = 3;
  const [audits, setAudits] = useState<MyAudit[] | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeBanner, setUpgradeBanner] = useState(false);

  // Redirect si non connecté — inchangé
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  // Re-fetch le plan à chaque visite du dashboard (évite le stale data du Provider)
  useEffect(() => {
    if (isSignedIn) refreshPlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Bandeau ?upgraded=true
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      setUpgradeBanner(true);
      // Nettoie l'URL sans rechargement
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  // Fetch des audits — inchangé
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Token Clerk introuvable');
        const res = await api.getMine(token);
        if (!cancelled) setAudits(res.data);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Erreur de chargement');
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  // Stats calculées côté front — inchangé
  const stats = useMemo(() => {
    if (!audits || audits.length === 0) {
      return { count: 0, avg: null as number | null, max: null as number | null, best: null as MyAudit | null };
    }
    const scored = audits.filter((a) => a.scorePerformance != null) as Array<MyAudit & { scorePerformance: number }>;
    if (scored.length === 0) return { count: audits.length, avg: null, max: null, best: null };
    const sum = scored.reduce((s, a) => s + a.scorePerformance, 0);
    const avg = Math.round(sum / scored.length);
    const max = Math.max(...scored.map((a) => a.scorePerformance));
    const best = scored.find((a) => a.scorePerformance === max) ?? null;
    return { count: audits.length, avg, max, best };
  }, [audits]);

  if (!isLoaded || (isLoaded && !isSignedIn)) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </main>
    );
  }

  const isLoading = audits === null && error === null;
  const hasAudits = !!audits && audits.length > 0;
  const firstName = user?.firstName ?? user?.username ?? null;
  const isBusiness = subPlan === 'business' && isPro;
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const userId = user?.id ?? '';

  return (
    <>
      {/* Modal Nouvel audit */}
      {auditModalOpen && (
        <NewAuditModal onClose={() => setAuditModalOpen(false)} />
      )}

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <main className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 sm:py-16">

          {/* ── Bandeau de félicitations upgraded=true ─────────────── */}
          {upgradeBanner && (
            <div
              className="fade-up mb-8 flex items-center justify-between gap-4 px-5 py-4 rounded-[var(--velifa-radius-lg)]"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(168,123,30,0.08) 100%)',
                border: '1px solid rgba(212,175,55,0.40)',
                boxShadow: '0 4px 24px rgba(212,175,55,0.12)',
              }}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                <div>
                  <p className="font-heading font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                    {t('welcomePro', { plan: subPlan === 'business' ? 'Business' : 'Pro' })}
                  </p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {t('welcomeProDesc')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUpgradeBanner(false)}
                className="flex-shrink-0 text-text-subtle hover:text-text transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Bandeau Business ───────────────────────────────────── */}
          {isBusiness && (
            <div
              className="fade-up mb-8 flex items-center justify-between gap-4 px-5 py-4 rounded-[var(--velifa-radius-lg)]"
              style={{
                background: 'linear-gradient(135deg, rgba(232,232,232,0.08) 0%, rgba(36,36,36,0.95) 60%)',
                border: '1px solid rgba(200,200,200,0.38)',
                boxShadow: '0 4px 28px rgba(200,200,200,0.07)',
              }}
            >
              <div className="flex items-center gap-3">
                <Gem className="w-5 h-5 flex-shrink-0" style={{ color: '#E8E8E8' }} strokeWidth={1.75} />
                <div>
                  <p className="font-heading font-semibold text-sm" style={{ color: '#E8E8E8' }}>
                    {t('businessAccess')}
                  </p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {t('businessDesc')}
                  </p>
                </div>
              </div>
              <span
                className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full flex-shrink-0"
                style={{
                  background: 'rgba(200,200,200,0.10)',
                  border: '1px solid rgba(200,200,200,0.30)',
                  color: '#C8C8C8',
                }}
              >
                Business
              </span>
            </div>
          )}

          {/* ── En-tête personnalisé ────────────────────────────────── */}
          <div className="fade-up flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 sm:mb-14">
            <div>
              <p className="velifa-eyebrow mb-2">{t('eyebrow')}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text tracking-tight">
                  {firstName ? `${t('hello')}, ${firstName}` : t('hello')}
                </h1>
                <PlanBadge plan={subPlan} />
              </div>
              <p className="text-text-muted mt-2 text-sm sm:text-base">
                {t('subtitle')}
              </p>
            </div>
            <button
              onClick={() => setAuditModalOpen(true)}
              className="velifa-btn flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              {t('newAudit')}
            </button>
          </div>

          {/* Cartes de stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 sm:mb-10">
            {[
              { icon: BarChart3, label: t('statAudits'), value: hasAudits ? stats.count : '—', sub: undefined, gold: false },
              { icon: Gauge,    label: t('statAvgScore'), value: stats.avg != null ? stats.avg : '—', sub: stats.avg != null ? '/ 100' : undefined, gold: false },
              { icon: Trophy,   label: t('statBestScore'), value: stats.max != null ? stats.max : '—', sub: stats.max != null ? '/ 100' : undefined, gold: false },
              { icon: Award,    label: t('statTopSite'), value: stats.best ? stripUrl(stats.best.url) : '—', sub: stats.best?.scorePerformance != null ? `${stats.best.scorePerformance} / 100` : undefined, gold: true },
            ].map(({ icon, label, value, sub, gold }, i) => (
              <div key={label} className="fade-up" style={{ animationDelay: `${50 + i * 50}ms` }}>
                <StatCard icon={icon} label={label} value={value} sub={sub} isLoading={isLoading} gold={gold} />
              </div>
            ))}
          </div>

          {/* Graphique évolution */}
          {!isLoading && !error && audits && (
            <div className="fade-up mb-10 sm:mb-14" style={{ animationDelay: '260ms' }}>
              <EvolutionChart audits={audits} />
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div
              className="text-center py-10 mb-6"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--velifa-radius-lg)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
              }}
            >
              <p style={{ color: 'var(--velifa-score-poor)' }} className="font-medium">
                {t('loadError')}
              </p>
              <p className="text-text-muted text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Skeletons */}
          {isLoading && (
            <div className="space-y-4">
              <AuditCardSkeleton />
              <AuditCardSkeleton />
              <AuditCardSkeleton />
            </div>
          )}

          {/* État vide */}
          {!isLoading && !error && !hasAudits && (
            <div
              className="fade-up text-center py-20"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--velifa-radius-lg)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
              }}
            >
              <div
                className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{ background: 'var(--surface-raised)' }}
              >
                <FileSearch className="w-6 h-6 text-text-subtle" strokeWidth={1.5} />
              </div>
              <h2 className="font-heading font-semibold text-text text-lg mb-2">
                {t('noAudits')}
              </h2>
              <p className="text-text-muted text-sm mb-6 max-w-sm mx-auto">
                {t('noAuditsDesc')}
              </p>
              <Link href="/" className="velifa-btn inline-flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {t('startFirstAction')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* ── Sites suivis (en base, limite par plan) ────────── */}
          {!isLoading && (
            <div className="fade-up mb-6" style={{ animationDelay: '270ms' }}>
              <TrackedSites />
            </div>
          )}

          {/* ── Fonctions à venir (non simulées) ─────────────── */}
          {!isLoading && (
            <div className="fade-up mb-10 sm:mb-14" style={{ animationDelay: '280ms' }}>
              <UpcomingFeatures />
            </div>
          )}

          {/* ── Liste des audits ──────────────────────────────── */}
          {!isLoading && !error && hasAudits && (() => {
            const visibleAudits = isPro ? audits! : audits!.slice(0, FREE_AUDIT_LIMIT);
            const lockedAudits  = isPro ? [] : audits!.slice(FREE_AUDIT_LIMIT);

            return (
              <>
                <div className="flex items-baseline justify-between mb-5 px-1">
                  <h2 className="font-heading font-semibold text-text text-lg">{t('yourAudits')}</h2>
                  <span className="text-xs text-text-muted">
                    {isPro
                      ? `${audits!.length} ${t('total')}`
                      : `${Math.min(audits!.length, FREE_AUDIT_LIMIT)} ${t('shown')} · ${audits!.length} ${t('total')}`}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Audits visibles */}
                  {visibleAudits.map((audit, i) => (
                    <div
                      key={audit.id}
                      className="fade-up"
                      style={{ animationDelay: `${300 + i * 60}ms` }}
                    >
                      <AuditCard audit={audit} />
                    </div>
                  ))}

                  {/* Audits verrouillés (gratuit seulement) */}
                  {lockedAudits.length > 0 && (
                    <div className="relative">
                      {/* Audits floutés derrière l'overlay */}
                      <div className="space-y-3 pointer-events-none" style={{ filter: 'blur(3px)', opacity: 0.35 }}>
                        {lockedAudits.slice(0, 2).map((audit) => (
                          <AuditCard key={audit.id} audit={audit} />
                        ))}
                      </div>

                      {/* Overlay cadenas */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[var(--velifa-radius-lg)]"
                        style={{
                          background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.85) 40%, rgba(10,10,10,0.97) 100%)',
                        }}
                      >
                        <div
                          className="flex flex-col items-center gap-3 text-center px-6"
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{
                              background: 'rgba(212,175,55,0.12)',
                              border: '1px solid rgba(212,175,55,0.3)',
                            }}
                          >
                            <Lock className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                          </div>
                          <div>
                            <p className="font-heading font-semibold text-text text-sm">
                              {lockedAudits.length} {t('hiddenAudits')}
                            </p>
                            <p className="text-text-muted text-xs mt-1">
                              {t('unlockedHistory')}
                            </p>
                          </div>
                          <Link href="/tarifs" className="velifa-btn flex items-center gap-2 text-xs mt-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            {t('goPro')}
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

        </div>
      </main>
    </>
  );
}
