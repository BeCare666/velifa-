import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlansService, toCents, DEFAULT_PLANS } from './plans.service';
import { PaymentsService } from '../payments/payments.service';

const row = (code: string, over: Record<string, any> = {}) => ({
  code, price_monthly_cents: 2900, price_yearly_cents: 26100, currency: 'USD',
  lemon_variant_monthly: null, lemon_variant_yearly: null, site_limit: 5, api_daily_limit: 0, widget_daily_limit: 0, ...over,
});

function setup(rows: any[] | Error = [row('free', { price_monthly_cents: 0, price_yearly_cents: null, site_limit: 1 }), row('pro'), row('business', { price_monthly_cents: 5900, price_yearly_cents: 53100, site_limit: 30, api_daily_limit: 50, widget_daily_limit: 50 })]) {
  const db = {
    listPlanRows: jest.fn(async () => { if (rows instanceof Error) throw rows; return rows; }),
    updatePlanRow: jest.fn(async (code: string, v: any) => {
      if (rows instanceof Error) return;
      const r = rows.find((x) => x.code === code);
      Object.assign(r, {
        price_monthly_cents: v.priceMonthlyCents, price_yearly_cents: v.priceYearlyCents,
        lemon_variant_monthly: v.lemonVariantMonthly, lemon_variant_yearly: v.lemonVariantYearly,
        site_limit: v.siteLimit, api_daily_limit: v.apiDailyLimit, widget_daily_limit: v.widgetDailyLimit,
      });
    }),
  };
  return { db, service: new PlansService(db as any) };
}

const input = (over: Record<string, any> = {}) => ({
  priceMonthly: 29, priceYearly: 261, lemonVariantMonthly: '101', lemonVariantYearly: '102',
  siteLimit: 5, apiDailyLimit: 0, widgetDailyLimit: 0, ...over,
});

describe('toCents', () => {
  it.each([[29, 2900], [29.99, 2999], [0, 0], [261, 26100]])('%p $ → %p', (v, c) => expect(toCents(v)).toBe(c));
  it.each([[-1], [29.999], [NaN], [Infinity], [10_001]])('%p → refusé', (v) => expect(() => toCents(v)).toThrow('price_invalid'));
});

describe('PlansService', () => {
  it('lit les plans en base (valeurs de la grille 4.2)', async () => {
    const { service } = setup();
    expect(await service.get('business')).toMatchObject({ priceMonthlyCents: 5900, priceYearlyCents: 53100, siteLimit: 30, apiDailyLimit: 50, widgetDailyLimit: 50 });
  });

  it('base indisponible → valeurs par défaut identiques à la migration 008 (le service continue)', async () => {
    const { service } = setup(new Error('ECONNREFUSED'));
    expect(await service.get('pro')).toEqual(DEFAULT_PLANS.pro);
  });

  it('cache de 60 s, invalidé par une modification de l’admin', async () => {
    const { service, db } = setup();
    await service.get('pro');
    await service.get('pro');
    expect(db.listPlanRows).toHaveBeenCalledTimes(1);
    const updated = await service.update('pro', input({ priceMonthly: 19, siteLimit: 8 }));
    expect(updated).toMatchObject({ priceMonthlyCents: 1900, siteLimit: 8, lemonVariantMonthly: '101', lemonVariantYearly: '102' });
    expect(db.listPlanRows).toHaveBeenCalledTimes(2);
  });

  it('validation : plan inconnu, prix payant à 0, variante non numérique ou identique, limite négative', async () => {
    const { service } = setup();
    await expect(service.update('gold', input())).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('pro', input({ priceMonthly: 0 }))).rejects.toThrow('price_invalid');
    await expect(service.update('pro', input({ lemonVariantMonthly: 'abc' }))).rejects.toThrow('variant_invalid');
    await expect(service.update('pro', input({ lemonVariantYearly: '101' }))).rejects.toThrow('variant_invalid');
    await expect(service.update('pro', input({ siteLimit: -1 }))).rejects.toThrow('limit_invalid');
    await expect(service.update('pro', input({ siteLimit: 2.5 }))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('plan gratuit : prix et variantes forcés à vide, limites modifiables', async () => {
    const { service } = setup();
    expect(await service.update('free', input({ priceMonthly: 99, siteLimit: 2 }))).toMatchObject({
      priceMonthlyCents: 0, priceYearlyCents: null, lemonVariantMonthly: null, lemonVariantYearly: null, siteLimit: 2,
    });
  });

  it('variante → plan (mensuelle ou annuelle) ; vue publique sans identifiants Lemon Squeezy', async () => {
    const { service } = setup();
    await service.update('business', input({ priceMonthly: 59, priceYearly: 531, lemonVariantMonthly: '201', lemonVariantYearly: '202', siteLimit: 30, apiDailyLimit: 50, widgetDailyLimit: 50 }));
    expect(await service.planForVariant('202')).toBe('business');
    expect(await service.planForVariant('999')).toBeNull();
    const pub = await service.publicPlans();
    expect(pub.find((p) => p.code === 'business')).toEqual({ code: 'business', currency: 'USD', priceMonthly: 59, priceYearly: 531, yearlyAvailable: true, siteLimit: 30 });
    expect(JSON.stringify(pub)).not.toContain('201');
  });
});

describe('PaymentsService — variantes depuis les plans', () => {
  function payments(plan: Record<string, any>, env: Record<string, string> = {}) {
    const plans = {
      get: jest.fn(async () => plan),
      planForVariant: jest.fn(async (v: string) => (v === plan.lemonVariantMonthly || v === plan.lemonVariantYearly ? 'business' : null)),
    };
    const config = { get: jest.fn((k: string, def: any) => env[k] ?? def) };
    const db = { upsertUser: jest.fn(async () => undefined), findUserByClerkId: jest.fn() };
    return { db, service: new PaymentsService(config as any, db as any, plans as any) };
  }

  it('mensuel/annuel depuis le backoffice ; annuel absent → 400 ; secours variable d’environnement pour le mensuel', async () => {
    const { service } = payments({ lemonVariantMonthly: '201', lemonVariantYearly: '202' });
    expect(await service.variantFor('business', 'monthly')).toBe('201');
    expect(await service.variantFor('business', 'yearly')).toBe('202');
    const noYear = payments({ lemonVariantMonthly: null, lemonVariantYearly: null }, { 'lemonSqueezy.businessVariantId': '77' });
    expect(await noYear.service.variantFor('business', 'monthly')).toBe('77');
    await expect(noYear.service.variantFor('business', 'yearly')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('webhook : abonnement annuel reconnu comme Business', async () => {
    const { service, db } = payments({ lemonVariantMonthly: '201', lemonVariantYearly: '202' });
    await service.handleWebhookEvent({
      meta: { event_name: 'subscription_created', custom_data: { clerk_user_id: 'user_1' } },
      data: { id: 'sub_1', attributes: { status: 'active', variant_id: 202 } },
    });
    expect(db.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ clerkUserId: 'user_1', subscriptionPlan: 'business', subscriptionStatus: 'active' }));
  });
});
