import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { api } from '@/lib/api';
import { formatMs, getCwvStatus, formatBytes } from '@/lib/utils';
import { displayHost } from '@/lib/score';
import {
  ExternalLink, MessageCircle, Globe, CheckCircle2, AlertCircle, XCircle, Zap,
  Users, ListChecks, Languages, TrendingUp, ShoppingBag, Info,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BrandMark } from '@/components/layout/Header';
import { ScoreRing } from '@/components/ui';
import ReportProFeatures from '@/components/report/ReportProFeatures';
import EmailReportModal from '@/components/report/EmailReportModal';
import LeadForm from '@/components/report/LeadForm';
import PdfDownloadButton from '@/components/report/PdfDownloadButton';
import type { FieldMetric, Recommendation } from '@/types/analysis';

export const revalidate = 0;

async function getAnalysis(id: string) {
  try {
    const res = await api.getAnalysis(id);
    return res.data;
  } catch {
    return null;
  }
}

/** Plateformes hébergées : le marchand ne modifie pas le code, les conseils sont adaptés. */
const HOSTED_PLATFORMS = new Set(['Salla', 'Zid', 'Shopify', 'BigCommerce']);

/** Regroupement des recommandations pour les conseils propres aux plateformes hébergées. */
const TIP_GROUP: Record<string, 'images' | 'apps' | 'theme' | 'server'> = {
  'image-delivery-insight': 'images', 'uses-optimized-images': 'images', 'modern-image-formats': 'images',
  'offscreen-images': 'images', 'unsized-images': 'theme', 'lcp-discovery-insight': 'theme',
  'third-parties-insight': 'apps', 'unused-javascript': 'apps', 'bootup-time': 'apps',
  'mainthread-work-breakdown': 'apps', 'legacy-javascript-insight': 'apps', 'duplicated-javascript-insight': 'apps',
  'render-blocking-insight': 'theme', 'render-blocking-resources': 'theme', 'unused-css-rules': 'theme',
  'font-display-insight': 'theme', 'layout-shifts': 'theme', 'cls-culprits-insight': 'theme', 'dom-size-insight': 'theme',
  'total-byte-weight': 'images',
  'cache-insight': 'server', 'document-latency-insight': 'server', 'server-response-time': 'server',
};

type Status = 'good' | 'needs-improvement' | 'poor';
const FIELD_STATUS: Record<string, Status> = { FAST: 'good', AVERAGE: 'needs-improvement', SLOW: 'poor' };
const BORDER: Record<Status, string> = { good: 'border-score-good/30', 'needs-improvement': 'border-score-average/30', poor: 'border-score-poor/30' };
const BG: Record<Status, string> = { good: 'bg-score-good/10', 'needs-improvement': 'bg-score-average/10', poor: 'bg-score-poor/10' };
const TEXT: Record<Status, string> = { good: 'text-score-good', 'needs-improvement': 'text-score-average', poor: 'text-score-poor' };

function StatusIcon({ status }: { status: Status }) {
  if (status === 'good')              return <CheckCircle2 className="w-4 h-4 score-good flex-shrink-0" />;
  if (status === 'needs-improvement') return <AlertCircle  className="w-4 h-4 score-average flex-shrink-0" />;
  return <XCircle className="w-4 h-4 score-poor flex-shrink-0" />;
}

/** Section du rapport : carte avec en-tête (icône, titre, sous-titre) et ancre de navigation. */
function ReportSection({ id, icon: Icon, title, subtitle, children }: {
  id: string; icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-velifa-xl border border-border bg-[color:var(--surface)] p-5 sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] border border-border bg-[color:var(--bg-subtle)] text-text">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold text-text">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Tuile de mesure ; statut `null` = mesure absente (affichage neutre, pas « mauvais »). */
function MetricTile({ label, value, status, hint, footer }: {
  label: string; value: string; status: Status | null; hint?: string; footer?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col rounded-velifa-lg border p-4 ${status ? `${BORDER[status]} ${BG[status]}` : 'border-border bg-[color:var(--bg-subtle)]'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">{label}</span>
        {status && <StatusIcon status={status} />}
      </div>
      <div dir="ltr" className={`font-heading text-2xl font-semibold tabular-nums ${status ? TEXT[status] : 'text-text-muted'}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-text-subtle">{hint}</div>}
      {footer && <div className="mt-3 border-t border-border pt-2.5 text-xs text-text-muted">{footer}</div>}
    </div>
  );
}

function formatSavings(r: Recommendation): string | null {
  if (r.savingsMs > 0) return formatMs(r.savingsMs);
  if (r.savingsCls > 0) return `CLS −${r.savingsCls}`;
  return null;
}

export default async function ReportPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis || analysis.status !== 'completed') notFound();

  const t = await getTranslations({ locale, namespace: 'reportPage' });

  const score = analysis.scorePerformance ?? 0;
  const scoreLabel = score >= 90 ? t('scoreLabel.excellent') : score >= 50 ? t('scoreLabel.needsWork') : t('scoreLabel.critical');
  const scoreRingColor = score >= 90 ? 'var(--velifa-score-good)' : score >= 50 ? 'var(--velifa-score-average)' : 'var(--velifa-score-poor)';

  const platform = analysis.platform ?? null;
  const field = analysis.fieldData ?? null;
  const recs = analysis.recommendations ?? [];
  const checks = analysis.siteChecks ?? null;

  const fieldItems: { key: string; label: string; m: FieldMetric | null; format: (v: number) => string }[] = field ? [
    { key: 'lcp', label: t('field.lcp'), m: field.lcpMs, format: formatMs },
    { key: 'inp', label: t('field.inp'), m: field.inpMs, format: formatMs },
    { key: 'cls', label: t('field.cls'), m: field.cls,   format: (v) => v.toFixed(2) },
    { key: 'ttfb', label: t('field.ttfb'), m: field.ttfbMs, format: formatMs },
  ] : [];

  const fmtCls = (v: number) => v.toFixed(3);
  const cwvItems: { key: 'lcp' | 'cls' | 'tbt' | 'fcp'; label: string; value: number | null | undefined; desktop: number | null | undefined; format: (v: number) => string; desc: string }[] = [
    { key: 'lcp', label: 'LCP', value: analysis.lcpMobile, desktop: analysis.lcpDesktop, format: formatMs, desc: t('lab.lcp') },
    { key: 'cls', label: 'CLS', value: analysis.clsMobile, desktop: analysis.clsDesktop, format: fmtCls,   desc: t('lab.cls') },
    { key: 'tbt', label: 'TBT', value: analysis.tbtMobile, desktop: analysis.tbtDesktop, format: formatMs, desc: t('lab.tbt') },
    { key: 'fcp', label: 'FCP', value: analysis.fcpMobile, desktop: null,                format: formatMs, desc: t('lab.fcp') },
  ];

  const lighthouseScores = [
    { label: t('scores.performance'),   score: analysis.scorePerformance },
    { label: t('scores.accessibility'), score: analysis.scoreAccessibility },
    { label: t('scores.seo'),           score: analysis.scoreSeo },
    { label: t('scores.bestPractices'), score: analysis.scoreBestPractices },
  ];

  const recTitle = (rid: string) => (t.has(`recs.list.${rid}.title`) ? t(`recs.list.${rid}.title`) : rid);
  const recHow   = (rid: string) => (t.has(`recs.list.${rid}.how`) ? t(`recs.list.${rid}.how`) : '');
  const hosted = platform != null && HOSTED_PLATFORMS.has(platform);
  const host = displayHost(analysis.urlSite);

  const reportUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/analyse/${id}`
    : `/${locale}/analyse/${id}`;

  const createdAt = analysis.completedAt ?? analysis.createdAt;
  const dateLabel = createdAt
    ? new Date(createdAt).toLocaleDateString(locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const hasFiles = (analysis.imagesToOptimize?.length ?? 0) > 0 || (analysis.blockingScripts?.length ?? 0) > 0;
  const nav = [
    { id: 'visitors', label: t('field.title') },
    { id: 'priorities', label: t('recs.title') },
    ...(checks ? [{ id: 'gulf', label: t('gulf.title') }] : []),
    { id: 'lab', label: t('lab.title') },
    ...(hasFiles ? [{ id: 'files', label: t('opportunities.title') }] : []),
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={`/${locale}`} aria-label="VELIFA" className="flex-shrink-0"><BrandMark /></Link>
            <span className="hidden h-5 w-px bg-[color:var(--border-strong)] sm:block" />
            <span className="hidden min-w-0 items-center gap-1.5 sm:flex">
              <Globe className="h-3.5 w-3.5 flex-shrink-0 text-text-subtle" />
              <span dir="ltr" className="truncate text-sm font-medium text-text">{host}</span>
            </span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <PdfDownloadButton analysisId={analysis.id} />
            <a href={analysis.urlSite} target="_blank" rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-velifa-md px-2 py-1.5 text-sm text-text-muted transition hover:text-text md:flex">
              {t('viewSite')} <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        {/* ── Synthèse ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-velifa-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)]">
          <div aria-hidden className="pointer-events-none absolute -top-40 start-[-10%] h-96 w-96 rounded-full blur-3xl"
            style={{ background: `radial-gradient(closest-side, color-mix(in srgb, ${scoreRingColor} 18%, transparent), transparent)` }} />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="mx-auto flex-shrink-0 sm:mx-0">
                <ScoreRing score={analysis.scorePerformance ?? null} size={148} stroke={9} />
              </div>
              <div className="min-w-0 text-center sm:text-start">
                <div className="mb-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ color: scoreRingColor, background: `color-mix(in srgb, ${scoreRingColor} 14%, transparent)` }}>
                    {t('mobilePerformance')}
                  </span>
                  {platform && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-strong)] px-2.5 py-1 text-xs font-medium text-text">
                      <ShoppingBag className="h-3.5 w-3.5" /> {t('platform', { platform })}
                    </span>
                  )}
                </div>
                <h1 className="font-heading text-3xl font-semibold tracking-tight text-text sm:text-4xl">{scoreLabel}</h1>
                <p dir="ltr" className="mt-1 truncate text-sm text-text-subtle sm:hidden">{host}</p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
                  {t('scoreSentence', { score })}{' '}
                  {score < 50 ? t('scoreUrgent') : score < 90 ? t('scoreMedium') : t('scoreGood')}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  {analysis.whatsappLink && (
                    <a href={analysis.whatsappLink} target="_blank" rel="noopener noreferrer" className="velifa-btn inline-flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" /> {t('whatsappCta')}
                    </a>
                  )}
                  {dateLabel && <span className="text-xs text-text-subtle">{t('analyzedOn', { date: dateLabel })}</span>}
                </div>
              </div>
            </div>

            {analysis.screenshotUrl && (
              <div className="hidden lg:block">
                <div className="overflow-hidden rounded-velifa-lg border border-border bg-[color:var(--bg-subtle)] shadow-velifa-md">
                  <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
                    {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-[color:var(--border-strong)]" />)}
                    <span dir="ltr" className="ms-2 truncate font-mono text-[10px] text-text-subtle">{host}</span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={analysis.screenshotUrl} alt="" className="aspect-[4/3] w-full object-cover object-top" />
                </div>
              </div>
            )}
          </div>

          {/* Les 4 scores Lighthouse */}
          <div className="relative grid grid-cols-2 border-t border-border md:grid-cols-4">
            {lighthouseScores.map(({ label, score: s }, i) => (
              <div key={label}
                className={`flex items-center gap-3 px-5 py-4 ${i % 2 === 0 ? 'border-e border-border' : ''} ${i < 2 ? 'border-b border-border md:border-b-0' : ''} ${i === 1 ? 'md:border-e' : ''}`}>
                <ScoreRing score={s ?? null} size={46} stroke={4} />
                <span className="text-xs font-medium leading-tight text-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Navigation interne ──────────────────────────────────────── */}
        <nav aria-label={t('onThisPage')} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-2">
            {nav.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-border bg-[color:var(--surface)] px-4 text-xs font-medium text-text-muted transition-colors hover:border-[color:var(--border-strong)] hover:text-text">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Vrais visiteurs (CrUX) ──────────────────────────────────── */}
        <ReportSection id="visitors" icon={Users} title={t('field.title')}
          subtitle={field ? (field.scope === 'url' ? t('field.subtitleUrl') : t('field.subtitleOrigin')) : undefined}>
          {field ? (
            <>
              {field.overall && (
                <p className="mb-4 text-sm text-text-muted">
                  {t('field.overall')} <strong className={TEXT[FIELD_STATUS[field.overall]]}>{t(`field.${field.overall}`)}</strong>
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {fieldItems.map(({ key, label, m, format }) => (
                  <MetricTile key={key} label={label} status={m?.category ? FIELD_STATUS[m.category] : null}
                    value={m ? format(m.percentile) : '—'} hint={m?.category ? t(`field.${m.category}`) : undefined} />
                ))}
              </div>
            </>
          ) : (
            <p className="flex items-start gap-2 text-sm text-text-muted">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" /> {t('field.none')}
            </p>
          )}
        </ReportSection>

        {/* ── Recommandations priorisées ──────────────────────────────── */}
        <ReportSection id="priorities" icon={ListChecks} title={t('recs.title')} subtitle={t('recs.subtitle')}>
          {recs.length === 0 ? (
            <p className="text-sm text-text-muted">{t('recs.none')}</p>
          ) : (
            <ol className="divide-y divide-[color:var(--border)] overflow-hidden rounded-velifa-lg border border-border">
              {recs.map((r, i) => {
                const st: Status = r.impact === 'high' ? 'poor' : r.impact === 'medium' ? 'needs-improvement' : 'good';
                const saving = formatSavings(r);
                const group = TIP_GROUP[r.id];
                return (
                  <li key={r.id} className="flex items-start gap-4 bg-[color:var(--bg)] p-4 sm:p-5">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--border-strong)] font-heading text-xs font-semibold tabular-nums text-text">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-text">{recTitle(r.id)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BG[st]} ${TEXT[st]}`}>{t(`recs.impact.${r.impact}`)}</span>
                      </div>
                      {recHow(r.id) && <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{recHow(r.id)}</p>}
                      {(saving || r.itemCount > 0) && (
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-subtle">
                          {saving && <span dir="auto">{t('recs.savings', { value: saving })}</span>}
                          {r.itemCount > 0 && <span>{t('recs.items', { count: r.itemCount })}</span>}
                        </div>
                      )}
                      {hosted && group && (
                        <p className="mt-3 rounded-velifa-md border border-border bg-[color:var(--bg-subtle)] p-3 text-xs leading-relaxed text-text-muted">
                          <strong className="text-text">{t('recs.tipOn', { platform: platform! })} </strong>
                          {t(`recs.tips.${group}`)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </ReportSection>

        {/* ── Impact business (sourcé) ────────────────────────────────── */}
        <section className="rounded-velifa-xl border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px] border border-border bg-[color:var(--bg)] text-text">
              <TrendingUp className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="font-heading text-lg font-semibold text-text">{t('impact.title')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-text">{t('impact.body')}</p>
              <p className="mt-2 text-xs text-text-muted">{t('impact.caveat')}</p>
              <a href="https://web.dev/case-studies/milliseconds-make-millions" target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-text underline underline-offset-4">
                {t('impact.source')} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </section>

        {/* ── « Je veux corriger » (capture de contact) ─────────────────── */}
        <LeadForm analysisId={analysis.id} />

        {/* ── Langue arabe et confidentialité ─────────────────────────── */}
        {checks && (
          <ReportSection id="gulf" icon={Languages} title={t('gulf.title')} subtitle={t('gulf.subtitle')}>
            {checks.blocked ? (
              <p className="text-sm text-text-muted">{t('gulf.blocked')}</p>
            ) : (
              <>
                {checks.issues.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm score-good"><CheckCircle2 className="h-4 w-4" /> {t('gulf.ok')}</p>
                ) : (
                  <ul className="space-y-2">
                    {checks.issues.map((iss) => {
                      const st: Status = iss.severity === 'high' ? 'poor' : iss.severity === 'medium' ? 'needs-improvement' : 'good';
                      return (
                        <li key={iss.code} className={`flex items-start gap-3 rounded-velifa-lg p-3.5 ${BG[st]}`}>
                          <StatusIcon status={st} />
                          <span className="text-sm text-text">
                            {t.has(`gulf.issues.${iss.code}`) ? t(`gulf.issues.${iss.code}`) : iss.code}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {(checks.privacy.trackers.length > 0 || checks.privacy.consentTool) && (
                  <div className="mt-4 space-y-1 text-xs text-text-subtle">
                    {checks.privacy.trackers.length > 0 && <p>{t('gulf.trackers', { list: checks.privacy.trackers.join(', ') })}</p>}
                    {checks.privacy.consentTool && <p>{t('gulf.consentTool', { name: checks.privacy.consentTool })}</p>}
                  </div>
                )}
              </>
            )}
            <p className="mt-4 border-t border-border pt-3 text-[11px] text-text-subtle">{t('gulf.disclaimer')}</p>
          </ReportSection>
        )}

        {/* ── Core Web Vitals (laboratoire), mobile + ordinateur ──────── */}
        <ReportSection id="lab" icon={Zap} title={t('lab.title')} subtitle={t('lab.note')}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {cwvItems.map(({ key, label, value, desktop, format, desc }) => {
              const status = value == null ? null : getCwvStatus(key, value);
              const dStatus = desktop == null ? null : getCwvStatus(key, desktop);
              return (
                <MetricTile key={key} label={label} status={status}
                  value={value == null ? t('lab.unavailable') : format(value)} hint={desc}
                  footer={key !== 'fcp' ? (
                    <span className="flex items-center justify-between gap-2">
                      <span>{t('lab.desktop')}</span>
                      <span dir="ltr" className={`font-semibold tabular-nums ${dStatus ? TEXT[dStatus] : 'text-text-subtle'}`}>
                        {desktop == null ? '—' : format(desktop)}
                      </span>
                    </span>
                  ) : undefined} />
              );
            })}
          </div>
        </ReportSection>

        {/* ── Fichiers concernés ──────────────────────────────────────── */}
        {hasFiles && (
          <ReportSection id="files" icon={AlertCircle} title={t('opportunities.title')}>
            <ul className="divide-y divide-[color:var(--border)] overflow-hidden rounded-velifa-lg border border-border">
              {(analysis.imagesToOptimize ?? []).slice(0, 5).map((item, i) => (
                <li key={`img-${i}`} className="flex items-start gap-3 bg-[color:var(--bg)] p-3.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 score-average" />
                  <div className="min-w-0">
                    <div dir="ltr" className="truncate font-mono text-xs text-text">{item.url || item.title}</div>
                    {item.savingsBytes ? <div className="mt-0.5 text-xs score-average">{t('opportunities.saving', { value: formatBytes(item.savingsBytes) })}</div> : null}
                  </div>
                </li>
              ))}
              {(analysis.blockingScripts ?? []).slice(0, 3).map((item, i) => (
                <li key={`blk-${i}`} className="flex items-start gap-3 bg-[color:var(--bg)] p-3.5">
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 score-poor" />
                  <div className="min-w-0">
                    <div dir="ltr" className="truncate font-mono text-xs text-text">{item.url || item.title}</div>
                    {item.savingsBytes ? <div className="mt-0.5 text-xs score-poor">{t('opportunities.blocking', { value: formatBytes(item.savingsBytes) })}</div> : null}
                  </div>
                </li>
              ))}
            </ul>
          </ReportSection>
        )}

        {/* ── Section Pro / bannière ──────────────────────────────────── */}
        <ReportProFeatures reportJson={analysis.reportJson} technologies={analysis.technologies} analysisId={analysis.id} />
      </div>

      {/* ── CTA WhatsApp fixe ───────────────────────────────────────────── */}
      {analysis.whatsappLink && (
        <div className="fixed bottom-5 end-5 z-30">
          <a href={analysis.whatsappLink} target="_blank" rel="noopener noreferrer"
            aria-label={t('stickyCta')} className="velifa-btn inline-flex items-center gap-2 shadow-velifa-lg">
            <MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">{t('stickyCta')}</span>
          </a>
        </div>
      )}

      <EmailReportModal analysisId={id} siteUrl={analysis.urlSite} score={score} reportUrl={reportUrl} />
    </div>
  );
}
