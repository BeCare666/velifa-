import { hasPaidAccess } from './entitlements';

export type PlanName = 'free' | 'pro' | 'business';

// Limites chiffrées (sites, API, widget) : table `plans`, modifiable dans le backoffice (plans/plans.service.ts).

/** Plan effectif : un abonnement expiré ou impayé retombe sur « free ». */
export function effectivePlan(plan: string | null | undefined, status: string | null | undefined): PlanName {
  if (!hasPaidAccess(plan, status)) return 'free';
  return plan === 'business' ? 'business' : 'pro';
}
