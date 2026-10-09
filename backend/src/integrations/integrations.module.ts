import { Module } from '@nestjs/common';
import { SallaController } from './salla.controller';
import { SallaService } from './salla.service';

@Module({
  controllers: [SallaController],
  providers:   [SallaService],
})
export class IntegrationsModule {}
