import { logger } from '@/lib/observability/logger'
import type { IORedisConstructor } from './redis-cache.types'

let IORedisModule: IORedisConstructor | null = null
let loadAttempted = false

export async function loadIORedis(): Promise<IORedisConstructor | null> {
  if (loadAttempted) return IORedisModule
  loadAttempted = true

  try {
    IORedisModule = await eval('import("ioredis")').then((module: unknown) => {
      const candidate = module as { default?: IORedisConstructor }
      return candidate.default ?? (module as IORedisConstructor)
    })
    return IORedisModule
  } catch {
    logger.warn('[RedisCache] ioredis not installed. Using in-memory fallback.')
    return null
  }
}
