import { Module } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
import { MonitoringService } from './monitoring.service';
import { MonitoringProcessor } from './monitoring.processor';
import { BrevoModule } from '../brevo/brevo.module';

@Module({
  imports:     [BrevoModule],
  controllers: [SitesController],
  providers:   [SitesService, MonitoringService, MonitoringProcessor],
  exports:     [SitesService, MonitoringService],
})
export class SitesModule {}
