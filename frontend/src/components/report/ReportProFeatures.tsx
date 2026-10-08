'use client';

import Link from 'next/link';
import {
  Sparkles, Lock, Download, Server, Code2, Globe2,
  Megaphone, Share2, Tag, Wifi, LayoutGrid,
  Layers, Pencil, BarChart2, CheckCircle2,
  AlertCircle, Minus, Gem, Microscope, Clock,
} from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import type { DetectedTech, TechCategory } from '@/types/analysis';

// ── Icônes par catégorie ───────────────────────────────────────────────────
const CATEGORY_ICON: Record<TechCategory, React.ReactNode> = {
  'CMS':          <Pencil      className="w-4 h-4" />,
  'Framework JS': <Code2       className="w-4 h-4" />,
  'Analytics':    <BarChart2   className="w-4 h-4" />,
  'Serveur':      <Server      className="w-4 h-4" />,
};

const CATEGORY_COLOR: Record<TechCategory, string> = {
  'CMS':          'rgba(139,92,246,0.15)',   // violet
  'Framework JS': 'rgba(59,130,246,0.15)',   // bleu
  'Analytics':    'rgba(16,185,129,0.15)',   // vert
  'Serveur':      'rgba(245,158,11,0.15)',   // ambre
};
const CATEGORY_BORDER: Record<TechCategory, string> = {
  'CMS':          'rgba(139,92,246,0.35)',
  'Framework JS': 'rgba(59,130,246,0.35)',
  'Analytics':    'rgba(16,185,129,0.35)',
  'Serveur':      'rgba(245,158,11,0.35)',
};
const CATEGORY_TEXT: Record<TechCategory, string> = {
  'CMS':          '#a78bfa',
  'Framework JS': '#60a5fa',
  'Analytics':    '#34d399',
  'Serveur':      '#fbbf24',
};

function ConfidenceDot({ level }: { level: 'high' | 'medium' | 'low' }) {
  if (level === 'high')   return <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: '#0CCE6B' }} />;
  if (level === 'medium') return <AlertCircle  className="w-3 h-3 flex-shrink-0" style={{ color: '#FFA400' }} />;
  return                         <Minus         className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-subtle)' }} />;
}

// ── Section tech détectée (badge par tech) ────────────────────────────────
function TechBadge({ tech }: { tech: DetectedTech }) {
  const cat = tech.category;
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-[var(--velifa-radius-md)]"
      style={{
        background: CATEGORY_COLOR[cat],
        border: `1px solid ${CATEGORY_BORDER[cat]}`,
      }}
    >
      <span style={{ color: CATEGORY_TEXT[cat] }} className="flex-shrink-0 mt-0.5">
        {CATEGORY_ICON[cat]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-text truncate">{tech.name}</span>
          {tech.version && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}
            >
              v{tech.version}
            </span>
          )}
          <ConfidenceDot level={tech.confidence} />
        </div>
        <span
          className="text-[10px] font-semibold tracking-widest uppercase mt-0.5 block"
          style={{ color: CATEGORY_TEXT[cat] }}
        >
          {cat}
        </span>
      </div>
    </div>
  );
}

// ── Extraction services tiers Lighthouse (complément) ─────────────────────
function extractLighthouseServices(reportJson: any): Array<{ name: string; category: string }> {
  const lh = reportJson?.lighthouseResult ?? reportJson;
  if (!lh?.entities) return [];
  return (lh.entities as any[])
    .filter((e) => !e.isFirstParty && !e.isUnrecognized && e.name)
    .slice(0, 6)
    .map((e) => ({ name: e.name, category: e.category ?? 'utility' }));
}

// ── Catégories des services Lighthouse → icône ────────────────────────────
const LS_CAT_ICON: Record<string, React.ReactNode> = {
  ad:               <Megaphone className="w-3 h-3" />,
  analytics:        <LayoutGrid className="w-3 h-3" />,
  social:           <Share2    className="w-3 h-3" />,
  'tag-manager':    <Tag       className="w-3 h-3" />,
  cdn:              <Wifi      className="w-3 h-3" />,
};
function lsIcon(cat: string) {
  return LS_CAT_ICON[cat] ?? <Globe2 className="w-3 h-3" />;
}
const LS_CAT_FR: Record<string, string> = {
  ad: 'Pub', analytics: 'Analytics', social: 'Social',
  'tag-manager': 'Tag Manager', cdn: 'CDN',
};

// ── Helpers métriques détaillées (Business) ───────────────────────────────
const SILVER = '#C8C8C8';
const SILVER_BORDER = 'rgba(200,200,200,0.38)';
const SILVER_BG = 'rgba(200,200,200,0.07)';

function formatMetricValue(audit: any): string {
  if (!audit) return '—';
  const d = audit.displayValue;
  if (d) return d;
  if (audit.numericValue != null) {
    const n = audit.numericValue;
    if (n >= 1000) return `${(n / 1000).toFixed(1)} s`;
    return `${Math.round(n)} ms`;
  }
  return '—';
}

function getMetricColor(score: number | null): string {
  if (score == null) return 'var(--text-subtle)';
  if (score >= 0.9) return '#0CCE6B';
  if (score >= 0.5) return '#FFA400';
  return '#FF4E42';
}

function DeepAnalysisSection({ reportJson }: { reportJson: any }) {
  const lh = reportJson?.lighthouseResult ?? reportJson;
  const audits = lh?.audits;
  if (!audits) return null;

  const metrics = [
    { key: 'first-contentful-paint',    label: 'First Contentful Paint',  abbr: 'FCP' },
    { key: 'largest-contentful-paint',  label: 'Largest Contentful Paint', abbr: 'LCP' },
    { key: 'total-blocking-time',       label: 'Total Blocking Time',      abbr: 'TBT' },
    { key: 'cumulative-layout-shift',   label: 'Cumulative Layout Shift',  abbr: 'CLS' },
    { key: 'speed-index',               label: 'Speed Index',              abbr: 'SI'  },
    { key: 'interactive',               label: 'Time to Interactive',      abbr: 'TTI' },
  ].map(({ key, label, abbr }) => ({
    key,
    label,
    abbr,
    value: formatMetricValue(audits[key]),
    score: audits[key]?.score ?? null,
  }));

  const opportunities = Object.values(audits as Record<string, any>)
    .filter((a: any) => a.details?.type === 'opportunity' && a.score != null && a.score < 0.9 && a.title)
    .slice(0, 4)
    .map((a: any) => ({
      title: a.title,
      score: a.score,
      savings: a.details?.overallSavingsMs
        ? `${Math.round(a.details.overallSavingsMs)} ms`
        : a.displayValue ?? '',
    }));

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(48,48,48,0.90) 0%, rgba(18,18,18,0.98) 100%)',
        border: `1px solid ${SILVER_BORDER}`,
        borderRadius: 'var(--velifa-radius-lg)',
        padding: '1.5rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.50)',
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Microscope className="w-4 h-4 flex-shrink-0" style={{ color: SILVER }} strokeWidth={1.75} />
        <h2 className="font-heading font-semibold text-base" style={{ color: SILVER }}>
          Analyse approfondie
        </h2>
        <span
          className="ml-auto text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{ background: SILVER_BG, color: SILVER }}
        >
          💎 Business
        </span>
      </div>

      {/* Core Web Vitals détaillés */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-widest uppercase text-text-subtle mb-3">
          Core Web Vitals &amp; Métriques
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {metrics.map(({ key, abbr, label, value, score }) => (
            <div
              key={key}
              className="flex flex-col gap-1 p-3 rounded-[var(--velifa-radius-md)]"
              style={{ background: SILVER_BG, border: `1px solid rgba(200,200,200,0.15)` }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[9px] font-bold tracking-widest uppercase"
                  style={{ color: SILVER }}
                >
                  {abbr}
                </span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: getMetricColor(score) }}
                />
              </div>
              <span
                className="font-heading font-bold text-lg leading-none"
                style={{ color: getMetricColor(score) }}
              >
                {value}
              </span>
              <span className="text-[10px] text-text-subtle truncate">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunités d'optimisation */}
      {opportunities.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-text-subtle mb-3">
            Opportunités d&apos;optimisation
          </p>
          <div className="space-y-2">
            {opportunities.map(({ title, score, savings }) => (
              <div
                key={title}
                className="flex items-center gap-3 p-3 rounded-[var(--velifa-radius-md)]"
                style={{ background: SILVER_BG, border: `1px solid rgba(200,200,200,0.12)` }}
              >
                <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: getMetricColor(score) }} />
                <span className="flex-1 text-sm text-text truncate">{title}</span>
                {savings && (
                  <span className="text-xs font-mono flex-shrink-0" style={{ color: getMetricColor(score) }}>
                    {savings}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function ReportProFeatures({
  reportJson,
  technologies,
  analysisId,
}: {
  reportJson:   any;
  technologies?: DetectedTech[] | null;
  analysisId:   string;
}) {
  const { isActive, plan } = useSubscription();

  // ── Bannière gratuit ──────────────────────────────────────────────────
  if (!isActive) {
    return (
      <div
        className="rounded-[var(--velifa-radius-lg)] border p-6 flex flex-col sm:flex-row sm:items-center gap-5"
        style={{
          background: 'linear-gradient(135deg, rgba(18,18,18,0.98) 0%, rgba(30,24,10,0.98) 100%)',
          border: '1px solid rgba(212,175,55,0.25)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
        }}
      >
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          <Lock className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1">
          <p className="font-heading font-semibold text-base" style={{ color: 'var(--accent)' }}>
            Débloquez le rapport complet avec Velifa Pro
          </p>
          <p className="text-text-muted text-sm mt-1 leading-relaxed">
            Détection automatique des technologies (CMS, frameworks, analytics),
            services tiers, export PDF et historique illimité.
          </p>
        </div>
        <Link href="/tarifs" className="velifa-btn flex-shrink-0 flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4" />
          Voir les plans
        </Link>
      </div>
    );
  }

  // ── Mode Pro ──────────────────────────────────────────────────────────
  const planLabel      = plan === 'business' ? 'Business' : 'Pro';
  const hasTech        = Array.isArray(technologies) && technologies.length > 0;
  const lsServices     = extractLighthouseServices(reportJson);
  const hasLsServices  = lsServices.length > 0;

  // Groupe les technologies par catégorie pour l'affichage
  const byCategory: Partial<Record<TechCategory, DetectedTech[]>> = {};
  if (hasTech) {
    for (const t of technologies!) {
      if (!byCategory[t.category]) byCategory[t.category] = [];
      byCategory[t.category]!.push(t);
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Badge rapport Pro / Business ───────────────────────── */}
      <div className="flex items-center gap-3">
        {plan === 'business' ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase"
            style={{
              background: 'linear-gradient(135deg, rgba(232,232,232,0.14) 0%, rgba(180,180,180,0.08) 100%)',
              border: `1px solid ${SILVER_BORDER}`,
              color: SILVER,
              boxShadow: '0 2px 12px rgba(200,200,200,0.10)',
            }}
          >
            <Gem className="w-3 h-3" />
            Rapport Business
          </span>
        ) : (
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
            Rapport Pro
          </span>
        )}
        <span className="text-text-subtle text-xs">Analyse avancée activée</span>
      </div>

      {/* ── Section technologies détectées ─────────────────────── */}
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
          <Layers className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
          <h2 className="font-heading font-semibold text-text text-base">
            Détection des technologies
          </h2>
          {hasTech && (
            <span
              className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(212,175,55,0.12)', color: 'var(--accent)' }}
            >
              {technologies!.length} trouvée{technologies!.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {!hasTech ? (
          /* Aucune tech détectée → message propre */
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Globe2 className="w-7 h-7 text-text-subtle" strokeWidth={1.5} />
            <p className="text-text-muted text-sm">
              Aucune technologie détectée automatiquement pour ce site.
            </p>
            <p className="text-text-subtle text-xs max-w-xs">
              Le site peut utiliser des technologies obfusquées ou non reconnues par nos signatures.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Par catégorie dans l'ordre : CMS → Framework → Analytics → Serveur */}
            {(['CMS', 'Framework JS', 'Analytics', 'Serveur'] as TechCategory[])
              .filter((cat) => byCategory[cat]?.length)
              .map((cat) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span style={{ color: CATEGORY_TEXT[cat] }}>{CATEGORY_ICON[cat]}</span>
                    <span className="text-[10px] font-bold tracking-widest uppercase"
                      style={{ color: CATEGORY_TEXT[cat] }}>
                      {cat}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {byCategory[cat]!.map((tech) => (
                      <TechBadge key={tech.name} tech={tech} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ── Services tiers Lighthouse (complément) ─────────── */}
        {hasLsServices && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Globe2 className="w-3.5 h-3.5 text-text-subtle" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-text-subtle">
                Services tiers (Lighthouse)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lsServices.map((s) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}
                >
                  <span className="text-text-subtle">{lsIcon(s.category)}</span>
                  {s.name}
                  {LS_CAT_FR[s.category] && (
                    <span className="text-[10px] text-text-subtle">· {LS_CAT_FR[s.category]}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Analyse approfondie (Business uniquement) ──────────── */}
      {plan === 'business' && (
        <DeepAnalysisSection reportJson={reportJson} />
      )}

      {/* ── Export PDF (placeholder) ───────────────────────────── */}
      <div
        className="flex items-center justify-between gap-4 p-4 rounded-[var(--velifa-radius-lg)]"
        style={{
          background: 'rgba(212,175,55,0.05)',
          border: '1px dashed rgba(212,175,55,0.30)',
        }}
      >
        <div className="flex items-center gap-3">
          <Download className="w-4 h-4 text-accent" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-medium text-text">Exporter en PDF</p>
            <p className="text-xs text-text-muted">Rapport complet prêt à partager</p>
          </div>
        </div>
        <button
          disabled
          className="velifa-btn text-xs opacity-60 cursor-not-allowed flex items-center gap-2"
          title="Disponible prochainement"
        >
          <Download className="w-3.5 h-3.5" />
          Bientôt
        </button>
      </div>

    </div>
  );
}
