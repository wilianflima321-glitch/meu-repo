import type { WebGPUPerformanceTraceSummary } from './webgpu-performance-trace'

export type WebGPUComputeReadinessStatus = 'available' | 'fallback' | 'held'

export type WebGPUShaderValidationStatus = 'passed' | 'not-run' | 'failed'

export type WebGPUComputeLane =
  | 'viewport-preview'
  | 'meshlet-culling-preview'
  | 'light-culling-preview'
  | 'material-preflight'

export type WebGPUComputeLimitName =
  | 'maxComputeInvocationsPerWorkgroup'
  | 'maxComputeWorkgroupStorageSize'
  | 'maxStorageBufferBindingSize'
  | 'maxBufferSize'

export type WebGPUComputeEvidenceInput = {
  secureContext?: boolean
  navigatorGpuAvailable: boolean
  adapterRequested?: boolean
  adapterAvailable?: boolean
  deviceRequested?: boolean
  deviceAvailable?: boolean
  requestAdapterError?: string
  requestDeviceError?: string
  adapterInfo?: {
    vendor?: string
    architecture?: string
    device?: string
    description?: string
  }
  features?: string[]
  limits?: Partial<Record<WebGPUComputeLimitName, number>>
  rendererModuleAvailable?: boolean
  shaderValidation?: WebGPUShaderValidationStatus
  benchmarkTraceRef?: string
  performanceTrace?: WebGPUPerformanceTraceSummary
}

export type WebGPUComputeReadinessSnapshot = {
  schemaVersion: 1
  capability: 'aethel.webgpu.compute.readiness'
  status: WebGPUComputeReadinessStatus
  browserPreviewOnly: true
  finalRenderRequiresNativeOrCloud: true
  computeAvailable: boolean
  featureLevel: 'core' | 'compatibility' | 'unknown'
  availableLanes: WebGPUComputeLane[]
  requiredEvidence: string[]
  blockers: string[]
  warnings: string[]
  adapterSummary: string
  nextAction: string
}

const REQUIRED_LIMITS: Record<WebGPUComputeLimitName, number> = {
  maxComputeInvocationsPerWorkgroup: 64,
  maxComputeWorkgroupStorageSize: 16 * 1024,
  maxStorageBufferBindingSize: 32 * 1024 * 1024,
  maxBufferSize: 64 * 1024 * 1024,
}

const REQUIRED_EVIDENCE = [
  'secure-context',
  'navigator.gpu',
  'GPUAdapter',
  'GPUDevice',
  'GPUSupportedFeatures',
  'GPUSupportedLimits',
  'WGSL shader validation',
  'structured WebGPU performance trace',
  'human review before final render',
]

function summarizeAdapter(input: WebGPUComputeEvidenceInput): string {
  const info = input.adapterInfo
  const parts = [
    info?.vendor,
    info?.architecture,
    info?.device,
    info?.description,
  ].filter(Boolean)

  if (parts.length > 0) return parts.join(' / ')
  if (input.adapterAvailable) return 'adapter available; vendor details not captured'
  if (input.navigatorGpuAvailable) return 'navigator.gpu present; adapter evidence missing'
  return 'browser WebGPU unavailable'
}

function detectFeatureLevel(features: string[] | undefined): WebGPUComputeReadinessSnapshot['featureLevel'] {
  if (!features || features.length === 0) return 'unknown'
  return features.includes('core-features-and-limits') ? 'core' : 'compatibility'
}

function findLimitBlockers(limits: WebGPUComputeEvidenceInput['limits']): string[] {
  return Object.entries(REQUIRED_LIMITS).flatMap(([name, minimum]) => {
    const value = limits?.[name as WebGPUComputeLimitName]
    if (typeof value !== 'number') return [`${name} evidence is missing`]
    if (value < minimum) return [`${name}=${value} is below Aethel preview baseline ${minimum}`]
    return []
  })
}

export function buildWebGPUComputeReadinessSnapshot(
  input: WebGPUComputeEvidenceInput,
): WebGPUComputeReadinessSnapshot {
  const blockers: string[] = []
  const warnings: string[] = []
  const availableLanes: WebGPUComputeLane[] = []

  if (input.secureContext === false) {
    blockers.push('WebGPU requires a secure context; run through HTTPS or localhost before probing GPU compute.')
  }

  if (!input.navigatorGpuAvailable) {
    blockers.push('navigator.gpu is not available; keep Browser Preview on WebGL2 fallback.')
  } else if (input.adapterAvailable === false || input.adapterRequested === false) {
    blockers.push(input.requestAdapterError ?? 'GPUAdapter evidence is missing.')
  }

  if (input.navigatorGpuAvailable && input.adapterAvailable && (input.deviceAvailable === false || input.deviceRequested === false)) {
    blockers.push(input.requestDeviceError ?? 'GPUDevice evidence is missing.')
  }

  if (input.rendererModuleAvailable === false) {
    blockers.push('Three WebGPURenderer module is unavailable; keep renderer on WebGL2 fallback.')
  }

  const limitBlockers = input.deviceAvailable ? findLimitBlockers(input.limits) : []
  blockers.push(...limitBlockers)

  if (input.shaderValidation !== 'passed') {
    blockers.push(
      input.shaderValidation === 'failed'
        ? 'WGSL shader validation failed; compute lanes remain held.'
        : 'WGSL shader validation has not run; compute lanes remain held.',
    )
  }

  if (input.performanceTrace) {
    if (input.performanceTrace.status === 'blocked' || input.performanceTrace.status === 'held') {
      blockers.push(
        `WebGPU performance trace is ${input.performanceTrace.status}; ${input.performanceTrace.nextAction}`,
      )
    }
    if (input.performanceTrace.status === 'needs-review') {
      warnings.push('WebGPU performance trace passed budgets but still needs human review before release evidence.')
    }
  } else if (!input.benchmarkTraceRef) {
    blockers.push('No structured WebGPU performance trace is attached; compute lanes remain held.')
  } else {
    warnings.push('Legacy performance trace ref is attached without metrics; attach structured trace before release review.')
  }

  warnings.push('Browser WebGPU compute is preview/review only; final rendering still requires Studio Local or Cloud Stream evidence.')
  warnings.push('Do not claim AAA, Unreal-grade, or final output from browser compute evidence alone.')

  const featureLevel = detectFeatureLevel(input.features)
  const computeAvailable =
    blockers.length === 0 &&
    input.navigatorGpuAvailable &&
    input.adapterAvailable === true &&
    input.deviceAvailable === true &&
    input.shaderValidation === 'passed'

  if (computeAvailable) {
    availableLanes.push('viewport-preview', 'meshlet-culling-preview', 'light-culling-preview', 'material-preflight')
  }

  const status: WebGPUComputeReadinessStatus = computeAvailable
    ? 'available'
    : input.navigatorGpuAvailable
      ? 'held'
      : 'fallback'

  return {
    schemaVersion: 1,
    capability: 'aethel.webgpu.compute.readiness',
    status,
    browserPreviewOnly: true,
    finalRenderRequiresNativeOrCloud: true,
    computeAvailable,
    featureLevel,
    availableLanes,
    requiredEvidence: REQUIRED_EVIDENCE,
    blockers,
    warnings,
    adapterSummary: summarizeAdapter(input),
    nextAction: computeAvailable
      ? 'Enable preview compute lanes only; attach performance trace and human review before any release-quality render claim.'
      : status === 'fallback'
        ? 'Use WebGL2 Browser Preview and route heavy geometry, cooking, and final renders to Studio Local or Cloud Stream.'
        : 'Collect adapter, device, supported limits, WGSL validation, and performance trace evidence before enabling compute lanes.',
  }
}

type BrowserWebGPUDevice = {
  features?: Iterable<string>
  limits?: Partial<Record<WebGPUComputeLimitName, number>>
  createShaderModule?: (descriptor: { code: string }) => unknown
  pushErrorScope?: (filter: 'validation') => void
  popErrorScope?: () => Promise<unknown>
}

type BrowserWebGPUAdapter = {
  features?: Iterable<string>
  limits?: Partial<Record<WebGPUComputeLimitName, number>>
  requestDevice?: () => Promise<BrowserWebGPUDevice>
  requestAdapterInfo?: () => Promise<WebGPUComputeEvidenceInput['adapterInfo']>
}

type BrowserGPU = {
  requestAdapter?: (options?: { powerPreference?: 'high-performance' | 'low-power' }) => Promise<BrowserWebGPUAdapter | null>
}

export async function probeBrowserWebGPUComputeReadiness(): Promise<WebGPUComputeReadinessSnapshot> {
  const gpu = typeof navigator === 'undefined'
    ? undefined
    : (navigator as Navigator & { gpu?: BrowserGPU }).gpu

  const evidence: WebGPUComputeEvidenceInput = {
    secureContext: typeof window === 'undefined' ? undefined : window.isSecureContext,
    navigatorGpuAvailable: Boolean(gpu?.requestAdapter),
    adapterRequested: false,
    adapterAvailable: false,
    deviceRequested: false,
    deviceAvailable: false,
    shaderValidation: 'not-run',
  }

  if (!gpu?.requestAdapter) return buildWebGPUComputeReadinessSnapshot(evidence)

  evidence.adapterRequested = true
  let adapter: BrowserWebGPUAdapter | null = null
  try {
    adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' })
    evidence.adapterAvailable = Boolean(adapter)
    evidence.features = adapter?.features ? Array.from(adapter.features) : undefined
    evidence.limits = adapter?.limits
    evidence.adapterInfo = await adapter?.requestAdapterInfo?.().catch(() => undefined)
  } catch (error) {
    evidence.requestAdapterError = error instanceof Error ? error.message : 'GPUAdapter request failed.'
  }

  if (!adapter?.requestDevice) return buildWebGPUComputeReadinessSnapshot(evidence)

  evidence.deviceRequested = true
  try {
    const device = await adapter.requestDevice()
    evidence.deviceAvailable = Boolean(device)
    evidence.features = device.features ? Array.from(device.features) : evidence.features
    evidence.limits = device.limits ?? evidence.limits

    if (device.pushErrorScope && device.popErrorScope && device.createShaderModule) {
      device.pushErrorScope('validation')
      device.createShaderModule({
        code: '@compute @workgroup_size(1) fn main() {}',
      })
      const validationError = await device.popErrorScope()
      evidence.shaderValidation = validationError ? 'failed' : 'passed'
    }
  } catch (error) {
    evidence.deviceAvailable = false
    evidence.requestDeviceError = error instanceof Error ? error.message : 'GPUDevice request failed.'
  }

  return buildWebGPUComputeReadinessSnapshot(evidence)
}
