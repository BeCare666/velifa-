/** Langues prises en charge pour les rapports, emails et messages WhatsApp. */
export const SUPPORTED_LOCALES = ['fr', 'en', 'ar'] as const;
export type ReportLocale = (typeof SUPPORTED_LOCALES)[number];

export function toReportLocale(value: string | null | undefined): ReportLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value ?? '') ? (value as ReportLocale) : 'en';
}

export function isRtl(locale: ReportLocale): boolean {
  return locale === 'ar';
}

interface ReportTexts {
  subject: string;
  reportFor: string;
  globalScore: string;
  scoreExcellent: string;
  scoreNeedsWork: string;
  scoreCritical: string;
  coreWebVitals: string;
  lcpHint: string;
  clsHint: string;
  tbtHint: string;
  preview: string;
  viewReport: string;
  whatsappHelp: string;
  follow: string;
  footerReason: string;
  whatsappMessage: (site: string, score: number, reportUrl: string) => string;
}

export const REPORT_TEXTS: Record<ReportLocale, ReportTexts> = {
  fr: {
    subject: 'Votre rapport de performance VELIFA',
    reportFor: 'Votre rapport de performance pour',
    globalScore: 'Score global',
    scoreExcellent: 'Excellent',
    scoreNeedsWork: 'À améliorer',
    scoreCritical: 'Critique',
    coreWebVitals: 'Core Web Vitals',
    lcpHint: 'Chargement',
    clsHint: 'Stabilité visuelle',
    tbtHint: 'Temps bloquant',
    preview: 'Aperçu de votre site',
    viewReport: 'Voir le rapport complet',
    whatsappHelp: "Obtenir de l'aide via WhatsApp",
    follow: 'Suivez Velifa',
    footerReason: 'Vous recevez cet email car vous avez demandé un audit de performance.',
    whatsappMessage: (site, score, url) => [
      `Bonjour, j'ai analysé mon site ${site}`,
      `Score performance : ${score}/100`,
      `Rapport complet : ${url}`,
      `Pouvez-vous m'aider à améliorer ces métriques ?`,
    ].join('\n'),
  },
  en: {
    subject: 'Your VELIFA performance report',
    reportFor: 'Your performance report for',
    globalScore: 'Overall score',
    scoreExcellent: 'Excellent',
    scoreNeedsWork: 'Needs improvement',
    scoreCritical: 'Critical',
    coreWebVitals: 'Core Web Vitals',
    lcpHint: 'Loading',
    clsHint: 'Visual stability',
    tbtHint: 'Blocking time',
    preview: 'Preview of your site',
    viewReport: 'View the full report',
    whatsappHelp: 'Get help on WhatsApp',
    follow: 'Follow Velifa',
    footerReason: 'You are receiving this email because you requested a performance audit.',
    whatsappMessage: (site, score, url) => [
      `Hello, I analysed my website ${site}`,
      `Performance score: ${score}/100`,
      `Full report: ${url}`,
      `Can you help me improve these metrics?`,
    ].join('\n'),
  },
  ar: {
    subject: 'تقرير أداء موقعك من VELIFA',
    reportFor: 'تقرير الأداء الخاص بموقعك',
    globalScore: 'النتيجة الإجمالية',
    scoreExcellent: 'ممتاز',
    scoreNeedsWork: 'يحتاج إلى تحسين',
    scoreCritical: 'حرج',
    coreWebVitals: 'مؤشرات الويب الأساسية',
    lcpHint: 'سرعة التحميل',
    clsHint: 'الاستقرار البصري',
    tbtHint: 'وقت الحظر',
    preview: 'معاينة موقعك',
    viewReport: 'عرض التقرير الكامل',
    whatsappHelp: 'احصل على المساعدة عبر واتساب',
    follow: 'تابع Velifa',
    footerReason: 'تصلك هذه الرسالة لأنك طلبت تدقيق أداء لموقعك.',
    whatsappMessage: (site, score, url) => [
      `مرحباً، قمت بتحليل موقعي ${site}`,
      `نتيجة الأداء: ${score}/100`,
      `التقرير الكامل: ${url}`,
      `هل يمكنكم مساعدتي في تحسين هذه المؤشرات؟`,
    ].join('\n'),
  },
};

/** URL publique du rapport, directement dans la bonne langue (les routes du frontend sont préfixées). */
export function buildReportUrl(frontendUrl: string, locale: ReportLocale, analysisId: string): string {
  return `${(frontendUrl ?? '').replace(/\/+$/, '')}/${locale}/analyse/${encodeURIComponent(analysisId)}`;
}

/** Lien WhatsApp pré-rempli dans la langue du rapport. Numéro vide → l'utilisateur choisit le contact. */
export function buildWhatsappLink(
  phoneNumber: string,
  locale: ReportLocale,
  site: string,
  score: number,
  reportUrl: string,
): string {
  const digits = (phoneNumber ?? '').replace(/\D/g, '');
  const text = encodeURIComponent(REPORT_TEXTS[locale].whatsappMessage(site, score, reportUrl));
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}
