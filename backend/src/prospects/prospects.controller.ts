import { Controller, Get, Post, Body, Headers, Query, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { requireAdmin } from '../admin/admin-auth';
import { ProspectsService } from './prospects.service';
import { ImportProspectsDto } from './dto/import-prospects.dto';

@Controller('admin/prospects')
@SkipThrottle()
export class ProspectsController {
  constructor(private readonly prospects: ProspectsService) {}

  /** POST /admin/prospects/import — CSV d'URL → audits programmés à débit limité */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  async import(@Headers('authorization') auth: string | undefined, @Body() dto: ImportProspectsDto) {
    await requireAdmin(auth);
    return this.prospects.importCsv(dto.csv, dto.locale ?? 'ar');
  }

  /** GET /admin/prospects/export?batch= → CSV (lien WhatsApp pré-rempli par prospect) */
  @Get('export')
  async export(
    @Headers('authorization') auth: string | undefined,
    @Res() res: Response,
    @Query('batch') batch?: string,
  ) {
    await requireAdmin(auth);
    const csv = await this.prospects.exportCsv(batch || undefined);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="velifa_prospects_${Date.now()}.csv"`);
    res.send(csv);
  }

  /** GET /admin/prospects?batch=&page=&limit= */
  @Get()
  async list(
    @Headers('authorization') auth: string | undefined,
    @Query('batch') batch?: string,
    @Query('page')  page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    await requireAdmin(auth);
    return this.prospects.list({ batchId: batch || undefined, page: parseInt(page) || 1, limit: parseInt(limit) || 50 });
  }
}
