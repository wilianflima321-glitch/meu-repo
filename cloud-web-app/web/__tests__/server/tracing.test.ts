import { afterEach, describe, expect, it } from 'vitest'

import {
  createTraceContext,
  getTraceSampleRate,
  parseTraceparent,
  shouldSampleTrace,
  toTraceparent,
  traceHeaders,
  withTraceSpan,
} from '@/lib/observability/tracing'

describe('observability tracing helpers', () => {
  afterEach(() => {
    delete process.env.AETHEL_TRACE_SAMPLE_RATE
    delete process.env.OTEL_TRACES_SAMPLER_ARG
  })

  it('parses and continues W3C traceparent headers without reusing the parent span id', () => {
    const parent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
    const parsed = parseTraceparent(parent)

    expect(parsed).toMatchObject({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      parentSpanId: '00f067aa0ba902b7',
      sampled: true,
    })
    expect(parsed?.spanId).toMatch(/^[0-9a-f]{16}$/)
    expect(parsed?.spanId).not.toBe('00f067aa0ba902b7')
  })

  it('rejects invalid or all-zero trace headers', () => {
    expect(parseTraceparent('bad-header')).toBeNull()
    expect(parseTraceparent('00-00000000000000000000000000000000-00f067aa0ba902b7-01')).toBeNull()
    expect(parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01')).toBeNull()
  })

  it('creates support-friendly trace response headers', () => {
    const context = createTraceContext()
    const headers = traceHeaders(context)

    expect(context.traceId).toMatch(/^[0-9a-f]{32}$/)
    expect(context.spanId).toMatch(/^[0-9a-f]{16}$/)
    expect(headers.traceparent).toBe(toTraceparent(context))
    expect(headers['x-aethel-trace-id']).toBe(context.traceId)
    expect(headers['x-aethel-span-id']).toBe(context.spanId)
  })

  it('clamps sample rate config and makes deterministic sample decisions', () => {
    process.env.AETHEL_TRACE_SAMPLE_RATE = '2'
    expect(getTraceSampleRate()).toBe(1)
    process.env.AETHEL_TRACE_SAMPLE_RATE = '-1'
    expect(getTraceSampleRate()).toBe(0)
    process.env.AETHEL_TRACE_SAMPLE_RATE = '0.25'
    expect(getTraceSampleRate()).toBe(0.25)
    expect(shouldSampleTrace(0.2)).toBe(true)
    expect(shouldSampleTrace(0.3)).toBe(false)
  })

  it('wraps async work with a span and rethrows failures for callers to handle', async () => {
    const ok = await withTraceSpan('test.ok', async (span) => span.context.traceId)
    expect(ok).toMatch(/^[0-9a-f]{32}$/)

    await expect(
      withTraceSpan('test.error', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
  })
})
