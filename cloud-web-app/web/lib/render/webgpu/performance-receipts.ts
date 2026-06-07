import type { WebGPUPerformanceTraceSummary } from '@/lib/runtime/webgpu-performance-trace'
import type { WebGPUDeferredPassContract, WebGPURenderKernelState } from '@/lib/render/webgpu/deferred'
import type { WebGPUForwardPlusPassContract } from '@/lib/render/webgpu/forward-plus'

export type WebGPURenderKernelReceiptInput = {
  kernelId?: string
  deferred?: WebGPUDeferredPassContract | null
  forwardPlus?: WebGPUForwardPlusPassContract | null
  performanceTrace?: WebGPUPerformanceTraceSummary | null
  fallbackRenderer: 'webgl2' | 'studio-local' | 'cloud-render'
  humanReviewAttached?: boolean
}

export type WebGPURenderKernelReceipt = {
  version: 1
  kernelId: string
  state: WebGPURenderKernelState
  activePipelines: Array<'deferred' | 'forward-plus'>
  fallbackRenderer: 'webgl2' | 'studio-local' | 'cloud-render'
  requiredEvidence: string[]
  evidenceRefs: string[]
  blockers: string[]
  warnings: string[]
  finalRenderReady: false
  releasePolicy: 'native-or-cloud-plus-human-review'
  nextAction: string
}

export const WEBGPU_RENDER_KERNEL_REQUIRED_EVIDENCE = [
  'deferred or forward-plus pass contract',
  'structured WebGPU performance trace',
  'WebGL2/Studio Local/Cloud Render fallback receipt',
  'human review before release-quality render claims',
] as const

export function buildWebGPURenderKernelReceipt(input: WebGPURenderKernelReceiptInput): WebGPURenderKernelReceipt {
  const blockers: string[] = []
  const warnings: string[] = ['Browser WebGPU render kernel is preview evidence only; final output requires native or cloud receipts.']
  const evidenceRefs: string[] = []
  const pipelines: Array<'deferred' | 'forward-plus'> = []
  const passContracts = [input.deferred, input.forwardPlus].filter(Boolean)

  if (input.deferred) {
    pipelines.push('deferred')
    evidenceRefs.push(...input.deferred.evidenceRefs)
    blockers.push(...input.deferred.blockers.map((blocker) => `Deferred: ${blocker}`))
  }
  if (input.forwardPlus) {
    pipelines.push('forward-plus')
    evidenceRefs.push(...input.forwardPlus.evidenceRefs)
    blockers.push(...input.forwardPlus.blockers.map((blocker) => `Forward+: ${blocker}`))
  }
  if (passContracts.length === 0) blockers.push('WebGPU render kernel requires at least one pass contract.')
  if (!input.performanceTrace) {
    blockers.push('WebGPU render kernel requires structured performance trace evidence.')
  } else {
    if (input.performanceTrace.traceRef) evidenceRefs.push(input.performanceTrace.traceRef)
    if (input.performanceTrace.status === 'held' || input.performanceTrace.status === 'blocked') {
      blockers.push(`WebGPU performance trace is ${input.performanceTrace.status}.`)
    }
    if (input.performanceTrace.status === 'needs-review') warnings.push('Performance trace needs human review before release evidence.')
  }
  if (input.fallbackRenderer === 'webgl2') warnings.push('WebGL2 fallback is preview-only and cannot own final cinematic/game output.')
  evidenceRefs.push(`fallback:${input.fallbackRenderer}`)
  if (input.humanReviewAttached) evidenceRefs.push('human-review:webgpu-render-kernel')
  else blockers.push('Human review is required before any release-quality render claim.')

  const state: WebGPURenderKernelState =
    blockers.length > 0 ? 'held' : passContracts.some((contract) => contract?.state === 'needs-review') ? 'needs-review' : 'available'

  return {
    version: 1,
    kernelId: input.kernelId ?? 'aethel-webgpu-render-kernel-v1',
    state,
    activePipelines: pipelines,
    fallbackRenderer: input.fallbackRenderer,
    requiredEvidence: [...WEBGPU_RENDER_KERNEL_REQUIRED_EVIDENCE],
    evidenceRefs: Array.from(new Set(evidenceRefs)),
    blockers: Array.from(new Set(blockers)),
    warnings,
    finalRenderReady: false,
    releasePolicy: 'native-or-cloud-plus-human-review',
    nextAction:
      state === 'available'
        ? 'Use this as browser-preview evidence only; route final output through Studio Local or Cloud Render receipts.'
        : 'Attach pass contracts, performance trace, fallback receipt, and human review before promotion.',
  }
}

export function validateWebGPURenderKernelReceipt(receipt: WebGPURenderKernelReceipt): string[] {
  const failures: string[] = []
  if (receipt.requiredEvidence.length < WEBGPU_RENDER_KERNEL_REQUIRED_EVIDENCE.length) failures.push('WebGPU render kernel evidence list is incomplete')
  if (receipt.finalRenderReady !== false) failures.push('WebGPU browser receipt must not mark finalRenderReady true')
  if (receipt.activePipelines.length === 0) failures.push('WebGPU render kernel needs an active deferred or forward-plus pipeline')
  if (!receipt.evidenceRefs.some((ref) => ref.startsWith('fallback:'))) failures.push('WebGPU render kernel needs a fallback receipt')
  if (receipt.state === 'available' && receipt.blockers.length > 0) failures.push('available WebGPU render kernel cannot have blockers')
  return failures
}
