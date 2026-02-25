export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  data?: unknown
  source?: string
  stack?: string
}

export interface Command {
  name: string
  description: string
  usage: string
  handler: CommandHandler
  aliases?: string[]
  category?: string
  hidden?: boolean
}

export type CommandHandler = (args: string[], context: CommandContext) => string | void | Promise<string | void>

export interface CommandContext {
  console: { log: (message: string, level?: LogLevel) => void }
  log: (message: string, level?: LogLevel) => void
  getVariable: (name: string) => unknown
  setVariable: (name: string, value: unknown) => void
}

export interface WatchedVariable {
  name: string
  getter: () => unknown
  formatter?: (value: unknown) => string
  category?: string
}

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memory: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
  drawCalls: number
  triangles: number
  textures: number
  custom: Map<string, number>
}

export interface DebugConsoleConfig {
  maxLogEntries: number
  maxHistorySize: number
  defaultLogLevel: LogLevel
  showTimestamp: boolean
  showSource: boolean
  persistHistory: boolean
}

export const DEFAULT_DEBUG_CONSOLE_CONFIG: DebugConsoleConfig = {
  maxLogEntries: 1000,
  maxHistorySize: 100,
  defaultLogLevel: 'info',
  showTimestamp: true,
  showSource: true,
  persistHistory: true,
}

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
}
