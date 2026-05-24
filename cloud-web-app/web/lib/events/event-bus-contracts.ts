export type EventPriority = 'highest' | 'high' | 'normal' | 'low' | 'lowest'

export interface EventData {
  type: string
  timestamp: number
  payload: unknown
  source?: string
  propagate?: boolean
}

export interface EventSubscription {
  id: string
  eventType: string
  handler: EventHandler
  priority: EventPriority
  once: boolean
  filter?: EventFilter
  context?: unknown
}

export type EventHandler<T = unknown> = (event: EventData & { payload: T }) => void | Promise<void>
export type EventFilter = (event: EventData) => boolean
export type EventMiddleware = (event: EventData, next: () => void) => void | Promise<void>

export interface EventBusConfig {
  maxHistorySize: number
  enableHistory: boolean
  enableLogging: boolean
  asyncHandlers: boolean
  throwOnError: boolean
}
