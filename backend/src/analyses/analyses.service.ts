import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../prisma/database.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { AnalysisJobPayload } from './analyses.worker';
import { validateUrl, hashUrl } from '../common/validators/url.validator';
import { BULL_ANALYSES_QUEUE } from '../redis/redis.module';
import { BrevoService } from '../brevo/brevo.service';
import axios from 'axios';

const CACHE_TTL_HOURS  = 24;
const FREE_USER_LIMIT  = 3;   // audits / 24h pour un utilisateur gratuit connecté
const ANON_IP_LIMIT    = 1;   // audits / 24h pour un visiteur anonyme par IP

@Injectable()
export class AnalysesService {
  private readonly logger = new Logger(AnalysesService.name);

  constructor(
    private readonly db: DatabaseService,
    @InjectQueue(BULL_ANALYSES_QUEUE) private readonly queue: Queue<AnalysisJobPayload>,
    private readonly config: ConfigService,
    private readonly brevo: BrevoService,
  ) {}

  async create(dto: CreateAnalysisDto, ipAddress: string, clerkUserId: string | null = null) {
    await this.verifyCaptcha(dto.cfTurnstileToken, ipAddress);

    const validation = validateUrl(dto.url);
    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }
    const normalizedUrl = validation.normalized!;
    const urlHash = hashUrl(normalizedUrl);

    // ── Rate limiting ───────────────────────────────────────────────────
    const cutoff24h = new Date(Date.now() - CACHE_TTL_HOURS * 3600 * 1000);

    if (clerkUserId) {
      // Vérifie si le compte est suspendu
      const isSuspended = await this.db.isUserSuspended(clerkUserId);
      if (isSuspended) {
        throw new HttpException(
          { statusCode: 403, message: 'Compte suspendu. Contactez le support.', error: 'Forbidden' },
          HttpStatus.FORBIDDEN,
        );
      }
      // Utilisateur connecté → vérifie son plan
      const userInfo = await this.db.findUserByClerkId(clerkUserId);
      const isPremium = userInfo?.subscriptionPlan === 'pro'
                     || userInfo?.subscriptionPlan === 'business';

      if (!isPremium) {
        // Plan gratuit → limite à FREE_USER_LIMIT audits / 24h
        const recentCount = await this.db.countRecentAnalysesByUser(clerkUserId, cutoff24h);
        if (recentCount >= FREE_USER_LIMIT) {
          throw new HttpException(
            {
              statusCode: 429,
              message:    'Limite quotidienne atteinte. Passez Pro pour des audits illimités.',
              error:      'Too Many Requests',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
      // Pro / Business → aucune limite
    } else {
      // Anonyme → limite à ANON_IP_LIMIT audit / 24h par IP
      const maskedIp = this.maskIp(ipAddress);
      const recentCount = await this.db.countRecentAnalysesByIp(maskedIp, cutoff24h);
      if (recentCount >= ANON_IP_LIMIT) {
        throw new HttpException(
          {
            statusCode: 429,
            message:    'Limite atteinte. Créez un compte gratuit pour plus d\'audits.',
            error:      'Too Many Requests',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // ── Cache check ─────────────────────────────────────────────────────
    const cached = dto.force ? null : await this.db.findCachedAnalysis(urlHash, cutoff24h);
    if (cached) {
      this.logger.log(`Cache hit for ${normalizedUrl} → ${cached.id}`);
      return cached;
    }

    // ── Create + queue ──────────────────────────────────────────────────
    const emailForJob = dto.email ?? '';   // worker n'envoie pas si vide

    const analysis = await this.db.createAnalysis({
      urlSite:     normalizedUrl,
      urlHash,
      email:       emailForJob,
      locale:      dto.locale ?? 'fr',
      source:      'web',
      clerkUserId: clerkUserId,
      ipAddress:   this.maskIp(ipAddress),
    });

    await this.queue.add(
      'run',
      { analysisId: analysis.id, url: normalizedUrl, email: emailForJob, locale: dto.locale ?? 'fr' },
      { jobId: analysis.id, timeout: 60_000 },
    );

    this.logger.log(`Analysis ${analysis.id} created and queued for ${normalizedUrl}`);
    return analysis;
  }

  async findById(id: string) {
    const analysis = await this.db.findAnalysisById(id);
    if (!analysis) throw new NotFoundException(`Analysis ${id} not found`);
    return analysis;
  }

  async findByUser(clerkUserId: string) {
    const rows = await this.db.findAnalysesByUser(clerkUserId);
    return rows.map((a) => ({
      id:                 a.id,
      url:                a.urlSite,
      status:             a.status,
      scorePerformance:   a.scorePerformance,
      scoreAccessibility: a.scoreAccessibility,
      scoreSeo:           a.scoreSeo,
      scoreBestPractices: a.scoreBestPractices,
      createdAt:          a.createdAt,
      completedAt:        a.completedAt,
    }));
  }

  private async verifyCaptcha(token: string, ip: string): Promise<void> {
    const secretKey = this.config.get<string>('security.turnstileSecretKey', '');
    if (
      !secretKey ||
      secretKey === 'your_turnstile_secret' ||
      process.env.NODE_ENV === 'development' ||
      token === 'dev-bypass-token'
    ) {
      this.logger.warn('Turnstile bypassed in development mode');
      return;
    }
    try {
      const { data } = await axios.post(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        new URLSearchParams({ secret: secretKey, response: token, remoteip: ip }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 5000 },
      );
      if (!data.success) throw new BadRequestException('CAPTCHA verification failed');
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(`Turnstile error (bypassing): ${error.message}`);
    }
  }

  /**
   * POST /analyses/:id/send-email
   * Renvoie le rapport existant par email (sans relancer l'audit).
   */
  async sendReportForAnalysis(id: string, toEmail: string): Promise<void> {
    const analysis = await this.db.findAnalysisById(id);
    if (!analysis) throw new NotFoundException(`Analysis ${id} not found`);
    if (analysis.status !== 'completed') {
      throw new BadRequestException('Le rapport n\'est pas encore disponible.');
    }

    const frontendUrl = this.config.get<string>('frontendUrl', 'http://localhost:3000');
    const reportUrl   = `${frontendUrl}/analyse/${id}`;

    await this.brevo.sendReportEmail({
      toEmail,
      urlSite:          analysis.urlSite,
      scorePerformance: analysis.scorePerformance ?? 0,
      lcp:              analysis.lcpMobile,
      cls:              analysis.clsMobile,
      tbt:              analysis.tbtMobile,
      reportUrl,
      whatsappUrl:      analysis.whatsappLink ?? reportUrl,
      screenshotUrl:    analysis.screenshotUrl,
    });

    this.logger.log(`Report email sent for ${id} → ${toEmail}`);
  }

  private maskIp(ip: string): string {
    if (!ip) return '';
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    return ip.substring(0, ip.length - 4) + 'xxxx';
  }
}
