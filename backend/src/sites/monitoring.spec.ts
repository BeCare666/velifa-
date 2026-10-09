import { isDue, shouldAlert, canSchedule, dueBefore } from './monitoring';
import { MonitoringService, MAX_SITES_PER_TICK } from './monitoring.service';
import { renderAlertEmail } from '../brevo/alert-email.template';

const H = 3_600_000;
const now = new Date('2026-10-09T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('isDue (passage horaire, 1 h de tolérance)', () => {
  it.each([
    ['daily', null, true],
    ['daily', ago(24 * H), true],
    ['daily', ago(23 * H), true],          // tolérance : évite de glisser d'1 h par jour
    ['daily', ago(22 * H), false],
    ['weekly', ago(6 * 24 * H), false],
    ['weekly', ago(7 * 24 * H - H), true],
    ['off', null, false],
    ['monthly', null, false],
  ])('%s, dernier passage %p → %p', (schedule, last, expected) => {
    expect(isDue(schedule as string, last as Date | null, now)).toBe(expected);
  });

  it('dueBefore = mêmes bornes que isDue (utilisées en SQL)', () => {
    const d = dueBefore(now);
    expect(d.daily.toISOString()).toBe(ago(23 * H).toISOString());
    expect(d.weekly.toISOString()).toBe(ago(7 * 24 * H - H).toISOString());
  });
});

describe('shouldAlert : alerte au passage sous le seuil, pas à chaque audit', () => {
  it.each([
    [50, 72, 45, true],    // passe sous le seuil
    [50, null, 45, true],  // premier audit déjà sous le seuil
    [50, 45, 40, false],   // déjà sous le seuil : pas de nouvel email
    [50, 45, 60, false],   // remonte
    [50, 50, 49, true],    // seuil atteint puis franchi
    [50, 60, 50, false],   // égal au seuil = pas sous le seuil
    [null, 72, 10, false], // pas de seuil
    [50, 72, null, false], // audit sans score
  ])('seuil %p, avant %p, après %p → %p', (t, before, after, expected) => {
    expect(shouldAlert(t, before, after)).toBe(expected);
  });
});

describe('canSchedule', () => {
  it('Business uniquement (annoncé sur la page Tarifs)', () => {
    expect(canSchedule('business')).toBe(true);
    expect(canSchedule('pro')).toBe(false);
    expect(canSchedule('free')).toBe(false);
  });
});

function setup(opts: { sites?: any[]; plans?: Record<string, [string, string]>; analysis?: any; email?: string | null; emailFails?: boolean; alertsOff?: boolean } = {}) {
  let n = 0;
  const db = {
    findDueTrackedSites: jest.fn(async () => opts.sites ?? []),
    findUserByClerkId: jest.fn(async (id: string) => {
      const p = opts.plans?.[id];
      return p ? { subscriptionPlan: p[0], subscriptionStatus: p[1] } : null;
    }),
    markTrackedSiteScheduled: jest.fn(async () => undefined),
    createAnalysis: jest.fn(async (d: any) => ({ id: `c${++n}`, ...d })),
    findTrackedSiteById: jest.fn(async (id: string) => (opts.sites ?? []).find((s) => s.id === id) ?? null),
    findAnalysisById: jest.fn(async () => opts.analysis ?? null),
    recordTrackedSiteAudit: jest.fn(async () => undefined),
    getNotificationPrefs: jest.fn(async () => (opts.alertsOff ? { reports: true, alerts: false } : null)),
  };
  const queue = { add: jest.fn(async () => undefined) };
  const config = { get: jest.fn((k: string, def: any) => (k === 'frontendUrl' ? 'https://velifa.io/' : def)) };
  const brevo = { sendAlertEmail: jest.fn(async () => { if (opts.emailFails) throw new Error('Brevo down'); }) };
  const service = new MonitoringService(db as any, queue as any, config as any, brevo as any);
  service.ownerEmail = jest.fn(async () => (opts.email === undefined ? 'agence@example.ae' : opts.email));
  return { db, queue, brevo, service };
}

const site = (over: any = {}) => ({
  id: 's1', ownerClerkUserId: 'user_biz', urlSite: 'https://shop.example', urlHash: 'h1', locale: 'ar',
  label: 'Boutique', schedule: 'weekly', alertThreshold: 50, lastScore: 72, lastAnalysisId: 'c0', ...over,
});

describe('MonitoringService.tick', () => {
  it('Business : audit programmé (source scheduled, sans email, compté au titulaire), espacé de 30 s, site marqué', async () => {
    const { db, queue, service } = setup({ sites: [site(), site({ id: 's2', urlSite: 'https://b.example' })], plans: { user_biz: ['business', 'active'] } });
    expect(await service.tick(now)).toEqual({ queued: 2, skipped: 0 });
    expect(db.createAnalysis).toHaveBeenCalledWith(expect.objectContaining({
      urlSite: 'https://shop.example', source: 'scheduled', email: '', clerkUserId: 'user_biz', locale: 'ar', ipAddress: null,
    }));
    expect(queue.add).toHaveBeenNthCalledWith(1, 'run',
      { analysisId: 'c1', url: 'https://shop.example', email: '', locale: 'ar', trackedSiteId: 's1' },
      { jobId: 'c1', timeout: 60_000, delay: 0 });
    expect(queue.add).toHaveBeenNthCalledWith(2, 'run', expect.objectContaining({ trackedSiteId: 's2' }), expect.objectContaining({ delay: 30_000 }));
    expect(db.markTrackedSiteScheduled).toHaveBeenCalledWith('s1', now);
  });

  it('titulaire plus Business (Pro, expiré) : aucun audit, site marqué pour ne pas réessayer chaque heure', async () => {
    const { db, queue, service } = setup({ sites: [site(), site({ id: 's2', ownerClerkUserId: 'user_pro' })], plans: { user_biz: ['business', 'expired'], user_pro: ['pro', 'active'] } });
    expect(await service.tick(now)).toEqual({ queued: 0, skipped: 2 });
    expect(queue.add).not.toHaveBeenCalled();
    expect(db.markTrackedSiteScheduled).toHaveBeenCalledTimes(2);
  });

  it('sélection bornée et calculée avec dueBefore', async () => {
    const { db, service } = setup();
    await service.tick(now);
    const d = dueBefore(now);
    expect(db.findDueTrackedSites).toHaveBeenCalledWith(d.daily, d.weekly, MAX_SITES_PER_TICK);
  });
});

describe('MonitoringService.onScheduledAuditCompleted', () => {
  const done = (score: number) => ({ id: 'c9', status: 'completed', scorePerformance: score });

  it('passage sous le seuil : email (langue du site, liens rapport + comparaison), nouveau score de référence', async () => {
    const { db, brevo, service } = setup({ sites: [site()], analysis: done(41) });
    expect(await service.onScheduledAuditCompleted('s1', 'c9')).toEqual({ alerted: true });
    expect(brevo.sendAlertEmail).toHaveBeenCalledWith('agence@example.ae', 'ar', expect.objectContaining({
      previousScore: 72, newScore: 41, threshold: 50,
      reportUrl: 'https://velifa.io/ar/analyse/c9',
      compareUrl: 'https://velifa.io/ar/analyse/c9/compare/c0',
    }));
    expect(db.recordTrackedSiteAudit).toHaveBeenCalledWith('s1', 41, 'c9', expect.any(Date));
  });

  it('pas de franchissement : pas d’email, score mis à jour', async () => {
    const { db, brevo, service } = setup({ sites: [site({ lastScore: 45 })], analysis: done(40) });
    expect(await service.onScheduledAuditCompleted('s1', 'c9')).toEqual({ alerted: false });
    expect(brevo.sendAlertEmail).not.toHaveBeenCalled();
    expect(db.recordTrackedSiteAudit).toHaveBeenCalledWith('s1', 40, 'c9', null);
  });

  it('envoi en échec ou titulaire sans email vérifié : ancien score conservé pour retenter au prochain audit', async () => {
    const failing = setup({ sites: [site()], analysis: done(41), emailFails: true });
    expect(await failing.service.onScheduledAuditCompleted('s1', 'c9')).toEqual({ alerted: false });
    expect(failing.db.recordTrackedSiteAudit).toHaveBeenCalledWith('s1', 72, 'c9', null);
    const noEmail = setup({ sites: [site()], analysis: done(41), email: null });
    await noEmail.service.onScheduledAuditCompleted('s1', 'c9');
    expect(noEmail.brevo.sendAlertEmail).not.toHaveBeenCalled();
    expect(noEmail.db.recordTrackedSiteAudit).toHaveBeenCalledWith('s1', 72, 'c9', null);
  });

  it('alertes désactivées par le titulaire (2.9) : pas d’email, score de référence mis à jour normalement', async () => {
    const { db, brevo, service } = setup({ sites: [site()], analysis: done(41), alertsOff: true });
    expect(await service.onScheduledAuditCompleted('s1', 'c9')).toEqual({ alerted: false });
    expect(brevo.sendAlertEmail).not.toHaveBeenCalled();
    expect(db.recordTrackedSiteAudit).toHaveBeenCalledWith('s1', 41, 'c9', null);
  });

  it('site supprimé entre-temps ou audit non terminé : rien', async () => {
    const { db, service } = setup({ sites: [], analysis: done(10) });
    expect(await service.onScheduledAuditCompleted('s1', 'c9')).toEqual({ alerted: false });
    expect(db.recordTrackedSiteAudit).not.toHaveBeenCalled();
  });
});

describe('renderAlertEmail', () => {
  const data = {
    urlSite: 'https://shop.example', label: '<b>Boutique</b>', previousScore: 72, newScore: 41, threshold: 50,
    reportUrl: 'https://velifa.io/ar/analyse/c9', compareUrl: 'javascript:alert(1)', sitesUrl: 'https://velifa.io/ar/dashboard',
  };
  it('arabe : RTL, scores, libellé échappé, lien non http(s) neutralisé', () => {
    const { subject, html } = renderAlertEmail(data, 'ar');
    expect(subject).toContain('41/100');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('&lt;b&gt;Boutique&lt;/b&gt;');
    expect(html).not.toContain('<b>Boutique</b>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('https://velifa.io/ar/analyse/c9');
  });
  it('FR / EN : sujet traduit, sans bouton de comparaison si pas d’audit précédent', () => {
    expect(renderAlertEmail({ ...data, label: null, compareUrl: null }, 'fr').subject).toBe('Alerte performance : https://shop.example est passé à 41/100');
    expect(renderAlertEmail({ ...data, compareUrl: null }, 'en').html).not.toContain('Compare before / after');
  });
});
