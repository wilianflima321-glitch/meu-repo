export interface RedisLike {
  get(key: string): Promise<string | null>
  setex(key: string, ttl: number, value: string): Promise<unknown>
  del(...keys: string[]): Promise<number>
  keys(pattern: string): Promise<string[]>
  smembers(key: string): Promise<string[]>
  sadd(key: string, value: string): Promise<unknown>
  exists(key: string): Promise<number>
  expire(key: string, ttl: number): Promise<number>
  incrby(key: string, amount: number): Promise<number>
  zadd(key: string, score: number, member: string): Promise<number>
  zcard(key: string): Promise<number>
  zrevrange(key: string, start: number, stop: number): Promise<string[]>
  dbsize(): Promise<number>
  info(section: string): Promise<string>
  ping(): Promise<unknown>
  connect(): Promise<void>
  quit(): Promise<void>
  on(event: 'connect' | 'close', callback: () => void): void
  on(event: 'error', callback: (error: Error) => void): void
}

export type IORedisConstructor = new (options: Record<string, unknown>) => RedisLike
export type AsyncCacheable = (...args: unknown[]) => Promise<unknown>

export interface CacheConfig {
  host: string
  port: number
  password?: string
  keyPrefix: string
  defaultTTL: number
  maxMemoryFallback: number
}

export interface CacheEntry<T = unknown> {
  value: T
  ttl: number
  createdAt: number
  tags?: string[]
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  size: number
  memoryUsage: number
  isRedisConnected: boolean
}

export interface CacheOptions {
  ttl?: number
  tags?: string[]
}
