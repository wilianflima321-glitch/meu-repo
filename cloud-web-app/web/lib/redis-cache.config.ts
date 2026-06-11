import type { CacheConfig } from './redis-cache.types'

export const redisCacheConfig: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  keyPrefix: 'aethel:cache:',
  defaultTTL: 3600,
  maxMemoryFallback: 100 * 1024 * 1024,
}
