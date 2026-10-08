import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { isInternalKey, requireAdmin, parseAdminEmails, MIN_INTERNAL_KEY_LENGTH } from './admin-auth';

const STRONG_KEY = 'k'.repeat(MIN_INTERNAL_KEY_LENGTH);

describe('isInternalKey', () => {
  it('refuse l’ancienne clé codée en dur quand aucune clé n’est configurée', () => {
    expect(isInternalKey('Bearer velifa_admin_internal_2026', '')).toBe(false);
  });

  it('désactive une clé configurée trop courte', () => {
    expect(isInternalKey('Bearer courte', 'courte')).toBe(false);
  });

  it('accepte la clé configurée exacte (≥ 32 caractères)', () => {
    expect(isInternalKey(`Bearer ${STRONG_KEY}`, STRONG_KEY)).toBe(true);
  });

  it('refuse une clé différente ou sans préfixe Bearer', () => {
    expect(isInternalKey(`Bearer ${STRONG_KEY}x`, STRONG_KEY)).toBe(false);
    expect(isInternalKey(STRONG_KEY, STRONG_KEY)).toBe(false);
    expect(isInternalKey(undefined, STRONG_KEY)).toBe(false);
  });
});

describe('parseAdminEmails', () => {
  it('normalise et filtre', () => {
    expect(parseAdminEmails(' A@x.com, ,b@Y.com ')).toEqual(['a@x.com', 'b@y.com']);
  });
});

describe('requireAdmin', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.ADMIN_API_KEY = '';
    process.env.ADMIN_EMAILS = 'boss@velifa.io';
  });
  afterAll(() => { process.env = env; });

  it('401 sans jeton valide', async () => {
    const deps = { verifyToken: async () => null, fetchEmails: async () => [] };
    await expect(requireAdmin(undefined, deps)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('401 avec l’ancienne clé publique', async () => {
    const deps = { verifyToken: async () => null, fetchEmails: async () => [] };
    await expect(requireAdmin('Bearer velifa_admin_internal_2026', deps))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('403 pour un utilisateur connecté non admin', async () => {
    const deps = { verifyToken: async () => 'user_1', fetchEmails: async () => ['client@shop.sa'] };
    await expect(requireAdmin('Bearer jwt', deps)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('403 si ADMIN_EMAILS est vide (personne n’est admin par défaut)', async () => {
    process.env.ADMIN_EMAILS = '';
    const deps = { verifyToken: async () => 'user_1', fetchEmails: async () => ['boss@velifa.io'] };
    await expect(requireAdmin('Bearer jwt', deps)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('403 si Clerk est injoignable', async () => {
    const deps = { verifyToken: async () => 'user_1', fetchEmails: async () => { throw new Error('timeout'); } };
    await expect(requireAdmin('Bearer jwt', deps)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('autorise un admin dont l’email vérifié est listé', async () => {
    const deps = { verifyToken: async () => 'user_admin', fetchEmails: async () => ['boss@velifa.io'] };
    await expect(requireAdmin('Bearer jwt', deps)).resolves.toBe('user_admin');
  });

  it('autorise la clé interne forte configurée côté serveur', async () => {
    process.env.ADMIN_API_KEY = STRONG_KEY;
    const deps = { verifyToken: async () => null, fetchEmails: async () => [] };
    await expect(requireAdmin(`Bearer ${STRONG_KEY}`, deps)).resolves.toBe('internal');
  });
});
