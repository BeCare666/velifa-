import { Global, Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { AdminPlansController } from './admin-plans.controller';

@Global()
@Module({
  controllers: [PlansController, AdminPlansController],
  providers:   [PlansService],
  exports:     [PlansService],
})
export class PlansModule {}
