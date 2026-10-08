import { HttpException } from '@nestjs/common';
import { HealthController } from './health.controller';

function make(dbOk: boolean | 'throw', redis: string | 'throw') {
  const db = { healthCheck: async () => { if (dbOk === 'throw') throw new Error('x'); return dbOk; } };
  const queue = { client: { ping: async () => { if (redis === 'throw') throw new Error('x'); return redis; } } };
  return new HealthController(db as any, queue as any);
}

describe('HealthController', () => {
  it('200 ok quand base et Redis répondent', async () => {
    await expect(make(true, 'PONG').check()).resolves.toEqual({ status: 'ok', database: true, redis: true });
  });

  it('503 si la base est indisponible', async () => {
    const err = await make(false, 'PONG').check().catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(503);
    expect((err as HttpException).getResponse()).toMatchObject({ database: false, redis: true });
  });

  it('503 si Redis lève une erreur', async () => {
    const err = await make(true, 'throw').check().catch((e) => e);
    expect((err as HttpException).getStatus()).toBe(503);
  });
});
