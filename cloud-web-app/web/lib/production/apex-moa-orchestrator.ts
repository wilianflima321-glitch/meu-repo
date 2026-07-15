/**
 * Apex MoA orchestrator — Decisions #60–#62 foundation
 * Fan-out generators → synthesize → LazyInspector → (caller runs L.5) → heal loop hook
 */

import { randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  adaptiveMoAWidth,
  selectMoAGenerators,
  type ApexTaskDomain,
} from '@/lib/ai/fusion-specialist-registry'
import { injectAntiLazySystemPrompt } from '@/lib/ai/fusion-anti-lazy-system'
import {
  canRetryLazyReject,
  inspectLazyPatch,
  type LazyInspectorResult,
} from '@/lib/production/lazy-inspector'
import { fuseCriticalProposals, type CriticalFuseFn } from '@/lib/production/critical-synthesizer'
import {
  appendAmbientSliceToMoAPrompt,
  applyAmbientSliceToMultiSurfacePack,
  getAmbientMoALiveWire,
  resetAmbientMoALiveWireForTests,
  subscribeAmbientEmotionForMoA,
  wireAmbientEmotionDeltaLive,
  type AmbientApexMoAPort,
  type AmbientLiveWireHandle,
  type AmbientLiveWireOptions,
  type AmbientMoAEscalationListener,
} from '@/lib/ambient'
import type { AethelAmbientApi } from '@/lib/ambient/developer-api'
import type { MultiSurfaceContextPack } from '@/lib/production/multi-surface-context-pack'

const log = createComponentLogger('apex-moa-orchestrator')

export interface ApexMoAJob {
  jobId: string
  parentMissionId?: string
  taskDomain: ApexTaskDomain
  prompt: string
  systemPrompt?: string
  planId?: string
  riskScore: number
  lawsPackId: string
  contextPackId: string
  projectMemoryDigestId: string
  maxHealRounds?: 1 | 2 | 3
}

export interface MoAGeneratorProposal {
  modelId: string
  patchText: string
  rationale?: string
}

export interface ApexMoACellResult {
  jobId: string
  verdict: 'CANDIDATE' | 'LAZY_RETRY' | 'BLOCK'
  generatorWidth: 1 | 2 | 3
  generatorModelIds: string[]
  systemPromptInjected: string
  proposals: MoAGeneratorProposal[]
  supremePatch?: string
  lazy?: LazyInspectorResult
  synthesizerNote?: string
}

export type MoAGeneratorFn = (input: {
  modelId: string
  systemPrompt: string
  userPrompt: string
  domain: ApexTaskDomain
}) => Promise<{ patchText: string; rationale?: string }>

/**
 * Run one MoA cell: pick Apex generators by #62 width, generate in parallel,
 * synthesize (longest non-empty / first PASS lazy), LazyInspector gate.
 * Does NOT call L.5 — caller/auto-heal owns compiler gate.
 */
export async function runApexMoACell(input: {
  job: Omit<ApexMoAJob, 'jobId'> & { jobId?: string }
  generate: MoAGeneratorFn
  lazyRejectCount?: number
  /** Optional Premium fuse for width ≥ 2 (Decision #62) */
  fuseFn?: CriticalFuseFn
}): Promise<ApexMoACellResult> {
  const jobId = input.job.jobId ?? randomUUID()
  const width = adaptiveMoAWidth(input.job.riskScore, input.job.planId)
  const generators = selectMoAGenerators({ domain: input.job.taskDomain, width })
  const systemPromptInjected = injectAntiLazySystemPrompt(input.job.systemPrompt)
  const userPrompt = enrichApexMoAPromptWithAmbient(input.job.prompt)

  log.info('moa_cell_start', {
    jobId,
    domain: input.job.taskDomain,
    width,
    models: generators.map((g) => g.modelId),
  })

  const proposals: MoAGeneratorProposal[] = await Promise.all(
    generators.map(async (g) => {
      const out = await input.generate({
        modelId: g.modelId,
        systemPrompt: systemPromptInjected,
        userPrompt,
        domain: input.job.taskDomain,
      })
      return {
        modelId: g.modelId,
        patchText: out.patchText,
        rationale: out.rationale,
      }
    }),
  )

  const fused = await fuseCriticalProposals({
    proposals,
    domainPrompt: userPrompt,
    fuseFn: input.fuseFn,
  })
  const supremePatch = fused.patchText
  const lazy = inspectLazyPatch(supremePatch, input.lazyRejectCount ?? 0)

  if (lazy.verdict === 'REJECT') {
    const canRetry = canRetryLazyReject(lazy.lazyRejectCount)
    log.warn('moa_lazy_reject', {
      jobId,
      matchedPatterns: lazy.matchedPatterns,
      lazyRejectCount: lazy.lazyRejectCount,
      canRetry,
    })
    return {
      jobId,
      verdict: canRetry ? 'LAZY_RETRY' : 'BLOCK',
      generatorWidth: width,
      generatorModelIds: generators.map((g) => g.modelId),
      systemPromptInjected,
      proposals,
      supremePatch,
      lazy,
      synthesizerNote: `${fused.note} — LazyInspector REJECT — settle:0; retry or BLOCK`,
    }
  }

  return {
    jobId,
    verdict: 'CANDIDATE',
    generatorWidth: width,
    generatorModelIds: generators.map((g) => g.modelId),
    systemPromptInjected,
    proposals,
    supremePatch,
    lazy,
    synthesizerNote:
      width === 1
        ? 'Single Apex proposal (no multi-fuse)'
        : `${fused.note} [${fused.fusedBy}]`,
  }
}

// ---------------------------------------------------------------------------
// K.0/J AmbientEmotionDelta live wire (CostGuard suppressor → MoA listen)
// Enhancement-only / Zero-UI: missing CSI → classic path; settle:0 on reject.
// Paid narration still must go through CreativeBridge / Law XVI CostGuard.
// ---------------------------------------------------------------------------

export {
  appendAmbientSliceToMoAPrompt,
  applyAmbientSliceToMultiSurfacePack,
  getAmbientMoALiveWire,
  resetAmbientMoALiveWireForTests,
  subscribeAmbientEmotionForMoA,
  wireAmbientEmotionDeltaLive,
}

export type { AmbientLiveWireHandle, AmbientLiveWireOptions, AmbientMoAEscalationListener }

/**
 * Subscribe Apex MoA host to AmbientEmotionDelta via CostGuard suppressor.
 * Critical deltas only; Law XVI — callers must still route paid narration through CreativeBridge.
 * Missing CSI → quiet classic path (no error UI).
 */
export function subscribeAmbientEmotionDeltaToMoA(input: {
  api: AethelAmbientApi
  onCritical?: AmbientMoAEscalationListener
  blackboards?: AmbientLiveWireOptions['blackboards']
}): AmbientLiveWireHandle {
  return subscribeAmbientEmotionForMoA({
    api: input.api,
    onMoAEscalation: input.onCritical,
    blackboards: input.blackboards,
  })
}

/** Alias — Apex MoA ambient listen entrypoint */
export function wireApexMoAAmbientEmotionListen(
  options: AmbientLiveWireOptions,
): AmbientLiveWireHandle {
  return subscribeAmbientEmotionForMoA(options)
}

/**
 * Append critical ambient slice into MoA user prompt (never 60Hz stream).
 * Returns original prompt when slice absent (suppressed / settle:0 path).
 */
export function appendAmbientCriticalHintToPrompt(
  prompt: string,
  slice: AmbientApexMoAPort['ambientEmotionSlice'] | undefined,
): string {
  return appendAmbientSliceToMoAPrompt(prompt, slice)
}

/**
 * Build MoA job prompt with optional ambient critical hint from live wire handle.
 */
export function withAmbientCriticalMoAPrompt(
  basePrompt: string,
  wire: AmbientLiveWireHandle | undefined,
): string {
  return appendAmbientSliceToMoAPrompt(basePrompt, wire?.getLatestMoASlice())
}

/**
 * Enrich MoA job prompt with latest suppressor-allowed ambient slice.
 * Safe no-op when suppressed / no wire — never invents CSI physiology.
 */
export function enrichApexMoAPromptWithAmbient(prompt: string): string {
  const slice = getAmbientMoALiveWire()?.getLatestMoASlice()
  return appendAmbientSliceToMoAPrompt(prompt, slice)
}

/**
 * Stamp MultiSurface pack with latest allowed ambientCriticalDelta (if any).
 */
export function stampMultiSurfacePackWithAmbient(
  pack: MultiSurfaceContextPack,
): MultiSurfaceContextPack {
  const slice = getAmbientMoALiveWire()?.getLatestMoASlice()
  return applyAmbientSliceToMultiSurfacePack(pack, slice)
}