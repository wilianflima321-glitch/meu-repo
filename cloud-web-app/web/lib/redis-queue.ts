/**
 * Redis Queue Client (sem keyPrefix)
 *
 * Usado para filas (ex.: build-queue) e estados operacionais (ex.: export:${id}).
 *
 * Observação: diferente do cache (redis-cache.ts), este client NÃO usa keyPrefix,
 * pois as listas/filas precisam de chaves estáveis e compartilhadas por workers.
 */

import type Redis from 'ioredis';

let clientPromise: Promise<Redis> | null = null;

async function loadIORedis(): Promise<typeof Redis> {
  try {
    const loadModule = new Function('return import("ioredis")') as () => Promise<typeof import('ioredis')>;
    return (await loadModule()).default;
  } catch {
    throw new Error('Missing dependency: ioredis. Install with `npm i ioredis` (cloud-web-app/web).');
  }
}

export async function getQueueRedis(): Promise<Redis> {
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    if (process.env.SKIP_REDIS === 'true') {
      throw new Error('Redis is disabled (SKIP_REDIS=true)');
    }

    const IORedis = await loadIORedis();

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      return new IORedis(redisUrl, { maxRetriesPerRequest: null });
    }

    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    return new IORedis({ host, port, password, maxRetriesPerRequest: null });
  })();

  return clientPromise;
}
