import { Controller, Get, Post, Query, Res, Body, Headers, HttpCode, HttpStatus, UnauthorizedException, Logger, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ZidService, verifyZidBasicAuth } from './zid.service';

/** App Zid : installation (OAuth par code) et webhooks de l'App Market. */
@Controller('integrations/zid')
@UseGuards(ThrottlerGuard)
export class ZidController {
  private readonly logger = new Logger(ZidController.name);

  constructor(private readonly zid: ZidService, private readonly config: ConfigService) {}

  /** « App URL » déclarée dans Zid : redirige le marchand vers l'autorisation Zid. */
  @Get('install')
  install(@Res() res: Response) {
    res.redirect(302, this.zid.authorizeUrl());
  }

  /** « Redirect URL » déclarée dans Zid : échange du code, puis page de confirmation du frontend. */
  @Get('callback')
  @Throttle({ short: { limit: 20, ttl: 60_000 } })
  async callback(@Query('code') code: string | undefined, @Res() res: Response) {
    const front = this.config.get<string>('frontendUrl', '').replace(/\/+$/, '');
    try {
      const { storeTitle } = await this.zid.handleCallback(code);
      res.redirect(302, `${front}/ar/zid/installed?status=ok${storeTitle ? `&store=${encodeURIComponent(storeTitle)}` : ''}`);
    } catch (err: any) {
      this.logger.warn(`Installation Zid en échec : ${err?.response?.status ?? ''} ${err?.message}`);
      res.redirect(302, `${front}/ar/zid/installed?status=error`);
    }
  }

  /** Webhooks App Market (store_id, event_name). Basic Auth vérifiée si configurée. */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 600, ttl: 60_000 } })
  async webhook(@Headers('authorization') auth: string | undefined, @Body() payload: any) {
    const user = this.config.get<string>('zid.webhookUsername', '');
    const pass = this.config.get<string>('zid.webhookPassword', '');
    if ((user || pass) && !verifyZidBasicAuth(auth, user, pass)) throw new UnauthorizedException('invalid_credentials');
    return this.zid.handleEvent(payload);
  }
}
