import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { verifyClerkToken } from '../common/auth/clerk-auth.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * GET /api/v1/payments/me
   * Retourne le plan et statut d'abonnement de l'utilisateur connecté.
   * Retourne plan: null si l'utilisateur n'a pas encore de ligne dans users.
   */
  @Get('me')
  @SkipThrottle()           // Route read-only de dashboard — pas de risque d'abus
  @UseGuards(ThrottlerGuard)
  async getMyPlan(@Headers('authorization') authHeader: string | undefined) {
    const clerkUserId = await verifyClerkToken(authHeader);
    if (!clerkUserId) {
      throw new UnauthorizedException('Token Clerk requis');
    }
    return this.paymentsService.getMyPlan(clerkUserId);
  }

  /**
   * POST /api/v1/payments/checkout
   * Crée une session de checkout Lemon Squeezy pour l'utilisateur connecté.
   * Retourne { checkoutUrl: string }.
   */
  @Post('checkout')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @Headers('authorization') authHeader: string | undefined,
  ) {
    const clerkUserId = await verifyClerkToken(authHeader);
    if (!clerkUserId) {
      throw new UnauthorizedException('Vous devez être connecté pour souscrire à un plan');
    }

    const result = await this.paymentsService.createCheckoutOrUpgrade(
      dto.plan,
      clerkUserId,
      dto.email,
    );

    return {
      checkoutUrl: result.checkoutUrl,
      upgraded:    result.upgraded,
    };
  }

  /**
   * POST /api/v1/payments/webhook
   * Reçoit les webhooks Lemon Squeezy.
   * Vérifie la signature HMAC-SHA256 avant traitement.
   * Traite : subscription_created, subscription_updated, subscription_cancelled.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string | undefined,
  ) {
    // ── Signature verification ─────────────────────────────────────────────
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.warn('Webhook received without raw body');
      throw new UnauthorizedException('Raw body missing');
    }
    if (!signature) {
      this.logger.warn('Webhook received without X-Signature header');
      throw new UnauthorizedException('Signature manquante');
    }

    const valid = this.paymentsService.verifySignature(rawBody, signature);
    if (!valid) {
      this.logger.warn('Webhook signature verification failed');
      throw new UnauthorizedException('Signature invalide');
    }

    // ── Parse and dispatch ─────────────────────────────────────────────────
    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      this.logger.error('Failed to parse webhook payload');
      return { received: false };
    }

    await this.paymentsService.handleWebhookEvent(payload);
    return { received: true };
  }
}
