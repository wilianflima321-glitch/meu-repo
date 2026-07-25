/**
 * Letter bx — Live clay poll → game-ready quality conveyor entry.
 * CreativeBridge/CostGuard choke preserved via runGameReadyQualityPipeline ingest.
 */

import {
  resolveLiveClayMesh,
  LIVE_CLAY_POLL_LETTER,
  LIVE_CLAY_POLL_WIRED,
  type ClayPollClientKeys,
  type ClayProviderPollClient,
  type FetchLike,
} from '@/lib/mesh-quality/clay-live-poll'
import {
  runGameReadyQualityPipeline,
  type GameReadyPipelineInput,
  type GameReadyPipelineResult,
} from '@/lib/mesh-quality/game-ready-quality-pipeline'
import type { ClayProviderId } from '@/lib/mesh-quality/clay-provider-adapters'
import {
  MESH_QUALITY_PIPELINE_ID,
  MESH_QUALITY_PIPELINE_LETTER,
  type MeshQualityStageReceipt,
  type RawMeshBuffer,
} from '@/lib/mesh-quality/types'

export interface LiveClayPollPipelineInput extends GameReadyPipelineInput {
  clayJob: {
    provider: ClayProviderId
    taskId: string
  }
  pollKeys?: ClayPollClientKeys
  fetchImpl?: FetchLike
  pollClient?: ClayProviderPollClient
  maxPollAttempts?: number
  pollIntervalMs?: number
  pollSleep?: (ms: number) => Promise<void>
  webhookPayload?: unknown
  /** When status route already returned modelUrl — skip re-poll download URL discovery. */
  clayModelUrl?: string
}

export interface LiveClayPollPipelineResult extends GameReadyPipelineResult {
  liveClayPollReady: typeof LIVE_CLAY_POLL_WIRED
  livePollLetter: typeof LIVE_CLAY_POLL_LETTER
  pollReceipt?: MeshQualityStageReceipt
}

/** Serialize polled GLB mesh back to OBJ so CostGuard clay ingest still runs. */
export function rawMeshToObjText(mesh: RawMeshBuffer): string {
  const lines: string[] = []
  const vCount = Math.floor(mesh.positions.length / 3)
  for (let i = 0; i < vCount; i++) {
    const o = i * 3
    lines.push(`v ${mesh.positions[o]} ${mesh.positions[o + 1]} ${mesh.positions[o + 2]}`)
  }
  const triCount = Math.floor(mesh.indices.length / 3)
  for (let t = 0; t < triCount; t++) {
    const o = t * 3
    const a = mesh.indices[o]! + 1
    const b = mesh.indices[o + 1]! + 1
    const c = mesh.indices[o + 2]! + 1
    lines.push(`f ${a} ${b} ${c}`)
  }
  return lines.join('\n')
}

/**
 * Poll/webhook clay job → feed mesh into runGameReadyQualityPipeline.
 * Fail-closed without BYOK keys / CostGuard adapter. Empty-honest on job failure.
 * settle:0 on CostGuard reject remains inside CreativeBridge ingest path.
 */
export async function runLiveClayPollIntoQualityPipeline(
  input: LiveClayPollPipelineInput,
): Promise<LiveClayPollPipelineResult> {
  if (!input.costGuardAdapter) {
    return {
      letter: MESH_QUALITY_PIPELINE_LETTER,
      pipelineId: MESH_QUALITY_PIPELINE_ID,
      success: false,
      blockedReason: 'cost_guard_adapter_required',
      stages: [],
      tripoOnlyShipAllowed: false,
      instantMeshesParity: false,
      instantMeshesParityReady: false,
      remeshQualityDeepened: false,
      semanticCommercialParityReady: false,
      delightingCommercialParityReady: false,
      notes: ['blocked:cost_guard_adapter_required'],
      liveClayPollReady: LIVE_CLAY_POLL_WIRED,
      livePollLetter: LIVE_CLAY_POLL_LETTER,
    }
  }

  const keys: ClayPollClientKeys = input.pollKeys ?? {
    TRIPO_API_KEY: process.env.TRIPO_API_KEY,
    LUMA_API_KEY: process.env.LUMA_API_KEY,
    MESHY_API_KEY: process.env.MESHY_API_KEY,
  }

  const resolved = await resolveLiveClayMesh({
    provider: input.clayJob.provider,
    taskId: input.clayJob.taskId,
    keys,
    fetchImpl: input.fetchImpl,
    client: input.pollClient,
    maxAttempts: input.maxPollAttempts ?? 8,
    intervalMs: input.pollIntervalMs ?? 0,
    sleep: input.pollSleep,
    webhookPayload: input.webhookPayload,
    modelUrl: input.clayModelUrl,
  })

  if (!resolved.ok || !resolved.mesh) {
    return {
      letter: MESH_QUALITY_PIPELINE_LETTER,
      pipelineId: MESH_QUALITY_PIPELINE_ID,
      success: false,
      blockedReason: resolved.blockedReason ?? 'live_clay_poll_failed',
      stages: [resolved.receipt],
      tripoOnlyShipAllowed: false,
      instantMeshesParity: false,
      instantMeshesParityReady: false,
      remeshQualityDeepened: false,
      semanticCommercialParityReady: false,
      delightingCommercialParityReady: false,
      notes: [
        'Meshy/Tripo = clay only; Aethel owns game-ready refine',
        `poll_failed:${resolved.blockedReason ?? 'unknown'}`,
      ],
      liveClayPollReady: LIVE_CLAY_POLL_WIRED,
      livePollLetter: LIVE_CLAY_POLL_LETTER,
      pollReceipt: resolved.receipt,
    }
  }

  // Always feed OBJ text through CreativeBridge clay ingest (CostGuard / settle:0).
  const offlineObjText = resolved.objText ?? rawMeshToObjText(resolved.mesh)

  const pipeline = await runGameReadyQualityPipeline({
    ...input,
    clayProvider: input.clayJob.provider,
    clayMesh: undefined,
    offlineObjText,
  })

  return {
    ...pipeline,
    liveClayPollReady: LIVE_CLAY_POLL_WIRED,
    livePollLetter: LIVE_CLAY_POLL_LETTER,
    pollReceipt: resolved.receipt,
  }
}