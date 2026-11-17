/**
 * Options ioredis à partir de REDIS_URL.
 * ioredis n'accepte pas de champ `url` dans ses options : il faut décomposer l'adresse,
 * sinon il se connecte silencieusement à localhost:6379.
 * - `rediss://` → TLS (Upstash, Render Key Value externe…)
 * - `redis://`  → sans TLS, sauf hôte Upstash (qui exige TLS sur tous ses ports)
 */
export function redisOptionsFromUrl(redisUrl: string) {
  const u = new URL(redisUrl.trim());
  if (u.protocol !== 'redis:' && u.protocol !== 'rediss:') {
    throw new Error(`REDIS_URL doit commencer par redis:// ou rediss:// (reçu : ${u.protocol}//)`);
  }
  const host = u.hostname;
  const tls = u.protocol === 'rediss:' || host.endsWith('.upstash.io');
  const db = u.pathname && u.pathname !== '/' ? Number(u.pathname.slice(1)) : undefined;

  return {
    host,
    port: u.port ? Number(u.port) : 6379,
    ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    ...(db !== undefined && !Number.isNaN(db) ? { db } : {}),
    ...(tls ? { tls: { servername: host } } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10000,
  };
}
