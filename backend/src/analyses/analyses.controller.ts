import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Sse,
  MessageEvent,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { Observable, map } from 'rxjs';
import { AnalysesService } from './analyses.service';
import { SseService } from '../sse/sse.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { SendReportEmailDto } from './dto/send-report-email.dto';
import { ClientIp } from '../common/decorators/client-ip.decorator';
import { verifyClerkToken } from '../common/auth/clerk-auth.service';

@Controller('analyses')
@UseGuards(ThrottlerGuard)
export class AnalysesController {
  private readonly logger = new Logger(AnalysesController.name);

  constructor(
    private readonly analysesService: AnalysesService,
    private readonly sseService: SseService,
  ) {}

  /**
   * POST /analyses
   * Creates a new analysis and queues it for processing.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateAnalysisDto,
    @ClientIp() ip: string,
    @Headers('authorization') authHeader: string | undefined,
  ) {
    const clerkUserId = await verifyClerkToken(authHeader);
    const analysis = await this.analysesService.create(dto, ip, clerkUserId);
    return {
      id:     analysis.id,
      status: analysis.status,
      cached: analysis.status === 'completed',
    };
  }

  /**
   * GET /analyses/mine
   * Returns all audits for the authenticated Clerk user, newest first.
   * Requires a valid Clerk Bearer token (401 otherwise).
   */
  @Get('mine')
  @SkipThrottle()           // Route read-only de dashboard — pas de risque d'abus
  async findMine(@Headers('authorization') authHeader: string | undefined) {
    const clerkUserId = await verifyClerkToken(authHeader);
    if (!clerkUserId) {
      throw new UnauthorizedException('Valid Clerk token required');
    }
    return this.analysesService.findByUser(clerkUserId);
  }

  /**
   * GET /analyses/:id
   * Returns the current state of an analysis.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.analysesService.findById(id);
  }

  /**
   * POST /analyses/:id/send-email
   * Envoie le rapport existant par email sans relancer l'audit.
   * Pas de throttle — action utilisateur explicite unique.
   */
  @Post(':id/send-email')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  async sendEmail(
    @Param('id') id: string,
    @Body() dto: SendReportEmailDto,
  ) {
    await this.analysesService.sendReportForAnalysis(id, dto.email);
    return { sent: true };
  }

  /**
   * GET /analyses/:id/stream
   * Server-Sent Events endpoint — real-time status updates.
   */
  @Sse(':id/stream')
  stream(@Param('id') id: string): Observable<MessageEvent> {
    this.logger.debug(`SSE stream opened for ${id}`);
    return this.sseService.getStream(id).pipe(
      map((event) => ({
        data: JSON.stringify(event),
        id:   event.analysisId,
        type: 'analysis-update',
      })),
    );
  }
}
