/**
 * Letter cb — Native Gen → Studio IDE + CreativeBridge wire.
 *
 * Text → prefer native pager (ca) when nativeOnnxReady else BYOK clay poll (bx)
 * → full game-ready conveyor (bw/bz + ca retopo/LOD/V-HACD/heat/delight) → FusionTx viewport.
 *
 * Cloud clay always CreativeBridge/CostGuard. Local native $0 still FusionTx for manifest.
 * Zero-UI when native ONNX unavailable and BYOK missing — silent MoA fallback, no error spam.
 */

import { resolveNativeOnnxReadyFlag } from '@/lib/native-gen/onnx-job-protocol'
import {
  evaluateNativeGenCapability,
  type NativeGenCapabilityGate,
  type NativeGenStageReceipt,
} from '@/lib/native-gen/types'
import {
  runNativeGenConveyor,
  type NativeGenConveyorResult,
} from '@/lib/native-gen/native-gen-conveyor'
import { probeNativeGenHonesty, type NativeGenHonestyReport } from '@/lib/native-gen/native-gen-honesty'
import {
  runLiveClayPollIntoQualityPipeline,
  type LiveClayPollPipelineInput,
  type LiveClayPollPipelineResult,
} from '@/lib/mesh-quality/live-clay-quality-bridge'
import {
  runGameReadyQualityPipeline,
  type GameReadyPipelineResult,
} from '@/lib/mesh-quality/game-ready-quality-pipeline'
import { probeMeshQualityHonesty, type MeshQualityHonestyReport } from '@/lib/mesh-quality/mesh-quality-honesty'
import type { ClayProviderId } from '@/lib/mesh-quality/clay-provider-adapters'
import type {
  ClayPollClientKeys,
  ClayProviderPollClient,
  FetchLike,
} from '@/lib/mesh-quality/clay-live-poll'
import type { MeshQualityStageReceipt, RawMeshBuffer } from '@/lib/mesh-quality/types'
import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import type { FusionScopeStore } from '@/lib/production/creative-fusion-transaction'

export const GAME_READY_CHARACTER_LETTER = 'cb' as const
export const GAME_READY_CHARACTER_PIPELINE_ID = 'studio-game-ready-character:v1' as const
export const GAME_READY_CHARACTER_WIRED = true as const

export type GameReadyCharacterRoute = 'native-ca' | 'byok-bx' | 'zero-ui-held'

export interface GameReadyCharacterRouteDecision {
  route: GameReadyCharacterRoute
  reason: string
  gate: NativeGenCapabilityGate
  nativeOnnxReady: boolean
  zeroUi: boolean
}

export interface GameReadyCharacterGenerationInput {
  projectId: string
  userId: string
  prompt: string
  capabilityScore?: number
  dedicatedVramMb?: number | null
  planId?: string
  byokProfileId?: string
  clayProvider?: ClayProviderId
  clayJob?: { provider: ClayProviderId; taskId: string }
  clayModelUrl?: string
  webhookPayload?: unknown
  pollKeys?: ClayPollClientKeys
  fetchImpl?: FetchLike
  pollClient?: ClayProviderPollClient
  offlineObjText?: string
  clayMesh?: RawMeshBuffer
  nativeMesh?: RawMeshBuffer
  fusionStore?: FusionScopeStore
  costGuardAdapter?: CostGuardLedgerAdapter
  writePackEntry?: boolean
  nativeOnnxReadyOverride?: boolean
  hasByok?: boolean
  hasClayKeys?: boolean
}

export interface GameReadyCharacterGenerationResult {
  letter: typeof GAME_READY_CHARACTER_LETTER
  pipelineId: typeof GAME_READY_CHARACTER_PIPELINE_ID
  route: GameReadyCharacterRoute
  success: boolean
  zeroUi: boolean
  nativeOnnxReady: boolean
  liveClayPollReady: boolean
  blockedReason?: string
  stages: Array<MeshQualityStageReceipt | NativeGenStageReceipt>
  mesh?: RawMeshBuffer
  fusionViewportStamped: boolean
  honesty: {
    mesh: MeshQualityHonestyReport
    native: NativeGenHonestyReport
  }
  notes: string[]
  nativeResult?: NativeGenConveyorResult
  clayResult?: LiveClayPollPipelineResult | GameReadyPipelineResult
}

function hasPollKeys(keys?: ClayPollClientKeys): boolean {
  if (!keys) return false
  return Boolean(keys.MESHY_API_KEY || keys.TRIPO_API_KEY || keys.LUMA_API_KEY)
}

export function selectGameReadyCharacterRoute(input: {
  capabilityScore?: number
  dedicatedVramMb?: number | null
  nativeOnnxReady?: boolean
  hasByok?: boolean
  hasClayKeys?: boolean
}): GameReadyCharacterRouteDecision {
  const nativeOnnxReady = input.nativeOnnxReady ?? resolveNativeOnnxReadyFlag()
  const gate = evaluateNativeGenCapability({
    capabilityScore: input.capabilityScore ?? 100,
    dedicatedVramMb: input.dedicatedVramMb,
  })

  if (nativeOnnxReady && gate.onnxPathAllowed && !gate.zeroUiFallback) {
    return {
      route: 'native-ca',
      reason: 'native_onnx_ready_pager_path',
      gate,
      nativeOnnxReady: true,
      zeroUi: false,
    }
  }

  const byokOk = input.hasByok === true && input.hasClayKeys === true
  if (byokOk) {
    return {
      route: 'byok-bx',
      reason: nativeOnnxReady
        ? 'native_gated_fallback_byok_clay'
        : 'native_onnx_held_byok_clay_poll',
      gate,
      nativeOnnxReady,
      zeroUi: false,
    }
  }

  return {
    route: 'zero-ui-held',
    reason: gate.zeroUiFallback
      ? 'native_moa_fallback_weak_gpu'
      : nativeOnnxReady
        ? 'byok_or_keys_missing_zero_ui'
        : 'native_onnx_held_byok_missing_zero_ui',
    gate,
    nativeOnnxReady,
    zeroUi: true,
  }
}

function fusionStamped(
  stages: Array<{ stage: string; status: string }>,
  notes?: string[],
): boolean {
  if (stages.some((s) => s.stage === 'fusion-viewport' && s.status === 'closed')) {
    return true
  }
  // bw stamps FusionTx without a dedicated stage — pack closed + no FusionTx HELD note.
  const packClosed = stages.some((s) => s.stage === 'aethelpack-entry' && s.status === 'closed')
  const fusionHeld = (notes ?? []).some((n) => n.includes('FusionTx stamp HELD'))
  return packClosed && !fusionHeld
}

export async function runGameReadyCharacterGeneration(
  input: GameReadyCharacterGenerationInput,
): Promise<GameReadyCharacterGenerationResult> {
  const notes: string[] = [
    'Letter cb — Studio IDE Generate game-ready character',
    'Prefer native ca pager when nativeOnnxReady; else BYOK bx clay poll → bw/bz conveyor',
    'Cloud clay CreativeBridge+CostGuard; native $0 still FusionTx for viewport/manifest',
    'Zero-UI silent when native ONNX HELD and BYOK missing — no error spam',
  ]

  const hasByok =
    input.hasByok ??
    (Boolean(input.byokProfileId) ||
      (input.costGuardAdapter
        ? await input.costGuardAdapter.hasByok(input.userId, input.byokProfileId)
        : false))

  const clayKeys =
    input.pollKeys ??
    ({
      TRIPO_API_KEY: process.env.TRIPO_API_KEY,
      LUMA_API_KEY: process.env.LUMA_API_KEY,
      MESHY_API_KEY: process.env.MESHY_API_KEY,
    } satisfies ClayPollClientKeys)

  const hasClayKeys =
    input.hasClayKeys ??
    (hasPollKeys(clayKeys) ||
      Boolean(input.offlineObjText) ||
      Boolean(input.clayMesh) ||
      Boolean(input.clayJob))

  const decision = selectGameReadyCharacterRoute({
    capabilityScore: input.capabilityScore,
    dedicatedVramMb: input.dedicatedVramMb,
    nativeOnnxReady: input.nativeOnnxReadyOverride ?? resolveNativeOnnxReadyFlag(),
    hasByok,
    hasClayKeys,
  })

  const honesty = {
    mesh: probeMeshQualityHonesty({
      conveyorProven: true,
      liveClayPollProven: true,
    }),
    native: probeNativeGenHonesty({
      vramPagerProven: true,
      splatToMeshProven: true,
      vhacdProven: true,
      heatDiffusionProven: true,
      conveyorProven: true,
    }),
  }

  const base = {
    letter: GAME_READY_CHARACTER_LETTER,
    pipelineId: GAME_READY_CHARACTER_PIPELINE_ID,
    route: decision.route,
    nativeOnnxReady: decision.nativeOnnxReady,
    liveClayPollReady: honesty.mesh.liveClayPollReady,
    honesty,
  } as const

  if (decision.route === 'zero-ui-held') {
    return {
      ...base,
      success: false,
      zeroUi: true,
      blockedReason: decision.reason,
      stages: [
        {
          stage: 'onnx-text-to-3d',
          status: 'zero-ui',
          evidence: ['zero-ui', 'silent-moa-fallback', 'letter-cb', decision.reason],
        },
      ],
      fusionViewportStamped: false,
      notes: [...notes, `route:zero-ui-held`, `reason:${decision.reason}`],
    }
  }

  if (decision.route === 'native-ca') {
    const nativeResult = await runNativeGenConveyor({
      projectId: input.projectId,
      userId: input.userId,
      prompt: input.prompt,
      capabilityScore: input.capabilityScore,
      dedicatedVramMb: input.dedicatedVramMb,
      mesh: input.nativeMesh ?? input.clayMesh,
      fusionStore: input.fusionStore,
      skipOnnx: false,
    })
    notes.push('route:native-ca', 'cost:local-$0', 'fusion-tx:required-when-mesh')
    return {
      ...base,
      success: nativeResult.success,
      zeroUi: nativeResult.zeroUi,
      blockedReason: nativeResult.blockedReason,
      stages: nativeResult.stages,
      mesh: nativeResult.mesh,
      fusionViewportStamped: fusionStamped(nativeResult.stages, nativeResult.notes),
      notes: [...notes, ...nativeResult.notes],
      nativeResult,
    }
  }

  if (!input.costGuardAdapter) {
    return {
      ...base,
      success: false,
      zeroUi: true,
      blockedReason: 'cost_guard_adapter_required',
      stages: [
        {
          stage: 'clay-ingest',
          status: 'rejected',
          evidence: ['fail-closed', 'zero-ui', 'letter-cb', 'cost_guard_adapter_required'],
        },
      ],
      fusionViewportStamped: false,
      notes: [...notes, 'blocked:cost_guard_adapter_required'],
    }
  }

  const provider = input.clayProvider ?? input.clayJob?.provider ?? 'generic-mesh-gen'

  if (input.clayJob) {
    const clayInput: LiveClayPollPipelineInput = {
      projectId: input.projectId,
      userId: input.userId,
      prompt: input.prompt,
      clayJob: input.clayJob,
      pollKeys: clayKeys,
      fetchImpl: input.fetchImpl,
      pollClient: input.pollClient,
      clayModelUrl: input.clayModelUrl,
      webhookPayload: input.webhookPayload,
      planId: input.planId,
      byokProfileId: input.byokProfileId,
      capabilityScore: input.capabilityScore,
      fusionStore: input.fusionStore,
      costGuardAdapter: input.costGuardAdapter,
      writePackEntry: input.writePackEntry ?? Boolean(input.fusionStore),
    }
    const clayResult = await runLiveClayPollIntoQualityPipeline(clayInput)
    notes.push('route:byok-bx', 'creative-bridge:mesh', 'costguard:required')
    return {
      ...base,
      success: clayResult.success,
      zeroUi: false,
      blockedReason: clayResult.blockedReason,
      stages: clayResult.pollReceipt
        ? [clayResult.pollReceipt, ...clayResult.stages]
        : clayResult.stages,
      mesh: clayResult.mesh,
      fusionViewportStamped: fusionStamped(clayResult.stages, clayResult.notes),
      notes: [...notes, ...clayResult.notes],
      clayResult,
    }
  }

  const clayResult = await runGameReadyQualityPipeline({
    projectId: input.projectId,
    userId: input.userId,
    prompt: input.prompt,
    clayProvider: provider,
    clayMesh: input.clayMesh,
    offlineObjText: input.offlineObjText,
    planId: input.planId,
    byokProfileId: input.byokProfileId,
    capabilityScore: input.capabilityScore,
    fusionStore: input.fusionStore,
    costGuardAdapter: input.costGuardAdapter,
    writePackEntry: input.writePackEntry ?? Boolean(input.fusionStore),
  })
  notes.push('route:byok-bx-offline', 'creative-bridge:mesh', 'costguard:required')
  return {
    ...base,
    success: clayResult.success,
    zeroUi: false,
    blockedReason: clayResult.blockedReason,
    stages: clayResult.stages,
    mesh: clayResult.mesh,
    fusionViewportStamped: fusionStamped(clayResult.stages, clayResult.notes),
    notes: [...notes, ...clayResult.notes],
    clayResult,
  }
}

export function buildGameReadyCharacterHonestyBadges(input?: {
  nativeOnnxReady?: boolean
  liveClayPollReady?: boolean
  route?: GameReadyCharacterRoute
}): Array<{
  id: string
  label: string
  status: 'available' | 'held' | 'needs-review'
  detail: string
}> {
  const nativeReady = input?.nativeOnnxReady ?? resolveNativeOnnxReadyFlag()
  const clayReady = input?.liveClayPollReady ?? true
  const route = input?.route

  return [
    {
      id: 'native-onnx',
      label: nativeReady ? 'Native ONNX' : 'Native ONNX [HELD]',
      status: nativeReady ? 'available' : 'held',
      detail: nativeReady
        ? 'Local pager Text-to-3D path active — $0 CostGuard; FusionTx still stamps viewport.'
        : 'ORT weights soak HELD — prefer BYOK MoA clay poll (bx); never invent model ship.',
    },
    {
      id: 'byok-clay',
      label: clayReady ? 'BYOK clay poll (bx)' : 'BYOK clay [HELD]',
      status: clayReady ? (route === 'byok-bx' ? 'available' : 'needs-review') : 'held',
      detail: clayReady
        ? 'Tripo/Meshy/Luma poll → CreativeBridge+CostGuard → game-ready conveyor.'
        : 'Live clay poll path not proven — fail-closed Zero-UI.',
    },
    {
      id: 'route',
      label:
        route === 'native-ca'
          ? 'Route · native-ca'
          : route === 'byok-bx'
            ? 'Route · byok-bx'
            : 'Route · zero-ui',
      status: route === 'zero-ui-held' || !route ? 'held' : 'available',
      detail:
        route === 'native-ca'
          ? 'VRAM pager + full native conveyor.'
          : route === 'byok-bx'
            ? 'Cloud clay choked by Law XVI; Aethel owns retopo/LOD/rig/PBR.'
            : 'Silent MoA fallback — no error spam when native HELD and BYOK missing.',
    },
  ]
}
