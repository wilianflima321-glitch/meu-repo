import { createComponentLogger, logger } from '@/lib/observability/logger'
import { MemoryCache } from './redis-cache-memory'
import { redisCacheConfig as config } from './redis-cache.config'
import { createCachedDecorator } from './redis-cache-decorator'
import { loadIORedis } from './redis-cache-loader'
import type { CacheOptions, CacheStats, RedisLike } from './redis-cache.types'
export type { AsyncCacheable, CacheConfig, CacheEntry, CacheOptions, CacheStats, RedisLike } from './redis-cache.types'

const log = createComponentLogger('redis-cache')

// ============================================================================
// CLASSE PRINCIPAL: REDIS CACHE
// ============================================================================

class RedisCache {
  private redis: RedisLike | null = null;
  private fallback: MemoryCache;
  private fallbackSortedSets: Map<string, Array<{ score: number; value: string }>> = new Map();
  private isConnected = false;
  private connectAttempted = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    memoryUsage: 0,
    isRedisConnected: false,
  };

  constructor() {
    this.fallback = new MemoryCache(config.maxMemoryFallback);
  }

  /**
   * Conecta ao Redis (lazy)
   */
  private async connect(): Promise<void> {
    if (this.connectAttempted) return;
    this.connectAttempted = true;

    if (process.env.SKIP_REDIS === 'true') {
      log.info('[RedisCache] Redis disabled, using memory fallback');
      return;
    }

    const IORedis = await loadIORedis();
    if (!IORedis) {
      log.info('[RedisCache] ioredis not available, using memory fallback');
      return;
    }

    try {
      this.redis = new IORedis({
        host: config.host,
        port: config.port,
        password: config.password,
        keyPrefix: config.keyPrefix,
        retryStrategy: (times: number) => {
          if (times > 3) {
            log.info('[RedisCache] Max retries reached, using memory fallback');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        this.stats.isRedisConnected = true;
        log.info('[RedisCache] Connected to Redis');
      });

      this.redis.on('error', (error: Error) => {
        logger.error('[RedisCache] Redis error:', error.message);
        this.isConnected = false;
        this.stats.isRedisConnected = false;
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        this.stats.isRedisConnected = false;
        log.info('[RedisCache] Redis connection closed');
      });

      // Tenta conectar
      await this.redis.connect().catch((err: Error) => {
        logger.error('[RedisCache] Failed to connect:', err.message);
      });

    } catch (error) {
      logger.error('[RedisCache] Failed to initialize:', error);
    }
  }

  /**
   * Obtém valor do cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    await this.connect();

    try {
      let value: string | null;

      if (this.isConnected && this.redis) {
        value = await this.redis.get(key);
      } else {
        value = await this.fallback.get(key);
      }

      if (value) {
        this.stats.hits++;
        return JSON.parse(value) as T;
      }

      this.stats.misses++;
      return null;

    } catch (error) {
      this.stats.misses++;
      logger.error('[RedisCache] Get error:', error);
      return null;
    }
  }

  /**
   * Define valor no cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    await this.connect();

    try {
      const ttl = options?.ttl || config.defaultTTL;
      const serialized = JSON.stringify(value);

      if (this.isConnected && this.redis) {
        await this.redis.setex(key, ttl, serialized);

        // Se tem tags, adiciona ao set de tags
        if (options?.tags) {
          for (const tag of options.tags) {
            await this.redis.sadd(`tag:${tag}`, key);
          }
        }
      } else {
        await this.fallback.set(key, serialized, ttl);
      }

      this.stats.sets++;
      return true;

    } catch (error) {
      logger.error('[RedisCache] Set error:', error);
      return false;
    }
  }

  /**
   * Remove valor do cache
   */
  async delete(key: string): Promise<boolean> {
    await this.connect();

    try {
      if (this.isConnected && this.redis) {
        await this.redis.del(key);
      } else {
        await this.fallback.delete(key);
      }

      this.stats.deletes++;
      return true;

    } catch (error) {
      logger.error('[RedisCache] Delete error:', error);
      return false;
    }
  }

  /**
   * Remove múltiplas chaves por pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    await this.connect();

    try {
      let count = 0;

      if (this.isConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          // Remove o prefixo para o del funcionar
          const keysWithoutPrefix = keys.map((k: string) => k.replace(config.keyPrefix, ''));
          count = await this.redis.del(...keysWithoutPrefix);
        }
      } else {
        const keys = await this.fallback.keys(pattern);
        for (const key of keys) {
          await this.fallback.delete(key);
          count++;
        }
      }

      this.stats.deletes += count;
      return count;

    } catch (error) {
      logger.error('[RedisCache] DeletePattern error:', error);
      return 0;
    }
  }

  /**
   * Sorted set: adiciona membro com score
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    await this.connect();

    try {
      if (this.isConnected && this.redis) {
        return await this.redis.zadd(key, score, member);
      }

      const items = this.fallbackSortedSets.get(key) || [];
      const existingIndex = items.findIndex((item) => item.value === member);
      if (existingIndex >= 0) {
        items.splice(existingIndex, 1);
      }
      items.push({ score, value: member });
      items.sort((a, b) => a.score - b.score);
      this.fallbackSortedSets.set(key, items);
      return 1;
    } catch (error) {
      logger.error('[RedisCache] ZADD error:', error);
      return 0;
    }
  }

  /**
   * Sorted set: retorna range reverso
   */
  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    await this.connect();

    try {
      if (this.isConnected && this.redis) {
        return await this.redis.zrevrange(key, start, stop);
      }

      const items = this.fallbackSortedSets.get(key) || [];
      const sorted = [...items].sort((a, b) => b.score - a.score);
      return sorted.slice(start, stop + 1).map((item) => item.value);
    } catch (error) {
      logger.error('[RedisCache] ZREVRANGE error:', error);
      return [];
    }
  }

  /**
   * Sorted set: conta membros
   */
  async zcard(key: string): Promise<number> {
    await this.connect();

    try {
      if (this.isConnected && this.redis) {
        return await this.redis.zcard(key);
      }

      return (this.fallbackSortedSets.get(key) || []).length;
    } catch (error) {
      logger.error('[RedisCache] ZCARD error:', error);
      return 0;
    }
  }

  /**
   * Invalida cache por tag
   */
  async invalidateTag(tag: string): Promise<number> {
    try {
      if (this.isConnected && this.redis) {
        const keys = await this.redis.smembers(`tag:${tag}`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          await this.redis.del(`tag:${tag}`);
        }
        return keys.length;
      }
      return 0;
    } catch (error) {
      logger.error('[RedisCache] InvalidateTag error:', error);
      return 0;
    }
  }

  /**
   * Cache-aside pattern: get or set
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Tenta obter do cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Não está no cache, executa factory
    const value = await factory();

    // Salva no cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Verifica se chave existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (this.isConnected && this.redis) {
        return (await this.redis.exists(key)) === 1;
      }
      return (await this.fallback.get(key)) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Incrementa valor numérico
   */
  async increment(key: string, amount = 1): Promise<number> {
    try {
      if (this.isConnected && this.redis) {
        return await this.redis.incrby(key, amount);
      }

      // Fallback: get, increment, set
      const current = await this.fallback.get(key);
      const value = (current ? parseInt(current) : 0) + amount;
      await this.fallback.set(key, value.toString(), config.defaultTTL);
      return value;

    } catch (error) {
      logger.error('[RedisCache] Increment error:', error);
      return 0;
    }
  }

  /**
   * Define expiração de uma chave
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (this.isConnected && this.redis) {
        return (await this.redis.expire(key, ttl)) === 1;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Limpa todo o cache
   */
  async flush(): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        const keys = await this.redis.keys('*');
        if (keys.length > 0) {
          const keysWithoutPrefix = keys.map((k: string) => k.replace(config.keyPrefix, ''));
          await this.redis.del(...keysWithoutPrefix);
        }
      }
      await this.fallback.flush();

      log.info('[RedisCache] Cache flushed');
    } catch (error) {
      logger.error('[RedisCache] Flush error:', error);
    }
  }

  /**
   * Retorna estatísticas do cache
   */
  async getStats(): Promise<CacheStats> {
    try {
      if (this.isConnected && this.redis) {
        const info = await this.redis.info('memory');
        const memMatch = info.match(/used_memory:(\d+)/);
        this.stats.memoryUsage = memMatch ? parseInt(memMatch[1]) : 0;

        const keys = await this.redis.dbsize();
        this.stats.size = keys;
      } else {
        this.stats.size = this.fallback.getSize();
        this.stats.memoryUsage = this.fallback.getMemoryUsage();
      }

      return { ...this.stats };
    } catch {
      return { ...this.stats };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();

    try {
      if (this.isConnected && this.redis) {
        await this.redis.ping();
      }
      return {
        healthy: true,
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
      };
    }
  }

  /**
   * Fecha conexão
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

const globalForCache = globalThis as unknown as {
  redisCache: RedisCache | undefined;
};

export const cache = globalForCache.redisCache ?? new RedisCache();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.redisCache = cache;
}

export { CacheKeys } from './redis-cache-keys'

// ============================================================================
// DECORATORS / HOC PARA CACHING
// ============================================================================

export const cached = createCachedDecorator(cache)

// ============================================================================
// EXPORTS
// ============================================================================

export default cache;
