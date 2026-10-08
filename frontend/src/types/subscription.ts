export type SubscriptionPlan   = 'pro' | 'business' | null;
export type SubscriptionStatus =
  | 'active' | 'on_trial' | 'cancelled' | 'past_due' | 'paused' | 'unpaid' | 'expired' | null;

export interface SubscriptionInfo {
  subscription_plan:   SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  /** Calculé par le serveur : accès payant ouvert (inclut résilié jusqu'à fin de période). */
  has_access?:         boolean;
}
