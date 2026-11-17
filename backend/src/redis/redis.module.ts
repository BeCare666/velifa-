import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { redisOptionsFromUrl } from './redis-options';

export const BULL_ANALYSES_QUEUE = 'analyses';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('redis.url', 'redis://localhost:6379');
        const redisOptions = redisOptionsFromUrl(redisUrl);

        return {
          redis: redisOptions,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 50 },
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: BULL_ANALYSES_QUEUE }),
  ],
  exports: [BullModule],
})
export class RedisModule {}
