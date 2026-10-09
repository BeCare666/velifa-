import { Controller, Post, Req, Headers, HttpCode, HttpStatus, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RawBodyRequest } from '@nestjs/common';
import { SallaService } from './salla.service';
import { verifySallaSignature } from './salla-signature';

/** Webhook de l'app Salla — URL à déclarer dans le portail : https://<backend>/api/v1/integrations/salla/webhook */
@Controller('integrations/salla')
@SkipThrottle()
export class SallaController {
  private readonly logger = new Logger(SallaController.name);

  constructor(private readonly salla: SallaService, private readonly config: ConfigService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
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
}
