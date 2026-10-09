import { Body, Controller, Get, Headers, Param, Put, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import axios from 'axios';
import { requireAdmin } from '../admin/admin-auth';
import { PLAN_CODES, PlansService } from './plans.service';

class UpdatePlanDto {
  @IsNumber() @Min(0) @Max(10_000)
  priceMonthly: number = 0;

  /** null = pas d'offre annuelle */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsNumber() @Min(0) @Max(100_000)
  priceYearly: number | null = null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(32)
  lemonVariantMonthly: string | null = null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(32)
  lemonVariantYearly: string | null = null;

  @IsInt() @Min(0) @Max(100_000)
  siteLimit: number = 0;

  @IsInt() @Min(0) @Max(100_000)
  apiDailyLimit: number = 0;

  @IsInt() @Min(0) @Max(100_000)
  widgetDailyLimit: number = 0;
}

/** Backoffice : plans, prix (USD), variantes Lemon Squeezy et limites. Admin uniquement. */
@Controller('admin/plans')
@SkipThrottle()
export class AdminPlansController {
  constructor(private readonly plans: PlansService, private readonly config: ConfigService) {}

  @Get()
  async list(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    const all = await this.plans.all();
    return PLAN_CODES.map((c) => all[c]);
  }

  @Put(':code')
  async update(@Headers('authorization') auth: string | undefined, @Param('code') code: string, @Body() dto: UpdatePlanDto) {
    await requireAdmin(auth);
    return this.plans.update(code, dto);
  }

  /**
   * Variantes Lemon Squeezy du compte (lecture seule : l'API ne permet pas de créer produits ou variantes).
   * Sert à choisir les variantes mensuelle / annuelle de chaque plan.
   */
  @Get('lemon-variants')
  async lemonVariants(@Headers('authorization') auth: string | undefined) {
    await requireAdmin(auth);
    const apiKey = this.config.get<string>('lemonSqueezy.apiKey', '');
    if (!apiKey) throw new ServiceUnavailableException('lemon_not_configured');
    try {
      const { data } = await axios.get('https://api.lemonsqueezy.com/v1/variants', {
        params: { 'page[size]': 100, include: 'product' },
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/vnd.api+json' },
        timeout: 10_000,
      });
      const products = new Map<string, string>(
        (data?.included ?? []).filter((i: any) => i.type === 'products').map((i: any) => [String(i.id), i.attributes?.name ?? '']),
      );
      return (data?.data ?? []).map((v: any) => ({
        id: String(v.id),
        name: v.attributes?.name ?? '',
        product: products.get(String(v.attributes?.product_id)) ?? '',
        priceCents: v.attributes?.price ?? null,
        isSubscription: !!v.attributes?.is_subscription,
        interval: v.attributes?.interval ?? null,
        status: v.attributes?.status ?? null,
        testMode: !!v.attributes?.test_mode,
      }));
    } catch (err: any) {
      throw new ServiceUnavailableException(`lemon_error: ${err?.response?.status ?? err?.message}`);
    }
  }
}
