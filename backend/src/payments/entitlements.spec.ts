import { hasPaidAccess } from './entitlements';

describe('hasPaidAccess', () => {
  it.each(['active', 'on_trial', 'past_due', 'cancelled'])('plan pro + statut %s → accès', (status) => {
    expect(hasPaidAccess('pro', status)).toBe(true);
    expect(hasPaidAccess('business', status)).toBe(true);
  });

  it.each(['expired', 'unpaid', 'paused', null, undefined, ''])('statut %s → pas d’accès', (status) => {
    expect(hasPaidAccess('pro', status as any)).toBe(false);
  });

  it('pas de plan → pas d’accès, même si le statut est actif', () => {
    expect(hasPaidAccess(null, 'active')).toBe(false);
    expect(hasPaidAccess('free', 'active')).toBe(false);
  });
});
