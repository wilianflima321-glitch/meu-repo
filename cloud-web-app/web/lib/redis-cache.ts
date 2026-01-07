/**
 * Redis Cache Layer - Cache Distribuído
 * 
 * Sistema de cache distribuído para:
 * - Sessions de usuário
 * - Respostas de API
 * - Dados frequentemente acessados
 * - Rate limiting global
 * 
 * Suporta fallback para cache in-memory se Redis não estiver disponível.
 */

import IORedis, { Redis } from 'ioredis';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  keyPrefix: string;
  defaultTTL: number; // segundos
  maxMemoryFallback: number; // bytes
}

const config: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  keyPrefix: 'aethel:cache:',
  defaultTTL: 3600, // 1 hour
  maxMemoryFallback: 100 * 1024 * 1024, // 100MB
};

// ============================================================================
// TIPOS
// ============================================================================

export interface CacheEntry<T = unknown> {
  value: T;
  ttl: number;
  createdAt: number;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  memoryUsage: number;
  isRedisConnected: boolean;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

// ============================================================================
// FALLBACK IN-MEMORY CACHE
// ============================================================================

class MemoryCache {
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private memoryUsage = 0;
  
  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  async set(key: string, value: string, ttl: number): Promise<void> {
    // Limpa entradas expiradas se memória estiver alta
    if (this.memoryUsage > config.maxMemoryFallback * 0.9) {
      this.cleanup();
    }
    
    const existing = this.cache.get(key);
    if (existing) {
      this.memoryUsage -= existing.value.length;
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
    this.memoryUsage += value.length;
  }
  
  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      this.memoryUsage -= entry.value.length;
      return this.cache.delete(key);
    }
    return false;
  }
  
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.cache.keys()).filter(k => regex.test(k));
  }
  
  async flush(): Promise<void> {
    this.cache.clear();
    this.memoryUsage = 0;
  }
  
  getSize(): number {
    return this.cache.size;
  }
  
  getMemoryUsage(): number {
    return this.memoryUsage;
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.delete(key);
      }
    }
  }
}

// ============================================================================
// CLASSE PRINCIPAL: REDIS CACHE
// ============================================================================

class RedisCache {
  private redis: Redis | null = null;
  private fallback: MemoryCache;
  private isConnected = false;
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
    this.fallback = new MemoryCache();
    this.connect();
  }
  
  /**
   * Conecta ao Redis
   */
  private connect(): void {
    if (process.env.SKIP_REDIS === 'true') {
      console.log('[RedisCache] Redis disabled, using memory fallback');
      return;
    }
    
    try {
      this.redis = new IORedis({
        host: config.host,
        port: config.port,
        password: config.password,
        keyPrefix: config.keyPrefix,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('[RedisCache] Max retries reached, using memory fallback');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });
      
      this.redis.on('connect', () => {
        this.isConnected = true;
        this.stats.isRedisConnected = true;
        console.log('[RedisCache] Connected to Redis');
      });
      
      this.redis.on('error', (error) => {
        console.error('[RedisCache] Redis error:', error.message);
        this.isConnected = false;
        this.stats.isRedisConnected = false;
      });
      
      this.redis.on('close', () => {
        this.isConnected = false;
        this.stats.isRedisConnected = false;
        console.log('[RedisCache] Redis connection closed');
      });
      
      // Tenta conectar
      this.redis.connect().catch((err) => {
        console.error('[RedisCache] Failed to connect:', err.message);
      });
      
    } catch (error) {
      console.error('[RedisCache] Failed to initialize:', error);
    }
  }
  
  /**
   * Obtém valor do cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
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
      console.error('[RedisCache] Get error:', error);
      return null;
    }
  }
  
  /**
   * Define valor no cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
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
      console.error('[RedisCache] Set error:', error);
      return false;
    }
  }
  
  /**
   * Remove valor do cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.del(key);
      } else {
        await this.fallback.delete(key);
      }
      
      this.stats.deletes++;
      return true;
      
    } catch (error) {
      console.error('[RedisCache] Delete error:', error);
      return false;
    }
  }
  
  /**
   * Remove múltiplas chaves por pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      let count = 0;
      
      if (this.isConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          // Remove o prefixo para o del funcionar
          const keysWithoutPrefix = keys.map(k => k.replace(config.keyPrefix, ''));
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
      console.error('[RedisCache] DeletePattern error:', error);
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
      console.error('[RedisCache] InvalidateTag error:', error);
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
      console.error('[RedisCache] Increment error:', error);
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
          const keysWithoutPrefix = keys.map(k => k.replace(config.keyPrefix, ''));
          await this.redis.del(...keysWithoutPrefix);
        }
      }
      await this.fallback.flush();
      
      console.log('[RedisCache] Cache flushed');
    } catch (error) {
      console.error('[RedisCache] Flush error:', error);
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

// ============================================================================
// CACHE KEYS HELPERS
// ============================================================================

export const CacheKeys = {
  // Usuários
  user: (id: string) => `user:${id}`,
  userSession: (id: string) => `session:${id}`,
  userProjects: (id: string) => `user:${id}:projects`,
  
  // Projetos
  project: (id: string) => `project:${id}`,
  projectFiles: (id: string) => `project:${id}:files`,
  projectAssets: (id: string) => `project:${id}:assets`,
  
  // AI
  aiResponse: (hash: string) => `ai:response:${hash}`,
  aiEmbedding: (id: string) => `ai:embedding:${id}`,
  
  // Rate limiting
  rateLimit: (key: string) => `ratelimit:${key}`,
  
  // Marketplace
  marketplaceItem: (id: string) => `marketplace:${id}`,
  marketplaceFeatured: () => `marketplace:featured`,
  
  // Analytics
  analytics: (type: string, date: string) => `analytics:${type}:${date}`,
  
  // Config
  featureFlags: () => `config:feature_flags`,
  systemSettings: () => `config:system`,
};

// ============================================================================
// DECORATORS / HOC PARA CACHING
// ============================================================================

/**
 * Decorator para cachear resultado de função
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  keyGenerator: (...args: Parameters<T>) => string,
  options?: CacheOptions
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: Parameters<T>) {
      const key = keyGenerator(...args);
      
      // Tenta obter do cache
      const cached = await cache.get(key);
      if (cached !== null) {
        return cached;
      }
      
      // Executa método original
      const result = await originalMethod.apply(this, args);
      
      // Cacheia resultado
      await cache.set(key, result, options);
      
      return result;
    };
    
    return descriptor;
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default cache;
