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

// ── Types et helpers pour les sections Business ────────────────────────────
interface TrackedSite {
  id: string;
  url: string;
  lastScore: number | null;
  lastAuditDate: string | null;
  alertEnabled: boolean;
  alertThreshold: number;
}

const BUSINESS_SILVER = '#C8C8C8';
const BUSINESS_BORDER = 'rgba(200,200,200,0.40)';
const BUSINESS_BG     = 'linear-gradient(135deg, rgba(36,36,36,0.95) 0%, rgba(18,18,18,0.98) 100%)';
const BUSINESS_SURFACE = 'rgba(200,200,200,0.07)';

function BusinessUpgradeTeaser({ feature }: { feature: string }) {
  return (
    <div
      className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-[var(--velifa-radius-lg)]"
      style={{
        background: 'linear-gradient(135deg, rgba(200,200,200,0.06) 0%, rgba(36,36,36,0.9) 100%)',
        border: `1px solid ${BUSINESS_BORDER}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.40)',
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: BUSINESS_SURFACE, border: `1px solid ${BUSINESS_BORDER}` }}
      >
        <Gem className="w-5 h-5" style={{ color: BUSINESS_SILVER }} />
      </div>
      <div className="flex-1 text-center sm:text-start">
        <p className="font-heading font-semibold text-sm" style={{ color: BUSINESS_SILVER }}>
          Fonctionnalité Business
        </p>
        <p className="text-text-muted text-xs mt-0.5">
          {feature} est réservée au plan Business.
        </p>
      </div>
      <Link
        href="/tarifs"
        className="velifa-btn flex items-center gap-2 text-xs flex-shrink-0"
        style={{ background: BUSINESS_SURFACE, border: `1px solid ${BUSINESS_BORDER}`, color: BUSINESS_SILVER }}
      >
        <ChevronRight className="w-3.5 h-3.5" />
        Passer Business
      </Link>
    </div>
  );
}

// ── Helper : normalise une URL pour comparaison anti-doublon ──────────────
function normaliseForCompare(raw: string): string {
  try {
    const full = raw.startsWith('http') ? raw : `https://${raw}`;
    const u = new URL(full);
    return u.host.replace(/^www\./, '').toLowerCase() + u.pathname.replace(/\/$/, '');
  } catch {
    return raw.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
  }
}

// ── Section Multi-sites ────────────────────────────────────────────────────
function MultiSitesSection() {
  const [sites, setSites] = useState<TrackedSite[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('velifa_tracked_sites') ?? '[]'); }
    catch { return []; }
  });
  const [addingUrl, setAddingUrl] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [duplicateError, setDuplicateError] = useState(false);

  // État édition
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const MAX_SITES = 10;

  function saveSites(next: TrackedSite[]) {
    setSites(next);
    localStorage.setItem('velifa_tracked_sites', JSON.stringify(next));
  }

  function addSite() {
    const url = addingUrl.trim();
    if (!url || sites.length >= MAX_SITES) return;
    const normalised = url.startsWith('http') ? url : `https://${url}`;
    const newKey = normaliseForCompare(url);
    const isDuplicate = sites.some((s) => normaliseForCompare(s.url) === newKey);
    if (isDuplicate) {
      setDuplicateError(true);
      setTimeout(() => setDuplicateError(false), 3000);
      return;
    }
    setDuplicateError(false);
    saveSites([...sites, {
      id: Date.now().toString(),
      url: normalised,
      lastScore: null,
      lastAuditDate: null,
      alertEnabled: false,
      alertThreshold: 70,
    }]);
    setAddingUrl('');
    setShowForm(false);
  }

  function removeSite(id: string) {
    saveSites(sites.filter((s) => s.id !== id));
  }

  function startEdit(site: TrackedSite) {
    setEditingId(site.id);
    setEditingUrl(site.url);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingUrl('');
    setEditError(null);
  }

  function saveEdit() {
    const url = editingUrl.trim();
    if (!url) { setEditError('L\'URL ne peut pas être vide.'); return; }

    // Validation format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setEditError('L\'URL doit commencer par http:// ou https://');
      return;
    }

    // Anti-doublon (exclure le site en cours d'édition)
    const newKey = normaliseForCompare(url);
    const isDuplicate = sites.some(
      (s) => s.id !== editingId && normaliseForCompare(s.url) === newKey
    );
    if (isDuplicate) {
      setEditError('Ce site est déjà dans votre liste.');
      return;
    }

    saveSites(sites.map((s) => s.id === editingId ? { ...s, url } : s));
    setEditingId(null);
    setEditingUrl('');
    setEditError(null);
  }

  return (
    <div
      style={{
        background: BUSINESS_BG,
        border: `1px solid ${BUSINESS_BORDER}`,
        borderRadius: 'var(--velifa-radius-lg)',
        padding: '1.5rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.50)',
      }}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 flex-shrink-0" style={{ color: BUSINESS_SILVER }} strokeWidth={1.75} />
          <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: BUSINESS_SILVER }}>
            Multi-sites
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: BUSINESS_SURFACE, color: BUSINESS_SILVER }}
          >
            {sites.length}/{MAX_SITES}
          </span>
        </div>
        {sites.length < MAX_SITES && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: BUSINESS_SILVER }}
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter un site
          </button>
        )}
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <div className="mb-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://monsite.fr"
              value={addingUrl}
              onChange={(e) => { setAddingUrl(e.target.value); setDuplicateError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && addSite()}
              className="flex-1 text-sm px-3 py-2 rounded-[var(--velifa-radius-md)] outline-none transition-all"
              style={{
                background: 'var(--surface-raised)',
                border: `1px solid ${duplicateError ? '#FF4E42' : BUSINESS_BORDER}`,
                color: 'var(--text)',
              }}
              autoFocus
            />
            <button
              onClick={addSite}
              disabled={!addingUrl.trim()}
              className="px-4 py-2 rounded-[var(--velifa-radius-md)] text-xs font-semibold transition-opacity disabled:opacity-40"
              style={{ background: BUSINESS_SURFACE, border: `1px solid ${BUSINESS_BORDER}`, color: BUSINESS_SILVER }}
            >
              Ajouter
            </button>
            <button
              onClick={() => { setShowForm(false); setAddingUrl(''); setDuplicateError(false); }}
              className="px-3 py-2 rounded-[var(--velifa-radius-md)] text-text-subtle hover:text-text transition"
              style={{ background: 'var(--surface-raised)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {duplicateError && (
            <p className="text-xs px-1" style={{ color: '#FF4E42' }}>
              ⚠ Ce site est déjà dans votre liste.
            </p>
          )}
        </div>
      )}

      {/* Liste des sites */}
      {sites.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Globe className="w-8 h-8 text-text-subtle" strokeWidth={1.25} />
          <p className="text-sm text-text-muted">Aucun site suivi pour l&apos;instant</p>
          <p className="text-xs text-text-subtle max-w-xs">
            Ajoutez jusqu&apos;à 10 sites pour surveiller leurs performances.
          </p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: BUSINESS_SILVER }}
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter mon premier site
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sites.map((site) => {
            const isEditing = editingId === site.id;
            return (
              <div
                key={site.id}
                className="group flex flex-col gap-2 p-3 rounded-[var(--velifa-radius-md)] transition-all duration-200"
                style={{
                  background: isEditing
                    ? 'rgba(200,200,200,0.10)'
                    : BUSINESS_SURFACE,
                  border: `1px solid ${isEditing ? 'rgba(200,200,200,0.45)' : 'rgba(200,200,200,0.20)'}`,
                  boxShadow: isEditing ? '0 0 0 2px rgba(200,200,200,0.08)' : 'none',
                }}
              >
                {isEditing ? (
                  /* ── Mode édition ── */
                  <>
                    <input
                      type="url"
                      value={editingUrl}
                      onChange={(e) => { setEditingUrl(e.target.value); setEditError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="w-full text-sm px-3 py-2 rounded-[var(--velifa-radius-md)] outline-none transition-all"
                      style={{
                        background: 'var(--surface-raised)',
                        border: `1px solid ${editError ? '#FF4E42' : BUSINESS_BORDER}`,
                        color: 'var(--text)',
                      }}
                      autoFocus
                    />
                    {editError && (
                      <p className="text-[11px] px-0.5" style={{ color: '#FF4E42' }}>
                        ⚠ {editError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[var(--velifa-radius-md)] text-xs font-semibold transition-all"
                        style={{
                          background: 'rgba(12,206,107,0.12)',
                          border: '1px solid rgba(12,206,107,0.40)',
                          color: '#0CCE6B',
                        }}
                      >
                        <CheckIcon className="w-3.5 h-3.5" />
                        Enregistrer
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[var(--velifa-radius-md)] text-xs font-medium transition-all"
                        style={{
                          background: 'var(--surface-raised)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                        Annuler
                      </button>
                    </div>
                  </>
                ) : (
                  /* ── Mode affichage ── */
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <ExternalLink className="w-3 h-3 flex-shrink-0 text-text-subtle" />
                        <span className="text-sm text-text font-medium truncate">{stripUrl(site.url)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-muted flex-wrap">
                        {site.lastScore != null ? (
                          <span style={{ color: SCORE_COLOR[getScoreBucket(site.lastScore)] }}>
                            Score : {site.lastScore}
                          </span>
                        ) : (
                          <>
                            <span className="text-text-subtle">Pas encore audité</span>
                            <Link
                              href={`/?url=${encodeURIComponent(site.url)}`}
                              className="flex items-center gap-1 font-semibold transition-opacity hover:opacity-80"
                              style={{ color: BUSINESS_SILVER }}
                            >
                              <Zap className="w-3 h-3" />
                              Auditer maintenant
                            </Link>
                          </>
                        )}
                        {site.lastAuditDate && (
                          <><span className="opacity-40">·</span><span>{formatDate(site.lastAuditDate)}</span></>
                        )}
                      </div>
                    </div>
                    {/* Actions — visibles au hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => startEdit(site)}
                        className="p-1.5 rounded-[6px] transition-colors hover:bg-surface-raised"
                        style={{ color: BUSINESS_SILVER }}
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeSite(site.id)}
                        className="p-1.5 rounded-[6px] transition-colors hover:bg-surface-raised text-text-subtle hover:text-red-400"
                        title="Supprimer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section Alertes de performance ────────────────────────────────────────
function AlertesSection({ userEmail }: { userEmail: string | null }) {
  const [sites, setSites] = useState<TrackedSite[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('velifa_tracked_sites') ?? '[]'); }
    catch { return []; }
  });

  function toggleAlert(id: string) {
    const next = sites.map((s) =>
      s.id === id ? { ...s, alertEnabled: !s.alertEnabled } : s
    );
    setSites(next);
    localStorage.setItem('velifa_tracked_sites', JSON.stringify(next));
  }

  function setThreshold(id: string, value: number) {
    const next = sites.map((s) =>
      s.id === id ? { ...s, alertThreshold: value } : s
    );
    setSites(next);
    localStorage.setItem('velifa_tracked_sites', JSON.stringify(next));
  }

  return (
    <div
      style={{
        background: BUSINESS_BG,
        border: `1px solid ${BUSINESS_BORDER}`,
        borderRadius: 'var(--velifa-radius-lg)',
        padding: '1.5rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.50)',
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Bell className="w-4 h-4 flex-shrink-0" style={{ color: BUSINESS_SILVER }} strokeWidth={1.75} />
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: BUSINESS_SILVER }}>
          Alertes de performance
        </span>
      </div>

      {userEmail && (
        <p className="text-xs text-text-muted mb-4">
          Alertes envoyées à&nbsp;
          <span className="font-medium text-text">{userEmail}</span>
        </p>
      )}

      {sites.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <BellOff className="w-7 h-7 text-text-subtle" strokeWidth={1.25} />
          <p className="text-sm text-text-muted">Ajoutez des sites dans Multi-sites pour configurer des alertes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <div
              key={site.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-[var(--velifa-radius-md)]"
              style={{ background: BUSINESS_SURFACE, border: `1px solid rgba(200,200,200,0.18)` }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{stripUrl(site.url)}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
                    <span>Seuil :</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={site.alertThreshold}
                      onChange={(e) => setThreshold(site.id, Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-12 text-center rounded-[6px] py-0.5 text-xs outline-none"
                      style={{
                        background: 'var(--surface-raised)',
                        border: `1px solid ${BUSINESS_BORDER}`,
                        color: 'var(--text)',
                      }}
                    />
                    <span>/100</span>
                  </label>
                </div>
              </div>
              <button
                onClick={() => toggleAlert(site.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={
                  site.alertEnabled
                    ? { background: 'rgba(12,206,107,0.12)', border: '1px solid rgba(12,206,107,0.35)', color: '#0CCE6B' }
                    : { background: BUSINESS_SURFACE, border: `1px solid ${BUSINESS_BORDER}`, color: BUSINESS_SILVER }
                }
              >
                {site.alertEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                {site.alertEnabled ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-subtle mt-4">
        Les alertes seront envoyées automatiquement lors du suivi toutes les 24h (disponible au déploiement).
      </p>
    </div>
  );
}

// ── Section Clé API ────────────────────────────────────────────────────────
const LS_API_KEY = 'velifa_api_key';

function generateSecureKey(): string {
  const rand = crypto.randomUUID().replace(/-/g, '') +
               crypto.randomUUID().replace(/-/g, '');
  return `vlf_live_${rand.substring(0, 32)}`;
}

function ApiKeySection({ userId: _userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  // Charge depuis localStorage ou génère une nouvelle clé au premier montage
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem(LS_API_KEY);
    if (stored) return stored;
    const fresh = generateSecureKey();
    localStorage.setItem(LS_API_KEY, fresh);
    return fresh;
  });

  function regenerateKey() {
    const newKey = generateSecureKey();
    localStorage.setItem(LS_API_KEY, newKey);
    setApiKey(newKey);
    setCopied(false);
  }

  function copyKey() {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{
        background: BUSINESS_BG,
        border: `1px solid ${BUSINESS_BORDER}`,
        borderRadius: 'var(--velifa-radius-lg)',
        padding: '1.5rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.50)',
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Key className="w-4 h-4 flex-shrink-0" style={{ color: BUSINESS_SILVER }} strokeWidth={1.75} />
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: BUSINESS_SILVER }}>
          Clé API
        </span>
      </div>

      <div
        className="flex items-center gap-2 p-3 rounded-[var(--velifa-radius-md)] mb-4"
        style={{ background: 'var(--surface-raised)', border: `1px solid ${BUSINESS_BORDER}` }}
      >
        <code
          className="flex-1 text-sm font-mono truncate"
          style={{ color: BUSINESS_SILVER, letterSpacing: '0.03em' }}
        >
          {apiKey}
        </code>
        <button
          onClick={copyKey}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-[6px] font-medium transition-all flex-shrink-0"
          style={{
            background: copied ? 'rgba(12,206,107,0.12)' : BUSINESS_SURFACE,
            border: `1px solid ${copied ? 'rgba(12,206,107,0.35)' : BUSINESS_BORDER}`,
            color: copied ? '#0CCE6B' : BUSINESS_SILVER,
          }}
        >
          {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copié' : 'Copier'}
        </button>
        <button
          onClick={regenerateKey}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-[6px] font-medium transition-all flex-shrink-0"
          style={{ background: BUSINESS_SURFACE, border: `1px solid ${BUSINESS_BORDER}`, color: BUSINESS_SILVER }}
          title="Régénérer la clé"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Régénérer
        </button>
      </div>

      <div
        className="p-3 rounded-[var(--velifa-radius-md)] text-xs text-text-muted leading-relaxed"
        style={{ background: BUSINESS_SURFACE, border: `1px solid rgba(200,200,200,0.15)` }}
      >
        <p className="font-semibold mb-1" style={{ color: BUSINESS_SILVER }}>Documentation rapide</p>
        <p>Utilisez cette clé pour accéder à l&apos;API Velifa depuis vos outils :</p>
        <code
          className="block mt-2 text-[11px] p-2 rounded-[6px] font-mono overflow-x-auto"
          style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}
        >
          {'Authorization: Bearer ' + apiKey}
        </code>
        <p className="mt-2 text-text-subtle">
          La clé sera persistée en base de données au déploiement.
        </p>
      </div>
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

          {/* ── Sections Business exclusives ─────────────────── */}
          {!isLoading && (
            <div className="fade-up space-y-6 mb-10 sm:mb-14" style={{ animationDelay: '280ms' }}>

              {/* Multi-sites */}
              <div id="multisites">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Globe className="w-4 h-4" style={{ color: BUSINESS_SILVER }} strokeWidth={1.75} />
                  <h2 className="font-heading font-semibold text-base" style={{ color: BUSINESS_SILVER }}>
                    Multi-sites
                  </h2>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase"
                    style={{ background: BUSINESS_SURFACE, border: `1px solid ${BUSINESS_BORDER}`, color: BUSINESS_SILVER }}
                  >
                    💎 Business
                  </span>
                </div>
                {isBusiness
                  ? <MultiSitesSection />
                  : <BusinessUpgradeTeaser feature="Le suivi multi-sites" />
                }
              </div>

              {/* Alertes */}
              <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Bell className="w-4 h-4" style={{ color: BUSINESS_SILVER }} strokeWidth={1.75} />
                  <h2 className="font-heading font-semibold text-base" style={{ color: BUSINESS_SILVER }}>
                    Alertes de performance
                  </h2>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase"
                    style={{ background: BUSINESS_SURFACE, border: `1px solid ${BUSINESS_BORDER}`, color: BUSINESS_SILVER }}
                  >
                    💎 Business
                  </span>
                </div>
                {isBusiness
                  ? <AlertesSection userEmail={userEmail} />
                  : <BusinessUpgradeTeaser feature="Les alertes de performance" />
                }
              </div>

              {/* Clé API */}
              <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Key className="w-4 h-4" style={{ color: BUSINESS_SILVER }} strokeWidth={1.75} />
                  <h2 className="font-heading font-semibold text-base" style={{ color: BUSINESS_SILVER }}>
                    Clé API
                  </h2>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase"
                    style={{ background: BUSINESS_SURFACE, border: `1px solid ${BUSINESS_BORDER}`, color: BUSINESS_SILVER }}
                  >
                    💎 Business
                  </span>
                </div>
                {isBusiness && userId
                  ? <ApiKeySection userId={userId} />
                  : <BusinessUpgradeTeaser feature="L'accès API" />
                }
              </div>

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
