export type SubscriptionPlan   = 'pro' | 'business' | null;
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'paused' | null;

export interface SubscriptionInfo {
  subscription_plan:   SubscriptionPlan;
  subscription_status: SubscriptionStatus;
}
