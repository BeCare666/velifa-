/**
 * Niveaux de score, alignés sur Lighthouse / PageSpeed : 90–100 bon, 50–89 moyen, 0–49 mauvais.
 * Source unique (avant : logique dupliquée dans le tableau de bord, les audits et l'admin).
 */
export type ScoreBucket = 'good' | 'average' | 'poor' | 'unknown';

export function scoreBucket(score: number | null | undefined): ScoreBucket {
  if (score == null) return 'unknown';
  if (score >= 90) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
}

export const SCORE_COLOR: Record<ScoreBucket, string> = {
  good:    'var(--velifa-score-good)',
  average: 'var(--velifa-score-average)',
  poor:    'var(--velifa-score-poor)',
  unknown: 'var(--text-subtle)',
};

export const SCORE_BG: Record<ScoreBucket, string> = {
  good:    'var(--velifa-score-good-bg)',
  average: 'var(--velifa-score-average-bg)',
  poor:    'var(--velifa-score-poor-bg)',
  unknown: 'var(--accent-soft)',
};

/** Clés de traduction existantes (namespace `audits`). */
export const SCORE_LABEL_KEY: Record<ScoreBucket, string | null> = {
  good: 'scoreExcellent', average: 'scoreImprove', poor: 'scoreCritical', unknown: null,
};

/** « https://www.site.com/ » → « site.com » */
export function displayHost(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    return u.hostname.replace(/^www\./, '') + path;
  } catch {
    return url;
  }
}
