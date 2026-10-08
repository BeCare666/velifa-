import type { Analysis } from '../prisma/database.service';

/**
 * Comparaison avant/après de deux audits d'une même URL.
 *
 * Une mesure Lighthouse varie d'un passage à l'autre (réseau, serveur, publicités…) : une petite différence
 * n'est pas une amélioration. En dessous des seuils ci-dessous, la tendance est « stable ».
 */

export type Trend = 'better' | 'worse' | 'stable' | 'unknown';

export interface MetricDiff {
  key: string;
  before: number | null;
  after: number | null;
  delta: number | null;
  trend: Trend;
}

export interface ListDiff {
  resolved: string[];
  added: string[];
  remaining: string[];
}

export interface AnalysisComparison {
  urlSite: string;
  before: { id: string; createdAt: Date };
  after: { id: string; createdAt: Date };
  scores: MetricDiff[];
  lab: MetricDiff[];
  /** Données réelles (CrUX, 28 jours glissants) ; null si absentes d'un des deux audits. */
  field: MetricDiff[] | null;
  /** null si un des audits n'a pas de recommandations calculées (audit antérieur à leur ajout). */
  recommendations: ListDiff | null;
  /** null si un des audits n'a pas de contrôles exploitables (page bloquée, audit ancien). */
  siteIssues: ListDiff | null;
}

/** Écart de score (points) considéré comme du bruit de mesure. */
export const SCORE_NOISE_POINTS = 5;

/** Mesures « plus bas = mieux » : bruit = max(seuil absolu, 10 % de la valeur avant). */
const METRIC_NOISE: Record<string, number> = { lcp: 100, fcp: 100, tbt: 50, inp: 25, cls: 0.01, ttfb: 100 };
const METRIC_NOISE_RATIO = 0.1;

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

export function scoreDiff(key: string, before: number | null | undefined, after: number | null | undefined): MetricDiff {
  if (before == null || after == null) return { key, before: before ?? null, after: after ?? null, delta: null, trend: 'unknown' };
  const delta = after - before;
  const trend: Trend = Math.abs(delta) < SCORE_NOISE_POINTS ? 'stable' : delta > 0 ? 'better' : 'worse';
  return { key, before, after, delta, trend };
}

export function metricDiff(key: string, before: number | null | undefined, after: number | null | undefined): MetricDiff {
  if (before == null || after == null) return { key, before: before ?? null, after: after ?? null, delta: null, trend: 'unknown' };
  const delta = round(after - before);
  const noise = Math.max(METRIC_NOISE[key] ?? 0, Math.abs(before) * METRIC_NOISE_RATIO);
  const trend: Trend = Math.abs(delta) < noise ? 'stable' : delta < 0 ? 'better' : 'worse';
  return { key, before, after, delta, trend };
}

export function listDiff(before: string[], after: string[]): ListDiff {
  const b = new Set(before);
  const a = new Set(after);
  return {
    resolved:  [...b].filter((x) => !a.has(x)),
    added:     [...a].filter((x) => !b.has(x)),
    remaining: [...a].filter((x) => b.has(x)),
  };
}

const recIds = (a: Analysis): string[] | null =>
  Array.isArray(a.recommendations) ? a.recommendations.map((r: any) => r.id) : null;
const issueCodes = (a: Analysis): string[] | null =>
  a.siteChecks && !a.siteChecks.blocked && Array.isArray(a.siteChecks.issues) ? a.siteChecks.issues.map((i: any) => i.code) : null;

function listDiffOrNull(before: string[] | null, after: string[] | null): ListDiff | null {
  return before && after ? listDiff(before, after) : null;
}

/** Les deux audits peuvent être passés dans n'importe quel ordre : le plus ancien est « avant ». */
export function compareAnalyses(x: Analysis, y: Analysis): AnalysisComparison {
  const [before, after] = new Date(x.createdAt).getTime() <= new Date(y.createdAt).getTime() ? [x, y] : [y, x];

  const fb = before.fieldData;
  const fa = after.fieldData;
  const field = fb && fa
    ? [
        metricDiff('lcp', fb.lcpMs?.percentile, fa.lcpMs?.percentile),
        metricDiff('inp', fb.inpMs?.percentile, fa.inpMs?.percentile),
        metricDiff('cls', fb.cls?.percentile, fa.cls?.percentile),
      ]
    : null;

  return {
    urlSite: after.urlSite,
    before: { id: before.id, createdAt: before.createdAt },
    after: { id: after.id, createdAt: after.createdAt },
    scores: [
      scoreDiff('performance', before.scorePerformance, after.scorePerformance),
      scoreDiff('accessibility', before.scoreAccessibility, after.scoreAccessibility),
      scoreDiff('seo', before.scoreSeo, after.scoreSeo),
      scoreDiff('bestPractices', before.scoreBestPractices, after.scoreBestPractices),
    ],
    lab: [
      metricDiff('lcp', before.lcpMobile, after.lcpMobile),
      metricDiff('cls', before.clsMobile, after.clsMobile),
      metricDiff('tbt', before.tbtMobile, after.tbtMobile),
      metricDiff('fcp', before.fcpMobile, after.fcpMobile),
    ],
    field,
    // Une recommandation absente du second audit n'est « corrigée » que si l'audit l'évaluait :
    // la liste est limitée aux 8 plus importantes, on reste donc prudent dans le libellé (« n'apparaît plus »).
    recommendations: listDiffOrNull(recIds(before), recIds(after)),
    siteIssues: listDiffOrNull(issueCodes(before), issueCodes(after)),
  };
}
