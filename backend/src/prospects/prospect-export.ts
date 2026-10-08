import { toReportLocale, ReportLocale } from '../i18n/report-texts';
import type { ProspectWithAudit } from '../prisma/database.service';

/**
 * Export CSV des prospects avec, pour chaque audit terminé, un lien WhatsApp vers le numéro du prospect
 * et un message pré-rempli dans la langue de l'import (arabe par défaut).
 */

interface ProspectMessageInput {
  site: string;
  name: string | null;
  score: number;
  reportUrl: string;
}

/** Message de premier contact : chiffre réel mesuré, lien vers le rapport gratuit, possibilité de refuser. */
const MESSAGES: Record<ReportLocale, (m: ProspectMessageInput) => string> = {
  ar: (m) => [
    `السلام عليكم${m.name ? ` ${m.name}` : ''}،`,
    `قمنا بقياس سرعة متجركم ${m.site} على الجوال: النتيجة ${m.score}/100 (قياس Google Lighthouse).`,
    `التقرير الكامل مجاني ومتاح بالعربية: ${m.reportUrl}`,
    `هل تودون أن نساعدكم في تحسين هذه النتيجة؟`,
    `إذا كنتم لا ترغبون في تلقي رسائل منا، يكفي إخبارنا.`,
  ].join('\n'),
  en: (m) => [
    `Hello${m.name ? ` ${m.name}` : ''},`,
    `We measured the mobile speed of your store ${m.site}: ${m.score}/100 (Google Lighthouse measurement).`,
    `The full report is free: ${m.reportUrl}`,
    `Would you like help improving this score?`,
    `If you prefer not to hear from us, just let us know.`,
  ].join('\n'),
  fr: (m) => [
    `Bonjour${m.name ? ` ${m.name}` : ''},`,
    `Nous avons mesuré la vitesse mobile de votre boutique ${m.site} : ${m.score}/100 (mesure Google Lighthouse).`,
    `Le rapport complet est gratuit : ${m.reportUrl}`,
    `Souhaitez-vous de l'aide pour améliorer ce score ?`,
    `Si vous ne souhaitez pas être recontacté, il suffit de nous le dire.`,
  ].join('\n'),
};

export function buildProspectMessage(locale: string, m: ProspectMessageInput): string {
  return MESSAGES[toReportLocale(locale)](m);
}

/** Lien wa.me vers le prospect ; vide sans téléphone (pas de lien générique dans un export par prospect). */
export function buildProspectWhatsappLink(phone: string | null, text: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : '';
}

/**
 * Cellule CSV : guillemets échappés ; une valeur commençant par = + - @ (ou tab / retour chariot)
 * est préfixée d'une apostrophe pour qu'Excel ne l'exécute pas comme formule (noms issus de fichiers externes).
 * Les nombres purs (ex. « +966501234567 ») ne sont pas des formules et restent intacts.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export const PROSPECT_EXPORT_HEADER = [
  'url', 'name', 'phone', 'country', 'locale', 'status', 'score_performance', 'platform',
  'gulf_issues', 'report_url', 'whatsapp_link', 'imported_at',
];

/** CSV UTF-8 avec BOM (sinon Excel affiche mal l'arabe). */
export function buildProspectsCsv(rows: ProspectWithAudit[]): string {
  const lines = [PROSPECT_EXPORT_HEADER.join(',')];
  for (const p of rows) {
    const done = p.status === 'completed' && p.scorePerformance != null && !!p.reportUrl;
    const message = done
      ? buildProspectMessage(p.locale, { site: p.urlSite, name: p.name, score: p.scorePerformance!, reportUrl: p.reportUrl! })
      : '';
    const issues: string[] = p.siteChecks?.blocked
      ? ['page_blocked']
      : (p.siteChecks?.issues ?? []).map((i: { code: string }) => i.code);
    lines.push([
      p.urlSite, p.name, p.phone ? `+${p.phone}` : '', p.country, p.locale, p.status,
      p.scorePerformance, p.platform, issues.join(' '), done ? p.reportUrl : '',
      done ? buildProspectWhatsappLink(p.phone, message) : '', p.createdAt,
    ].map(csvCell).join(','));
  }
  return '﻿' + lines.join('\r\n');
}
