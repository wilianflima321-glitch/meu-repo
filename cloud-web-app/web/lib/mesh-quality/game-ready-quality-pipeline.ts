/**
 * Letter bw — Game-ready quality conveyor orchestrator.
 * text/clay OBJ → retopo → UV → LOD → rig → PBR → collider → critic → optional pack entry.
 * Meshy/Tripo = clay; Aethel = game-ready refine. Zero-MVP · Law XVI Travas.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { runAutoRetopology } from '@/lib/mesh-quality/auto-retopology'
import { buildMeshLodCascade } from '@/lib/mesh-quality/mesh-lod-cascade'
import { ensureAndValidateUvs } from '@/lib/mesh-quality/mesh-uv-validate'
import { cookMeshColliders } from '@/lib/mesh-quality/mesh-collider-cook'
import { runMeshAutoRigger, type MeshAutoRigResult } from '@/lib/mesh-quality/mesh-auto-rigger'
import { assignContextualPbr, type ContextualPbrResult, type ScenePbrContext } from '@/lib/mesh-quality/contextual-pbr'
import type { ClayTextureBuffer } from '@/lib/mesh-quality/delighting-pbr'
import type { NativeGenLodCaConsumerPayload } from '@/lib/mesh-quality/mesh-lod-cascade'
import type { SemanticLandmark } from '@/lib/mesh-quality/semantic-retopology'
import {
  ingestClayMesh,
  type ClayIngestRequest,
  type ClayProviderId,
} from '@/lib/mesh-quality/clay-provider-adapters'
import { critiqueMeshTopology } from '@/lib/mesh-quality/mesh-topology-critic'
import {
  sealClayRefineEvidence,
  type ClayRefineEvidenceReceipt,
} from '@/lib/mesh-quality/clay-refine-evidence'
import {
  DEFAULT_RETOPO_TARGET_TRIANGLES,
  MESH_QUALITY_PIPELINE_ID,
  MESH_QUALITY_PIPELINE_LETTER,
  type MeshQualityStageReceipt,
  type RawMeshBuffer,
} from '@/lib/mesh-quality/types'
import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  abortCreativeFusionTransaction,
  recordFusionMutation,
  type FusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import {
  dispatchCreativeArtifact,
} from '@/lib/production/creative-artifact-bridge'
import { CREATIVE_WEIGHTED_TOKEN_ESTIMATES } from '@/lib/creative-provider-matrix'
import { writeAethelPack } from '@/lib/immunity/aethel-pack-writer'
import type { CookedCollider } from '@/lib/mesh-quality/mesh-collider-cook'
import type { MeshLodLevel } from '@/lib/mesh-quality/mesh-lod-cascade'

const log = createComponentLogger('game-ready-quality-pipeline')

export const GAME_READY_QUALITY_PIPELINE_WIRED = true as const

export interface GameReadyPipelineInput {
  projectId: string
  userId: string
  prompt: string
  /** Clay provider when ingesting via MoA/BYOK. */
  clayProvider?: ClayProviderId
  /** Pre-parsed clay mesh — skips provider (tests / post-poll OBJ). */
  clayMesh?: RawMeshBuffer
  offlineObjText?: string
  planId?: string
  byokProfileId?: string
  usageBucketId?: string
  targetTriangles?: number
  capabilityScore?: number
  sceneContext?: ScenePbrContext
  /** When true + CostGuard allow, queue texture refine via CreativeBridge. */
  requestTextureRefine?: boolean
  /** Optional Fusion scope for manifest stamp. */
  fusionStore?: FusionScopeStore
  costGuardAdapter?: CostGuardLedgerAdapter
  /** Include AethelPack mesh entry when critic passes. */
  writePackEntry?: boolean
  /** Optional clay texture for Delighting → Radiance albedo/N/R/M. */
  clayTexture?: ClayTextureBuffer
  /** Force delighting even without clayTexture. */
  runDelighting?: boolean
}

export interface GameReadyPipelineResult {
  letter: typeof MESH_QUALITY_PIPELINE_LETTER
  pipelineId: typeof MESH_QUALITY_PIPELINE_ID
  success: boolean
  blockedReason?: string
  stages: MeshQualityStageReceipt[]
  mesh?: RawMeshBuffer
  lods?: MeshLodLevel[]
  /** LOD tiers for native-gen ca consumer (no V-HACD / heat weights). */
  caLodConsumer?: NativeGenLodCaConsumerPayload
  rig?: MeshAutoRigResult
  pbr?: ContextualPbrResult
  colliders?: { convex: CookedCollider; trimesh: CookedCollider }
  packBytes?: Uint8Array
  packSha256?: string
  /** Top-8 #4 — durable clay→refine fingerprint when critic passes. */
  refineEvidence?: ClayRefineEvidenceReceipt
  semanticLandmarks?: SemanticLandmark[]
  facialMocapReadyHint?: boolean
  tripoOnlyShipAllowed: false
  instantMeshesParity: false
  instantMeshesParityReady: false
  remeshQualityDeepened: boolean
  semanticCommercialParityReady: false
  delightingCommercialParityReady: false
  notes: string[]
}

export async function runGameReadyQualityPipeline(
  input: GameReadyPipelineInput,
): Promise<GameReadyPipelineResult> {
  const stages: MeshQualityStageReceipt[] = []
  const notes: string[] = [
    'Meshy/Tripo = clay only; Aethel owns game-ready refine',
    'Letter bz: TS remesh deepen + semantic landmark bias + delighting PBR',
    'Instant Meshes / QuadriFlow commercial remesh HELD — instantMeshesParityReady: false',
    'remeshQualityDeepened: true when TS deepen path runs',
    'LOD tiers ca-consumer compatible — V-HACD / heat-diffusion owned by letter ca',
    'tripoOnlyShipAllowed: false',
  ]

  let mesh: RawMeshBuffer | undefined = input.clayMesh

  // 1. Clay ingest (optional when clayMesh provided)
  if (!mesh) {
    if (!input.costGuardAdapter) {
      return blocked('cost_guard_adapter_required', stages, notes)
    }
    const clayReq: ClayIngestRequest = {
      prompt: input.prompt,
      projectId: input.projectId,
      userId: input.userId,
      provider: input.clayProvider ?? 'tripo',
      planId: input.planId,
      byokProfileId: input.byokProfileId,
      usageBucketId: input.usageBucketId,
      offlineObjText: input.offlineObjText,
    }
    const clay = await ingestClayMesh({
      request: clayReq,
      adapter: input.costGuardAdapter,
    })
    stages.push(clay.receipt)
    if (!clay.ok || !clay.mesh) {
      return blocked(clay.blockedReason ?? 'clay_ingest_failed', stages, notes)
    }
    mesh = clay.mesh
  } else {
    stages.push({
      stage: 'clay-ingest',
      status: 'closed',
      evidence: ['preparsed-clay-mesh'],
      metrics: { triangles: Math.floor(mesh.indices.length / 3) },
    })
  }

  // 2. Auto-retopo (letter bz deepen — Instant Meshes parity still HELD)
  const retopo = runAutoRetopology({
    mesh,
    targetTriangles: input.targetTriangles ?? DEFAULT_RETOPO_TARGET_TRIANGLES,
    capabilityScore: input.capabilityScore ?? 100,
    allowInlineOnWeakGpu: (input.capabilityScore ?? 100) >= 45,
    preferNativeWorker: true,
  })
  stages.push(retopo.receipt)
  if (retopo.receipt.status === 'rejected') {
    return blocked('retopo_rejected', stages, notes, {
      mesh: retopo.mesh,
      remeshQualityDeepened: retopo.remeshQualityDeepened,
    })
  }
  if (retopo.deferredToWorker) {
    notes.push('Heavy remesh deferred — Capability Score gate (offline/worker)')
    return blocked('retopo_deferred_weak_gpu', stages, notes, {
      mesh,
      remeshQualityDeepened: retopo.remeshQualityDeepened,
    })
  }
  mesh = retopo.mesh
  if (retopo.remeshQualityDeepened) {
    notes.push('remeshQualityDeepened: TS feature-aware manifold + semantic landmark path')
  }
  if (retopo.facialMocapReadyHint) {
    notes.push('facialMocapReadyHint: eyes+mouth landmarks biased for edge loops')
  }
  if (retopo.nativeWorker?.held) {
    notes.push(`native-worker-ipc: HELD (${retopo.nativeWorker.heldReason})`)
  }

  // 3. UV validate
  const uv = ensureAndValidateUvs(mesh)
  stages.push(uv.receipt)
  if (uv.receipt.status === 'rejected') {
    return blocked('uv_rejected', stages, notes, { mesh })
  }
  mesh = uv.mesh

  // 4. LOD cascade (ca-consumer tiers — no V-HACD / heat weights)
  const lods = buildMeshLodCascade({
    mesh,
    lod0Triangles: retopo.trianglesAfter,
    capabilityScore: input.capabilityScore ?? 100,
    semanticLandmarks: true,
  })
  stages.push(lods.receipt)

  // 5. Auto-rig (empty-honest if non-humanoid) — heat-diffusion weights stay on ca
  const rig = runMeshAutoRigger(mesh)
  stages.push(rig.receipt)

  // 6. Contextual PBR + optional Delighting (Radiance albedo/N/R/M)
  const pbr = assignContextualPbr({
    context: input.sceneContext ?? { promptHint: input.prompt },
    requestTextureRefine: input.requestTextureRefine === true,
    clayTexture: input.clayTexture,
    runDelighting: input.runDelighting === true || input.clayTexture !== undefined,
  })
  stages.push(pbr.receipt)
  if (pbr.bakedLightingStripped) {
    notes.push('delighting: baked lighting stripped — Radiance albedo/normal/roughness/metalness')
  }

  // 6b. Texture refine via CreativeBridge when requested + adapter present
  if (pbr.textureRefineRequested && input.costGuardAdapter) {
    const refineOk = await runTextureRefineViaBridge(input)
    if (!refineOk) {
      notes.push('Texture refine blocked by CostGuard — PBR params kept; settle:0 path honored')
    } else {
      notes.push('Texture refine dispatched via CreativeBridge + CostGuard')
    }
  }

  // 7. Colliders
  const colliders = cookMeshColliders({ mesh })
  stages.push(colliders.receipt)

  // 8. Topology critic
  const critic = critiqueMeshTopology({ mesh })
  stages.push(critic.receipt)
  if (!critic.approved) {
    return blocked(`topology_critic:${critic.rejectReasons.join(',')}`, stages, notes, {
      mesh,
      lods: lods.lods,
      rig,
      pbr,
      colliders: { convex: colliders.convex, trimesh: colliders.trimesh },
    })
  }

  // 9. Optional AethelPack entry + FusionTx stamp
  let packBytes: Uint8Array | undefined
  let packSha256: string | undefined
  if (input.writePackEntry) {
    const meshBytes = encodeMeshPayload(mesh, lods.lods)
    const written = writeAethelPack({
      buildId: `bw-quality-${Date.now()}`,
      projectId: input.projectId,
      compression: 'deflate',
      meshes: [
        {
          assetId: `game-ready-${MESH_QUALITY_PIPELINE_LETTER}`,
          codec: 'raw-gltf',
          lodCount: lods.lods.length,
          bytes: meshBytes,
        },
      ],
      textures: [],
    })
    if (!written.ok || written.packBytes.length === 0) {
      stages.push({
        stage: 'aethelpack-entry',
        status: 'rejected',
        evidence: ['law-xvi-no-empty-pack'],
        heldReason: written.errors?.join(',') ?? 'empty pack',
      })
      return blocked('aethelpack_empty', stages, notes, {
        mesh,
        lods: lods.lods,
        rig,
        pbr,
        colliders: { convex: colliders.convex, trimesh: colliders.trimesh },
      })
    }
    packBytes = written.packBytes
    packSha256 = written.packSha256
    stages.push({
      stage: 'aethelpack-entry',
      status: 'closed',
      evidence: ['aethelpack-mesh-slot', 'sha256'],
      metrics: { bytes: packBytes.length, lodCount: lods.lods.length },
    })

    if (input.fusionStore) {
      let txId: string | undefined
      try {
        const tx = await beginCreativeFusionTransaction({
          projectId: input.projectId,
          yDocScope: 'manifest',
          store: input.fusionStore,
        })
        txId = tx.id
        recordFusionMutation(
          tx.id,
          input.fusionStore,
          JSON.stringify({
            gameReadyMesh: true,
            letter: MESH_QUALITY_PIPELINE_LETTER,
            packSha256,
            lodCount: lods.lods.length,
            walkReady: rig.walkReady,
          }),
        )
        await commitCreativeFusionTransaction(tx.id, input.fusionStore)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'fusion_failed'
        log.info('FusionTx stamp failed', { msg })
        if (txId) {
          await abortCreativeFusionTransaction(txId, input.fusionStore).catch(() => undefined)
        }
        notes.push(`FusionTx stamp HELD: ${msg}`)
      }
    }
  } else {
    stages.push({
      stage: 'aethelpack-entry',
      status: 'skipped',
      evidence: ['pack-optional'],
    })
  }

  log.info('Game-ready pipeline closed', {
    triangles: Math.floor(mesh.indices.length / 3),
    walkReady: rig.walkReady,
    stages: stages.length,
  })

  const refineSeal = sealClayRefineEvidence({
    projectId: input.projectId,
    providerId: input.clayMesh ? 'preparsed' : (input.clayProvider ?? 'unknown'),
    capabilityScore: input.capabilityScore ?? null,
    triangleBudgetTarget: input.targetTriangles ?? DEFAULT_RETOPO_TARGET_TRIANGLES,
    mesh,
    criticApproved: true,
    stages,
    packSha256,
  })
  if (!refineSeal.ok) {
    return blocked(`refine_evidence:${refineSeal.code}`, stages, notes, {
      mesh,
      lods: lods.lods,
      rig,
      pbr,
      colliders: { convex: colliders.convex, trimesh: colliders.trimesh },
      packBytes,
      packSha256,
      remeshQualityDeepened: retopo.remeshQualityDeepened,
    })
  }
  notes.push(`clay-refine-evidence:${refineSeal.value.fingerprint}`)

  return {
    letter: MESH_QUALITY_PIPELINE_LETTER,
    pipelineId: MESH_QUALITY_PIPELINE_ID,
    success: true,
    stages,
    mesh,
    lods: lods.lods,
    caLodConsumer: lods.caConsumer,
    rig,
    pbr,
    colliders: { convex: colliders.convex, trimesh: colliders.trimesh },
    packBytes,
    packSha256,
    refineEvidence: refineSeal.value,
    semanticLandmarks: retopo.semanticLandmarks,
    facialMocapReadyHint: retopo.facialMocapReadyHint,
    tripoOnlyShipAllowed: false,
    instantMeshesParity: false,
    instantMeshesParityReady: false,
    remeshQualityDeepened: retopo.remeshQualityDeepened,
    semanticCommercialParityReady: false,
    delightingCommercialParityReady: false,
    notes,
  }
}

function blocked(
  reason: string,
  stages: MeshQualityStageReceipt[],
  notes: string[],
  partial?: Partial<GameReadyPipelineResult>,
): GameReadyPipelineResult {
  return {
    letter: MESH_QUALITY_PIPELINE_LETTER,
    pipelineId: MESH_QUALITY_PIPELINE_ID,
    success: false,
    blockedReason: reason,
    stages,
    tripoOnlyShipAllowed: false,
    instantMeshesParity: false,
    instantMeshesParityReady: false,
    remeshQualityDeepened: partial?.remeshQualityDeepened === true,
    semanticCommercialParityReady: false,
    delightingCommercialParityReady: false,
    notes: [...notes, `blocked:${reason}`],
    ...partial,
  }
}

function encodeMeshPayload(mesh: RawMeshBuffer, lods: MeshLodLevel[]): Uint8Array {
  const header = new TextEncoder().encode(
    JSON.stringify({
      kind: 'aethel-game-ready-mesh',
      letter: MESH_QUALITY_PIPELINE_LETTER,
      lodCount: lods.length,
      triangles: Math.floor(mesh.indices.length / 3),
      vertices: Math.floor(mesh.positions.length / 3),
    }),
  )
  const payload = new Uint8Array(header.length + mesh.positions.byteLength + mesh.indices.byteLength)
  payload.set(header, 0)
  payload.set(new Uint8Array(mesh.positions.buffer, mesh.positions.byteOffset, mesh.positions.byteLength), header.length)
  payload.set(
    new Uint8Array(mesh.indices.buffer, mesh.indices.byteOffset, mesh.indices.byteLength),
    header.length + mesh.positions.byteLength,
  )
  return payload
}

async function runTextureRefineViaBridge(input: GameReadyPipelineInput): Promise<boolean> {
  if (!input.costGuardAdapter) return false
  try {
    const { result } = await dispatchCreativeArtifact({
      request: {
        domain: 'texture',
        prompt: `Refine PBR textures (no albedo bake): ${input.prompt}`,
        projectId: input.projectId,
        userId: input.userId,
        costGuard: {
          byokProfileId: input.byokProfileId,
          usageBucketId: input.usageBucketId,
          estimatedTokenWeight: CREATIVE_WEIGHTED_TOKEN_ESTIMATES.imageStandard,
          planId: input.planId ?? 'pro',
        },
        requiresFusionWrite: false,
      },
      adapter: input.costGuardAdapter,
      provider: async () => ({
        artifactId: `pbr-refine-${MESH_QUALITY_PIPELINE_LETTER}`,
        provider: 'contextual-pbr-refine',
        costUsd: 0,
        actualTokenWeight: CREATIVE_WEIGHTED_TOKEN_ESTIMATES.imageStandard,
        empty: false,
      }),
    })
    return result.success
  } catch {
    return false
  }
}
