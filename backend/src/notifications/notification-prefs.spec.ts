import { shouldSendReportEmail, DEFAULT_NOTIFICATION_PREFS } from './notification-prefs';

describe('shouldSendReportEmail', () => {
  it.each([
    [null, null, null, false, 'pas d’adresse'],
    ['a@b.co', null, null, true, 'visiteur anonyme : il a demandé CE rapport'],
    ['a@b.co', 'user_1', null, true, 'compte sans préférence enregistrée : valeur par défaut (activé)'],
    ['a@b.co', 'user_1', { reports: true, alerts: false }, true, 'rapports activés'],
    ['a@b.co', 'user_1', { reports: false, alerts: true }, false, 'rapports désactivés'],
  ])('%p / %p / %p → %p (%s)', (email, user, prefs, expected, _why) => {
    expect(shouldSendReportEmail(email as any, user as any, prefs as any)).toBe(expected);
  });

  it('valeurs par défaut : tout activé', () => {
    expect(DEFAULT_NOTIFICATION_PREFS).toEqual({ reports: true, alerts: true });
  });
});
