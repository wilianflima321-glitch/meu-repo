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
    writeToStream(process.stderr, output, entry.level);
  } else if (entry.level === 'warn') {
    writeToStream(process.stderr, output, entry.level);
  } else {
    writeToStream(process.stdout, output, entry.level);
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
  trace(message: unknown, ...args: unknown[]): void;
  debug(message: unknown, ...args: unknown[]): void;
  info(message: unknown, ...args: unknown[]): void;
  warn(message: unknown, ...args: unknown[]): void;
  error(message: unknown, ...args: unknown[]): void;
  fatal(message: unknown, ...args: unknown[]): void;
  child(context: LogContext): Logger;
  timed(msg: string, context?: LogContext): () => void;
}

function createLogger(baseContext: LogContext = {}): Logger {
  const log = (level: LogLevel, msg: string, context?: LogContext, extra?: Record<string, unknown>) => {
    if (!shouldLog(level)) return;
    const merged = { ...baseContext, ...context };
    writeLog(createLogEntry(level, msg, merged, extra));
  };

  const parseLogArgs = (args: unknown[]): { msg: string; context?: LogContext; extra?: Record<string, unknown> } => {
    const [message, ...rest] = args;
    const msg = typeof message === 'string' ? message : stringifyValue(message);

    if (rest.length === 0) {
      return { msg };
    }

    if (rest.length === 1) {
      const single = rest[0];
      if (isLogContext(single)) {
        return { msg, context: single };
      }
      if (single instanceof Error) {
        return { msg, extra: { err: normalizeError(single) } };
      }
      return { msg, extra: { data: normalizeExtra(single) } };
    }

    const maybeContext = rest[rest.length - 1];
    const payload = rest.slice(0, maybeContext && isLogContext(maybeContext) ? -1 : rest.length);
    const extra: Record<string, unknown> = {};

    if (payload.length === 1) {
      const item = payload[0];
      if (item instanceof Error) {
        extra.err = normalizeError(item);
      } else {
        extra.data = normalizeExtra(item);
      }
    } else if (payload.length > 1) {
      extra.data = payload.map(normalizeExtra);
    }

    return {
      msg,
      context: maybeContext && isLogContext(maybeContext) ? maybeContext : undefined,
      extra: Object.keys(extra).length > 0 ? extra : undefined,
    };
  };

  return {
    trace: (...args) => {
      const parsed = parseLogArgs(args);
      log('trace', parsed.msg, parsed.context, parsed.extra);
    },
    debug: (...args) => {
      const parsed = parseLogArgs(args);
      log('debug', parsed.msg, parsed.context, parsed.extra);
    },
    info: (...args) => {
      const parsed = parseLogArgs(args);
      log('info', parsed.msg, parsed.context, parsed.extra);
    },
    warn: (...args) => {
      const parsed = parseLogArgs(args);
      log('warn', parsed.msg, parsed.context, parsed.extra);
    },
    error: (...args) => {
      const parsed = parseLogArgs(args);
      log('error', parsed.msg, parsed.context, parsed.extra);
    },
    fatal: (...args) => {
      const parsed = parseLogArgs(args);
      log('fatal', parsed.msg, parsed.context, parsed.extra);
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

function writeToStream(stream: NodeJS.WriteStream | undefined, output: string, level: LogLevel): void {
  if (stream?.write) {
    stream.write(`${output}\n`);
    return;
  }

  const consoleLike = Reflect.get(globalThis, 'console') as
    | { log?(message?: unknown): void; warn?(message?: unknown): void; error?(message?: unknown): void }
    | undefined;

  if (level === 'warn') {
    consoleLike?.warn?.(output);
    return;
  }

  if (LOG_LEVELS[level] >= LOG_LEVELS.error) {
    consoleLike?.error?.(output);
    return;
  }

  consoleLike?.log?.(output);
}

function normalizeError(err: Error | unknown): { message: string; stack?: string; code?: string } {
  if (err instanceof Error) {
    const code = (err as Error & { code?: string }).code;
    return { message: err.message, stack: err.stack, code };
  }
  return { message: String(err) };
}

function normalizeExtra(value: unknown): unknown {
  if (value instanceof Error) {
    return normalizeError(value);
  }
  return value;
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (typeof value === 'number' || typeof value === 'boolean' || value == null) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function isLogContext(value: unknown): value is LogContext {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Error) {
    return false;
  }

  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.length === 0) return true;

  return keys.some((key) =>
    [
      'requestId',
      'userId',
      'sessionId',
      'traceId',
      'spanId',
      'service',
      'component',
      'action',
    ].includes(key)
  );
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
