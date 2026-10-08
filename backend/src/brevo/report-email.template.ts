import { REPORT_TEXTS, ReportLocale, isRtl } from '../i18n/report-texts';

export interface ReportEmailData {
  urlSite: string;
  scorePerformance: number;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  reportUrl: string;
  whatsappUrl: string;
  screenshotUrl?: string | null;
}

/** Échappe le texte inséré dans le HTML (l'URL du site est saisie par l'utilisateur). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** N'autorise que des liens http(s) dans les attributs href/src. */
function safeHref(url: string | null | undefined): string {
  if (!url) return '#';
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : '#';
}

function scoreHex(score: number): string {
  if (score >= 90) return '#0CCE6B';
  if (score >= 50) return '#FFA400';
  return '#FF4E42';
}

function scoreLabel(score: number, locale: ReportLocale): string {
  const t = REPORT_TEXTS[locale];
  if (score >= 90) return t.scoreExcellent;
  if (score >= 50) return t.scoreNeedsWork;
  return t.scoreCritical;
}

export function renderReportEmail(data: ReportEmailData, locale: ReportLocale): { subject: string; html: string } {
  const t   = REPORT_TEXTS[locale];
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  const font = isRtl(locale) ? "Tahoma, Arial, Helvetica, sans-serif" : 'Arial, Helvetica, sans-serif';

  const gold1 = '#F4D88A', gold2 = '#D4AF37', gold3 = '#A87B1E';
  const bg = '#0A0A0A', card = '#1A1A1A', border = '#2E2E2E';
  const text = '#FFFFFF', sub = '#9A9A9A', dimmed = '#555555';

  const hex   = scoreHex(data.scorePerformance);
  const lcp   = data.lcp != null ? `${(data.lcp / 1000).toFixed(1)}s` : 'N/A';
  const cls   = data.cls != null ? data.cls.toFixed(3) : 'N/A';
  const tbt   = data.tbt != null ? `${Math.round(data.tbt)}ms` : 'N/A';
  const site  = escapeHtml(data.urlSite);
  const year  = new Date().getFullYear();

  const btnCTA = `display:inline-block;padding:14px 36px;border-radius:4px;font-family:${font};font-size:15px;font-weight:bold;color:#0A0A0A;text-decoration:none;text-align:center;background:linear-gradient(135deg, ${gold1} 0%, ${gold2} 50%, ${gold3} 100%);`;
  const btnSecondary = `display:inline-block;padding:11px 28px;border-radius:4px;font-family:${font};font-size:14px;font-weight:bold;color:${gold2};text-decoration:none;text-align:center;border:1px solid ${gold2};`;

  const metric = (label: string, value: string, hint: string, last = false) => `
          <td width="33%" style="padding:22px 8px 20px 8px;text-align:center;${last ? '' : `border-${dir === 'rtl' ? 'left' : 'right'}:1px solid ${border};`}">
            <p style="margin:0 0 6px 0;font-size:10px;color:${sub};letter-spacing:1px;text-transform:uppercase;">${label}</p>
            <p dir="ltr" style="margin:0;font-size:24px;font-weight:bold;color:${text};">${value}</p>
            <p style="margin:6px 0 0 0;font-size:10px;color:${dimmed};">${hint}</p>
          </td>`;

  const screenshot = data.screenshotUrl ? `
  <tr>
    <td style="padding:24px 0 0 0;text-align:center;">
      <p style="margin:0 0 12px 0;font-size:12px;color:${sub};letter-spacing:1px;text-transform:uppercase;">${t.preview}</p>
      <img src="${safeHref(data.screenshotUrl)}" alt="" width="560"
           style="border-radius:8px;border:1px solid ${border};max-width:100%;height:auto;display:block;margin:0 auto;" />
    </td>
  </tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${t.subject}</title>
</head>
<body dir="${dir}" style="margin:0;padding:0;background-color:${bg};font-family:${font};">
<table dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bg};">
<tr>
<td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

  <tr>
    <td style="background-color:${card};border:1px solid ${border};border-radius:10px;padding:36px 32px 28px 32px;text-align:center;">
      <p style="margin:0 0 6px 0;font-size:30px;font-weight:bold;letter-spacing:5px;color:${gold2};">VELIFA</p>
      <p style="margin:0;font-size:12px;color:${sub};letter-spacing:2px;text-transform:uppercase;">Performance Beyond Limits</p>
    </td>
  </tr>

  <tr>
    <td style="padding:28px 0 0 0;text-align:center;">
      <p style="margin:0;font-size:14px;color:${sub};">${t.reportFor}</p>
      <p dir="ltr" style="margin:8px 0 0 0;font-size:15px;color:${text};font-weight:bold;word-break:break-all;">${site}</p>
    </td>
  </tr>

  <tr>
    <td style="padding:28px 0 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color:${card};border:1px solid ${border};border-radius:10px;padding:36px 32px;text-align:center;">
            <p style="margin:0 0 10px 0;font-size:12px;color:${sub};letter-spacing:2px;text-transform:uppercase;">${t.globalScore}</p>
            <p style="margin:0 0 8px 0;font-size:76px;font-weight:bold;line-height:1;color:${hex};">${data.scorePerformance}</p>
            <p style="margin:0;font-size:15px;font-weight:bold;color:${hex};">${scoreLabel(data.scorePerformance, locale)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 0 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${card};border:1px solid ${border};border-radius:10px;overflow:hidden;">
        <tr>
          <td colspan="3" style="padding:16px 20px 14px 20px;border-bottom:1px solid ${border};">
            <p style="margin:0;font-size:12px;color:${sub};letter-spacing:2px;text-transform:uppercase;text-align:center;">${t.coreWebVitals}</p>
          </td>
        </tr>
        <tr>${metric('LCP', lcp, t.lcpHint)}${metric('CLS', cls, t.clsHint)}${metric('TBT', tbt, t.tbtHint, true)}
        </tr>
      </table>
    </td>
  </tr>
${screenshot}
  <tr>
    <td style="padding:32px 0 0 0;text-align:center;">
      <a href="${safeHref(data.reportUrl)}" style="${btnCTA}">${t.viewReport}</a>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 0 0 0;text-align:center;">
      <a href="${safeHref(data.whatsappUrl)}" style="${btnSecondary}">${t.whatsappHelp}</a>
    </td>
  </tr>

  <tr>
    <td style="padding:36px 0 0 0;text-align:center;">
      <p style="margin:0;font-size:11px;color:${dimmed};">© ${year} Velifa · Performance Beyond Limits</p>
      <p style="margin:6px 0 0 0;font-size:10px;color:#444444;">${t.footerReason}</p>
    </td>
  </tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

  return { subject: t.subject, html };
}
