import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { BULL_ANALYSES_QUEUE } from '../redis/redis.module';
import { MonitoringService, MONITORING_TICK_JOB } from './monitoring.service';

/** Passage horaire du planificateur d'audits programmés. */
@Processor(BULL_ANALYSES_QUEUE)
export class MonitoringProcessor {
  private readonly logger = new Logger(MonitoringProcessor.name);

  constructor(private readonly monitoring: MonitoringService) {}

  @Process(MONITORING_TICK_JOB)
  async handleTick(): Promise<void> {
    try {
      await this.monitoring.tick();
    } catch (err: any) {
      this.logger.error(`Planificateur en échec : ${err?.message}`);
      throw err;
    }
  }
}
