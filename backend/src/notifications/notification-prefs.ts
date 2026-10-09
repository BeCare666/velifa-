/** Préférences de notification d'un compte (par défaut : tout activé). */
export interface NotificationPrefs {
  /** Email récapitulatif après chaque audit terminé. */
  reports: boolean;
  /** Alertes de baisse de score (audits programmés). */
  alerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { reports: true, alerts: true };

/**
 * Email de rapport après un audit :
 * - pas d'adresse → rien ;
 * - audit d'un visiteur anonyme → envoyé (il a saisi son email pour recevoir CE rapport) ;
 * - audit d'un compte → selon sa préférence « rapports ».
 */
export function shouldSendReportEmail(email: string | null | undefined, clerkUserId: string | null | undefined, prefs: NotificationPrefs | null): boolean {
  if (!email) return false;
  if (!clerkUserId) return true;
  return (prefs ?? DEFAULT_NOTIFICATION_PREFS).reports;
}
