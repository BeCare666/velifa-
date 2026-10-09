import { ReportLocale, isRtl } from '../i18n/report-texts';
import { escapeHtml } from './report-email.template';

export interface AlertEmailData {
  urlSite: string;
  label: string | null;
  previousScore: number | null;
  newScore: number;
  threshold: number;
  reportUrl: string;
  /** Lien vers la comparaison avant/après (absent pour le premier audit programmé). */
  compareUrl: string | null;
  sitesUrl: string;
}

const TEXTS: Record<ReportLocale, {
  subject: (site: string, score: number) => string;
  intro: (site: string, threshold: number) => string;
  before: string; now: string; viewReport: string; compare: string; settings: string; why: string;
}> = {
  fr: {
    subject: (site, score) => `Alerte performance : ${site} est passé à ${score}/100`,
    intro: (site, t) => `Le score de performance mobile de ${site} est passé sous votre seuil d'alerte (${t}/100) lors de l'audit programmé.`,
    before: 'Avant', now: 'Maintenant', viewReport: 'Voir le rapport', compare: 'Comparer avant / après',
    settings: 'Gérer les alertes',
    why: 'Vous recevez cet email car une alerte est configurée pour ce site dans VELIFA. Une mesure Lighthouse varie d’un passage à l’autre : vérifiez le rapport avant d’agir.',
  },
  en: {
    subject: (site, score) => `Performance alert: ${site} dropped to ${score}/100`,
    intro: (site, t) => `The mobile performance score of ${site} fell below your alert threshold (${t}/100) during the scheduled audit.`,
    before: 'Before', now: 'Now', viewReport: 'View report', compare: 'Compare before / after',
    settings: 'Manage alerts',
    why: 'You are receiving this email because an alert is set for this site in VELIFA. Lighthouse results vary between runs: check the report before acting.',
  },
  ar: {
    subject: (site, score) => `تنبيه أداء: انخفضت نتيجة ${site} إلى ${score}/100`,
    intro: (site, t) => `انخفضت نتيجة أداء الجوال لموقع ${site} إلى ما دون حد التنبيه الذي حددته (${t}/100) خلال التدقيق المجدول.`,
    before: 'قبل', now: 'الآن', viewReport: 'عرض التقرير', compare: 'مقارنة قبل / بعد',
    settings: 'إدارة التنبيهات',
    why: 'تصلك هذه الرسالة لأن تنبيهاً مفعّلاً لهذا الموقع في VELIFA. تختلف نتائج Lighthouse من قياس لآخر: راجع التقرير قبل اتخاذ أي إجراء.',
  },
};

const safeHref = (url: string | null): string => (url && /^https?:\/\//i.test(url) ? escapeHtml(url) : '#');

export function renderAlertEmail(d: AlertEmailData, locale: ReportLocale): { subject: string; html: string } {
  const t = TEXTS[locale];
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  const font = isRtl(locale) ? 'Tahoma, Arial, sans-serif' : 'Arial, Helvetica, sans-serif';
  const name = d.label ? `${d.label} (${d.urlSite})` : d.urlSite;
  const site = escapeHtml(name);
  const btn = `display:inline-block;margin:6px;padding:12px 24px;border-radius:4px;font-family:${font};font-size:14px;font-weight:bold;text-decoration:none;`;

  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<body style="margin:0;padding:24px;background:#0A0A0A;font-family:${font};color:#FFFFFF;">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#1A1A1A;border:1px solid #2E2E2E;border-radius:8px;" dir="${dir}">
    <tr><td style="padding:28px;">
      <p style="margin:0 0 6px;font-size:13px;letter-spacing:2px;color:#D4AF37;font-weight:bold;">VELIFA</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#FFFFFF;">${escapeHtml(t.intro(name, d.threshold))}</p>
      <table role="presentation" width="100%" style="margin:0 0 20px;text-align:center;">
        <tr>
          <td style="padding:12px;background:#111;border-radius:6px;">
            <div style="font-size:12px;color:#9A9A9A;">${t.before}</div>
            <div style="font-size:32px;font-weight:bold;color:#FFFFFF;">${d.previousScore ?? '—'}</div>
          </td>
          <td style="width:12px;"></td>
          <td style="padding:12px;background:#111;border-radius:6px;">
            <div style="font-size:12px;color:#9A9A9A;">${t.now}</div>
            <div style="font-size:32px;font-weight:bold;color:#FF4E42;">${d.newScore}</div>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 4px;font-size:13px;color:#9A9A9A;" dir="ltr">${site}</p>
      <div style="text-align:center;margin:20px 0;">
        <a href="${safeHref(d.reportUrl)}" style="${btn}background:#D4AF37;color:#0A0A0A;">${t.viewReport}</a>
        ${d.compareUrl ? `<a href="${safeHref(d.compareUrl)}" style="${btn}border:1px solid #D4AF37;color:#D4AF37;">${t.compare}</a>` : ''}
      </div>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#777;">${escapeHtml(t.why)}
        <a href="${safeHref(d.sitesUrl)}" style="color:#D4AF37;">${t.settings}</a></p>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject: t.subject(d.label ?? d.urlSite, d.newScore), html };
}
