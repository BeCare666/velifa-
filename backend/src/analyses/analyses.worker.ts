import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { DatabaseService } from '../prisma/database.service';
import { PageSpeedService } from '../pagespeed/pagespeed.service';
import { ScreenshotService } from '../screenshot/screenshot.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { BrevoService } from '../brevo/brevo.service';
import { SseService } from '../sse/sse.service';
import { ConfigService } from '@nestjs/config';
import { BULL_ANALYSES_QUEUE } from '../redis/redis.module';
import { TechDetectorService } from '../tech-detector/tech-detector.service';

export interface AnalysisJobPayload {
  analysisId: string;
  url: string;
  email: string;
  locale: string;
}

@Processor(BULL_ANALYSES_QUEUE)
export class AnalysisWorker {
  private readonly logger = new Logger(AnalysisWorker.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly pageSpeed: PageSpeedService,
    private readonly screenshot: ScreenshotService,
    private readonly cloudinary: CloudinaryService,
    private readonly brevo: BrevoService,
    private readonly sse: SseService,
    private readonly config: ConfigService,
    private readonly techDetector: TechDetectorService,
  ) {}

  @Process('run')
  async handleAnalysis(job: Job<AnalysisJobPayload>): Promise<void> {
    const { analysisId, url, email, locale } = job.data;
    const startTime = Date.now();
    this.logger.log(`Worker started for ${analysisId} [attempt ${job.attemptsMade + 1}]`);

    await this.db.updateAnalysis(analysisId, { status: 'processing' });
    this.sse.emit(analysisId, { status: 'processing' });

    try {
      this.logger.log(`[${analysisId}] Running PageSpeed...`);
      const [mobileResult, desktopResult] = await Promise.allSettled([
        this.pageSpeed.analyze(url, 'mobile'),
        this.pageSpeed.analyze(url, 'desktop'),
      ]);

      if (mobileResult.status === 'rejected') {
        throw new Error(`PageSpeed mobile failed: ${mobileResult.reason?.message}`);
      }
      const mobile = mobileResult.value;
      const desktop = desktopResult.status === 'fulfilled' ? desktopResult.value : null;

      this.logger.log(`[${analysisId}] Capturing screenshot + detecting technologies...`);
      let screenshotUrl: string | null = null;
      let cloudinaryPublicId: string | null = null;
      let technologies: any[] = [];

      // Screenshot et détection de technologies en parallèle (tous deux non-bloquants)
      const [screenshotResult, techResult] = await Promise.allSettled([
        (async () => {
          const buffer = await this.screenshot.capture(url);
          if (!buffer) return { url: null, publicId: null };
          return this.cloudinary.uploadBuffer(buffer, 'velifa/screenshots', `analysis_${analysisId}`);
        })(),
        this.techDetector.detect(url),
      ]);

      if (screenshotResult.status === 'fulfilled' && screenshotResult.value?.url) {
        screenshotUrl      = screenshotResult.value.url;
        cloudinaryPublicId = screenshotResult.value.publicId;
      } else if (screenshotResult.status === 'rejected') {
        this.logger.warn(`[${analysisId}] Screenshot failed (non-blocking): ${screenshotResult.reason?.message}`);
        Sentry.captureException(screenshotResult.reason, { tags: { analysisId, step: 'screenshot' } });
      }

      if (techResult.status === 'fulfilled') {
        technologies = techResult.value;
        this.logger.log(`[${analysisId}] Technologies: ${technologies.map((t: any) => t.name).join(', ') || 'none'}`);
      } else {
        this.logger.warn(`[${analysisId}] TechDetector failed (non-blocking): ${techResult.reason?.message}`);
      }

      const frontendUrl = this.config.get<string>('frontendUrl', '');
      const reportUrl = `${frontendUrl}/analyse/${analysisId}`;
      const whatsappLink = this.buildWhatsappLink(url, mobile.scorePerformance, reportUrl);

      this.logger.log(`[${analysisId}] Saving results...`);
      await this.db.updateAnalysis(analysisId, {
        status:             'completed',
        completedAt:        new Date(),
        scorePerformance:   mobile.scorePerformance,
        scoreAccessibility: mobile.scoreAccessibility,
        scoreSeo:          mobile.scoreSeo,
        scoreBestPractices: mobile.scoreBestPractices,
        lcpMobile:         mobile.coreWebVitals.lcp,
        clsMobile:         mobile.coreWebVitals.cls,
        tbtMobile:         mobile.coreWebVitals.tbt,
        fcpMobile:         mobile.coreWebVitals.fcp,
        ttfbMobile:        mobile.coreWebVitals.ttfb,
        lcpDesktop:        desktop?.coreWebVitals.lcp ?? null,
        clsDesktop:        desktop?.coreWebVitals.cls ?? null,
        tbtDesktop:        desktop?.coreWebVitals.tbt ?? null,
        fcpDesktop:        desktop?.coreWebVitals.fcp ?? null,
        ttfbDesktop:       desktop?.coreWebVitals.ttfb ?? null,
        imagesToOptimize:  mobile.imagesToOptimize,
        blockingScripts:   mobile.blockingScripts,
        unusedResources:   mobile.unusedResources,
        reportJson:        mobile.rawJson,
        technologies:      technologies.length ? technologies : null,
        screenshotUrl,
        cloudinaryPublicId,
        whatsappLink,
        reportUrl,
      });

      try {
        await this.brevo.sendReportEmail({
          toEmail:           email,
          urlSite:           url,
          scorePerformance:  mobile.scorePerformance,
          lcp:               mobile.coreWebVitals.lcp,
          cls:               mobile.coreWebVitals.cls,
          tbt:               mobile.coreWebVitals.tbt,
          reportUrl,
          whatsappUrl:       whatsappLink,
          screenshotUrl,
        });
      } catch (err: any) {
        this.logger.warn(`[${analysisId}] Email failed (non-blocking): ${err.message}`);
        Sentry.captureException(err, { tags: { analysisId, step: 'email' } });
      }

      this.sse.emit(analysisId, { status: 'completed', redirectUrl: reportUrl });
      this.logger.log(
        `[${analysisId}] Done in ${Date.now() - startTime}ms — score: ${mobile.scorePerformance}`,
      );

    } catch (error: any) {
      this.logger.error(`[${analysisId}] Worker failed: ${error.message}`, error.stack);
      Sentry.captureException(error, { tags: { analysisId } });

      const maxAttempts = job.opts.attempts ?? 3;
      if (job.attemptsMade >= maxAttempts - 1) {
        await this.db.updateAnalysis(analysisId, {
          status:       'failed',
          failedAt:     new Date(),
          errorMessage: error.message,
        });
        this.sse.emit(analysisId, { status: 'failed' });
      }

      throw error;
    }
  }

  private buildWhatsappLink(urlSite: string, score: number, reportUrl: string): string {
    const number = this.config.get<string>('whatsapp.number', '');
    const msg = [
      `Bonjour, j'ai analysé mon site ${urlSite}`,
      `Score performance : ${score}/100`,
      `Rapport complet : ${reportUrl}`,
      `Pouvez-vous m'aider à améliorer ces métriques ?`,
    ].join('\n');
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  }
}
