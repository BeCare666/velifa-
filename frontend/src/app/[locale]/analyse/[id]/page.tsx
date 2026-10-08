import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getScoreColor, getScoreBg, getScoreLabel, formatMs, getCwvStatus, formatBytes } from '@/lib/utils';
import { ExternalLink, MessageCircle, Globe, CheckCircle2, AlertCircle, XCircle, Zap } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import ReportProFeatures from '@/components/report/ReportProFeatures';
import EmailReportModal from '@/components/report/EmailReportModal';

export const revalidate = 0;

async function getAnalysis(id: string) {
  try {
    const res = await api.getAnalysis(id);
    return res.data;
  } catch {
    return null;
  }
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  const analysis = await getAnalysis(params.id);
  if (!analysis || analysis.status !== 'completed') notFound();

  const score = analysis.scorePerformance ?? 0;
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference;

  const cwvItems = [
    { key: 'lcp', label: 'LCP', value: analysis.lcpMobile, format: formatMs, desc: 'Largest Contentful Paint' },
    { key: 'cls', label: 'CLS', value: analysis.clsMobile, format: (v: number | null | undefined) => v != null ? v.toFixed(3) : 'N/A', desc: 'Cumulative Layout Shift' },
    { key: 'tbt', label: 'TBT', value: analysis.tbtMobile, format: formatMs, desc: 'Total Blocking Time' },
    { key: 'fcp', label: 'FCP', value: analysis.fcpMobile, format: formatMs, desc: 'First Contentful Paint' },
  ] as const;

  const lighthouseScores = [
    { label: 'Performance',    score: analysis.scorePerformance },
    { label: 'Accessibilité',  score: analysis.scoreAccessibility },
    { label: 'SEO',            score: analysis.scoreSeo },
    { label: 'Best Practices', score: analysis.scoreBestPractices },
  ];

  function StatusIcon({ status }: { status: 'good' | 'needs-improvement' | 'poor' }) {
    if (status === 'good')             return <CheckCircle2 className="w-4 h-4 score-good flex-shrink-0" />;
    if (status === 'needs-improvement') return <AlertCircle  className="w-4 h-4 score-average flex-shrink-0" />;
    return <XCircle className="w-4 h-4 score-poor flex-shrink-0" />;
  }

  const scoreRingColor = score >= 90 ? 'var(--velifa-score-good)' : score >= 50 ? 'var(--velifa-score-average)' : 'var(--velifa-score-poor)';

  return (
    <main className="min-h-screen bg-bg">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className=" border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-accent" />
            <Link href="/" className="velifa-wordmark text-sm">VELIFA</Link>
            <span className="text-muted text-xs">·</span>
            <Globe className="w-4 h-4 text-text-subtle" />
            <span className="text-sm font-medium text-text truncate max-w-xs">{analysis.urlSite}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={analysis.urlSite} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition">
              Voir le site <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* ── Hero section ────────────────────────────────────────────── */}
        <div className="velifa-card">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Score ring */}
            <div className="flex-shrink-0">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="45" fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="60" cy="60" r="45" fill="none"
                  stroke={scoreRingColor}
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  className="score-ring"
                />
                <text x="60" y="55" textAnchor="middle" dominantBaseline="middle"
                  className="font-bold font-heading" style={{ fontSize: 26, fontWeight: 700, fill: 'var(--text)' }}>
                  {score}
                </text>
                <text x="60" y="74" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--text-subtle)' }}>
                  /100
                </text>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-heading font-bold text-text">{getScoreLabel(score)}</h1>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${getScoreBg(score)} ${getScoreColor(score)}`}>
                  Performance mobile
                </span>
              </div>
              <p className="text-text-muted mb-4 text-sm leading-relaxed">
                Votre site obtient un score de <strong className="text-text">{score}/100</strong> sur mobile selon Velifa.
                {score < 50 && ' Des améliorations urgentes sont nécessaires.'}
                {score >= 50 && score < 90 && ' Plusieurs optimisations peuvent améliorer votre expérience utilisateur.'}
                {score >= 90 && ' Excellent travail ! Votre site est très performant.'}
              </p>
              {analysis.whatsappLink && (
                <a href={analysis.whatsappLink} target="_blank" rel="noopener noreferrer"
                  className="velifa-btn">
                  <MessageCircle className="w-4 h-4" />
                  Obtenir de l&apos;aide via WhatsApp
                </a>
              )}
            </div>
            {/* Screenshot */}
            {analysis.screenshotUrl && (
              <div className="flex-shrink-0">
                <img src={analysis.screenshotUrl} alt="Capture du site"
                  className="w-48 h-32 object-cover rounded-velifa-lg border border-border shadow-md" />
              </div>
            )}
          </div>
        </div>

        {/* ── Core Web Vitals ─────────────────────────────────────────── */}
        <div className="velifa-card">
          <h2 className="font-heading font-semibold text-text mb-5">Core Web Vitals</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cwvItems.map(({ key, label, value, format, desc }) => {
              const status = getCwvStatus(key as any, value);
              const borderColors = {
                good: 'border-score-good/30',
                'needs-improvement': 'border-score-average/30',
                poor: 'border-score-poor/30',
              };
              const bgColors = {
                good: 'bg-score-good/10',
                'needs-improvement': 'bg-score-average/10',
                poor: 'bg-score-poor/10',
              };
              const textColors = {
                good: 'text-score-good',
                'needs-improvement': 'text-score-average',
                poor: 'text-score-poor',
              };
              return (
                <div key={key} className={`rounded-velifa-lg border p-4 ${borderColors[status]} ${bgColors[status]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wide">{label}</span>
                    <StatusIcon status={status} />
                  </div>
                  <div className={`text-2xl font-bold font-heading ${textColors[status]}`}>
                    {format(value as any)}
                  </div>
                  <div className="text-xs text-text-subtle mt-1">{desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Lighthouse scores ────────────────────────────────────────── */}
        <div className="velifa-card">
          <h2 className="font-heading font-semibold text-text mb-5">Scores de performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {lighthouseScores.map(({ label, score: s }) => (
              <div key={label} className="text-center p-4 rounded-velifa-lg" style={{ background: 'var(--surface-raised)' }}>
                <div className={`text-3xl font-bold font-heading mb-1 ${getScoreColor(s)}`}>{s ?? '—'}</div>
                <div className="text-xs text-text-muted font-medium">{label}</div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{
                    background: (s ?? 0) >= 90 ? 'var(--velifa-score-good)' : (s ?? 0) >= 50 ? 'var(--velifa-score-average)' : 'var(--velifa-score-poor)',
                    width: `${s ?? 0}%`,
                    transition: 'width 1s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Opportunities ────────────────────────────────────────────── */}
        {((analysis.imagesToOptimize?.length ?? 0) > 0 || (analysis.blockingScripts?.length ?? 0) > 0) && (
          <div className="velifa-card">
            <h2 className="font-heading font-semibold text-text mb-5">Opportunités d&apos;amélioration</h2>
            <div className="space-y-3">
              {(analysis.imagesToOptimize ?? []).slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-velifa-lg" style={{ background: 'var(--velifa-score-average-bg)' }}>
                  <AlertCircle className="w-4 h-4 score-average flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-text truncate max-w-sm">{item.url ?? item.title}</div>
                    {item.savingsBytes && (
                      <div className="text-xs score-average mt-0.5">Économie potentielle : {formatBytes(item.savingsBytes)}</div>
                    )}
                  </div>
                </div>
              ))}
              {(analysis.blockingScripts ?? []).slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-velifa-lg" style={{ background: 'var(--velifa-score-poor-bg)' }}>
                  <XCircle className="w-4 h-4 score-poor flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-text truncate max-w-sm">{item.url ?? item.title}</div>
                    {item.savingsMs && (
                      <div className="text-xs score-poor mt-0.5">Ralentissement : {formatMs(item.savingsMs)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ── Section Pro / Bannière upgrade ──────────────────────────── */}
        <ReportProFeatures
          reportJson={analysis.reportJson}
          technologies={analysis.technologies}
          analysisId={analysis.id}
        />
      </div>

      {/* ── Sticky WhatsApp CTA ──────────────────────────────────────── */}
      {analysis.whatsappLink && (
        <div className="fixed bottom-6 right-6 z-50">
          <a href={analysis.whatsappLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 velifa-btn shadow-lg hover:shadow-xl transition-all">
            <MessageCircle className="w-5 h-5" />
            Améliorer mon score
          </a>
        </div>
      )}
      {/* Modal email — Client Component, s'affiche 1.5s après le chargement */}
      <EmailReportModal
        analysisId={params.id}
        siteUrl={analysis.urlSite}
        score={score}
        reportUrl={typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/analyse/${params.id}`
          : `/analyse/${params.id}`}
      />
    </main>
  );
}