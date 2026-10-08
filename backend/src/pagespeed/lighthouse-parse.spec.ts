import { readFileSync } from 'fs';
import { join } from 'path';
import { parseLighthouse, parseFieldData, parseRecommendations } from './lighthouse-parse';

// Réponse réelle réduite : amazon.sa, mobile, Lighthouse 13.5.0 (2026-10-08)
const data: any = JSON.parse(readFileSync(join(__dirname, '__fixtures__', 'psi-amazon-sa-mobile.json'), 'utf8'));

describe('parseLighthouse (réponse réelle Lighthouse 13.5)', () => {
  const r = parseLighthouse(data);

  it('scores 0–100', () => {
    expect(r.scorePerformance).toBe(55);
    for (const s of [r.scoreAccessibility, r.scoreSeo, r.scoreBestPractices]) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it('images à optimiser lues depuis image-delivery-insight (l’ancien audit n’existe plus)', () => {
    expect(data.lighthouseResult.audits['uses-optimized-images']).toBeUndefined();
    expect(r.imagesToOptimize.length).toBeGreaterThan(0);
    expect(r.imagesToOptimize[0].url).toMatch(/^https:\/\//);
  });

  it('ressources bloquantes lues depuis render-blocking-insight', () => {
    expect(data.lighthouseResult.audits['render-blocking-resources']).toBeUndefined();
    expect(r.blockingScripts.length).toBeGreaterThan(0);
  });

  it('Core Web Vitals de laboratoire', () => {
    expect(r.coreWebVitals.lcp).toBeGreaterThan(0);
    expect(r.coreWebVitals.cls).not.toBeNull();
  });
});

describe('parseFieldData (CrUX)', () => {
  it('données de la page quand elles existent, CLS divisé par 100', () => {
    const f = parseFieldData(data)!;
    expect(f.scope).toBe('url');
    expect(f.overall).toBe('AVERAGE');
    expect(f.lcpMs).toEqual({ percentile: 2761, category: 'AVERAGE' });
    expect(f.inpMs).toEqual({ percentile: 172, category: 'FAST' });
    expect(f.cls).toEqual({ percentile: 0.01, category: 'FAST' });
  });

  it('repli sur l’origine quand la page n’a pas assez de trafic', () => {
    const f = parseFieldData({ loadingExperience: { metrics: {} }, originLoadingExperience: data.originLoadingExperience })!;
    expect(f.scope).toBe('origin');
    expect(f.lcpMs?.percentile).toBe(1979);
  });

  it('origin_fallback signalé par Google → portée « origin »', () => {
    const f = parseFieldData({ loadingExperience: { ...data.originLoadingExperience, origin_fallback: true } })!;
    expect(f.scope).toBe('origin');
  });

  it('aucune donnée terrain → null', () => {
    expect(parseFieldData({})).toBeNull();
  });
});

describe('parseRecommendations', () => {
  const recs = parseRecommendations(data.lighthouseResult.audits);

  it('au plus 8, triées par impact puis gain', () => {
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(8);
    const rank = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < recs.length; i++) {
      expect(rank[recs[i - 1].impact]).toBeLessThanOrEqual(rank[recs[i].impact]);
    }
  });

  it('la ressource bloquante (gain FCP 1,9 s sur ce site) arrive en tête', () => {
    expect(recs[0].id).toBe('render-blocking-insight');
    expect(recs[0].savingsMs).toBeGreaterThanOrEqual(1900);
  });

  it('ignore les audits réussis (score ≥ 0,9) et les audits non actionnables', () => {
    const ids = recs.map((r) => r.id);
    expect(ids).not.toContain('third-parties-insight'); // score 1 sur ce site
    expect(ids).not.toContain('largest-contentful-paint');
  });
});
