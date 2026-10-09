import { Module } from '@nestjs/common';
import { SallaController } from './salla.controller';
import { SallaService } from './salla.service';
import { SallaDashboardService } from './salla-dashboard.service';

@Module({
  controllers: [SallaController],
  providers:   [SallaService, SallaDashboardService],
})
export class IntegrationsModule {}
