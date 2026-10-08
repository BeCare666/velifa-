/**
 * Lecture d'une réponse PageSpeed Insights v5 (Lighthouse 13+), sans réseau — testable.
 * Structure vérifiée sur une réponse réelle (Lighthouse 13.5.0, 2026-10-08) :
 * - les anciens audits « uses-optimized-images » et « render-blocking-resources » n'existent plus,
 *   remplacés par « image-delivery-insight » et « render-blocking-insight » ;
 * - données terrain CrUX dans loadingExperience / originLoadingExperience (CLS percentile × 100).
 */

export interface AuditItem {
  url?: string;
  title: string;
  description?: string;
  savingsBytes?: number;
  savingsMs?: number;
}

export type FieldCategory = 'FAST' | 'AVERAGE' | 'SLOW';

export interface FieldMetric {
  percentile: number;
  category: FieldCategory | null;
}

/** Données réelles des visiteurs Chrome (28 derniers jours, Chrome UX Report). */
export interface FieldData {
  /** 'url' = données propres à cette page ; 'origin' = moyenne du domaine (la page n'a pas assez de trafic). */
  scope: 'url' | 'origin';
  overall: FieldCategory | null;
  lcpMs: FieldMetric | null;
  inpMs: FieldMetric | null;
  /** CLS réel (déjà divisé par 100). */
  cls: FieldMetric | null;
  fcpMs: FieldMetric | null;
  ttfbMs: FieldMetric | null;
}

/** Recommandation identifiée par l'id d'audit Lighthouse ; le texte est traduit à l'affichage. */
export interface Recommendation {
  id: string;
  /** Score Lighthouse de l'audit (0 = mauvais). */
  score: number;
  /** Gain estimé (ms) sur LCP + FCP + TBT selon Lighthouse (estimation de laboratoire). */
  savingsMs: number;
  /** Gain estimé sur le CLS. */
  savingsCls: number;
  /** Nombre d'éléments concernés (fichiers, images…). */
  itemCount: number;
  impact: 'high' | 'medium' | 'low';
}

/**
 * Audits retenus comme recommandations actionnables pour un propriétaire de site.
 * Les audits purement métriques (largest-contentful-paint, speed-index…) sont exclus.
 */
export const RECOMMENDATION_IDS = [
  'render-blocking-insight',
  'image-delivery-insight',
  'lcp-discovery-insight',
  'cache-insight',
  'document-latency-insight',
  'server-response-time',
  'third-parties-insight',
  'unused-javascript',
  'unused-css-rules',
  'legacy-javascript-insight',
  'duplicated-javascript-insight',
  'bootup-time',
  'mainthread-work-breakdown',
  'layout-shifts',
  'cls-culprits-insight',
  'unsized-images',
  'font-display-insight',
  'total-byte-weight',
  'dom-size-insight',
  'crawlable-anchors',
  // anciens identifiants (Lighthouse < 13), lus s'ils sont présents
  'render-blocking-resources',
  'uses-optimized-images',
  'modern-image-formats',
  'offscreen-images',
] as const;

const MAX_RECOMMENDATIONS = 8;

/**
 * Audits qui décrivent le même problème : on n'en garde qu'un (le premier présent en échec).
 * Constaté sur une réponse réelle : « layout-shifts » et « cls-culprits-insight » affichaient deux fois
 * « La page bouge pendant le chargement ».
 */
const SAME_PROBLEM: string[][] = [
  ['layout-shifts', 'cls-culprits-insight'],
  ['document-latency-insight', 'server-response-time'],
  ['render-blocking-insight', 'render-blocking-resources'],
  ['image-delivery-insight', 'uses-optimized-images', 'modern-image-formats', 'offscreen-images'],
];

/**
 * Impact = gain mesuré par Lighthouse. Un audit en échec sans gain chiffré n'est pas « fort »
 * (constaté : 8 recommandations sur 8 classées « fort » avec l'ancienne règle basée sur score = 0).
 */
function impactOf(savingsMs: number, savingsCls: number, score: number): Recommendation['impact'] {
  if (savingsMs >= 1000 || savingsCls >= 0.1) return 'high';
  if (savingsMs >= 150 || savingsCls >= 0.025 || score < 0.5) return 'medium';
  return 'low';
}

function toMs(raw: number | null | undefined): number | null {
  return raw == null ? null : Math.round(raw);
}

function toScore(raw: number | null | undefined): number {
  return raw == null ? 0 : Math.round(raw * 100);
}

function parseItems(audit: any, limit = 10): AuditItem[] {
  if (!Array.isArray(audit?.details?.items)) return [];
  return (audit.details.items as any[]).slice(0, limit).map((item) => ({
    url:          item.url ?? item.label ?? '',
    title:        audit.title ?? '',
    description:  audit.description ?? '',
    savingsBytes: item.wastedBytes ?? item.totalBytes ?? undefined,
    savingsMs:    item.wastedMs ?? undefined,
  }));
}

/** Premier audit présent parmi une liste d'identifiants (nouveau puis ancien). */
function firstAudit(audits: Record<string, any>, ids: string[]): any {
  for (const id of ids) if (audits[id]) return audits[id];
  return null;
}

function fieldMetric(m: any, divisor = 1): FieldMetric | null {
  if (!m || typeof m.percentile !== 'number') return null;
  return { percentile: m.percentile / divisor, category: m.category ?? null };
}

export function parseFieldData(data: any): FieldData | null {
  const pick = (le: any) => le && le.metrics && Object.keys(le.metrics).length > 0 ? le : null;
  const page = pick(data?.loadingExperience);
  // Quand la page n'a pas assez de trafic, Google renvoie les données de l'origine (origin_fallback).
  const le = page && !page.origin_fallback ? page : pick(data?.originLoadingExperience) ?? page;
  if (!le) return null;
  const scope: 'url' | 'origin' = le === page && !page.origin_fallback ? 'url' : 'origin';
  const m = le.metrics;
  return {
    scope,
    overall: le.overall_category ?? null,
    lcpMs:  fieldMetric(m.LARGEST_CONTENTFUL_PAINT_MS),
    inpMs:  fieldMetric(m.INTERACTION_TO_NEXT_PAINT),
    cls:    fieldMetric(m.CUMULATIVE_LAYOUT_SHIFT_SCORE, 100),
    fcpMs:  fieldMetric(m.FIRST_CONTENTFUL_PAINT_MS),
    ttfbMs: fieldMetric(m.EXPERIMENTAL_TIME_TO_FIRST_BYTE),
  };
}

export function parseRecommendations(audits: Record<string, any>): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const id of RECOMMENDATION_IDS) {
    const a = audits[id];
    if (!a || a.score == null) continue;
    if (a.scoreDisplayMode === 'notApplicable' || a.scoreDisplayMode === 'informative' || a.scoreDisplayMode === 'manual') continue;
    if (a.score >= 0.9) continue;
    const s = a.metricSavings ?? {};
    const group = SAME_PROBLEM.find((g) => g.includes(id));
    if (group && recs.some((r) => group.includes(r.id))) continue;
    const savingsMs = Math.round((s.LCP ?? 0) + (s.FCP ?? 0) + (s.TBT ?? 0) + (s.INP ?? 0));
    const savingsCls = Math.round((s.CLS ?? 0) * 1000) / 1000;
    const impact = impactOf(savingsMs, savingsCls, a.score);
    recs.push({
      id,
      score: a.score,
      savingsMs,
      savingsCls,
      itemCount: Array.isArray(a.details?.items) ? a.details.items.length : 0,
      impact,
    });
  }
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return recs
    .sort((x, y) => rank[x.impact] - rank[y.impact] || y.savingsMs - x.savingsMs || y.savingsCls - x.savingsCls || x.score - y.score)
    .slice(0, MAX_RECOMMENDATIONS);
}

export interface ParsedLighthouse {
  scorePerformance: number;
  scoreAccessibility: number;
  scoreSeo: number;
  scoreBestPractices: number;
  coreWebVitals: { lcp: number | null; cls: number | null; tbt: number | null; fcp: number | null; ttfb: number | null };
  imagesToOptimize: AuditItem[];
  blockingScripts: AuditItem[];
  unusedResources: AuditItem[];
  fieldData: FieldData | null;
  recommendations: Recommendation[];
}

export function parseLighthouse(data: any): ParsedLighthouse {
  const cats = data?.lighthouseResult?.categories ?? {};
  const audits = data?.lighthouseResult?.audits ?? {};
  return {
    scorePerformance:   toScore(cats.performance?.score),
    scoreAccessibility: toScore(cats.accessibility?.score),
    scoreSeo:           toScore(cats.seo?.score),
    scoreBestPractices: toScore(cats['best-practices']?.score),
    coreWebVitals: {
      lcp:  toMs(audits['largest-contentful-paint']?.numericValue),
      cls:  audits['cumulative-layout-shift']?.numericValue ?? null,
      tbt:  toMs(audits['total-blocking-time']?.numericValue),
      fcp:  toMs(audits['first-contentful-paint']?.numericValue),
      ttfb: toMs(audits['server-response-time']?.numericValue),
    },
    imagesToOptimize: parseItems(firstAudit(audits, ['image-delivery-insight', 'uses-optimized-images'])),
    blockingScripts:  parseItems(firstAudit(audits, ['render-blocking-insight', 'render-blocking-resources'])),
    unusedResources:  parseItems(audits['unused-javascript']),
    fieldData:        parseFieldData(data),
    recommendations:  parseRecommendations(audits),
  };
}
