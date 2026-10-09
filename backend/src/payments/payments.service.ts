import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { DatabaseService } from '../prisma/database.service';
import { hasPaidAccess } from './entitlements';
import { PlansService } from '../plans/plans.service';

export type Billing = 'monthly' | 'yearly';

/** Lemon Squeezy REST API base URL */
const LS_API = 'https://api.lemonsqueezy.com/v1';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly plans: PlansService,
  ) {
    this.logConfig();
  }

  private logConfig(): void {
    const mask = (v: string) =>
      v.length > 4 ? v.slice(0, Math.ceil(v.length / 4)) + '****' : v ? '****' : '(vide)';

    const storeId    = this.config.get<string>('lemonSqueezy.storeId', '');
    const proVariant = this.config.get<string>('lemonSqueezy.proVariantId', '');
    const bizVariant = this.config.get<string>('lemonSqueezy.businessVariantId', '');
    const apiKey     = this.config.get<string>('lemonSqueezy.apiKey', '');
    const secret     = this.config.get<string>('lemonSqueezy.webhookSecret', '');

    this.logger.log(`LemonSqueezy config —`
      + ` storeId=${mask(storeId)}`
      + ` proVariant=${mask(proVariant)}`
      + ` bizVariant=${mask(bizVariant)}`
      + ` apiKey=${mask(apiKey)}`
      + ` webhookSecret=${mask(secret)}`,
    );
  }

  /**
   * Variante Lemon Squeezy du plan : saisie dans le backoffice (table plans).
   * Secours pour le mensuel : LEMONSQUEEZY_PRO_VARIANT_ID / LEMONSQUEEZY_BUSINESS_VARIANT_ID.
   */
  async variantFor(plan: 'pro' | 'business', billing: Billing): Promise<string> {
    const p = await this.plans.get(plan);
    if (billing === 'yearly') {
      if (!p.lemonVariantYearly) throw new BadRequestException('Paiement annuel non disponible pour ce plan');
      return p.lemonVariantYearly;
    }
    return p.lemonVariantMonthly
      ?? this.config.get<string>(plan === 'pro' ? 'lemonSqueezy.proVariantId' : 'lemonSqueezy.businessVariantId', '');
  }

  /** Plan correspondant à une variante reçue par webhook (mensuelle ou annuelle), avec le même secours. */
  async planForVariant(variantId: string): Promise<'pro' | 'business' | null> {
    const fromPlans = await this.plans.planForVariant(variantId);
    if (fromPlans) return fromPlans;
    if (variantId && variantId === this.config.get<string>('lemonSqueezy.proVariantId', '')) return 'pro';
    if (variantId && variantId === this.config.get<string>('lemonSqueezy.businessVariantId', '')) return 'business';
    return null;
  }

  // ── Checkout ou Upgrade ───────────────────────────────────────────────────

  /**
   * Point d'entrée principal :
   * - Si l'utilisateur a déjà un abonnement actif sur un plan différent
   *   → upgrade via PATCH Lemon Squeezy (pas de nouveau checkout)
   * - Sinon → crée un nouveau checkout Lemon Squeezy
   */
  async createCheckoutOrUpgrade(
    plan: 'pro' | 'business',
    clerkUserId: string,
    userEmail?: string,
    billing: Billing = 'monthly',
  ): Promise<{ checkoutUrl: string | null; upgraded: boolean }> {
    const user = await this.db.findUserByClerkId(clerkUserId);

    const hasActiveSub =
      user?.subscriptionStatus === 'active' &&
      user?.lemonSubscriptionId;

    const isDifferentPlan = user?.subscriptionPlan !== plan;

    if (hasActiveSub && isDifferentPlan) {
      // Upgrade : modifier le variant de l'abonnement existant
      await this.upgradeSubscriptionVariant(
        user!.lemonSubscriptionId!,
        plan,
        clerkUserId,
        billing,
      );
      return { checkoutUrl: null, upgraded: true };
    }

    // Pas d'abonnement actif ou même plan → nouveau checkout
    const url = await this.createCheckoutUrl(plan, clerkUserId, userEmail, billing);
    return { checkoutUrl: url, upgraded: false };
  }

  /**
   * PATCH /v1/subscriptions/{id}
   * Change le variant_id d'un abonnement Lemon Squeezy existant.
   */
  private async upgradeSubscriptionVariant(
    lemonSubId: string,
    plan: 'pro' | 'business',
    clerkUserId: string,
    billing: Billing,
  ): Promise<void> {
    const apiKey    = this.config.get<string>('lemonSqueezy.apiKey', '');
    const variantId = await this.variantFor(plan, billing);

    if (!apiKey || !variantId) {
      throw new BadRequestException('Configuration paiement incomplète pour l\'upgrade');
    }

    try {
      await axios.patch(
        `${LS_API}/subscriptions/${lemonSubId}`,
        {
          data: {
            type:       'subscriptions',
            id:         lemonSubId,
            attributes: { variant_id: Number(variantId) },
          },
        },
        {
          headers: {
            Authorization:  `Bearer ${apiKey}`,
            Accept:         'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
          },
        },
      );

      // Mise à jour immédiate en BDD (le webhook confirmera)
      await this.db.upsertUser({
        clerkUserId,
        subscriptionPlan:    plan,
        subscriptionStatus:  'active',
        lemonSubscriptionId: lemonSubId,
      });

      this.logger.log(
        `[upgrade] user=${clerkUserId} subscription=${lemonSubId} → plan=${plan}`,
      );
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      const detail = err?.response?.data ?? err?.message;
      this.logger.error('Lemon Squeezy upgrade error', detail);
      throw new BadRequestException('Impossible de mettre à niveau l\'abonnement');
    }
  }

  // ── Checkout (nouveau) ────────────────────────────────────────────────────

  async createCheckoutUrl(
    plan: 'pro' | 'business',
    clerkUserId: string,
    userEmail?: string,
    billing: Billing = 'monthly',
  ): Promise<string> {
    const apiKey      = this.config.get<string>('lemonSqueezy.apiKey', '');
    const storeId     = this.config.get<string>('lemonSqueezy.storeId', '');
    const variantId   = await this.variantFor(plan, billing);
    const frontendUrl = this.config.get<string>('frontendUrl', 'http://localhost:3000');

    if (!apiKey || !storeId || !variantId) {
      this.logger.error('Lemon Squeezy config incomplete (apiKey/storeId/variantId)');
      throw new BadRequestException('Configuration paiement incomplète');
    }

    try {
      const response = await axios.post(
        `${LS_API}/checkouts`,
        {
          data: {
            type: 'checkouts',
            attributes: {
              checkout_options: {
                embed:  false,
                media:  true,
                logo:   true,
              },
              checkout_data: {
                email:  userEmail ?? undefined,
                custom: { clerk_user_id: clerkUserId },
              },
              product_options: {
                redirect_url:       `${frontendUrl}/dashboard?upgraded=true`,
                receipt_link_url:   `${frontendUrl}/dashboard`,
              },
              // URL de retour si l'utilisateur annule
              expires_at: null,
            },
            relationships: {
              store: {
                data: { type: 'stores', id: String(storeId) },
              },
              variant: {
                data: { type: 'variants', id: String(variantId) },
              },
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept:        'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
          },
        },
      );

      const url: string | undefined = response.data?.data?.attributes?.url;
      if (!url) {
        this.logger.error('No checkout URL in Lemon Squeezy response', response.data);
        throw new BadRequestException('URL de checkout introuvable dans la réponse');
      }

      this.logger.log(`Checkout created for user=${clerkUserId} plan=${plan}`);
      return url;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      const detail = err?.response?.data ?? err?.message;
      this.logger.error('Lemon Squeezy checkout error', detail);
      throw new BadRequestException('Impossible de créer la session de paiement');
    }
  }

  // ── Webhook signature ─────────────────────────────────────────────────────

  verifySignature(rawBody: Buffer, signature: string): boolean {
    const secret = this.config.get<string>('lemonSqueezy.webhookSecret', '');
    if (!secret) {
      this.logger.warn('LEMONSQUEEZY_WEBHOOK_SECRET not set — rejecting webhook');
      return false;
    }
    const digest = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(digest, 'utf8'),
        Buffer.from(signature, 'utf8'),
      );
    } catch {
      return false;
    }
  }

  // ── Plan lookup ───────────────────────────────────────────────────────────

  async getMyPlan(clerkUserId: string): Promise<{
    subscription_plan:   'pro' | 'business' | null;
    subscription_status: string | null;
    has_access:          boolean;
  }> {
    const user = await this.db.findUserByClerkId(clerkUserId);
    return {
      subscription_plan:   (user?.subscriptionPlan as 'pro' | 'business' | null) ?? null,
      subscription_status: user?.subscriptionStatus ?? null,
      has_access:          hasPaidAccess(user?.subscriptionPlan, user?.subscriptionStatus),
    };
  }

  // ── Webhook event handler ─────────────────────────────────────────────────

  async handleWebhookEvent(payload: any): Promise<void> {
    const eventName   = payload?.meta?.event_name as string | undefined;
    const clerkUserId = payload?.meta?.custom_data?.clerk_user_id as string | undefined;

    this.logger.debug(`Webhook received: ${eventName} | user=${clerkUserId ?? 'unknown'}`);

    if (!clerkUserId) {
      this.logger.warn(`Webhook ${eventName}: missing clerk_user_id in custom_data — skipping`);
      return;
    }

    const attrs          = payload?.data?.attributes ?? {};
    const lemonSubId     = String(payload?.data?.id ?? '');
    const status: string = attrs?.status ?? 'inactive';
    const variantId      = String(attrs?.variant_id ?? '');

    const plan = await this.planForVariant(variantId);

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
        await this.db.upsertUser({
          clerkUserId,
          subscriptionPlan:   plan,
          subscriptionStatus: status,
          lemonSubscriptionId: lemonSubId,
        });
        this.logger.log(
          `[${eventName}] user=${clerkUserId} plan=${plan ?? 'unknown'} status=${status}`,
        );
        break;

      case 'subscription_cancelled':
        // Résiliation : l'accès reste ouvert jusqu'à la fin de la période payée.
        await this.db.upsertUser({
          clerkUserId,
          subscriptionPlan:   plan,
          subscriptionStatus: 'cancelled',
          lemonSubscriptionId: lemonSubId,
        });
        this.logger.log(`[subscription_cancelled] user=${clerkUserId} (accès jusqu'à la fin de période)`);
        break;

      case 'subscription_expired':
        // Fin réelle de la période payée → retour au plan gratuit.
        await this.db.upsertUser({
          clerkUserId,
          subscriptionPlan:   null,
          subscriptionStatus: 'expired',
          lemonSubscriptionId: lemonSubId,
        });
        this.logger.log(`[subscription_expired] user=${clerkUserId}`);
        break;

      default:
        this.logger.debug(`Unhandled LS event: ${eventName}`);
    }
  }
}
