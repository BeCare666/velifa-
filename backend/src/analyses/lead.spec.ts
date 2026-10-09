import { BadRequestException, NotFoundException } from '@nestjs/common';
import { normalizeLeadContact, leadNotificationMessage } from './lead';
import { AnalysesService } from './analyses.service';

describe('normalizeLeadContact', () => {
  it('email seul, espaces et casse normalisés', () => {
    expect(normalizeLeadContact({ email: '  Ali@Shop.SA ', name: '  Ali   Saleh ' }))
      .toEqual({ name: 'Ali Saleh', email: 'ali@shop.sa', phone: null, message: null });
  });
  it('téléphone international → chiffres wa.me', () => {
    expect(normalizeLeadContact({ phone: '+966 50 123 4567' }).phone).toBe('966501234567');
    expect(normalizeLeadContact({ phone: '00971-50-123-4567' }).phone).toBe('971501234567');
  });
  it('refus : aucun contact, numéro local sans indicatif, numéro invalide', () => {
    expect(() => normalizeLeadContact({ name: 'Ali' })).toThrow('contact_required');
    expect(() => normalizeLeadContact({ phone: '0501234567' })).toThrow('phone_international');
    expect(() => normalizeLeadContact({ phone: '+12' })).toThrow('phone_invalid');
  });
  it('message tronqué à 1000 caractères', () => {
    expect(normalizeLeadContact({ email: 'a@b.co', message: 'x'.repeat(5000) }).message).toHaveLength(1000);
  });
});

describe('leadNotificationMessage', () => {
  it('site, score, nom et contacts', () => {
    expect(leadNotificationMessage('https://shop.sa', 34, { name: 'Ali', email: 'a@shop.sa', phone: '966501234567', message: null }))
      .toBe('Demande de correction : https://shop.sa (score 34/100) — Ali — a@shop.sa / +966501234567');
  });
});

describe('AnalysesService.createLead', () => {
  const completed = { id: 'c1', urlSite: 'https://shop.sa', status: 'completed', locale: 'ar', scorePerformance: 34 };
  function setup(opts: { analysis?: any; recent?: boolean; notifyFails?: boolean } = {}) {
    const db = {
      findAnalysisById: jest.fn(async () => ('analysis' in opts ? opts.analysis : completed)),
      hasRecentLead: jest.fn(async () => !!opts.recent),
      insertLead: jest.fn(async () => undefined),
      createAdminNotification: jest.fn(async () => { if (opts.notifyFails) throw new Error('db down'); }),
    };
    // Développement sans clé Turnstile : CAPTCHA contourné (comportement testé dans turnstile.spec.ts)
    const config = { get: jest.fn((_k: string, def: any) => def) };
    return { db, service: new AnalysesService(db as any, {} as any, config as any, {} as any) };
  }

  it('enregistre la demande (IP masquée, langue du rapport) et notifie l’admin', async () => {
    const { db, service } = setup();
    await expect(service.createLead('c1', { email: 'a@shop.sa', name: 'Ali' } as any, '203.0.113.7', null))
      .resolves.toEqual({ received: true });
    expect(db.insertLead).toHaveBeenCalledWith(expect.objectContaining({
      analysisId: 'c1', urlSite: 'https://shop.sa', email: 'a@shop.sa', name: 'Ali', phone: null,
      locale: 'ar', clerkUserId: null, ipAddress: '203.0.113.xxx',
    }));
    expect(db.createAdminNotification).toHaveBeenCalledWith('lead', expect.stringContaining('https://shop.sa'));
  });

  it('même contact déjà reçu dans les 24 h → pas de doublon ni de nouvelle notification', async () => {
    const { db, service } = setup({ recent: true });
    await expect(service.createLead('c1', { email: 'a@shop.sa' } as any, '1.2.3.4', null)).resolves.toEqual({ received: true });
    expect(db.insertLead).not.toHaveBeenCalled();
    expect(db.createAdminNotification).not.toHaveBeenCalled();
  });

  it('échec de la notification : la demande reste enregistrée', async () => {
    const { db, service } = setup({ notifyFails: true });
    await expect(service.createLead('c1', { email: 'a@shop.sa' } as any, '1.2.3.4', null)).resolves.toEqual({ received: true });
    expect(db.insertLead).toHaveBeenCalled();
  });

  it('production : un anonyme sans CAPTCHA valide est refusé avant tout accès à la base', async () => {
    const db = { findAnalysisById: jest.fn(), insertLead: jest.fn() };
    const config = { get: jest.fn((k: string, def: any) => (k === 'nodeEnv' ? 'production' : def)) };
    const service = new AnalysesService(db as any, {} as any, config as any, {} as any);
    await expect(service.createLead('c1', { email: 'a@shop.sa' } as any, '1.2.3.4', null)).rejects.toThrow();
    expect(db.findAnalysisById).not.toHaveBeenCalled();
    expect(db.insertLead).not.toHaveBeenCalled();
  });

  it('rapport inexistant ou non terminé → 404 ; sans contact → 400, rien en base', async () => {
    await expect(setup({ analysis: null }).service.createLead('x', { email: 'a@b.co' } as any, '1.2.3.4', null))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(setup({ analysis: { ...completed, status: 'pending' } }).service.createLead('c1', { email: 'a@b.co' } as any, '1.2.3.4', null))
      .rejects.toBeInstanceOf(NotFoundException);
    const { db, service } = setup();
    await expect(service.createLead('c1', {} as any, '1.2.3.4', null)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.insertLead).not.toHaveBeenCalled();
  });
});
