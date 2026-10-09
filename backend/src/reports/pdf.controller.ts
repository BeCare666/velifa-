import { Controller, Get, Param, Query, Headers, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';
import { verifyClerkToken } from '../common/auth/clerk-auth.service';
import { PdfService } from './pdf.service';

@Controller('reports')
@UseGuards(ThrottlerGuard)
export class PdfController {
  constructor(private readonly pdf: PdfService) {}

  /** GET /reports/:analysisId/pdf?workspaceId=&locale= → PDF à la marque de l'agence (plan Business) */
  @Get(':analysisId/pdf')
  @Throttle({ short: { limit: 10, ttl: 60_000 } })   // chaque PDF consomme du temps Browserless
  async download(
    @Headers('authorization') auth: string | undefined,
    @Param('analysisId') analysisId: string,
    @Query('workspaceId') workspaceId: string,
    @Query('locale') locale: string | undefined,
    @Res() res: Response,
  ) {
    const { pdf, filename } = await this.pdf.generate(await verifyClerkToken(auth), analysisId, workspaceId, locale);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  }
}
