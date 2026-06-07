import type { WebGPUComputeReadinessSnapshot } from '@/lib/runtime/webgpu-compute-readiness'
import type { WebGPURenderKernelState } from '@/lib/render/webgpu/deferred'

export type WebGPUForwardPlusInput = {
  passId?: string
  computeReadiness?: WebGPUComputeReadinessSnapshot | null
  tileSize?: 8 | 16 | 32
  lightCount: number
  meshletCullingReady?: boolean
  lightCullingReady?: boolean
  traceRef?: string
  humanReviewAttached?: boolean
}

export type WebGPUForwardPlusPassContract = {
  version: 1
  passId: string
  pipeline: 'forward-plus'
  state: WebGPURenderKernelState
  tileSize: 8 | 16 | 32
  lightCount: number
  computeLanes: string[]
  requiredEvidence: string[]
  evidenceRefs: string[]
  blockers: string[]
  finalRenderReady: false
  nextAction: string
}

export const WEBGPU_FORWARD_PLUS_REQUIRED_EVIDENCE = [
  'WebGPU compute readiness',
  'meshlet culling lane',
  'light culling lane',
  'tile size budget',
  'structured WebGPU performance trace',
  'human review before release-quality render claims',
] as const

export function buildWebGPUForwardPlusPassContract(input: WebGPUForwardPlusInput): WebGPUForwardPlusPassContract {
  const blockers: string[] = []
  const evidenceRefs: string[] = []
  const computeLanes = input.computeReadiness?.availableLanes ?? []
  const tileSize = input.tileSize ?? 16

  if (!input.computeReadiness) {
    blockers.push('Forward+ pass requires WebGPU compute readiness evidence.')
  } else if (input.computeReadiness.status !== 'available') {
    blockers.push(`WebGPU compute readiness is ${input.computeReadiness.status}.`)
  }
  if (!input.meshletCullingReady || !computeLanes.includes('meshlet-culling-preview')) {
    blockers.push('Forward+ pass requires meshlet culling lane evidence.')
  }
  if (!input.lightCullingReady || !computeLanes.includes('light-culling-preview')) {
    blockers.push('Forward+ pass requires light culling lane evidence.')
  }
  if (input.lightCount > 2048) blockers.push('Forward+ light count exceeds browser preview budget.')
  if (!input.traceRef) blockers.push('Forward+ pass requires structured WebGPU performance trace evidence.')
  if (input.traceRef) evidenceRefs.push(input.traceRef)
  if (input.computeReadiness) evidenceRefs.push(`webgpu-compute:${input.computeReadiness.status}`)
  if (input.humanReviewAttached) evidenceRefs.push('human-review:webgpu-forward-plus')

  const state: WebGPURenderKernelState =
    blockers.length > 0 ? 'held' : input.humanReviewAttached ? 'available' : 'needs-review'

  return {
    version: 1,
    passId: input.passId ?? 'webgpu-forward-plus-v1',
    pipeline: 'forward-plus',
    state,
    tileSize,
    lightCount: input.lightCount,
    computeLanes,
    requiredEvidence: [...WEBGPU_FORWARD_PLUS_REQUIRED_EVIDENCE],
    evidenceRefs,
    blockers,
    finalRenderReady: false,
    nextAction:
      state === 'available'
        ? 'Use Forward+ as browser-preview evidence only; final render still requires Studio Local or Cloud Render receipts.'
        : 'Complete compute, culling, trace, and review evidence before enabling Forward+ preview promotion.',
  }
}
