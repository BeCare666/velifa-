import { Controller, Get, Post, Delete, Body, Param, Headers, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { verifyClerkToken } from '../common/auth/clerk-auth.service';
import { ApiKeysService } from './api-keys.service';

class CreateKeyDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  name: string = '';
}

class PublicAuditDto {
  @IsString() @IsNotEmpty() @MaxLength(2048)
  url: string = '';

  @IsOptional() @IsIn(['ar', 'en', 'fr'])
  locale?: string;
}

/** Gestion des clés API (utilisateur Clerk connecté). */
@Controller('api-keys')
@UseGuards(ThrottlerGuard)
export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}

  @Get()
  async list(@Headers('authorization') auth: string | undefined) {
    return this.keys.list(await verifyClerkToken(auth));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Headers('authorization') auth: string | undefined, @Body() dto: CreateKeyDto) {
    return this.keys.create(await verifyClerkToken(auth), dto.name);
  }

  @Delete(':id')
  async revoke(@Headers('authorization') auth: string | undefined, @Param('id') id: string) {
    return this.keys.revoke(await verifyClerkToken(auth), id);
  }
}

/**
 * API publique v1 — authentification par clé :
 *   Authorization: Bearer vlf_…   ou   X-API-Key: vlf_…
 */
@Controller('public/audits')
@UseGuards(ThrottlerGuard)
export class PublicAuditsController {
  constructor(private readonly keys: ApiKeysService) {}

  /** POST /api/v1/public/audits { url, locale? } → audit en file (status: pending) */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ short: { limit: 30, ttl: 60_000 } })
  async create(
    @Headers('authorization') auth: string | undefined,
    @Headers('x-api-key') apiKey: string | undefined,
    @Body() dto: PublicAuditDto,
  ) {
    const owner = await this.keys.authenticate(auth, apiKey);
    return this.keys.createAudit(owner, dto);
  }

  /** GET /api/v1/public/audits/:id → statut puis résultats (scores, mesures, recommandations, contrôles) */
  @Get(':id')
  async get(
    @Headers('authorization') auth: string | undefined,
    @Headers('x-api-key') apiKey: string | undefined,
    @Param('id') id: string,
  ) {
    const owner = await this.keys.authenticate(auth, apiKey);
    return this.keys.getAudit(owner, id);
  }
}
