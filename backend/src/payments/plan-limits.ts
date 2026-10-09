import { hasPaidAccess } from './entitlements';

export type PlanName = 'free' | 'pro' | 'business';

/**
 * Nombre de sites suivis par plan. ⚠️ HYPOTHÈSE à valider (ROADMAP 4.2) : aucune limite n'est encore
 * annoncée sur la page Tarifs. Modifiable sans code via PLAN_SITE_LIMITS="free:1,pro:5,business:30".
 */
export const DEFAULT_SITE_LIMITS: Record<PlanName, number> = { free: 1, pro: 5, business: 30 };

export function parseSiteLimits(raw: string | undefined): Record<PlanName, number> {
  const limits = { ...DEFAULT_SITE_LIMITS };
  for (const part of (raw ?? '').split(',')) {
    const m = /^\s*(free|pro|business)\s*:\s*(\d{1,5})\s*$/.exec(part);
    if (m) limits[m[1] as PlanName] = Number(m[2]);
  }
  return limits;
}

/** Plan effectif : un abonnement expiré ou impayé retombe sur « free ». */
export function effectivePlan(plan: string | null | undefined, status: string | null | undefined): PlanName {
  if (!hasPaidAccess(plan, status)) return 'free';
  return plan === 'business' ? 'business' : 'pro';
}
