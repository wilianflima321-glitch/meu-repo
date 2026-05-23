export const SOURCE_QUEUE = 'build-queue'
export const PROCESSING_QUEUE = 'build-queue:processing'
export const DELAYED_QUEUE = 'build-queue:delayed'
export const PROCESSING_TS_PREFIX = 'build-queue:processing:ts:'
export const METRICS_KEY = 'build-queue:metrics'

export const MAX_ATTEMPTS = parseInt(process.env.BUILD_QUEUE_MAX_ATTEMPTS || '3', 10)
export const PROCESSING_TIMEOUT_MS = parseInt(process.env.BUILD_QUEUE_PROCESSING_TIMEOUT_MS || `${15 * 60 * 1000}`, 10)
export const REAPER_INTERVAL_MS = parseInt(process.env.BUILD_QUEUE_REAPER_INTERVAL_MS || `${30 * 1000}`, 10)
export const DELAY_BASE_MS = parseInt(process.env.BUILD_QUEUE_RETRY_BASE_DELAY_MS || `${5 * 1000}`, 10)

export type BuildQueueMessage = {
  type: string
  exportId?: string
  projectId?: string
  userId?: string
  platform?: string
  configuration?: string
  options?: Record<string, unknown> | null
  reservationId?: string
}

export type RedisClient = {
  hincrby(key: string, field: string, increment: number): Promise<number>
  hset(key: string, field: string, value: string): Promise<number>
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, ttlSecondsOrMs?: number): Promise<unknown>
  zadd(key: string, score: number, member: string): Promise<number>
  zrangebyscore(key: string, min: number, max: number, limitKeyword?: 'LIMIT', offset?: number, count?: number): Promise<string[]>
  zrem(key: string, member: string): Promise<number>
  lpush(key: string, value: string): Promise<number>
  del(key: string): Promise<number>
  lrange(key: string, start: number, stop: number): Promise<string[]>
  lrem(key: string, count: number, value: string): Promise<number>
  brpoplpush(source: string, destination: string, timeoutSeconds: number): Promise<string | null>
  llen(key: string): Promise<number>
  quit(): Promise<unknown>
  on(event: 'connect', listener: () => void): void
  on(event: 'error', listener: (error: unknown) => void): void
}

export type RedisConstructor = new (...args: unknown[]) => RedisClient

export type ExportState = Record<string, unknown> & {
  logs?: string[]
  attempts?: number
  progress?: number
}

export type WorkerMetric = {
  status: 'success' | 'failed'
  durationMs?: number
  backlog?: number
}

export type SourceManifest = {
  includedFiles: number
  includedBytes: number
  skippedFiles: number
  skippedBytes: number
  warnings: string[]
}

export type AssetManifest = {
  projectId: string
  generatedAt: string
  limits: {
    maxTotalBytes: number
    maxSingleBytes: number
  }
  totals: {
    includedFiles: number
    includedBytes: number
    skippedFiles: number
    skippedBytes: number
  }
  dbAssets: Array<{
    id: string
    name: string
    url: string | null
    storagePath?: string | null
    type: string
    size: number
    mimeType?: string | null
    downloadUrl?: string | null
    downloadExpiresAt?: string | null
  }>
  localFiles: Array<{
    path: string
    size: number
    sha256: string
    lods?: Array<{ path: string; ratio: number; size: number; sha256: string }>
  }>
  warnings: string[]
}
