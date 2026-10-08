import { ForbiddenException } from '@nestjs/common';
import { checkEmailSend, toPublicAnalysis } from './analysis-access';

describe('toPublicAnalysis', () => {
  it('retire email, IP, user-agent et identifiant Clerk', () => {
    const pub = toPublicAnalysis({
      id: 'c1', urlSite: 'https://shop.sa', email: 'client@shop.sa', ipAddress: '1.2.3.xxx',
      userAgent: 'UA', clerkUserId: 'user_1', scorePerformance: 42,
    } as any) as any;
    expect(pub.id).toBe('c1');
    expect(pub.scorePerformance).toBe(42);
    for (const f of ['email', 'ipAddress', 'userAgent', 'clerkUserId']) {
      expect(pub).not.toHaveProperty(f);
    }
  });
});

describe('checkEmailSend', () => {
  it('rapport anonyme sans email : capture la première adresse', () => {
    expect(checkEmailSend({ clerkUserId: null, email: '' }, null, 'a@shop.sa')).toBe('capture');
  });

  it('rapport anonyme : renvoi à la même adresse autorisé (casse ignorée)', () => {
    expect(checkEmailSend({ clerkUserId: null, email: 'a@shop.sa' }, null, 'A@Shop.sa')).toBe('allowed');
  });

  it('rapport anonyme : refuse une autre adresse (anti-spam)', () => {
    expect(() => checkEmailSend({ clerkUserId: null, email: 'a@shop.sa' }, null, 'victime@x.com'))
      .toThrow(ForbiddenException);
  });

  it('rapport d’un compte : refusé à un autre utilisateur ou à un anonyme', () => {
    expect(() => checkEmailSend({ clerkUserId: 'u1', email: 'u1@x.com' }, 'u2', 'u2@x.com')).toThrow(ForbiddenException);
    expect(() => checkEmailSend({ clerkUserId: 'u1', email: 'u1@x.com' }, null, 'u1@x.com')).toThrow(ForbiddenException);
  });

  it('rapport d’un compte : le propriétaire peut l’envoyer à son équipe', () => {
    expect(checkEmailSend({ clerkUserId: 'u1', email: 'u1@x.com' }, 'u1', 'dev@agence.com')).toBe('allowed');
  });
});
