/**
 * Letter cb — Studio IDE entry: Generate game-ready character.
 *
 * Route (selectGameReadyCharacterRoute) →
 *   native-pager → runNativeGenConveyor (ca; local $0 + FusionTx)
 *   byok-clay    → live poll (bx) or CreativeBridge clay ingest (bw) → quality conveyor
 *
 * Zero-UI when native ONNX unavailable. No Coins / Agones / ORT invention.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  selectGameReadyCharacterRoute,
  NATIVE_GEN_IDE_LETTER,
  NATIVE_GEN_IDE_ROUTE_WIRED,
  type NativeGenIdeHonestyBadge,
  type NativeGenIdePath,
  type NativeGenIdeRouteDecision,
} from '@/lib/native-gen/native-gen-ide-route'
import {
  runNativeGenConveyor,
  type NativeGenConveyorInput,
  type NativeGenConveyorResult,
} from '@/lib/native-gen/native-gen-conveyor'
import { resolveNativeOnnxReadyFlag } from '@/lib/native-gen/onnx-job-protocol'
import {
  runLiveClayPollIntoQualityPipeline,
  type LiveClayPollPipelineInput,
  type LiveClayPollPipelineResult,
} from '@/lib/mesh-quality/live-clay-quality-bridge'
import {
  runGameReadyQualityPipeline,
  type GameReadyPipelineInput,
  type GameReadyPipelineResult,
} from '@/lib/mesh-quality/game-ready-quality-pipeline'
import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import type { FusionScopeStore } from '@/lib/production/creative-fusion-transaction'
import type { ClayProviderId } from '@/lib/mesh-quality/clay-provider-adapters'
import type { ClayPollClientKeys, ClayProviderPollClient, FetchLike } from '@/lib/mesh-quality/clay-live-poll'
import type { RawMeshBuffer } from '@/lib/mesh-quality/types'
import type { GaussianSplatCloud } from '@/lib/native-gen/types'

const log = createComponentLogger('native-gen-ide-bridge')

export const NATIVE_GEN_IDE_BRIDGE_WIRED = true as const

export interface GenerateGameReadyCharacterInput {
  projectId: string
  userId: string
  prompt: string
  planId?: string
  byokProfileId?: string
  usageBucketId?: string
  capabilityScore?: number
  dedicatedVramMb?: number | null
  fusionStore?: FusionScopeStore
  /** Required for BYOK clay path (CreativeBridge / CostGuard). */
  costGuardAdapter?: CostGuardLedgerAdapter
  /** Optional live clay job — prefer poll→conveyor (bx) on BYOK path. */
  clayJob?: {
    provider: ClayProviderId
    taskId: string
  }
  pollKeys?: ClayPollClientKeys
  fetchImpl?: FetchLike
  pollClient?: ClayProviderPollClient
  clayModelUrl?: string
  offlineObjText?: string
  /** Pre-parsed mesh / splat for native conveyor tests. */
  mesh?: RawMeshBuffer
  splatCloud?: GaussianSplatCloud
  /** Test / future soak override — production must not invent true. */
  forceNativeOnnxReady?: boolean
  skipOnnx?: boolean
}

export interface GenerateGameReadyCharacterResult {
  letter: typeof NATIVE_GEN_IDE_LETTER
  success: boolean
  path: NativeGenIdePath
  honestyBadge: NativeGenIdeHonestyBadge
  route: NativeGenIdeRouteDecision
  zeroUi: boolean
  /** Always false until ORT soak — mirror ca honesty. */
  nativeOnnxReady: boolean
  creativeBridgeUsed: boolean
  localNativeCostUsd: 0
  blockedReason?: string
  native?: NativeGenConveyorResult
  byokPoll?: LiveClayPollPipelineResult
  byokPipeline?: GameReadyPipelineResult
  notes: string[]
}

/**
 * Studio IDE entry: text → route → full conveyor → FusionTx viewport stamp.
 */
export async function generateGameReadyCharacter(
  input: GenerateGameReadyCharacterInput,
): Promise<GenerateGameReadyCharacterResult> {
  const route = selectGameReadyCharacterRoute({
    nativeOnnxReady: input.forceNativeOnnxReady ?? resolveNativeOnnxReadyFlag(),
  })
  const notes = [
    'Letter cb — Native Gen → Studio IDE + CreativeBridge wire',
    ...route.notes,
  ]

  if (route.path === 'native-pager') {
    const nativeInput: NativeGenConveyorInput = {
      projectId: input.projectId,
      userId: input.userId,
      prompt: input.prompt,
      capabilityScore: input.capabilityScore,
      dedicatedVramMb: input.dedicatedVramMb,
      mesh: input.mesh,
      splatCloud: input.splatCloud,
      fusionStore: input.fusionStore,
      skipOnnx: input.skipOnnx,
    }
    const native = await runNativeGenConveyor(nativeInput)
    notes.push('cb: native path — local $0; FusionTx for manifest/viewport')
    return {
      letter: NATIVE_GEN_IDE_LETTER,
      success: native.success,
      path: 'native-pager',
      honestyBadge: 'native',
      route,
      zeroUi: native.zeroUi,
      nativeOnnxReady: route.nativeOnnxReady,
      creativeBridgeUsed: false,
      localNativeCostUsd: 0,
      blockedReason: native.blockedReason,
      native,
      notes: [...notes, ...native.notes],
    }
  }

  // BYOK / MoA clay — CreativeBridge + CostGuard choke (silent when native HELD)
  if (!input.costGuardAdapter) {
    log.info('native_gen_ide_byok_blocked_no_adapter', {
      zeroUi: true,
      reason: 'cost_guard_adapter_required',
    })
    return {
      letter: NATIVE_GEN_IDE_LETTER,
      success: false,
      path: 'byok-clay',
      honestyBadge: 'byok',
      route,
      zeroUi: true,
      nativeOnnxReady: false,
      creativeBridgeUsed: false,
      localNativeCostUsd: 0,
      blockedReason: 'cost_guard_adapter_required',
      notes: [
        ...notes,
        'blocked:cost_guard_adapter_required',
        'Zero-UI — no native-unavailable toast spam',
      ],
    }
  }

  if (input.clayJob) {
    const pollInput: LiveClayPollPipelineInput = {
      projectId: input.projectId,
      userId: input.userId,
      prompt: input.prompt,
      planId: input.planId,
      byokProfileId: input.byokProfileId,
      usageBucketId: input.usageBucketId,
      capabilityScore: input.capabilityScore,
      fusionStore: input.fusionStore,
      costGuardAdapter: input.costGuardAdapter,
      clayJob: input.clayJob,
      pollKeys: input.pollKeys,
      fetchImpl: input.fetchImpl,
      pollClient: input.pollClient,
      clayModelUrl: input.clayModelUrl,
    }
    const byokPoll = await runLiveClayPollIntoQualityPipeline(pollInput)
    notes.push('cb: BYOK live clay poll (bx) → quality conveyor; CreativeBridge choke')
    return {
      letter: NATIVE_GEN_IDE_LETTER,
      success: byokPoll.success,
      path: 'byok-clay',
      honestyBadge: 'byok',
      route,
      zeroUi: true,
      nativeOnnxReady: false,
      creativeBridgeUsed: true,
      localNativeCostUsd: 0,
      blockedReason: byokPoll.blockedReason,
      byokPoll,
      notes: [...notes, ...byokPoll.notes],
    }
  }

  const pipelineInput: GameReadyPipelineInput = {
    projectId: input.projectId,
    userId: input.userId,
    prompt: input.prompt,
    planId: input.planId,
    byokProfileId: input.byokProfileId,
    usageBucketId: input.usageBucketId,
    capabilityScore: input.capabilityScore,
    fusionStore: input.fusionStore,
    costGuardAdapter: input.costGuardAdapter,
    offlineObjText: input.offlineObjText,
    clayMesh: input.mesh,
  }
  const byokPipeline = await runGameReadyQualityPipeline(pipelineInput)
  notes.push('cb: BYOK CreativeBridge clay ingest (bw) → full quality conveyor + FusionTx')
  return {
    letter: NATIVE_GEN_IDE_LETTER,
    success: byokPipeline.success,
    path: 'byok-clay',
    honestyBadge: 'byok',
    route,
    zeroUi: true,
    nativeOnnxReady: false,
    creativeBridgeUsed: true,
    localNativeCostUsd: 0,
    blockedReason: byokPipeline.blockedReason,
    byokPipeline,
    notes: [...notes, ...byokPipeline.notes],
  }
}
