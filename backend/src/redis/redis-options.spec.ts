import { redisOptionsFromUrl } from './redis-options';

describe('redisOptionsFromUrl (REDIS_URL → options ioredis)', () => {
  it('Upstash rediss:// : hôte, port, identifiants et TLS', () => {
    const o = redisOptionsFromUrl('rediss://default:AbC123@eu1-sharp-cat-12345.upstash.io:6379');
    expect(o).toMatchObject({
      host: 'eu1-sharp-cat-12345.upstash.io',
      port: 6379,
      username: 'default',
      password: 'AbC123',
      tls: { servername: 'eu1-sharp-cat-12345.upstash.io' },
    });
  });

  it('Upstash saisi en redis:// : TLS forcé (Upstash refuse les connexions sans TLS)', () => {
    const o = redisOptionsFromUrl('redis://default:pw@eu1-x.upstash.io:6379');
    expect(o.tls).toEqual({ servername: 'eu1-x.upstash.io' });
  });

  it('redis:// classique : décomposé (jamais de champ url ignoré → localhost)', () => {
    const o: Record<string, unknown> = redisOptionsFromUrl('redis://red-abc123:6379');
    expect(o.host).toBe('red-abc123');
    expect(o.port).toBe(6379);
    expect(o.tls).toBeUndefined();
    expect(o.url).toBeUndefined();
  });

  it('mot de passe encodé, port par défaut, base numérotée, espaces autour', () => {
    const o = redisOptionsFromUrl('  redis://:p%40ss@cache.example.com/2  ');
    expect(o).toMatchObject({ host: 'cache.example.com', port: 6379, password: 'p@ss', db: 2 });
  });

  it('options requises par Bull toujours présentes', () => {
    const o = redisOptionsFromUrl('redis://localhost:6379');
    expect(o).toMatchObject({ maxRetriesPerRequest: null, enableReadyCheck: false });
  });

  it('URL REST Upstash (https://) refusée avec un message clair', () => {
    expect(() => redisOptionsFromUrl('https://eu1-x.upstash.io')).toThrow(/redis:\/\/ ou rediss:\/\//);
  });
});
