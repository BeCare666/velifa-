import { Controller, Post, Get, Body, Req, Headers, HttpCode, HttpStatus, UnauthorizedException, Logger, BadRequestException, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RawBodyRequest } from '@nestjs/common';
import { SallaService } from './salla.service';
import { verifySallaSignature } from './salla-signature';
import { SallaDashboardService } from './salla-dashboard.service';

class SessionDto {
  @IsString() @MaxLength(4096)
  token: string = '';
}

class MerchantAuditDto {
  @IsOptional() @IsIn(['ar', 'en', 'fr'])
  locale?: string;
}

const bearer = (auth: string | undefined) => (auth?.startsWith('Bearer ') ? auth.slice(7).trim() : undefined);

/** Webhook de l'app Salla — URL à déclarer dans le portail : https://<backend>/api/v1/integrations/salla/webhook */
@Controller('integrations/salla')
@UseGuards(ThrottlerGuard)
export class SallaController {
  private readonly logger = new Logger(SallaController.name);

  constructor(
    private readonly salla: SallaService,
    private readonly config: ConfigService,
    private readonly dashboardService: SallaDashboardService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 600, ttl: 60_000 } })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-salla-security-strategy') strategy: string | undefined,
    @Headers('x-salla-signature') signature: string | undefined,
  ) {
    const secret = this.config.get<string>('salla.webhookSecret', '');
    if (!verifySallaSignature(req.rawBody, strategy, signature, secret)) {
      this.logger.warn('Webhook Salla refusé : signature absente ou invalide');
      throw new UnauthorizedException('invalid_signature');
    }
    let payload: any;
    try {
      payload = JSON.parse(req.rawBody!.toString('utf8'));
    } catch {
      throw new BadRequestException('invalid_json');
    }
    return this.salla.handle(payload);
  }

  // ── Tableau de bord intégré (Embedded SDK, ROADMAP 3.4) ──────────────────

  /** Jeton de l'iframe Salla → vérifié auprès de Salla → session VELIFA d'une heure. */
  @Post('session')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 20, ttl: 60_000 } })
  async session(@Body() dto: SessionDto) {
    return this.dashboardService.openSession(dto.token);
  }

  /** Données du tableau de bord du marchand (session dans Authorization: Bearer). */
  @Get('dashboard')
  async dashboard(@Headers('authorization') auth: string | undefined) {
    return this.dashboardService.dashboard(bearer(auth));
  }

  /** Nouvel audit de la boutique (3 / 24 h, plan gratuit). */
  @Post('audit')
  @HttpCode(HttpStatus.CREATED)
  async audit(@Headers('authorization') auth: string | undefined, @Body() dto: MerchantAuditDto) {
    return this.dashboardService.runAudit(bearer(auth), dto.locale);
  }
}
