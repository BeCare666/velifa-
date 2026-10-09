import { REPORT_MESSAGES } from '../i18n/report-messages.generated';
import { ReportLocale, isRtl } from '../i18n/report-texts';
import { escapeHtml } from '../brevo/report-email.template';

/**
 * Rapport PDF en marque blanche : seule la marque de l'agence apparaît (nom, logo, couleur).
 * HTML autonome imprimé par Browserless (A4). Toute donnée variable est échappée.
 */

export interface PdfBranding {
  name: string;
  logoUrl: string | null;
  brandColor: string;
}

export interface PdfAnalysis {
  urlSite: string;
  completedAt: Date | string | null;
  createdAt: Date | string;
  scorePerformance: number | null;
  scoreAccessibility: number | null;
  scoreSeo: number | null;
  scoreBestPractices: number | null;
  lcpMobile: number | null;
  clsMobile: number | null;
  tbtMobile: number | null;
  fcpMobile: number | null;
  fieldData: any | null;
  recommendations: { id: string; impact: 'high' | 'medium' | 'low' }[] | null;
  siteChecks: { blocked: boolean; issues: { code: string; severity: string }[] } | null;
}

const LABELS: Record<ReportLocale, { title: string; preparedBy: (n: string) => string; date: string; site: string; sources: string }> = {
  fr: { title: 'Rapport de performance', preparedBy: (n) => `Préparé par ${n}`, date: 'Date :', site: 'Site :',
        sources: 'Mesures : Google Lighthouse (simulation mobile) et Chrome UX Report (vrais visiteurs, 28 jours).' },
  en: { title: 'Performance report', preparedBy: (n) => `Prepared by ${n}`, date: 'Date:', site: 'Site:',
        sources: 'Measurements: Google Lighthouse (mobile simulation) and Chrome UX Report (real visitors, 28 days).' },
  ar: { title: 'تقرير الأداء', preparedBy: (n) => `أعدّته ${n}`, date: 'التاريخ:', site: 'الموقع:',
        sources: 'القياسات: Google Lighthouse (محاكاة الجوال) وتقرير Chrome UX (زوار حقيقيون، 28 يوماً).' },
};

const MAX_RECS_IN_PDF = 6;

const scoreHex = (s: number | null) => (s == null ? '#9A9A9A' : s >= 90 ? '#0C9E52' : s >= 50 ? '#C77700' : '#D93025');
const ms = (v: number | null | undefined) => (v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);
const safeColor = (c: string) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : '#D4AF37');
const safeSrc = (u: string | null) => (u && /^https:\/\//i.test(u) ? escapeHtml(u) : null);

export function renderPdfReportHtml(a: PdfAnalysis, brand: PdfBranding, locale: ReportLocale): string {
  const m = REPORT_MESSAGES[locale];
  const L = LABELS[locale];
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  const color = safeColor(brand.brandColor);
  const logo = safeSrc(brand.logoUrl);
  const e = escapeHtml;
  const date = new Date(a.completedAt ?? a.createdAt).toLocaleDateString(locale === 'ar' ? 'ar' : locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const perf = a.scorePerformance;
  const perfLabel = perf == null ? '' : perf >= 90 ? m.scoreLabel.excellent : perf >= 50 ? m.scoreLabel.needsWork : m.scoreLabel.critical;

  const scores = ([
    ['performance', a.scorePerformance], ['accessibility', a.scoreAccessibility],
    ['seo', a.scoreSeo], ['bestPractices', a.scoreBestPractices],
  ] as const).map(([k, v]) => `<td class="box"><div class="big" style="color:${scoreHex(v)}">${v ?? '—'}</div><div class="muted">${e(m.scores[k])}</div></td>`).join('');

  const lab = ([
    ['LCP', ms(a.lcpMobile), m.lab.lcp], ['CLS', a.clsMobile == null ? '—' : a.clsMobile.toFixed(3), m.lab.cls],
    ['TBT', ms(a.tbtMobile), m.lab.tbt], ['FCP', ms(a.fcpMobile), m.lab.fcp],
  ]).map(([k, v, d]) => `<td class="box"><div class="muted">${k}</div><div class="mid" dir="ltr">${v}</div><div class="small">${e(d)}</div></td>`).join('');

  const f = a.fieldData;
  const fieldRows = f ? ([
    ['lcp', f.lcpMs, ms], ['inp', f.inpMs, ms], ['cls', f.cls, (v: number) => v.toFixed(2)],
  ] as const).map(([k, metric, fmt]) => {
    const cat = metric?.category as 'FAST' | 'AVERAGE' | 'SLOW' | undefined;
    return `<tr><td>${e(m.field[k])}</td><td dir="ltr">${metric ? fmt(metric.percentile) : '—'}</td><td>${cat ? e(m.field[cat]) : '—'}</td></tr>`;
  }).join('') : '';

  const list = m.recs.list as unknown as Record<string, { title: string; how: string }>;
  const recs = (a.recommendations ?? []).filter((r) => list[r.id]).slice(0, MAX_RECS_IN_PDF).map((r, i) => `
    <li><div class="rec-head"><span class="num" style="background:${color}">${i + 1}</span>
      <strong>${e(list[r.id].title)}</strong> <span class="tag tag-${r.impact}">${e(m.recs.impact[r.impact])}</span></div>
      <div class="small">${e(list[r.id].how)}</div></li>`).join('');

  const issues = m.gulf.issues as unknown as Record<string, string>;
  const checks = a.siteChecks;
  const gulf = !checks ? '' : checks.blocked ? `<p class="small">${e(m.gulf.blocked)}</p>`
    : checks.issues.length === 0 ? `<p class="small">${e(m.gulf.ok)}</p>`
    : `<ul class="issues">${checks.issues.filter((i) => issues[i.code]).map((i) => `<li>${e(issues[i.code])}</li>`).join('')}</ul>`;

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&family=Noto+Sans:wght@400;700&display=block" rel="stylesheet">
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Noto Sans', 'Noto Sans Arabic', Arial, sans-serif; color: #1A1A1A; font-size: 11pt; line-height: 1.45; }
  header { display: flex; align-items: center; gap: 12px; padding-bottom: 10px; border-bottom: 3px solid ${color}; margin-bottom: 14px; }
  header img { max-height: 40px; max-width: 160px; object-fit: contain; }
  header .agency { font-weight: 700; font-size: 14pt; }
  header .doc { margin-inline-start: auto; text-align: end; font-size: 9pt; color: #555; }
  h1 { font-size: 18pt; margin: 0 0 4px; }
  h2 { font-size: 12.5pt; margin: 18px 0 8px; padding-inline-start: 8px; border-inline-start: 4px solid ${color}; break-after: avoid; }
  .muted { color: #666; font-size: 9pt; }
  .small { color: #444; font-size: 9.5pt; }
  .big { font-size: 22pt; font-weight: 700; }
  .mid { font-size: 14pt; font-weight: 700; }
  table.grid { width: 100%; border-collapse: separate; border-spacing: 6px; }
  td.box { border: 1px solid #E2E2E2; border-radius: 6px; padding: 8px; text-align: center; vertical-align: top; width: 25%; }
  .hero { display: flex; align-items: center; gap: 18px; margin: 10px 0; }
  .hero .score { width: 92px; height: 92px; border-radius: 50%; border: 8px solid; display: flex; align-items: center; justify-content: center; font-size: 26pt; font-weight: 700; flex-shrink: 0; }
  table.field { width: 100%; border-collapse: collapse; font-size: 10pt; }
  table.field td { padding: 5px 6px; border-bottom: 1px solid #EEE; }
  ol.recs { list-style: none; margin: 0; padding: 0; }
  ol.recs li { padding: 7px 0; border-bottom: 1px solid #EEE; break-inside: avoid; }
  .rec-head { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
  .num { color: #fff; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 9pt; flex-shrink: 0; }
  .tag { font-size: 8pt; padding: 1px 6px; border-radius: 8px; }
  .tag-high { background: #FDE7E5; color: #B3261E; } .tag-medium { background: #FFF1D6; color: #8A5300; } .tag-low { background: #E3F5EA; color: #0B6E3A; }
  ul.issues { margin: 0; padding-inline-start: 18px; font-size: 10pt; }
  section.keep { break-inside: avoid; }
  footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #E2E2E2; font-size: 8.5pt; color: #666; }
</style>
</head>
<body>
  <header>
    ${logo ? `<img src="${logo}" alt="">` : ''}
    <span class="agency" style="color:${color}">${e(brand.name)}</span>
    <span class="doc">${e(L.title)}<br>${e(L.date)} ${e(date)}</span>
  </header>

  <h1>${e(L.title)}</h1>
  <div class="muted">${e(L.site)} <span dir="ltr">${e(a.urlSite)}</span></div>

  <div class="hero">
    <div class="score" style="border-color:${scoreHex(perf)};color:${scoreHex(perf)}">${perf ?? '—'}</div>
    <div><div class="mid">${e(perfLabel)}</div><div class="small">${e(m.impact.body)}</div><div class="muted">${e(m.impact.caveat)}</div></div>
  </div>

  ${f ? `<h2>${e(m.field.title)}</h2><table class="field">${fieldRows}</table>` : ''}

  <h2>${e(m.lab.title)}</h2>
  <table class="grid"><tr>${lab}</tr></table>

  ${recs ? `<h2>${e(m.recs.title)}</h2><ol class="recs">${recs}</ol>` : ''}

  ${checks ? `<section class="keep"><h2>${e(m.gulf.title)}</h2>${gulf}<p class="muted">${e(m.gulf.disclaimer)}</p></section>` : ''}

  <h2>${e(m.scores.title)}</h2>
  <table class="grid"><tr>${scores}</tr></table>

  <footer>${e(L.preparedBy(brand.name))} — ${e(L.sources)}</footer>
</body>
</html>`;
}
