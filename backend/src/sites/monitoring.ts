import type { PlanName } from '../payments/plan-limits';

/** Règles des audits programmés et des alertes (fonctions pures, testées). */

export const SCHEDULES = ['off', 'daily', 'weekly'] as const;
export type Schedule = (typeof SCHEDULES)[number];

const HOUR = 3_600_000;
export const SCHEDULE_INTERVAL_MS: Record<Exclude<Schedule, 'off'>, number> = { daily: 24 * HOUR, weekly: 7 * 24 * HOUR };

/** Le planificateur passe toutes les heures : une heure de tolérance évite qu'un audit quotidien dérive d'1 h par jour. */
export const TICK_TOLERANCE_MS = HOUR;

/** Audits programmés et alertes : plan Business (annoncé sur la page Tarifs). */
export function canSchedule(plan: PlanName): boolean {
  return plan === 'business';
}

/** Dates limites : un site est dû si son dernier audit programmé est antérieur (ou absent). */
export function dueBefore(now: Date): Record<Exclude<Schedule, 'off'>, Date> {
  return {
    daily: new Date(now.getTime() - SCHEDULE_INTERVAL_MS.daily + TICK_TOLERANCE_MS),
    weekly: new Date(now.getTime() - SCHEDULE_INTERVAL_MS.weekly + TICK_TOLERANCE_MS),
  };
}

export function isDue(schedule: string, lastScheduledAt: Date | null, now: Date): boolean {
  if (schedule !== 'daily' && schedule !== 'weekly') return false;
  return !lastScheduledAt || lastScheduledAt.getTime() <= dueBefore(now)[schedule].getTime();
}

/**
 * Alerte quand le score PASSE sous le seuil (et pas à chaque audit sous le seuil) :
 * premier audit déjà sous le seuil → alerte ; reste sous le seuil → pas de nouvel email.
 */
export function shouldAlert(threshold: number | null, previousScore: number | null, newScore: number | null): boolean {
  if (threshold == null || newScore == null) return false;
  return newScore < threshold && (previousScore == null || previousScore >= threshold);
}
