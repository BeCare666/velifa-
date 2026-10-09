import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { WorkspacesService, validateBranding, MAX_WORKSPACE_MEMBERS } from './workspaces.service';

/** Base en mémoire reproduisant les règles SQL (propriétaire inscrit à la création, propriétaire non supprimable). */
function memoryDb() {
  const workspaces = new Map<string, any>();
  const members: { workspaceId: string; clerkUserId: string; role: 'owner' | 'member'; createdAt: Date }[] = [];
  return {
    workspaces, members,
    createWorkspace: jest.fn(async (w: any) => {
      workspaces.set(w.id, { ...w, createdAt: new Date() });
      members.push({ workspaceId: w.id, clerkUserId: w.ownerClerkUserId, role: 'owner', createdAt: new Date() });
    }),
    findWorkspaceById: jest.fn(async (id: string) => workspaces.get(id) ?? null),
    findWorkspacesForUser: jest.fn(async (u: string) =>
      members.filter((m) => m.clerkUserId === u).map((m) => ({ ...workspaces.get(m.workspaceId), role: m.role }))),
    updateWorkspace: jest.fn(async (id: string, data: any) => {
      for (const [k, v] of Object.entries(data)) if (v !== undefined) workspaces.get(id)[k] = v;
    }),
    findWorkspaceMembers: jest.fn(async (id: string) =>
      members.filter((m) => m.workspaceId === id).map(({ clerkUserId, role, createdAt }) => ({ clerkUserId, role, createdAt }))),
    addWorkspaceMember: jest.fn(async (id: string, u: string) => {
      if (!members.some((m) => m.workspaceId === id && m.clerkUserId === u)) {
        members.push({ workspaceId: id, clerkUserId: u, role: 'member', createdAt: new Date() });
      }
    }),
    removeWorkspaceMember: jest.fn(async (id: string, u: string) => {
      const i = members.findIndex((m) => m.workspaceId === id && m.clerkUserId === u && m.role !== 'owner');
      if (i >= 0) members.splice(i, 1);
    }),
  };
}

function setup() {
  const db = memoryDb();
  const service = new WorkspacesService(db as any);
  const accounts: Record<string, string> = { 'sara@agence.ae': 'user_sara', 'omar@agence.ae': 'user_omar' };
  service.lookupUser = jest.fn(async (email: string) => accounts[email] ?? null);
  const emails = Object.fromEntries(Object.entries(accounts).map(([e, id]) => [id, e]));
  service.memberEmail = jest.fn(async (id: string) => {
    if (id === 'user_owner') throw new Error('Clerk indisponible');
    return emails[id] ?? null;
  });
  return { db, service };
}

describe('validateBranding', () => {
  it('création : nom obligatoire (2–80), espaces normalisés, couleur en majuscules', () => {
    expect(validateBranding({ name: '  Agence   Riyad ', brandColor: '#1a2b3c' }, false))
      .toEqual({ name: 'Agence Riyad', brandColor: '#1A2B3C' });
    expect(() => validateBranding({}, false)).toThrow('name_invalid');
    expect(() => validateBranding({ name: 'A' }, false)).toThrow('name_invalid');
  });
  it('logo https uniquement ; chaîne vide = suppression du logo', () => {
    expect(validateBranding({ logoUrl: 'https://cdn.agence.ae/logo.png' }, true)).toEqual({ logoUrl: 'https://cdn.agence.ae/logo.png' });
    expect(validateBranding({ logoUrl: '' }, true)).toEqual({ logoUrl: null });
    for (const bad of ['http://x.ae/l.png', 'javascript:alert(1)', 'data:image/png;base64,AA', 'pas une url']) {
      expect(() => validateBranding({ logoUrl: bad }, true)).toThrow('logo_invalid');
    }
  });
  it('couleur #RRGGBB et langue ar/en/fr', () => {
    expect(() => validateBranding({ brandColor: 'red' }, true)).toThrow('color_invalid');
    expect(() => validateBranding({ brandColor: '#FFF' }, true)).toThrow('color_invalid');
    expect(() => validateBranding({ defaultLocale: 'de' }, true)).toThrow('locale_invalid');
    expect(validateBranding({ defaultLocale: 'en' }, true)).toEqual({ defaultLocale: 'en' });
  });
});

describe('WorkspacesService', () => {
  it('non connecté → 401', async () => {
    const { service } = setup();
    await expect(service.create(null, { name: 'Agence' })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.listMine(null)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('création : valeurs par défaut (arabe, or VELIFA), créateur propriétaire et membre', async () => {
    const { service } = setup();
    const w = await service.create('user_owner', { name: 'Agence Riyad' });
    expect(w).toMatchObject({ name: 'Agence Riyad', brandColor: '#D4AF37', defaultLocale: 'ar', logoUrl: null, ownerClerkUserId: 'user_owner' });
    expect(await service.listMine('user_owner')).toEqual([expect.objectContaining({ id: w.id, role: 'owner' })]);
    const detail = await service.get('user_owner', w.id);
    expect(detail.members).toEqual([expect.objectContaining({ clerkUserId: 'user_owner', role: 'owner' })]);
  });

  it('un non-membre ne voit pas l’espace (404, existence non révélée)', async () => {
    const { service } = setup();
    const w = await service.create('user_owner', { name: 'Agence' });
    await expect(service.get('user_intrus', w.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('user_intrus', w.id, { name: 'Piraté' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mise à jour de la marque : propriétaire seulement', async () => {
    const { service } = setup();
    const w = await service.create('user_owner', { name: 'Agence' });
    await service.addMember('user_owner', w.id, 'sara@agence.ae');
    await expect(service.update('user_sara', w.id, { brandColor: '#000000' })).rejects.toBeInstanceOf(ForbiddenException);
    const updated = await service.update('user_owner', w.id, { brandColor: '#0a0a0a', defaultLocale: 'en' });
    expect(updated).toMatchObject({ brandColor: '#0A0A0A', defaultLocale: 'en', name: 'Agence' });
  });

  it('ajout de membre par email : compte existant requis, pas de doublon, email normalisé', async () => {
    const { service } = setup();
    const w = await service.create('user_owner', { name: 'Agence' });
    const after = await service.addMember('user_owner', w.id, '  Sara@Agence.AE ');
    expect(after.map((m) => [m.clerkUserId, m.role, m.email])).toEqual([
      ['user_owner', 'owner', null],            // échec Clerk : email absent, pas d'erreur
      ['user_sara', 'member', 'sara@agence.ae'],
    ]);
    await service.addMember('user_owner', w.id, 'sara@agence.ae');
    expect((await service.get('user_owner', w.id)).members).toHaveLength(2);
    await expect(service.addMember('user_owner', w.id, 'inconnu@x.ae')).rejects.toThrow('user_not_found');
    await expect(service.addMember('user_owner', w.id, 'pas-un-email')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.addMember('user_sara', w.id, 'omar@agence.ae')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it(`limite de ${MAX_WORKSPACE_MEMBERS} membres`, async () => {
    const { db, service } = setup();
    const w = await service.create('user_owner', { name: 'Agence' });
    for (let i = 1; i < MAX_WORKSPACE_MEMBERS; i++) await db.addWorkspaceMember(w.id, `user_${i}`);
    await expect(service.addMember('user_owner', w.id, 'sara@agence.ae')).rejects.toThrow('members_limit');
  });

  it('retrait : le propriétaire retire un membre, un membre se retire lui-même, propriétaire jamais retiré', async () => {
    const { service } = setup();
    const w = await service.create('user_owner', { name: 'Agence' });
    await service.addMember('user_owner', w.id, 'sara@agence.ae');
    await service.addMember('user_owner', w.id, 'omar@agence.ae');

    await expect(service.removeMember('user_sara', w.id, 'user_omar')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.removeMember('user_owner', w.id, 'user_owner')).rejects.toThrow('cannot_remove_owner');
    await expect(service.removeMember('user_sara', w.id, 'user_owner')).rejects.toThrow('cannot_remove_owner');

    expect((await service.removeMember('user_sara', w.id, 'user_sara')).map((m) => m.clerkUserId)).toEqual(['user_owner', 'user_omar']);
    expect((await service.removeMember('user_owner', w.id, 'user_omar')).map((m) => m.clerkUserId)).toEqual(['user_owner']);
    await expect(service.get('user_sara', w.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
