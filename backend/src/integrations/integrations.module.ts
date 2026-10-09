import { Module } from '@nestjs/common';
import { SallaController } from './salla.controller';
import { SallaService } from './salla.service';
import { SallaDashboardService } from './salla-dashboard.service';
import { ZidController } from './zid.controller';
import { ZidService } from './zid.service';

@Module({
  controllers: [SallaController, ZidController],
  providers:   [SallaService, SallaDashboardService, ZidService],
})
export class IntegrationsModule {}
