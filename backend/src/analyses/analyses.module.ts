import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AnalysesController } from './analyses.controller';
import { AnalysesService } from './analyses.service';
import { AnalysisWorker } from './analyses.worker';
import { PageSpeedModule } from '../pagespeed/pagespeed.module';
import { ScreenshotModule } from '../screenshot/screenshot.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { BrevoModule } from '../brevo/brevo.module';
import { SseModule } from '../sse/sse.module';
import { TechDetectorModule } from '../tech-detector/tech-detector.module';
import { BULL_ANALYSES_QUEUE } from '../redis/redis.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: BULL_ANALYSES_QUEUE }),
    PageSpeedModule,
    ScreenshotModule,
    CloudinaryModule,
    BrevoModule,
    SseModule,
    TechDetectorModule,
  ],
  controllers: [AnalysesController],
  providers: [AnalysesService, AnalysisWorker],
})
export class AnalysesModule {}
