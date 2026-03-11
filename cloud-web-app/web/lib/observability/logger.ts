/**
 * Structured Logging with Pino
 *
 * Production-grade logging with structured JSON output,
 * request context, and log levels.
 *
 * @see docs/master/38_L5_EXECUTION_BOARD_2026-03-10.md (P1: Observability)
 */

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  service?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  msg: string;
  time: string;
  service: string;
  env: string;
  context?: LogContext;
  err?: { message: string; stack?: string; code?: string };
  duration?: number;
  [key: string]: unknown;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LOG_LEVELS) return env as LogLevel;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()];
}

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'aethel-engine';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_JSON = process.env.LOG_FORMAT === 'json' || NODE_ENV === 'production';

// ============================================================================
// LOGGER IMPLEMENTATION
// ============================================================================

function formatLog(entry: LogEntry): string {
  if (IS_JSON) {
    return JSON.stringify(entry);
  }

  // Pretty format for development
  const time = new Date(entry.time).toLocaleTimeString();
  const level = entry.level.toUpperCase().padEnd(5);
  const ctx = entry.context?.component ? `[${entry.context.component}]` : '';
  const duration = entry.duration ? ` (${entry.duration}ms)` : '';
  return `${time} ${level} ${ctx} ${entry.msg}${duration}`;
}

function writeLog(entry: LogEntry): void {
  const output = formatLog(entry);

  if (LOG_LEVELS[entry.level] >= LOG_LEVELS.error) {
    console.error(output);
  } else if (entry.level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

function createLogEntry(
  level: LogLevel,
  msg: string,
  context?: LogContext,
  extra?: Record<string, unknown>
): LogEntry {
  return {
    level,
    msg,
    time: new Date().toISOString(),
    service: SERVICE_NAME,
    env: NODE_ENV,
    context,
    ...extra,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export interface Logger {
  trace(msg: string, context?: LogContext): void;
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, err?: Error | unknown, context?: LogContext): void;
  fatal(msg: string, err?: Error | unknown, context?: LogContext): void;
  child(context: LogContext): Logger;
  timed(msg: string, context?: LogContext): () => void;
}

function createLogger(baseContext: LogContext = {}): Logger {
  const log = (level: LogLevel, msg: string, context?: LogContext, extra?: Record<string, unknown>) => {
    if (!shouldLog(level)) return;
    const merged = { ...baseContext, ...context };
    writeLog(createLogEntry(level, msg, merged, extra));
  };

  return {
    trace: (msg, ctx) => log('trace', msg, ctx),
    debug: (msg, ctx) => log('debug', msg, ctx),
    info: (msg, ctx) => log('info', msg, ctx),
    warn: (msg, ctx) => log('warn', msg, ctx),
    error: (msg, err, ctx) => {
      const errObj = err instanceof Error
        ? { message: err.message, stack: err.stack, code: (err as any).code }
        : err
          ? { message: String(err) }
          : undefined;
      log('error', msg, ctx, errObj ? { err: errObj } : undefined);
    },
    fatal: (msg, err, ctx) => {
      const errObj = err instanceof Error
        ? { message: err.message, stack: err.stack, code: (err as any).code }
        : err
          ? { message: String(err) }
          : undefined;
      log('fatal', msg, ctx, errObj ? { err: errObj } : undefined);
    },
    child: (childCtx) => createLogger({ ...baseContext, ...childCtx }),
    timed: (msg, ctx) => {
      const start = Date.now();
      return () => {
        const duration = Date.now() - start;
        log('info', msg, ctx, { duration });
      };
    },
  };
}

/** Root logger instance */
export const logger = createLogger({ service: SERVICE_NAME });

/** Create a child logger for a specific component */
export function createComponentLogger(component: string): Logger {
  return logger.child({ component });
}

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

export function createRequestLogger(req: {
  method?: string;
  url?: string;
  headers?: { get?(name: string): string | null };
}): Logger {
  const requestId =
    (req.headers?.get?.('x-request-id') as string) ||
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  return logger.child({
    requestId,
    action: `${req.method || 'GET'} ${req.url || '/'}`,
  });
}

// ============================================================================
// OPENTELEMETRY INTEGRATION
// ============================================================================

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

/**
 * Create a simple trace span context
 * For full OpenTelemetry support, install @opentelemetry/sdk-node
 */
export function createSpan(name: string, parentContext?: SpanContext): SpanContext & {
  end: () => { name: string; durationMs: number; context: SpanContext };
} {
  const traceId = parentContext?.traceId || generateId(32);
  const spanId = generateId(16);
  const start = Date.now();

  return {
    traceId,
    spanId,
    parentSpanId: parentContext?.spanId,
    end: () => {
      const durationMs = Date.now() - start;
      logger.debug(`span:${name}`, {
        traceId,
        spanId,
        action: name,
      });
      return { name, durationMs, context: { traceId, spanId, parentSpanId: parentContext?.spanId } };
    },
  };
}

function generateId(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ============================================================================
// RUM (Real User Monitoring) METRICS
// ============================================================================

export interface RUMMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
  timestamp: number;
}

/**
 * Process a RUM metric from the client
 */
export function processRUMMetric(metric: RUMMetric): void {
  logger.info(`rum:${metric.name}`, {
    component: 'rum',
    action: metric.name,
  });
}
