import * as fs from 'fs';
import * as path from 'path';
import { ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { renderPdfReportHtml, PdfAnalysis } from './pdf-report.template';
import { PdfService } from './pdf.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { build, OUT } = require('../../scripts/sync-report-texts.js');

const analysis: PdfAnalysis = {
  urlSite: 'https://shop.example/<script>',
  completedAt: '2026-10-08T10:00:00Z', createdAt: '2026-10-08T09:59:00Z',
  scorePerformance: 34, scoreAccessibility: 91, scoreSeo: 80, scoreBestPractices: 75,
  lcpMobile: 4700, clsMobile: 0.224, tbtMobile: 213, fcpMobile: 3300,
  fieldData: { lcpMs: { percentile: 2800, category: 'AVERAGE' }, inpMs: { percentile: 172, category: 'FAST' }, cls: { percentile: 0.01, category: 'FAST' } },
  recommendations: [
    { id: 'render-blocking-insight', impact: 'high' }, { id: 'id-inconnu', impact: 'low' }, { id: 'cache-insight', impact: 'medium' },
  ],
  siteChecks: { blocked: false, issues: [{ code: 'arabic_without_rtl', severity: 'high' }] },
};
const brand = { name: 'Agence <Riyad>', logoUrl: 'https://cdn.agence.example/logo.png', brandColor: '#1A73E8' };

describe('textes du rapport (backend ↔ frontend)', () => {
  it('le fichier généré est à jour (sinon : npm run i18n:sync)', () => {
    expect(fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n')).toBe(build());
  });
});

describe('renderPdfReportHtml', () => {
  it('arabe : RTL, police arabe, textes arabes du rapport, marque de l’agence uniquement', () => {
    const html = renderPdfReportHtml(analysis, brand, 'ar');
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('Noto+Sans+Arabic');
    expect(html).toContain('تقرير الأداء');
    expect(html).toContain('ملفات تمنع ظهور الصفحة');           // titre de recommandation traduit
    expect(html).toContain('أعدّته Agence &lt;Riyad&gt;');
    expect(html).not.toMatch(/velifa/i);                        // marque blanche
  });

  it('échappe toutes les données variables et neutralise couleur / logo non conformes', () => {
    const html = renderPdfReportHtml(analysis, brand, 'en');
    expect(html).not.toContain('<script>');
    expect(html).toContain('https://shop.example/&lt;script&gt;');
    expect(html).toContain('border-bottom: 3px solid #1A73E8');
    const hostile = renderPdfReportHtml(analysis, { name: 'X', logoUrl: 'javascript:alert(1)', brandColor: 'red;}</style><script>' }, 'en');
    expect(hostile).not.toContain('javascript:');
    expect(hostile).not.toContain('</style><script>');
    expect(hostile).toContain('#D4AF37');
  });

  it('contenu : scores, mesures, données terrain, recommandations connues (6 max), points Golfe, sources', () => {
    const html = renderPdfReportHtml(analysis, brand, 'fr');
    expect(html).toContain('>34<');
    expect(html).toContain('4.7 s');
    expect(html).toContain('0.224');
    expect(html).toContain('Ce que vivent vos vrais visiteurs');
    expect(html).toContain('Des fichiers bloquent l’affichage de la page');
    expect(html).not.toContain('id-inconnu');
    expect(html).toContain('Contenu en arabe mais page non configurée de droite à gauche (RTL).');
    expect(html).toContain('pas un avis juridique');
    expect(html).toContain('Chrome UX Report');
    const many = renderPdfReportHtml({ ...analysis, recommendations: Array(10).fill({ id: 'cache-insight', impact: 'low' }) }, brand, 'fr');
    expect(many.match(/class="num"/g)).toHaveLength(6);
  });

  it('sans données terrain ni contrôles : sections absentes ; page bloquée : message dédié', () => {
    const html = renderPdfReportHtml({ ...analysis, fieldData: null, siteChecks: null, recommendations: null }, brand, 'en');
    expect(html).not.toContain('What your real visitors experience');
    expect(html).not.toContain('Arabic language and privacy');
    const blocked = renderPdfReportHtml({ ...analysis, siteChecks: { blocked: true, issues: [] } }, brand, 'en');
    expect(blocked).toContain('Arabic language and privacy');
  });
});

describe('PdfService.generate', () => {
  function setup(opts: { plan?: [string, string]; analysis?: any; noKey?: boolean } = {}) {
    const db = {
      findWorkspaceById: jest.fn(async (id: string) => (id === 'ws1'
        ? { id: 'ws1', name: 'Agence', logoUrl: null, brandColor: '#1A73E8', defaultLocale: 'ar', ownerClerkUserId: 'user_owner' } : null)),
      findWorkspaceMembers: jest.fn(async () => [{ clerkUserId: 'user_owner' }, { clerkUserId: 'user_sara' }]),
      findUserByClerkId: jest.fn(async () => (opts.plan ? { subscriptionPlan: opts.plan[0], subscriptionStatus: opts.plan[1] } : null)),
      findAnalysisById: jest.fn(async () => ('analysis' in opts ? opts.analysis : { ...analysis, status: 'completed' })),
    };
    const config = { get: jest.fn((k: string, def: any) => (k === 'browserless.apiKey' ? (opts.noKey ? '' : 'key') : def)) };
    const service = new PdfService(db as any, config as any);
    const rendered: string[] = [];
    if (!opts.noKey) service.renderPdf = jest.fn(async (html: string) => { rendered.push(html); return Buffer.from('%PDF-1.7'); });
    return { service, rendered };
  }

  it('membre d’un espace Business : PDF dans la langue par défaut de l’espace, nom de fichier sûr', async () => {
    const { service, rendered } = setup({ plan: ['business', 'active'] });
    const res = await service.generate('user_sara', 'c1', 'ws1');
    expect(res.pdf.toString()).toBe('%PDF-1.7');
    expect(res.filename).toBe('rapport-shop.example-ar.pdf');
    expect(rendered[0]).toContain('dir="rtl"');
    await service.generate('user_sara', 'c1', 'ws1', 'en');
    expect(rendered[1]).toContain('dir="ltr"');
  });

  it('refus : non connecté 401, non-membre 404, plan non Business 403, audit non terminé 404', async () => {
    await expect(setup({ plan: ['business', 'active'] }).service.generate(null, 'c1', 'ws1')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(setup({ plan: ['business', 'active'] }).service.generate('user_intrus', 'c1', 'ws1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup({ plan: ['business', 'active'] }).service.generate('user_sara', 'c1', 'ws-inconnu')).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup({ plan: ['pro', 'active'] }).service.generate('user_sara', 'c1', 'ws1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(setup({ plan: ['business', 'active'], analysis: { ...analysis, status: 'pending' } }).service.generate('user_sara', 'c1', 'ws1'))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('Browserless non configuré → 503 explicite', async () => {
    await expect(setup({ plan: ['business', 'active'], noKey: true }).service.generate('user_sara', 'c1', 'ws1'))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
