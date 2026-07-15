export type WebGPUPerformanceTraceStatus = 'available' | 'held' | 'blocked' | 'needs-review'

export type WebGPUFrameTraceSample = {
  frameIndex: number
  frameTimeMs: number
  gpuTimeMs?: number
  drawCalls?: number
  triangles?: number
  visibleMeshlets?: number
  culledMeshlets?: number
  memoryMb?: number
}

export type WebGPUPerformanceTraceInput = {
  traceRef?: string
  capturedAt?: string
  targetFps?: 30 | 60 | 90 | 120
  minSampleCount?: number
  maxP95FrameMs?: number
  maxDroppedFrameRatio?: number
  maxAverageGpuMs?: number
  maxMemoryMb?: number
  maxDrawCalls?: number
  maxTriangles?: number
  humanReviewAttached?: boolean
  samples: WebGPUFrameTraceSample[]
}

export type WebGPUPerformanceTraceMetrics = {
  sampleCount: number
  averageFrameMs: number
  medianFrameMs: number
  p95FrameMs: number
  maxFrameMs: number
  estimatedFps: number
  droppedFrameRatio: number
  averageGpuMs?: number
  maxDrawCalls?: number
  maxTriangles?: number
  maxMemoryMb?: number
  cullEfficiency?: number
}

export type WebGPUPerformanceTraceSummary = {
  schemaVersion: 1
  capability: 'aethel.webgpu.performance.trace'
  status: WebGPUPerformanceTraceStatus
  traceRef: string | null
  targetFps: number
  metrics: WebGPUPerformanceTraceMetrics
  requiredEvidence: string[]
  blockers: string[]
  warnings: string[]
  nextAction: string
}

export const WEBGPU_PERFORMANCE_TRACE_REQUIRED_EVIDENCE = [
  'structured trace reference',
  'minimum frame sample count',
  'p95 frame time budget',
  'dropped-frame ratio budget',
  'GPU time or renderer timing evidence when available',
  'draw call, triangle, or meshlet budget evidence when available',
  'human review before release-quality render claims',
]

const DEFAULT_TARGET_FPS = 60
const DEFAULT_MIN_SAMPLE_COUNT = 60
const DEFAULT_MAX_DROPPED_FRAME_RATIO = 0.05
const DEFAULT_MAX_AVERAGE_GPU_MS = 14
const DEFAULT_MAX_MEMORY_MB = 2048
const DEFAULT_MAX_DRAW_CALLS = 1800
const DEFAULT_MAX_TRIANGLES = 2_000_000

function cleanNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1)
  return sorted[index] ?? 0
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100
}

function frameBudgetMs(targetFps: number): number {
  return 1000 / targetFps
}

function defaultP95Budget(targetFps: number): number {
  return frameBudgetMs(targetFps) * 1.2
}

function summarizeTraceMetrics(input: WebGPUPerformanceTraceInput): WebGPUPerformanceTraceMetrics {
  const frameTimes = input.samples.map((sample) => cleanNumber(sample.frameTimeMs)).filter((value): value is number => value !== undefined)
  const gpuTimes = input.samples.map((sample) => cleanNumber(sample.gpuTimeMs)).filter((value): value is number => value !== undefined)
  const drawCalls = input.samples.map((sample) => cleanNumber(sample.drawCalls)).filter((value): value is number => value !== undefined)
  const triangles = input.samples.map((sample) => cleanNumber(sample.triangles)).filter((value): value is number => value !== undefined)
  const memory = input.samples.map((sample) => cleanNumber(sample.memoryMb)).filter((value): value is number => value !== undefined)
  const visibleMeshlets = input.samples.map((sample) => cleanNumber(sample.visibleMeshlets)).filter((value): value is number => value !== undefined)
  const culledMeshlets = input.samples.map((sample) => cleanNumber(sample.culledMeshlets)).filter((value): value is number => value !== undefined)
  const targetFps = input.targetFps ?? DEFAULT_TARGET_FPS
  const frameBudget = frameBudgetMs(targetFps)
  const droppedFrames = frameTimes.filter((frameMs) => frameMs > frameBudget * 1.25).length
  const averageFrameMs = average(frameTimes)
  const totalVisible = visibleMeshlets.reduce((sum, value) => sum + value, 0)
  const totalCulled = culledMeshlets.reduce((sum, value) => sum + value, 0)
  const cullEfficiency = totalVisible + totalCulled > 0 ? totalCulled / (totalVisible + totalCulled) : undefined

  return {
    sampleCount: frameTimes.length,
    averageFrameMs: roundMetric(averageFrameMs),
    medianFrameMs: roundMetric(percentile(frameTimes, 50)),
    p95FrameMs: roundMetric(percentile(frameTimes, 95)),
    maxFrameMs: roundMetric(Math.max(0, ...frameTimes)),
    estimatedFps: averageFrameMs > 0 ? roundMetric(1000 / averageFrameMs) : 0,
    droppedFrameRatio: frameTimes.length > 0 ? roundMetric(droppedFrames / frameTimes.length) : 0,
    averageGpuMs: gpuTimes.length > 0 ? roundMetric(average(gpuTimes)) : undefined,
    maxDrawCalls: drawCalls.length > 0 ? Math.max(...drawCalls) : undefined,
    maxTriangles: triangles.length > 0 ? Math.max(...triangles) : undefined,
    maxMemoryMb: memory.length > 0 ? Math.max(...memory) : undefined,
    cullEfficiency: cullEfficiency === undefined ? undefined : roundMetric(cullEfficiency),
  }
}

export function buildWebGPUPerformanceTraceSummary(input: WebGPUPerformanceTraceInput): WebGPUPerformanceTraceSummary {
  const targetFps = input.targetFps ?? DEFAULT_TARGET_FPS
  const minSampleCount = input.minSampleCount ?? DEFAULT_MIN_SAMPLE_COUNT
  const maxP95FrameMs = input.maxP95FrameMs ?? defaultP95Budget(targetFps)
  const maxDroppedFrameRatio = input.maxDroppedFrameRatio ?? DEFAULT_MAX_DROPPED_FRAME_RATIO
  const maxAverageGpuMs = input.maxAverageGpuMs ?? DEFAULT_MAX_AVERAGE_GPU_MS
  const maxMemoryMb = input.maxMemoryMb ?? DEFAULT_MAX_MEMORY_MB
  const maxDrawCalls = input.maxDrawCalls ?? DEFAULT_MAX_DRAW_CALLS
  const maxTriangles = input.maxTriangles ?? DEFAULT_MAX_TRIANGLES
  const metrics = summarizeTraceMetrics(input)
  const blockers: string[] = []
  const warnings: string[] = []

  if (!input.traceRef) blockers.push('WebGPU performance trace reference is missing.')
  if (metrics.sampleCount < minSampleCount) {
    blockers.push(`WebGPU trace needs at least ${minSampleCount} frame samples; captured ${metrics.sampleCount}.`)
  }
  if (metrics.p95FrameMs > maxP95FrameMs) {
    blockers.push(`WebGPU p95 frame time ${metrics.p95FrameMs}ms exceeds budget ${roundMetric(maxP95FrameMs)}ms.`)
  }
  if (metrics.droppedFrameRatio > maxDroppedFrameRatio) {
    blockers.push(`WebGPU dropped-frame ratio ${metrics.droppedFrameRatio} exceeds budget ${maxDroppedFrameRatio}.`)
  }
  if (metrics.averageGpuMs !== undefined && metrics.averageGpuMs > maxAverageGpuMs) {
    blockers.push(`WebGPU average GPU time ${metrics.averageGpuMs}ms exceeds budget ${maxAverageGpuMs}ms.`)
  }
  if (metrics.maxMemoryMb !== undefined && metrics.maxMemoryMb > maxMemoryMb) {
    blockers.push(`WebGPU memory peak ${metrics.maxMemoryMb}MB exceeds preview budget ${maxMemoryMb}MB.`)
  }
  if (metrics.maxDrawCalls !== undefined && metrics.maxDrawCalls > maxDrawCalls) {
    blockers.push(`WebGPU draw-call peak ${metrics.maxDrawCalls} exceeds preview budget ${maxDrawCalls}.`)
  }
  if (metrics.maxTriangles !== undefined && metrics.maxTriangles > maxTriangles) {
    blockers.push(`WebGPU triangle peak ${metrics.maxTriangles} exceeds preview budget ${maxTriangles}.`)
  }

  if (metrics.averageGpuMs === undefined) warnings.push('GPU timestamp evidence is missing; use CPU frame timing only as preview evidence.')
  if (metrics.maxTriangles === undefined && metrics.maxDrawCalls === undefined) {
    warnings.push('Geometry budget evidence is missing; attach draw-call, triangle, or meshlet counters before release review.')
  }
  warnings.push('Browser WebGPU performance traces are preview evidence only; final rendering still requires Studio Local or Cloud Stream receipts.')

  const status: WebGPUPerformanceTraceStatus = blockers.length > 0
    ? blockers.some((blocker) => blocker.includes('exceeds budget'))
      ? 'blocked'
      : 'held'
    : input.humanReviewAttached
      ? 'available'
      : 'needs-review'

  return {
    schemaVersion: 1,
    capability: 'aethel.webgpu.performance.trace',
    status,
    traceRef: input.traceRef ?? null,
    targetFps,
    metrics,
    requiredEvidence: WEBGPU_PERFORMANCE_TRACE_REQUIRED_EVIDENCE,
    blockers,
    warnings,
    nextAction: status === 'available'
      ? 'Use this trace as browser-preview evidence only; route final-quality output through Studio Local or Cloud Stream receipts.'
      : status === 'needs-review'
        ? 'Attach human review before promoting this WebGPU preview trace to release evidence.'
        : status === 'blocked'
          ? 'Reduce shader, draw-call, geometry, memory, or frame-time pressure before enabling compute lanes.'
          : 'Capture a structured WebGPU performance trace with enough frame samples before enabling compute lanes.',
  }
}
