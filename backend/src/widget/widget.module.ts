import { Module } from '@nestjs/common';
import { WidgetConfigController, WidgetPublicController } from './widget.controller';
import { WidgetService } from './widget.service';

@Module({
  controllers: [WidgetConfigController, WidgetPublicController],
  providers:   [WidgetService],
})
export class WidgetModule {}
