export interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latency?: number
  uptime?: number
  lastCheck: string
  details?: string
}

export interface ResourceMetrics {
  cpu: { usage: number; cores: number }
  memory: { used: number; total: number; percentage: number }
  disk: { used: number; total: number; percentage: number }
  network: { in: number; out: number }
}

export interface QueueMetrics {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  isPaused: boolean
}

export interface InfrastructureData {
  services: ServiceHealth[]
  resources: ResourceMetrics
  queues: QueueMetrics[]
  requestsPerMinute: number
  activeConnections: number
  errorRate: number
  dbConnections: { active: number; idle: number; max: number }
  dbQueryTime: number
  cacheHitRate: number
  cacheMemory: number
}
