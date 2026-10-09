import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../prisma/database.service';
import type { PlanName } from '../payments/plan-limits';

export const PLAN_CODES: PlanName[] = ['free', 'pro', 'business'];

export interface Plan {
  code: PlanName;
  priceMonthlyCents: number;
  priceYearlyCents: number | null;
  currency: string;
  lemonVariantMonthly: string | null;
  lemonVariantYearly: string | null;
  siteLimit: number;
  apiDailyLimit: number;
  widgetDailyLimit: number;
}

/** Valeurs de secours (base indisponible) = valeurs initiales de la migration 008 (grille 4.2). */
export const DEFAULT_PLANS: Record<PlanName, Plan> = {
  free:     { code: 'free', priceMonthlyCents: 0, priceYearlyCents: null, currency: 'USD', lemonVariantMonthly: null, lemonVariantYearly: null, siteLimit: 1, apiDailyLimit: 0, widgetDailyLimit: 0 },
  pro:      { code: 'pro', priceMonthlyCents: 2900, priceYearlyCents: 26100, currency: 'USD', lemonVariantMonthly: null, lemonVariantYearly: null, siteLimit: 5, apiDailyLimit: 0, widgetDailyLimit: 0 },
  business: { code: 'business', priceMonthlyCents: 5900, priceYearlyCents: 53100, currency: 'USD', lemonVariantMonthly: null, lemonVariantYearly: null, siteLimit: 30, apiDailyLimit: 50, widgetDailyLimit: 50 },
};

const CACHE_MS = 60_000;
const MAX_PRICE_CENTS = 1_000_000;   // 10 000 $ : garde-fou contre une faute de frappe
const MAX_LIMIT = 100_000;

export interface PlanUpdateInput {
  priceMonthly: number;
  priceYearly: number | null;
  lemonVariantMonthly: string | null;
  lemonVariantYearly: string | null;
  siteLimit: number;
  apiDailyLimit: number;
  widgetDailyLimit: number;
}

/** Montant en dollars (2 décimales max) → centimes ; refuse négatif, NaN, plus de 2 décimales. */
export function toCents(amount: number): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new BadRequestException('price_invalid');
  const cents = Math.round(amount * 100);
  if (Math.abs(cents - amount * 100) > 1e-6 || cents > MAX_PRICE_CENTS) throw new BadRequestException('price_invalid');
  return cents;
}

function limit(v: number): number {
  if (!Number.isInteger(v) || v < 0 || v > MAX_LIMIT) throw new BadRequestException('limit_invalid');
  return v;
}

function variant(v: string | null): string | null {
  const s = (v ?? '').trim();
  if (!s) return null;
  if (!/^\d{1,20}$/.test(s)) throw new BadRequestException('variant_invalid');
  return s;
}

function rowToPlan(r: any): Plan {
  return {
    code: r.code, priceMonthlyCents: Number(r.price_monthly_cents), currency: r.currency ?? 'USD',
    priceYearlyCents: r.price_yearly_cents == null ? null : Number(r.price_yearly_cents),
    lemonVariantMonthly: r.lemon_variant_monthly ?? null, lemonVariantYearly: r.lemon_variant_yearly ?? null,
    siteLimit: Number(r.site_limit), apiDailyLimit: Number(r.api_daily_limit), widgetDailyLimit: Number(r.widget_daily_limit),
  };
}

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);
  private cache: { at: number; plans: Record<PlanName, Plan> } | null = null;

  constructor(private readonly db: DatabaseService) {}

  async all(): Promise<Record<PlanName, Plan>> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.plans;
    const plans = { ...DEFAULT_PLANS };
    try {
      for (const r of await this.db.listPlanRows()) {
        if ((PLAN_CODES as string[]).includes(r.code)) plans[r.code as PlanName] = rowToPlan(r);
      }
      this.cache = { at: Date.now(), plans };
    } catch (err: any) {
      this.logger.warn(`Plans indisponibles, valeurs par défaut utilisées : ${err?.message}`);
    }
    return plans;
  }

  async get(code: PlanName): Promise<Plan> {
    return (await this.all())[code];
  }

  /** Plan dont la variante Lemon Squeezy correspond (mensuelle ou annuelle), sinon null. */
  async planForVariant(variantId: string): Promise<'pro' | 'business' | null> {
    if (!variantId) return null;
    const plans = await this.all();
    for (const code of ['pro', 'business'] as const) {
      if (plans[code].lemonVariantMonthly === variantId || plans[code].lemonVariantYearly === variantId) return code;
    }
    return null;
  }

  /** Vue publique (page Tarifs) : prix et limites, sans identifiants Lemon Squeezy. */
  async publicPlans() {
    const plans = await this.all();
    return PLAN_CODES.map((c) => {
      const p = plans[c];
      return {
        code: p.code, currency: p.currency, priceMonthly: p.priceMonthlyCents / 100,
        priceYearly: p.priceYearlyCents == null ? null : p.priceYearlyCents / 100,
        yearlyAvailable: !!p.lemonVariantYearly, siteLimit: p.siteLimit,
      };
    });
  }

  async update(code: string, input: PlanUpdateInput): Promise<Plan> {
    if (!(PLAN_CODES as string[]).includes(code)) throw new NotFoundException('plan_not_found');
    const isFree = code === 'free';
    const v = {
      priceMonthlyCents: isFree ? 0 : toCents(input.priceMonthly),
      priceYearlyCents: isFree || input.priceYearly == null ? null : toCents(input.priceYearly),
      lemonVariantMonthly: isFree ? null : variant(input.lemonVariantMonthly),
      lemonVariantYearly: isFree ? null : variant(input.lemonVariantYearly),
      siteLimit: limit(input.siteLimit),
      apiDailyLimit: limit(input.apiDailyLimit),
      widgetDailyLimit: limit(input.widgetDailyLimit),
    };
    if (!isFree && v.priceMonthlyCents === 0) throw new BadRequestException('price_invalid');
    if (v.lemonVariantMonthly && v.lemonVariantMonthly === v.lemonVariantYearly) throw new BadRequestException('variant_invalid');
    await this.db.updatePlanRow(code, v);
    this.cache = null;
    return this.get(code as PlanName);
  }
}
