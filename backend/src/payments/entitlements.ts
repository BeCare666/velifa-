export type PaidPlan = 'pro' | 'business';

/**
 * Statuts Lemon Squeezy qui donnent encore accès aux fonctions payantes :
 * - active / on_trial : abonnement en cours
 * - past_due : paiement en échec, Lemon Squeezy retente — on ne coupe pas pendant les relances
 * - cancelled : résilié mais la période payée n'est pas terminée (l'événement
 *   `subscription_expired` arrive à la vraie fin et retire le plan)
 * Statuts sans accès : expired, unpaid, paused, null.
 */
const ACCESS_STATUSES = new Set(['active', 'on_trial', 'past_due', 'cancelled']);

export function hasPaidAccess(plan: string | null | undefined, status: string | null | undefined): plan is PaidPlan {
  return (plan === 'pro' || plan === 'business') && ACCESS_STATUSES.has(status ?? '');
}
