import { renderReportEmail, escapeHtml } from './report-email.template';
import { buildWhatsappLink, buildReportUrl, toReportLocale, REPORT_TEXTS } from '../i18n/report-texts';

const data = {
  urlSite: 'https://boutique.sa',
  scorePerformance: 42,
  lcp: 4200, cls: 0.25, tbt: 610,
  reportUrl: 'https://velifa.io/ar/analyse/c123',
  whatsappUrl: 'https://wa.me/966500000000?text=x',
  screenshotUrl: 'https://res.cloudinary.com/x/shot.png',
};

describe('renderReportEmail', () => {
  it('arabe : lang="ar", dir="rtl" et textes arabes', () => {
    const { subject, html } = renderReportEmail(data, 'ar');
    expect(subject).toBe(REPORT_TEXTS.ar.subject);
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('عرض التقرير الكامل');
    expect(html).toContain('حرج');            // score 42 → critique
    expect(html).not.toContain('Voir le rapport complet');
  });

  it('anglais et français : sens de lecture gauche → droite', () => {
    expect(renderReportEmail(data, 'en').html).toContain('<html lang="en" dir="ltr">');
    expect(renderReportEmail(data, 'en').html).toContain('View the full report');
    expect(renderReportEmail(data, 'fr').html).toContain('Voir le rapport complet');
  });

  it('libellé du score selon les seuils', () => {
    expect(renderReportEmail({ ...data, scorePerformance: 95 }, 'fr').html).toContain('Excellent');
    expect(renderReportEmail({ ...data, scorePerformance: 70 }, 'fr').html).toContain('À améliorer');
  });

  it('échappe une URL de site malveillante', () => {
    const { html } = renderReportEmail({ ...data, urlSite: 'https://x.sa/"><script>alert(1)</script>' }, 'en');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('refuse les liens non http(s)', () => {
    const { html } = renderReportEmail({ ...data, reportUrl: 'javascript:alert(1)' }, 'en');
    expect(html).not.toContain('javascript:');
  });

  it('sans capture d’écran : pas de bloc image', () => {
    const { html } = renderReportEmail({ ...data, screenshotUrl: null }, 'en');
    expect(html).not.toContain('<img');
  });
});

describe('escapeHtml', () => {
  it('échappe les 5 caractères spéciaux', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('textes et liens', () => {
  it('langue inconnue → anglais', () => {
    expect(toReportLocale('de')).toBe('en');
    expect(toReportLocale(undefined)).toBe('en');
    expect(toReportLocale('ar')).toBe('ar');
  });

  it('URL du rapport préfixée par la langue', () => {
    expect(buildReportUrl('https://velifa.io/', 'ar', 'c1')).toBe('https://velifa.io/ar/analyse/c1');
  });

  it('lien WhatsApp en arabe avec numéro nettoyé', () => {
    const link = buildWhatsappLink('+966 50 000 0000', 'ar', 'https://boutique.sa', 42, 'https://velifa.io/ar/analyse/c1');
    expect(link.startsWith('https://wa.me/966500000000?text=')).toBe(true);
    expect(decodeURIComponent(link.split('text=')[1])).toContain('نتيجة الأداء: 42/100');
  });

  it('sans numéro configuré : lien de partage générique (pas wa.me/ vide cassé)', () => {
    expect(buildWhatsappLink('', 'en', 's', 1, 'u').startsWith('https://wa.me/?text=')).toBe(true);
  });
});
