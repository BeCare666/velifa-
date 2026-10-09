import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import configuration, { validate } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AnalysesModule } from './analyses/analyses.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { ProspectsModule } from './prospects/prospects.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { SitesModule } from './sites/sites.module';
import { ReportsModule } from './reports/reports.module';
import { WidgetModule } from './widget/widget.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      cache: true,
    }),
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 60_000,     limit: 60  },   // 60 req/min  (dashboard polling)
      { name: 'medium', ttl: 3_600_000,  limit: 300 },   // 300 req/h
      { name: 'daily',  ttl: 86_400_000, limit: 1000 },  // 1000 req/day
    ]),
    PrismaModule,
    RedisModule,
    AnalysesModule,
    PaymentsModule,
    AdminModule,
    ProspectsModule,
    WorkspacesModule,
    SitesModule,
    ReportsModule,
    WidgetModule,
    ApiKeysModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER,      useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
