import { logger, type LogContext } from '@/lib/observability/logger'

export type TraceStatus = 'ok' | 'error' | 'cancelled'

export type TraceContext = {
  traceId: string
  spanId: string
  parentSpanId?: string
  sampled: boolean
}

export type TraceSpan = {
  name: string
  context: TraceContext
  startedAt: number
  attributes: Record<string, unknown>
  end: (status?: TraceStatus, extra?: Record<string, unknown>) => { durationMs: number; context: TraceContext }
}

type ObservabilityInitOptions = {
  serviceName?: string
  runtime?: 'nodejs' | 'edge' | 'browser' | 'worker'
}

const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i
const globalState = globalThis as typeof globalThis & {
  __aethelObservabilityInitialized?: boolean
}

export function initObservability(options: ObservabilityInitOptions = {}) {
  if (globalState.__aethelObservabilityInitialized) return { initialized: false }
  globalState.__aethelObservabilityInitialized = true

  logger.info('observability.initialized', {
    component: 'observability',
    service: options.serviceName || process.env.OTEL_SERVICE_NAME || 'aethel-engine',
    runtime: options.runtime || 'nodejs',
    otelCompatible: true,
    tracePropagation: 'w3c-traceparent',
  })

  return { initialized: true }
}

export function getTraceSampleRate() {
  const raw = Number(process.env.AETHEL_TRACE_SAMPLE_RATE ?? process.env.OTEL_TRACES_SAMPLER_ARG ?? '1')
  if (!Number.isFinite(raw)) return 1
  return Math.min(1, Math.max(0, raw))
}

export function shouldSampleTrace(seed = Math.random()) {
  return seed <= getTraceSampleRate()
}

export function parseTraceparent(header: string | null | undefined): TraceContext | null {
  if (!header) return null
  const match = header.trim().match(TRACEPARENT_RE)
  if (!match) return null

  const [, traceId, spanId, flags] = match
  if (traceId === '00000000000000000000000000000000') return null
  if (spanId === '0000000000000000') return null

  return {
    traceId: traceId.toLowerCase(),
    spanId: createSpanId(),
    parentSpanId: spanId.toLowerCase(),
    sampled: (Number.parseInt(flags, 16) & 1) === 1,
  }
}

export function createTraceContext(parent?: string | TraceContext | null): TraceContext {
  if (typeof parent === 'string') {
    const parsed = parseTraceparent(parent)
    if (parsed) return parsed
  }

  if (parent && typeof parent === 'object') {
    return {
      traceId: parent.traceId,
      spanId: createSpanId(),
      parentSpanId: parent.spanId,
      sampled: parent.sampled,
    }
  }

  return {
    traceId: createTraceId(),
    spanId: createSpanId(),
    sampled: shouldSampleTrace(),
  }
}

export function toTraceparent(context: TraceContext) {
  const flags = context.sampled ? '01' : '00'
  return `00-${context.traceId}-${context.spanId}-${flags}`
}

export function traceHeaders(context: TraceContext) {
  return {
    traceparent: toTraceparent(context),
    'x-aethel-trace-id': context.traceId,
    'x-aethel-span-id': context.spanId,
  }
}

export function startTraceSpan(
  name: string,
  parent?: string | TraceContext | null,
  attributes: Record<string, unknown> = {},
): TraceSpan {
  const context = createTraceContext(parent)
  const startedAt = Date.now()

  logger.debug('trace.span.start', buildLogContext(context, name, attributes))

  return {
    name,
    context,
    startedAt,
    attributes,
    end: (status: TraceStatus = 'ok', extra: Record<string, unknown> = {}) => {
      const durationMs = Date.now() - startedAt
      const logContext = buildLogContext(context, name, {
        ...attributes,
        ...extra,
        status,
        durationMs,
      })

      if (status === 'error') {
        logger.error('trace.span.end', logContext)
      } else if (status === 'cancelled') {
        logger.warn('trace.span.end', logContext)
      } else {
        logger.info('trace.span.end', logContext)
      }

      return { durationMs, context }
    },
  }
}

export async function withTraceSpan<T>(
  name: string,
  run: (span: TraceSpan) => Promise<T>,
  options: { parent?: string | TraceContext | null; attributes?: Record<string, unknown> } = {},
): Promise<T> {
  const span = startTraceSpan(name, options.parent, options.attributes)
  try {
    const result = await run(span)
    span.end('ok')
    return result
  } catch (error) {
    span.end('error', { error: normalizeError(error) })
    throw error
  }
}

function buildLogContext(context: TraceContext, name: string, attributes: Record<string, unknown>): LogContext {
  return {
    component: 'tracing',
    action: name,
    traceId: context.traceId,
    spanId: context.spanId,
    parentSpanId: context.parentSpanId,
    sampled: context.sampled,
    ...attributes,
  }
}

function createTraceId(): string {
  return createHexId(32)
}

function createSpanId(): string {
  return createHexId(16)
}

function createHexId(length: number): string {
  const bytes = new Uint8Array(length / 2)
  fillRandomBytes(bytes)
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return /^0+$/.test(hex) ? createHexId(length) : hex
}

function fillRandomBytes(bytes: Uint8Array) {
  const cryptoLike = globalThis.crypto
  if (cryptoLike?.getRandomValues) {
    cryptoLike.getRandomValues(bytes)
    return
  }

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256)
  }
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack }
  }
  return { message: String(error) }
}
