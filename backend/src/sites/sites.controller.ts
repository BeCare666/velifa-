import { Controller, Get, Post, Delete, Body, Param, Query, Headers, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { verifyClerkToken } from '../common/auth/clerk-auth.service';
import { SitesService } from './sites.service';
import { AddSiteDto } from './dto/add-site.dto';

/** Sites suivis (personnels ou d'un espace agence). Utilisateur Clerk connecté obligatoire. */
@Controller('sites')
@UseGuards(ThrottlerGuard)
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  /** GET /sites?workspaceId= → { sites, usage: { plan, used, limit } } */
  @Get()
  async list(@Headers('authorization') auth: string | undefined, @Query('workspaceId') workspaceId?: string) {
    return this.sites.list(await verifyClerkToken(auth), workspaceId || undefined);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(@Headers('authorization') auth: string | undefined, @Body() dto: AddSiteDto) {
    return this.sites.add(await verifyClerkToken(auth), dto);
  }

  @Delete(':id')
  async remove(@Headers('authorization') auth: string | undefined, @Param('id') id: string) {
    return this.sites.remove(await verifyClerkToken(auth), id);
  }
}
