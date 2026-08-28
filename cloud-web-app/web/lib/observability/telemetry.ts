/**
 * telemetry.ts  — Sprint V33
 *
 * OpenTelemetry-compatible distributed tracing and metrics for Aethel Engine.
 *
 * Provides:
 *   - Span / Trace abstraction compatible with OpenTelemetry SDK (browser & server)
 *   - Metric counters, histograms, and gauges
 *   - Automatic Next.js API route instrumentation
 *   - PagerDuty / Slack alert webhook integration
 *   - Kill switch feature flag transport (see kill-switch/route.ts)
 *
 * In production, spans are exported to a collector via OTLP/HTTP.
 * In development, they are logged via the structured component logger.
 *
 * Usage:
 *   const span = telemetry.startSpan('ai.generate', { prompt: '...' });
 *   // ... do work ...
 *   span.end();
 *
 *   telemetry.counter('api.requests').add(1, { route: '/api/ai/chat' });
 */

import { createComponentLogger } from '@/lib/observability/logger'

const telemetryLog = createComponentLogger('telemetry');

// ---------------------------------------------------------------------------
// Span / Trace
// ---------------------------------------------------------------------------

export type SpanStatus = 'ok' | 'error' | 'unset';

export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

export interface Span {
  traceId: string;
  spanId: string;
  name: string;
  startTime: number;  // performance.now()
  endTime?: number;
  status: SpanStatus;
  attributes: SpanAttributes;
  error?: string;
  end(status?: SpanStatus, error?: Error): void;
  setAttribute(key: string, value: string | number | boolean): void;
}

export interface SpanExport {
  traceId: string;
  spanId: string;
  name: string;
  durationMs: number;
  status: SpanStatus;
  attributes: SpanAttributes;
  error?: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Metric types
// ---------------------------------------------------------------------------

export type MetricKind = 'counter' | 'gauge' | 'histogram';

export interface MetricValue {
  value: number;
  labels: SpanAttributes;
  timestamp: number;
}

class Metric {
  private values: MetricValue[] = [];
  constructor(readonly name: string, readonly kind: MetricKind) {}

  add(value: number, labels: SpanAttributes = {}): void {
    if (this.kind === 'counter') {
      this.values.push({ value, labels, timestamp: Date.now() });
    }
  }

  set(value: number, labels: SpanAttributes = {}): void {
    if (this.kind === 'gauge') {
      this.values = this.values.filter(
        (v) => JSON.stringify(v.labels) !== JSON.stringify(labels),
      );
      this.values.push({ value, labels, timestamp: Date.now() });
    }
  }

  record(value: number, labels: SpanAttributes = {}): void {
    this.values.push({ value, labels, timestamp: Date.now() });
  }

  collect(): MetricValue[] {
    const result = [...this.values];
    if (this.kind === 'counter') this.values = [];
    return result;
  }

  sum(): number { return this.values.reduce((s, v) => s + v.value, 0); }
  last(): number { return this.values[this.values.length - 1]?.value ?? 0; }
}

// ---------------------------------------------------------------------------
// Telemetry engine
// ---------------------------------------------------------------------------

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  /** OTLP collector URL (null = console only) */
  collectorUrl: string | null;
  /** Alert webhook for PagerDuty or Slack */
  alertWebhookUrl: string | null;
  /** Sampling rate 0..1 */
  samplingRate: number;
  batchIntervalMs: number;
}

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  serviceName: 'aethel-engine',
  serviceVersion: process.env.npm_package_version ?? '0.0.0',
  collectorUrl: process.env.OTLP_ENDPOINT ?? null,
  alertWebhookUrl: process.env.ALERT_WEBHOOK_URL ?? null,
  samplingRate: 1.0,
  batchIntervalMs: 10_000,
};

export class AethelTelemetry {
  private config: TelemetryConfig;
  private spans: SpanExport[] = [];
  private metrics = new Map<string, Metric>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_TELEMETRY_CONFIG, ...config };
    if (typeof window !== 'undefined' || typeof global !== 'undefined') {
      this.flushTimer = setInterval(() => this.flush(), this.config.batchIntervalMs);
    }
  }

  // ── Tracing ───────────────────────────────────────────────────────────────

  startSpan(name: string, attributes: SpanAttributes = {}): Span {
    const sample = Math.random() < this.config.samplingRate;
    const traceId = this.generateId(32);
    const spanId = this.generateId(16);
    const startTime = performance.now();
    const telemetry = this;

    const span: Span = {
      traceId,
      spanId,
      name,
      startTime,
      status: 'unset',
      attributes: { ...attributes, 'service.name': this.config.serviceName },
      end(status: SpanStatus = 'ok', error?: Error): void {
        this.endTime = performance.now();
        this.status = status;
        if (error) this.error = error.message;
        if (sample) {
          telemetry.spans.push({
            traceId: this.traceId,
            spanId: this.spanId,
            name: this.name,
            durationMs: this.endTime - startTime,
            status: this.status,
            attributes: this.attributes,
            error: this.error,
            timestamp: new Date().toISOString(),
          });
        }
      },
      setAttribute(key: string, value: string | number | boolean): void {
        this.attributes[key] = value;
      },
    };

    return span;
  }

  /** Wrap an async function in a span automatically */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes: SpanAttributes = {},
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    try {
      const result = await fn(span);
      span.end('ok');
      return result;
    } catch (err) {
      span.end('error', err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  counter(name: string): Metric {
    return this.getOrCreateMetric(name, 'counter');
  }

  gauge(name: string): Metric {
    return this.getOrCreateMetric(name, 'gauge');
  }

  histogram(name: string): Metric {
    return this.getOrCreateMetric(name, 'histogram');
  }

  private getOrCreateMetric(name: string, kind: MetricKind): Metric {
    let m = this.metrics.get(name);
    if (!m) { m = new Metric(name, kind); this.metrics.set(name, m); }
    return m;
  }

  // ── Alerting ──────────────────────────────────────────────────────────────

  async alert(severity: 'info' | 'warning' | 'critical', message: string, context?: SpanAttributes): Promise<void> {
    const payload = {
      service: this.config.serviceName,
      severity,
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    if (severity === 'critical') {
      telemetryLog.error(`[ALERT][CRITICAL] ${message}`, context);
    } else if (severity === 'warning') {
      telemetryLog.warn(`[ALERT][WARNING] ${message}`, context);
    } else {
      telemetryLog.info(`[ALERT][INFO] ${message}`, context);
    }

    if (this.config.alertWebhookUrl) {
      try {
        await fetch(this.config.alertWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            this.config.alertWebhookUrl.includes('pagerduty')
              ? { routing_key: process.env.PAGERDUTY_ROUTING_KEY ?? '', event_action: severity === 'critical' ? 'trigger' : 'acknowledge', payload }
              : { text: `*[${severity.toUpperCase()}]* ${message}\n\`\`\`${JSON.stringify(context, null, 2)}\`\`\`` },
          ),
        });
      } catch (e) {
        telemetryLog.error('[Telemetry] Alert webhook failed:', e);
      }
    }
  }

  // ── Flush / Export ────────────────────────────────────────────────────────

  async flush(): Promise<void> {
    const spansToExport = this.spans.splice(0);
    if (spansToExport.length === 0) return;

    if (this.config.collectorUrl) {
      try {
        await fetch(`${this.config.collectorUrl}/v1/traces`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceSpans: [{
              resource: { attributes: [{ key: 'service.name', value: { stringValue: this.config.serviceName } }] },
              scopeSpans: [{ spans: spansToExport }],
            }],
          }),
        });
      } catch (e) {
        telemetryLog.error('[Telemetry] OTLP export failed:', e);
      }
    } else {
      // Dev: log to console
      for (const span of spansToExport) {
        telemetryLog.debug(`[Span] ${span.name} ${span.durationMs.toFixed(1)}ms [${span.status}]`, span.attributes);
      }
    }
  }

  collectMetrics(): Record<string, MetricValue[]> {
    const result: Record<string, MetricValue[]> = {};
    for (const [name, metric] of this.metrics) {
      result[name] = metric.collect();
    }
    return result;
  }

  private generateId(length: number): string {
    const arr = new Uint8Array(length / 2);
    if (typeof crypto !== 'undefined') crypto.getRandomValues(arr);
    return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  dispose(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
  }
}

export const telemetry = new AethelTelemetry();
