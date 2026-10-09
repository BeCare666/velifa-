import { Controller, Get, Post, Patch, Delete, Body, Param, Headers, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { verifyClerkToken } from '../common/auth/clerk-auth.service';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceBrandingDto, AddMemberDto } from './dto/workspace.dto';

/** Espaces agence (offre B). Toutes les routes exigent un utilisateur Clerk connecté. */
@Controller('workspaces')
@UseGuards(ThrottlerGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  async listMine(@Headers('authorization') auth: string | undefined) {
    return this.workspaces.listMine(await verifyClerkToken(auth));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Headers('authorization') auth: string | undefined, @Body() dto: WorkspaceBrandingDto) {
    return this.workspaces.create(await verifyClerkToken(auth), dto);
  }

  @Get(':id')
  async get(@Headers('authorization') auth: string | undefined, @Param('id') id: string) {
    return this.workspaces.get(await verifyClerkToken(auth), id);
  }

  @Patch(':id')
  async update(@Headers('authorization') auth: string | undefined, @Param('id') id: string, @Body() dto: WorkspaceBrandingDto) {
    return this.workspaces.update(await verifyClerkToken(auth), id, dto);
  }

  @Post(':id/members')
  async addMember(@Headers('authorization') auth: string | undefined, @Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.workspaces.addMember(await verifyClerkToken(auth), id, dto.email);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspaces.removeMember(await verifyClerkToken(auth), id, memberId);
  }
}
