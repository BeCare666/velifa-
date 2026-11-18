/**
 * Blocs des pages vitrine (accueil, fonctionnalités, à propos, FAQ, contact).
 * Composants serveur : aucun état, uniquement les variables de la charte (thèmes sombre et clair, RTL).
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/** En-tête de page vitrine : fond quadrillé discret + halo, titre centré. */
export function MarketingHero({
  eyebrow, title, subtitle, children,
}: { eyebrow: string; title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[360px] w-[720px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgb(var(--accent-rgb)/0.10), transparent)' }}
      />
      <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24">
        <p className="velifa-eyebrow mb-5">{eyebrow}</p>
        <h1 className="font-heading text-4xl font-semibold leading-[1.08] tracking-tight text-text sm:text-5xl lg:text-[56px]">
          {title}
        </h1>
        {subtitle && <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">{subtitle}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow, title, subtitle, className,
}: { eyebrow?: string; title: React.ReactNode; subtitle?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('mx-auto mb-12 max-w-2xl text-center', className)}>
      {eyebrow && <p className="velifa-eyebrow mb-4">{eyebrow}</p>}
      <h2 className="font-heading text-3xl font-semibold tracking-tight text-text md:text-[40px]">{title}</h2>
      {subtitle && <p className="mt-4 text-base leading-relaxed text-text-muted">{subtitle}</p>}
    </div>
  );
}

export type FeatureItem = { icon: React.ElementType; title: string; description: string; tag?: string | null; wide?: boolean };

/** Grille à filets fins (cellules séparées par 1 px), cohérente avec la grille des capacités de l'accueil. */
export function FeatureGrid({ items, columns = 3 }: { items: FeatureItem[]; columns?: 2 | 3 | 4 }) {
  const cols = columns === 4 ? 'lg:grid-cols-4' : columns === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3';
  return (
    <div className={cx('grid grid-cols-1 gap-px overflow-hidden rounded-velifa-xl border border-border bg-[color:var(--border)] sm:grid-cols-2', cols)}>
      {items.map(({ icon: Icon, title, description, tag, wide }) => (
        <div key={title} className={cx('group relative flex flex-col bg-[color:var(--bg)] p-6 transition-colors hover:bg-[color:var(--bg-subtle)] sm:p-7', wide && 'sm:col-span-2')}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[11px] border border-border bg-[color:var(--surface)] text-text">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            {tag && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {tag}
              </span>
            )}
          </div>
          <h3 className="mb-2 text-[15px] font-semibold text-text">{title}</h3>
          <p className="text-sm leading-relaxed text-text-muted">{description}</p>
        </div>
      ))}
    </div>
  );
}

/** Étapes numérotées reliées par une ligne (horizontale sur ordinateur). */
export function Steps({ steps }: { steps: { number: string; title: string; description: string }[] }) {
  return (
    <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
      <span aria-hidden className="absolute inset-x-[16%] top-6 hidden h-px bg-[color:var(--border-strong)] md:block" />
      {steps.map((s) => (
        <li key={s.number} className="relative text-center">
          <span className="relative mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--bg)] font-heading text-sm font-semibold tabular-nums text-text">
            {s.number}
          </span>
          <h3 className="mb-2 font-heading text-lg font-semibold text-text">{s.title}</h3>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-text-muted">{s.description}</p>
        </li>
      ))}
    </ol>
  );
}

/** Bandeau d'appel final. */
export function CtaBand({
  title, subtitle, primary, secondary,
}: {
  title: string; subtitle?: string;
  primary: { href: string; label: string }; secondary?: { href: string; label: string };
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-6">
      <div className="relative overflow-hidden rounded-velifa-xl border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-6 py-14 text-center sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[600px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgb(var(--accent-rgb)/0.12), transparent)' }}
        />
        <h2 className="relative font-heading text-3xl font-semibold tracking-tight text-text md:text-[40px]">{title}</h2>
        {subtitle && <p className="relative mx-auto mt-4 max-w-md text-base text-text-muted">{subtitle}</p>}
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={primary.href} className="velifa-btn inline-flex items-center gap-2">
            {primary.label}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
          {secondary && (
            <Link href={secondary.href} className="velifa-btn velifa-btn--ghost inline-flex items-center gap-2">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
