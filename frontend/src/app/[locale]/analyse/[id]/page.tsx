import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { api } from '@/lib/api';
import { getScoreColor, getScoreBg, formatMs, getCwvStatus, formatBytes } from '@/lib/utils';
import {
  ExternalLink, MessageCircle, Globe, CheckCircle2, AlertCircle, XCircle, Zap,
  Users, ListChecks, Languages, TrendingUp, ShoppingBag, Info,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import ReportProFeatures from '@/components/report/ReportProFeatures';
import EmailReportModal from '@/components/report/EmailReportModal';
import LeadForm from '@/components/report/LeadForm';
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

function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-heading font-semibold text-text flex items-center gap-2">
        <Icon className="w-4 h-4 text-accent" /> {title}
      </h2>
      {subtitle && <p className="text-xs text-text-muted mt-1 leading-relaxed">{subtitle}</p>}
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
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference;
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

  const cwvItems = [
    { key: 'lcp', label: 'LCP', value: analysis.lcpMobile, format: formatMs, desc: t('lab.lcp') },
    { key: 'cls', label: 'CLS', value: analysis.clsMobile, format: (v: number | null | undefined) => v != null ? v.toFixed(3) : 'N/A', desc: t('lab.cls') },
    { key: 'tbt', label: 'TBT', value: analysis.tbtMobile, format: formatMs, desc: t('lab.tbt') },
    { key: 'fcp', label: 'FCP', value: analysis.fcpMobile, format: formatMs, desc: t('lab.fcp') },
  ] as const;

  const lighthouseScores = [
    { label: t('scores.performance'),   score: analysis.scorePerformance },
    { label: t('scores.accessibility'), score: analysis.scoreAccessibility },
    { label: t('scores.seo'),           score: analysis.scoreSeo },
    { label: t('scores.bestPractices'), score: analysis.scoreBestPractices },
  ];

  const recTitle = (rid: string) => (t.has(`recs.list.${rid}.title`) ? t(`recs.list.${rid}.title`) : rid);
  const recHow   = (rid: string) => (t.has(`recs.list.${rid}.how`) ? t(`recs.list.${rid}.how`) : '');
  const hosted = platform != null && HOSTED_PLATFORMS.has(platform);

  const reportUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/analyse/${id}`
    : `/${locale}/analyse/${id}`;

  return (
    <main className="min-h-screen bg-bg">
      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <header className="border-b border-border sticky top-0 z-10 bg-bg/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Zap className="w-5 h-5 text-accent flex-shrink-0" />
            <Link href={`/${locale}`} className="velifa-wordmark text-sm">VELIFA</Link>
            <span className="text-muted text-xs">·</span>
            <Globe className="w-4 h-4 text-text-subtle flex-shrink-0" />
            <span dir="ltr" className="text-sm font-medium text-text truncate">{analysis.urlSite}</span>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <a href={analysis.urlSite} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition">
              {t('viewSite')} <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* ── Score ───────────────────────────────────────────────────── */}
        <div className="velifa-card">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="45" fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="60" cy="60" r="45" fill="none" stroke={scoreRingColor} strokeWidth="10"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
                  transform="rotate(-90 60 60)" className="score-ring" />
                <text x="60" y="55" textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 26, fontWeight: 700, fill: 'var(--text)' }}>{score}</text>
                <text x="60" y="74" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--text-subtle)' }}>/100</text>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl font-heading font-bold text-text">{scoreLabel}</h1>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${getScoreBg(score)} ${getScoreColor(score)}`}>
                  {t('mobilePerformance')}
                </span>
                {platform && (
                  <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium"
                    style={{ background: 'rgba(212,175,55,0.12)', color: 'var(--accent)', border: '1px solid rgba(212,175,55,0.35)' }}>
                    <ShoppingBag className="w-3.5 h-3.5" /> {t('platform', { platform })}
                  </span>
                )}
              </div>
              <p className="text-text-muted mb-4 text-sm leading-relaxed">
                {t('scoreSentence', { score })}{' '}
                {score < 50 ? t('scoreUrgent') : score < 90 ? t('scoreMedium') : t('scoreGood')}
              </p>
              {analysis.whatsappLink && (
                <a href={analysis.whatsappLink} target="_blank" rel="noopener noreferrer" className="velifa-btn">
                  <MessageCircle className="w-4 h-4" /> {t('whatsappCta')}
                </a>
              )}
            </div>
            {analysis.screenshotUrl && (
              <div className="flex-shrink-0">
                <img src={analysis.screenshotUrl} alt=""
                  className="w-48 h-32 object-cover rounded-velifa-lg border border-border shadow-md" />
              </div>
            )}
          </div>
        </div>

        {/* ── Vrais visiteurs (CrUX) ──────────────────────────────────── */}
        <div className="velifa-card">
          <SectionTitle icon={Users} title={t('field.title')}
            subtitle={field ? (field.scope === 'url' ? t('field.subtitleUrl') : t('field.subtitleOrigin')) : undefined} />
          {field ? (
            <>
              {field.overall && (
                <p className="text-sm text-text-muted mb-4">
                  {t('field.overall')} <strong className={TEXT[FIELD_STATUS[field.overall]]}>{t(`field.${field.overall}`)}</strong>
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {fieldItems.map(({ key, label, m, format }) => {
                  const st = m?.category ? FIELD_STATUS[m.category] : null;
                  return (
                    <div key={key} className={`rounded-velifa-lg border p-4 ${st ? `${BORDER[st]} ${BG[st]}` : 'border-border'}`}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-xs font-bold text-text-muted">{label}</span>
                        {st && <StatusIcon status={st} />}
                      </div>
                      <div dir="ltr" className={`text-2xl font-bold font-heading ${st ? TEXT[st] : 'text-text-muted'}`}>
                        {m ? format(m.percentile) : '—'}
                      </div>
                      {m?.category && <div className="text-xs text-text-subtle mt-1">{t(`field.${m.category}`)}</div>}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-text-muted flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" /> {t('field.none')}
            </p>
          )}
        </div>

        {/* ── Recommandations priorisées ──────────────────────────────── */}
        <div className="velifa-card">
          <SectionTitle icon={ListChecks} title={t('recs.title')} subtitle={t('recs.subtitle')} />
          {recs.length === 0 ? (
            <p className="text-sm text-text-muted">{t('recs.none')}</p>
          ) : (
            <ol className="space-y-3">
              {recs.map((r, i) => {
                const st: Status = r.impact === 'high' ? 'poor' : r.impact === 'medium' ? 'needs-improvement' : 'good';
                const saving = formatSavings(r);
                const group = TIP_GROUP[r.id];
                return (
                  <li key={r.id} className={`rounded-velifa-lg border p-4 ${BORDER[st]}`}>
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${BG[st]} ${TEXT[st]}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-text">{recTitle(r.id)}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${BG[st]} ${TEXT[st]}`}>{t(`recs.impact.${r.impact}`)}</span>
                        </div>
                        {recHow(r.id) && <p className="text-xs text-text-muted mt-1 leading-relaxed">{recHow(r.id)}</p>}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-text-subtle">
                          {saving && <span dir="auto">{t('recs.savings', { value: saving })}</span>}
                          {r.itemCount > 0 && <span>{t('recs.items', { count: r.itemCount })}</span>}
                        </div>
                        {hosted && group && (
                          <p className="text-xs mt-2 p-2 rounded-velifa-md" style={{ background: 'rgba(212,175,55,0.08)', color: 'var(--text-muted)' }}>
                            <strong style={{ color: 'var(--accent)' }}>{t('recs.tipOn', { platform: platform! })} </strong>
                            {t(`recs.tips.${group}`)}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* ── Impact business (sourcé) ────────────────────────────────── */}
        <div className="velifa-card" style={{ borderColor: 'rgba(212,175,55,0.35)' }}>
          <SectionTitle icon={TrendingUp} title={t('impact.title')} />
          <p className="text-sm text-text leading-relaxed">{t('impact.body')}</p>
          <p className="text-xs text-text-muted mt-2">{t('impact.caveat')}</p>
          <a href="https://web.dev/case-studies/milliseconds-make-millions" target="_blank" rel="noopener noreferrer"
            className="text-xs text-accent hover:underline mt-1 inline-block">{t('impact.source')}</a>
        </div>

        {/* ── « Je veux corriger » (capture de contact) ─────────────────── */}
        <LeadForm analysisId={analysis.id} />

        {/* ── Langue arabe et confidentialité ─────────────────────────── */}
        {checks && (
          <div className="velifa-card">
            <SectionTitle icon={Languages} title={t('gulf.title')} subtitle={t('gulf.subtitle')} />
            {checks.blocked ? (
              <p className="text-sm text-text-muted">{t('gulf.blocked')}</p>
            ) : (
              <>
                {checks.issues.length === 0 ? (
                  <p className="text-sm score-good flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {t('gulf.ok')}</p>
                ) : (
                  <ul className="space-y-2">
                    {checks.issues.map((iss) => {
                      const st: Status = iss.severity === 'high' ? 'poor' : iss.severity === 'medium' ? 'needs-improvement' : 'good';
                      return (
                        <li key={iss.code} className={`flex items-start gap-3 p-3 rounded-velifa-lg ${BG[st]}`}>
                          <StatusIcon status={st} />
                          <span className="text-sm text-text">
                            {t.has(`gulf.issues.${iss.code}`) ? t(`gulf.issues.${iss.code}`) : iss.code}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="mt-4 space-y-1 text-xs text-text-subtle">
                  {checks.privacy.trackers.length > 0 && <p>{t('gulf.trackers', { list: checks.privacy.trackers.join(', ') })}</p>}
                  {checks.privacy.consentTool && <p>{t('gulf.consentTool', { name: checks.privacy.consentTool })}</p>}
                </div>
              </>
            )}
            <p className="text-[11px] text-text-subtle mt-4 pt-3 border-t border-border">{t('gulf.disclaimer')}</p>
          </div>
        )}

        {/* ── Core Web Vitals (laboratoire) ───────────────────────────── */}
        <div className="velifa-card">
          <SectionTitle icon={Zap} title={t('lab.title')} subtitle={t('lab.note')} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cwvItems.map(({ key, label, value, format, desc }) => {
              const status = getCwvStatus(key as any, value);
              return (
                <div key={key} className={`rounded-velifa-lg border p-4 ${BORDER[status]} ${BG[status]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wide">{label}</span>
                    <StatusIcon status={status} />
                  </div>
                  <div dir="ltr" className={`text-2xl font-bold font-heading ${TEXT[status]}`}>{format(value as any)}</div>
                  <div className="text-xs text-text-subtle mt-1">{desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Scores Lighthouse ───────────────────────────────────────── */}
        <div className="velifa-card">
          <h2 className="font-heading font-semibold text-text mb-5">{t('scores.title')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {lighthouseScores.map(({ label, score: s }) => (
              <div key={label} className="text-center p-4 rounded-velifa-lg" style={{ background: 'var(--surface-raised)' }}>
                <div className={`text-3xl font-bold font-heading mb-1 ${getScoreColor(s)}`}>{s ?? '—'}</div>
                <div className="text-xs text-text-muted font-medium">{label}</div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{
                    background: (s ?? 0) >= 90 ? 'var(--velifa-score-good)' : (s ?? 0) >= 50 ? 'var(--velifa-score-average)' : 'var(--velifa-score-poor)',
                    width: `${s ?? 0}%`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Fichiers concernés ──────────────────────────────────────── */}
        {((analysis.imagesToOptimize?.length ?? 0) > 0 || (analysis.blockingScripts?.length ?? 0) > 0) && (
          <div className="velifa-card">
            <h2 className="font-heading font-semibold text-text mb-5">{t('opportunities.title')}</h2>
            <div className="space-y-3">
              {(analysis.imagesToOptimize ?? []).slice(0, 5).map((item, i) => (
                <div key={`img-${i}`} className="flex items-start gap-3 p-3 rounded-velifa-lg" style={{ background: 'var(--velifa-score-average-bg)' }}>
                  <AlertCircle className="w-4 h-4 score-average flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div dir="ltr" className="text-sm font-medium text-text truncate">{item.url || item.title}</div>
                    {item.savingsBytes ? (
                      <div className="text-xs score-average mt-0.5">{t('opportunities.saving', { value: formatBytes(item.savingsBytes) })}</div>
                    ) : null}
                  </div>
                </div>
              ))}
              {(analysis.blockingScripts ?? []).slice(0, 3).map((item, i) => (
                <div key={`blk-${i}`} className="flex items-start gap-3 p-3 rounded-velifa-lg" style={{ background: 'var(--velifa-score-poor-bg)' }}>
                  <XCircle className="w-4 h-4 score-poor flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div dir="ltr" className="text-sm font-medium text-text truncate">{item.url || item.title}</div>
                    {item.savingsBytes ? (
                      <div className="text-xs score-poor mt-0.5">{t('opportunities.blocking', { value: formatBytes(item.savingsBytes) })}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section Pro / bannière ──────────────────────────────────── */}
        <ReportProFeatures reportJson={analysis.reportJson} technologies={analysis.technologies} analysisId={analysis.id} />
      </div>

      {/* ── CTA WhatsApp fixe ───────────────────────────────────────────── */}
      {analysis.whatsappLink && (
        <div className="fixed bottom-6 end-6 z-50">
          <a href={analysis.whatsappLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 velifa-btn shadow-lg hover:shadow-xl transition-all">
            <MessageCircle className="w-5 h-5" /> {t('stickyCta')}
          </a>
        </div>
      )}

      <EmailReportModal analysisId={id} siteUrl={analysis.urlSite} score={score} reportUrl={reportUrl} />
    </main>
  );
}
