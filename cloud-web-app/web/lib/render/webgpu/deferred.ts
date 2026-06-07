export type WebGPURenderKernelState = 'available' | 'held' | 'blocked' | 'needs-review'

export type WebGPUDeferredPassInput = {
  passId?: string
  gBufferAttachments: string[]
  depthPrepassReady?: boolean
  materialPreflightReady?: boolean
  lightingResolveReady?: boolean
  traceRef?: string
  humanReviewAttached?: boolean
}

export type WebGPUDeferredPassContract = {
  version: 1
  passId: string
  pipeline: 'deferred'
  state: WebGPURenderKernelState
  gBufferAttachments: string[]
  requiredEvidence: string[]
  evidenceRefs: string[]
  blockers: string[]
  finalRenderReady: false
  nextAction: string
}

export const WEBGPU_DEFERRED_REQUIRED_ATTACHMENTS = ['albedo', 'normal', 'material', 'depth'] as const
export const WEBGPU_DEFERRED_REQUIRED_EVIDENCE = [
  'g-buffer attachments',
  'depth prepass',
  'material preflight',
  'lighting resolve',
  'structured WebGPU performance trace',
  'human review before release-quality render claims',
] as const

function missingAttachments(attachments: string[]): string[] {
  const normalized = new Set(attachments.map((attachment) => attachment.trim().toLowerCase()).filter(Boolean))
  return WEBGPU_DEFERRED_REQUIRED_ATTACHMENTS.filter((attachment) => !normalized.has(attachment))
}

export function buildWebGPUDeferredPassContract(input: WebGPUDeferredPassInput): WebGPUDeferredPassContract {
  const blockers: string[] = []
  const evidenceRefs: string[] = []
  const missing = missingAttachments(input.gBufferAttachments)

  if (missing.length > 0) blockers.push(`Deferred pass missing G-buffer attachments: ${missing.join(', ')}.`)
  if (!input.depthPrepassReady) blockers.push('Deferred pass requires depth prepass evidence.')
  if (!input.materialPreflightReady) blockers.push('Deferred pass requires material preflight evidence.')
  if (!input.lightingResolveReady) blockers.push('Deferred pass requires lighting resolve evidence.')
  if (!input.traceRef) blockers.push('Deferred pass requires structured WebGPU performance trace evidence.')
  if (input.traceRef) evidenceRefs.push(input.traceRef)
  if (input.humanReviewAttached) evidenceRefs.push('human-review:webgpu-deferred')

  const state: WebGPURenderKernelState =
    blockers.length > 0 ? 'held' : input.humanReviewAttached ? 'available' : 'needs-review'

  return {
    version: 1,
    passId: input.passId ?? 'webgpu-deferred-v1',
    pipeline: 'deferred',
    state,
    gBufferAttachments: input.gBufferAttachments,
    requiredEvidence: [...WEBGPU_DEFERRED_REQUIRED_EVIDENCE],
    evidenceRefs,
    blockers,
    finalRenderReady: false,
    nextAction:
      state === 'available'
        ? 'Use deferred pass as browser-preview evidence only; final render still requires Studio Local or Cloud Render receipts.'
        : 'Complete G-buffer, depth, material, lighting, trace, and human review evidence before promotion.',
  }
}
