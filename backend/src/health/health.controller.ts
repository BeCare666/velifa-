import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DatabaseService } from '../prisma/database.service';
import { BULL_ANALYSES_QUEUE } from '../redis/redis.module';

const CHECK_TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>, ms = CHECK_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/** GET /api/v1/health — utilisé par Render pour vérifier que le service est opérationnel. */
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    @InjectQueue(BULL_ANALYSES_QUEUE) private readonly queue: Queue,
  ) {}

  @Get()
  async check() {
    const [database, redis] = await Promise.all([
      withTimeout(this.db.healthCheck()).catch(() => false),
      withTimeout(this.queue.client.ping()).then((r) => r === 'PONG').catch(() => false),
    ]);
    const body = { status: database && redis ? 'ok' : 'degraded', database, redis };
    if (body.status !== 'ok') throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    return body;
  }
}
