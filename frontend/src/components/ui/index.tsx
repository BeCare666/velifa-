'use client';
/**
 * Composants d'interface partagés (espace client + admin).
 * Uniquement des variables de la charte : fonctionnent en thème sombre et clair.
 */
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { scoreBucket, SCORE_BG, SCORE_COLOR, SCORE_LABEL_KEY } from '@/lib/score';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/* ── Mise en page ─────────────────────────────────────────────────────────── */

export function PageHeader({
  eyebrow, title, description, actions,
}: { eyebrow?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="velifa-eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-text sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title, eyebrow, actions, children, className, padded = true,
}: {
  title?: React.ReactNode; eyebrow?: React.ReactNode; actions?: React.ReactNode;
  children: React.ReactNode; className?: string; padded?: boolean;
}) {
  return (
    <section className={cx('rounded-velifa-lg border border-border bg-[color:var(--surface)] shadow-velifa-sm', className)}>
      {(title || actions || eyebrow) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {eyebrow && <p className="velifa-eyebrow mb-1 !text-[10px]">{eyebrow}</p>}
            {title && <h2 className="truncate text-sm font-semibold text-text">{title}</h2>}
          </div>
          {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

/* ── Indicateurs ──────────────────────────────────────────────────────────── */

export function StatCard({
  icon: Icon, label, value, sub, loading, highlight, trend,
}: {
  icon?: React.ElementType; label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode;
  loading?: boolean; highlight?: boolean; trend?: { delta: number; label?: React.ReactNode } | null;
}) {
  return (
    <div
      className={cx(
        'group relative flex h-full flex-col justify-between gap-5 overflow-hidden rounded-velifa-lg border p-5 transition-colors',
        highlight ? 'border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]' : 'border-border bg-[color:var(--surface)]',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">{label}</span>
        {Icon && (
          <span className="grid h-8 w-8 place-items-center rounded-[9px] border border-border bg-[color:var(--bg-subtle)] text-text-muted">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div className="font-heading text-[32px] font-semibold leading-none tracking-tight text-text tabular-nums">{value}</div>
        )}
        {!loading && (sub || trend) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
            {trend && (
              <span
                className="rounded-full px-1.5 py-0.5 font-medium tabular-nums"
                style={{
                  color: trend.delta >= 0 ? 'var(--velifa-score-good)' : 'var(--velifa-score-poor)',
                  background: trend.delta >= 0 ? 'var(--velifa-score-good-bg)' : 'var(--velifa-score-poor-bg)',
                }}
              >
                {trend.delta >= 0 ? '+' : ''}{trend.delta}%
              </span>
            )}
            {trend?.label ?? sub}
          </div>
        )}
      </div>
    </div>
  );
}

/** Pastille de score : valeur + couleur de sens (+ libellé traduit si demandé). */
export function ScoreBadge({ score, withLabel = false }: { score: number | null | undefined; withLabel?: boolean }) {
  const t = useTranslations('audits');
  const b = scoreBucket(score);
  const key = SCORE_LABEL_KEY[b];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
      style={{ color: SCORE_COLOR[b], background: SCORE_BG[b] }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: SCORE_COLOR[b] }} />
      {score ?? '—'}
      {withLabel && key && <span className="font-medium opacity-90">· {t(key)}</span>}
    </span>
  );
}

/** Anneau de score animé. */
export function ScoreRing({ score, size = 72, stroke = 5 }: { score: number | null | undefined; size?: number; stroke?: number }) {
  const b = scoreBucket(score);
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const target = circ * (1 - (score ?? 0) / 100);
  const ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.strokeDashoffset = String(circ);
    void el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)';
    el.style.strokeDashoffset = String(target);
  }, [circ, target]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0" role="img" aria-label={`Score ${score ?? '—'}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      {score != null && (
        <circle
          ref={ref}
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={SCORE_COLOR[b]} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={target}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill={score != null ? 'var(--text)' : 'var(--text-subtle)'}
        fontSize={size * 0.28} fontWeight={600} fontFamily="var(--velifa-font-heading)"
      >
        {score ?? '—'}
      </text>
    </svg>
  );
}

/* ── États ────────────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-velifa-sm bg-[color:var(--surface-raised)]', className)} />;
}

export function EmptyState({
  icon: Icon, title, description, action,
}: { icon?: React.ElementType; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-velifa-lg border border-dashed border-[color:var(--border-strong)] px-6 py-14 text-center">
      {Icon && (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-full border border-border bg-[color:var(--surface)] text-text-muted">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      )}
      <p className="text-sm font-semibold text-text">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'average' | 'poor' }) {
  const style =
    tone === 'neutral'
      ? undefined
      : { color: `var(--velifa-score-${tone})`, background: `var(--velifa-score-${tone}-bg)`, borderColor: 'transparent' };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-text-muted"
      style={style}
    >
      {children}
    </span>
  );
}
