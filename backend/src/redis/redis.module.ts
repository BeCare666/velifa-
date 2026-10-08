import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import Redis from 'ioredis';

export const BULL_ANALYSES_QUEUE = 'analyses';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('redis.url', 'redis://localhost:6379');
        const isUpstash = redisUrl.startsWith('rediss://');

        // Standard case
        let redisOptions: any = {
          url: redisUrl,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          connectTimeout: 10000,
        };

        if (isUpstash) {
          // Upstash with explicit TLS
          const urlMatch = redisUrl.match(/rediss:\/\/([^@]+)@(.+):(\d+)/);
          if (urlMatch) {
            redisOptions = {
              host: urlMatch[2],
              port: parseInt(urlMatch[3]),
              password: urlMatch[1].replace('default:', ''),
              tls: {},
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
              connectTimeout: 10000,
            };
          }
        }

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
