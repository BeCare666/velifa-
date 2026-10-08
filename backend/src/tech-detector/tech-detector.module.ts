import { Module } from '@nestjs/common';
import { TechDetectorService } from './tech-detector.service';

@Module({
  providers: [TechDetectorService],
  exports:   [TechDetectorService],
})
export class TechDetectorModule {}
