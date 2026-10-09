import { Controller, Get, Post, Put, Body, Param, Headers, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { verifyClerkToken } from '../common/auth/clerk-auth.service';
import { ClientIp } from '../common/decorators/client-ip.decorator';
import { WidgetService } from './widget.service';
import { WidgetAuditDto, WidgetConfigDto } from './widget.dto';

/** Configuration du widget (membres de l'espace ; modification : propriétaire, plan Business). */
@Controller('workspaces/:workspaceId/widget')
@UseGuards(ThrottlerGuard)
export class WidgetConfigController {
  constructor(private readonly widget: WidgetService) {}

  @Get()
  async get(@Headers('authorization') auth: string | undefined, @Param('workspaceId') workspaceId: string) {
    return this.widget.getConfig(await verifyClerkToken(auth), workspaceId);
  }

  @Put()
  async configure(
    @Headers('authorization') auth: string | undefined,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: WidgetConfigDto,
  ) {
    return this.widget.configure(await verifyClerkToken(auth), workspaceId, dto.origins, dto.regenerateKey);
  }
}

/**
 * Routes publiques appelées depuis le site de l'agence (CORS ouvert sur /widget/*, sans authentification).
 * L'origine du navigateur doit être un domaine déclaré par l'agence.
 */
@Controller('widget')
@UseGuards(ThrottlerGuard)
export class WidgetPublicController {
  constructor(private readonly widget: WidgetService) {}

  @Get(':key/config')
  async config(@Param('key') key: string, @Headers('origin') origin: string | undefined) {
    return this.widget.publicConfig(key, origin);
  }

  @Post(':key/audit')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 3, ttl: 3_600_000 } })   // 3 audits / heure / IP
  async audit(
    @Param('key') key: string,
    @Headers('origin') origin: string | undefined,
    @ClientIp() ip: string,
    @Body() dto: WidgetAuditDto,
  ) {
    return this.widget.publicAudit(key, origin, ip, dto);
  }

  @Get(':key/analyses/:id')
  async status(@Param('key') key: string, @Param('id') id: string, @Headers('origin') origin: string | undefined) {
    return this.widget.publicStatus(key, origin, id);
  }
}
