import { BadRequestException, NotFoundException } from '@nestjs/common';
import { compareAnalyses, metricDiff, scoreDiff, listDiff } from './compare';
import { AnalysesService } from './analyses.service';

const audit = (over: Record<string, any>) => ({
  id: 'a', urlSite: 'https://shop.example', urlHash: 'h1', status: 'completed',
  createdAt: new Date('2026-09-01T10:00:00Z'),
  scorePerformance: 40, scoreAccessibility: 90, scoreSeo: 80, scoreBestPractices: 70,
  lcpMobile: 6000, clsMobile: 0.25, tbtMobile: 800, fcpMobile: 3000,
  fieldData: null, recommendations: [], siteChecks: { blocked: false, issues: [] },
  ...over,
}) as any;

describe('scoreDiff', () => {
  it('écart < 5 points = stable (bruit de mesure Lighthouse)', () => {
    expect(scoreDiff('performance', 40, 44).trend).toBe('stable');
    expect(scoreDiff('performance', 40, 36).trend).toBe('stable');
  });
  it('hausse / baisse au-delà du bruit', () => {
    expect(scoreDiff('performance', 40, 72)).toEqual({ key: 'performance', before: 40, after: 72, delta: 32, trend: 'better' });
    expect(scoreDiff('performance', 72, 40).trend).toBe('worse');
  });
  it('valeur manquante → inconnu', () => {
    expect(scoreDiff('seo', null, 80)).toEqual({ key: 'seo', before: null, after: 80, delta: null, trend: 'unknown' });
  });
});

describe('metricDiff (plus bas = mieux)', () => {
  it('LCP : −2,5 s = mieux ; −300 ms sur 6 s (5 %) = stable', () => {
    expect(metricDiff('lcp', 6000, 3500).trend).toBe('better');
    expect(metricDiff('lcp', 6000, 5700).trend).toBe('stable');
  });
  it('seuil absolu pour les petites valeurs : LCP 800 → 880 ms = stable', () => {
    expect(metricDiff('lcp', 800, 880).trend).toBe('stable');
  });
  it('CLS : 0,25 → 0,02 = mieux ; 0,02 → 0,025 = stable ; 0,05 → 0,2 = pire', () => {
    expect(metricDiff('cls', 0.25, 0.02)).toMatchObject({ delta: -0.23, trend: 'better' });
    expect(metricDiff('cls', 0.02, 0.025).trend).toBe('stable');
    expect(metricDiff('cls', 0.05, 0.2).trend).toBe('worse');
  });
});

describe('listDiff', () => {
  it('corrigés, nouveaux, restants', () => {
    expect(listDiff(['a', 'b', 'c'], ['b', 'd'])).toEqual({ resolved: ['a', 'c'], added: ['d'], remaining: ['b'] });
  });
});

describe('compareAnalyses', () => {
  const before = audit({
    id: 'old', createdAt: new Date('2026-09-01T10:00:00Z'),
    recommendations: [{ id: 'render-blocking-insight' }, { id: 'image-delivery-insight' }],
    siteChecks: { blocked: false, issues: [{ code: 'arabic_without_rtl' }, { code: 'privacy_policy_link_missing' }] },
    fieldData: { lcpMs: { percentile: 4200 }, inpMs: { percentile: 350 }, cls: { percentile: 0.3 } },
  });
  const after = audit({
    id: 'new', createdAt: new Date('2026-10-01T10:00:00Z'),
    scorePerformance: 78, lcpMobile: 2400, clsMobile: 0.02, tbtMobile: 150, fcpMobile: 1500,
    recommendations: [{ id: 'image-delivery-insight' }, { id: 'cache-insight' }],
    siteChecks: { blocked: false, issues: [{ code: 'privacy_policy_link_missing' }] },
    fieldData: { lcpMs: { percentile: 2300 }, inpMs: { percentile: 180 }, cls: { percentile: 0.05 } },
  });

  it('le plus ancien est « avant », quel que soit l’ordre des paramètres', () => {
    const c = compareAnalyses(after, before);
    expect(c.before.id).toBe('old');
    expect(c.after.id).toBe('new');
  });

  it('scores, mesures labo et terrain, recommandations et points Golfe', () => {
    const c = compareAnalyses(before, after);
    expect(c.scores[0]).toMatchObject({ key: 'performance', before: 40, after: 78, delta: 38, trend: 'better' });
    expect(c.scores[1].trend).toBe('stable');
    expect(c.lab.map((m) => [m.key, m.trend])).toEqual([['lcp', 'better'], ['cls', 'better'], ['tbt', 'better'], ['fcp', 'better']]);
    expect(c.field!.map((m) => [m.key, m.trend])).toEqual([['lcp', 'better'], ['inp', 'better'], ['cls', 'better']]);
    expect(c.recommendations).toEqual({ resolved: ['render-blocking-insight'], added: ['cache-insight'], remaining: ['image-delivery-insight'] });
    expect(c.siteIssues).toEqual({ resolved: ['arabic_without_rtl'], added: [], remaining: ['privacy_policy_link_missing'] });
  });

  it('pas de « corrigé » trompeur : page bloquée, contrôles ou recommandations absents → null', () => {
    const blocked = audit({ id: 'new', createdAt: new Date('2026-10-01'), siteChecks: { blocked: true, issues: [] } });
    expect(compareAnalyses(before, blocked).siteIssues).toBeNull();
    const old = audit({ id: 'new', createdAt: new Date('2026-10-01'), siteChecks: null, recommendations: null });
    expect(compareAnalyses(before, old).siteIssues).toBeNull();
    expect(compareAnalyses(before, old).recommendations).toBeNull();
  });

  it('données terrain absentes d’un côté → null', () => {
    expect(compareAnalyses(before, audit({ id: 'new', createdAt: new Date('2026-10-01') })).field).toBeNull();
  });
});

describe('AnalysesService.compare', () => {
  const rows: Record<string, any> = {
    a1: audit({ id: 'a1' }),
    a2: audit({ id: 'a2', createdAt: new Date('2026-10-01') }),
    other: audit({ id: 'other', urlHash: 'h2' }),
    pending: audit({ id: 'pending', status: 'pending' }),
  };
  const db = { findAnalysisById: jest.fn(async (id: string) => rows[id] ?? null) };
  const service = new AnalysesService(db as any, {} as any, {} as any, {} as any);

  it('même URL, deux audits terminés → comparaison', async () => {
    const c = await service.compare('a2', 'a1');
    expect(c.before.id).toBe('a1');
    expect(c.after.id).toBe('a2');
  });
  it('refus : même audit, URL différente, audit non terminé, audit inexistant', async () => {
    await expect(service.compare('a1', 'a1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.compare('a1', 'other')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.compare('a1', 'pending')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.compare('a1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('ne renvoie aucune donnée personnelle (email, IP, compte)', async () => {
    const c = await service.compare('a1', 'a2');
    const json = JSON.stringify(c);
    for (const f of ['email', 'ipAddress', 'clerkUserId', 'userAgent']) expect(json).not.toContain(f);
  });
});
