/**
 * Letter ca — Native 3D Generation conveyor (travas 1–7).
 *
 * VRAM pager → (optional ONNX HELD) → splat→mesh → bz semantic → bz delighting
 * → bw LOD0/1/2 → V-HACD → heat-diffusion skin → FusionTx viewport stamp.
 *
 * BYOK MoA clay remains; native is enhancement Zero-UI when VRAM insufficient.
 * Never Instant Meshes / Tripo local parity claims.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { buildMeshLodCascade, type MeshLodLevel } from '@/lib/mesh-quality/mesh-lod-cascade'
import { detectSemanticLandmarks, buildSemanticFeatureMask } from '@/lib/mesh-quality/semantic-retopology'
import { delightClayTextureToRadiancePbr, type DelightingPbrResult, type ClayTextureBuffer } from '@/lib/mesh-quality/delighting-pbr'
import type { ScenePbrContext } from '@/lib/mesh-quality/contextual-pbr'
import { runAutoRetopology } from '@/lib/mesh-quality/auto-retopology'
import {
  buildTestIcosphere,
  type RawMeshBuffer,
} from '@/lib/mesh-quality/types'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  abortCreativeFusionTransaction,
  recordFusionMutation,
  type FusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import {
  NATIVE_GEN_LETTER,
  NATIVE_GEN_PIPELINE_ID,
  buildSyntheticSplatCloud,
  evaluateNativeGenCapability,
  type GaussianSplatCloud,
  type NativeGenStageReceipt,
} from '@/lib/native-gen/types'
import { runVramPagerNativeGenWindow } from '@/lib/native-gen/vram-pager'
import { submitOnnxNativeGenJob, resolveNativeOnnxReadyFlag } from '@/lib/native-gen/onnx-job-protocol'
import { extractMeshFromSplats } from '@/lib/native-gen/splat-to-mesh'
import { decomposeVhacdApproximate, type VhacdDecompositionResult } from '@/lib/native-gen/vhacd-decomposition'
import {
  paintHeatDiffusionSkinWeights,
  type HeatDiffusionSkinResult,
} from '@/lib/native-gen/heat-diffusion-skin'

const log = createComponentLogger('native-gen-conveyor')

export const NATIVE_GEN_CONVEYOR_WIRED = true as const

export interface NativeGenConveyorInput {
  projectId: string
  userId: string
  prompt: string
  capabilityScore?: number
  dedicatedVramMb?: number | null
  /** Pre-parsed mesh (tests / post-splat). */
  mesh?: RawMeshBuffer
  /** 3DGS cloud — extracted before remesh. */
  splatCloud?: GaussianSplatCloud
  /** Optional clay albedo for delighting → Radiance. */
  clayTexture?: ClayTextureBuffer
  sceneContext?: ScenePbrContext
  fusionStore?: FusionScopeStore
  maxHulls?: number
  /** Skip ONNX submit (tests focusing on mesh path). */
  skipOnnx?: boolean
}

export interface NativeGenConveyorResult {
  letter: typeof NATIVE_GEN_LETTER
  pipelineId: typeof NATIVE_GEN_PIPELINE_ID
  success: boolean
  zeroUi: boolean
  blockedReason?: string
  stages: NativeGenStageReceipt[]
  mesh?: RawMeshBuffer
  lods?: MeshLodLevel[]
  vhacd?: VhacdDecompositionResult
  skin?: HeatDiffusionSkinResult
  delighting?: DelightingPbrResult
  nativeOnnxReady: false
  vramPagerReady: boolean
  splatToMeshReady: boolean
  vhacdReady: boolean
  heatDiffusionReady: boolean
  instantMeshesParityReady: false
  tripoLocalParityReady: false
  notes: string[]
}

export async function runNativeGenConveyor(
  input: NativeGenConveyorInput,
): Promise<NativeGenConveyorResult> {
  const stages: NativeGenStageReceipt[] = []
  const notes: string[] = [
    'Letter ca — Native 3D Generation Travas 1–7',
    'BYOK MoA clay remains; native ONNX enhancement Zero-UI when VRAM insufficient',
    'Instant Meshes / Tripo local parity HELD',
    'bz owns semantic retopo + delighting — ca consumes',
    'bw LOD cascade deepened inside native conveyor',
  ]
  const score = input.capabilityScore ?? 100
  const gate = evaluateNativeGenCapability({
    capabilityScore: score,
    dedicatedVramMb: input.dedicatedVramMb,
  })

  let mesh = input.mesh
  let splatToMeshReady = false
  let vhacdReady = false
  let heatDiffusionReady = false
  let lods: MeshLodLevel[] | undefined
  let vhacd: VhacdDecompositionResult | undefined
  let skin: HeatDiffusionSkinResult | undefined
  let delighting: DelightingPbrResult | undefined
  let zeroUi = gate.zeroUiFallback
  let jobOk = false

  const runMeshPipeline = async (): Promise<{ ok: boolean; error?: string }> => {
    // ONNX — honest HELD / Zero-UI (only attempt when discrete path allowed)
    if (!input.skipOnnx) {
      const onnx = submitOnnxNativeGenJob({
        kind: 'text-to-3d',
        prompt: input.prompt,
        projectId: input.projectId,
        capabilityScore: score,
        dedicatedVramMb: input.dedicatedVramMb,
      })
      stages.push(onnx.receipt)
      if (onnx.zeroUi) zeroUi = true
    }

    // Splat → mesh
    if (input.splatCloud) {
      const extract = extractMeshFromSplats({ cloud: input.splatCloud })
      stages.push(extract.receipt)
      splatToMeshReady = extract.splatToMeshReady
      if (extract.splatToMeshReady) {
        mesh = extract.mesh
      } else if (!mesh) {
        return { ok: false, error: 'splat_to_mesh_failed' }
      }
    }

    if (!mesh) {
      if (!resolveNativeOnnxReadyFlag()) {
        stages.push({
          stage: 'onnx-text-to-3d',
          status: 'held',
          evidence: ['no-mesh-input', 'onnx-models-HELD'],
          heldReason: 'No mesh/splat input and native ONNX weights HELD',
        })
        return { ok: false, error: 'no_mesh_onnx_held' }
      }
      return { ok: false, error: 'no_mesh_input' }
    }

    // Light remesh pass (bz deepen via auto-retopo) before semantic bias
    const retopo = runAutoRetopology({
      mesh,
      targetTriangles: Math.min(
        10_000,
        Math.max(200, Math.floor(mesh.indices.length / 3) || 2000),
      ),
      capabilityScore: score,
      allowInlineOnWeakGpu: score >= 45,
    })
    mesh = retopo.mesh

    // Consume bz semantic landmarks (do not duplicate forever)
    const landmarks = detectSemanticLandmarks(mesh)
    const mask = buildSemanticFeatureMask(mesh)
    stages.push({
      stage: 'semantic-retopo',
      status: retopo.receipt.status === 'rejected' ? 'rejected' : 'closed',
      evidence: [
        'consume-bz-semantic-retopology',
        'pre-semantic-auto-retopo-bz',
        ...retopo.receipt.evidence,
        `landmarks=${landmarks.landmarks.length}`,
        `facialHint=${landmarks.facialMocapReadyHint}`,
        'semanticCommercialParityReady:false',
      ],
      metrics: {
        landmarkCount: landmarks.landmarks.length,
        lockVertices: mask.lockStrength.length,
        semanticCommercialParityReady: false,
        remeshQualityDeepened: retopo.remeshQualityDeepened,
      },
      heldReason: retopo.receipt.heldReason,
    })

    // Delighting → Radiance (bz)
    if (input.clayTexture) {
      delighting = delightClayTextureToRadiancePbr({
        clayTexture: input.clayTexture,
        context: input.sceneContext,
      })
      stages.push({
        ...delighting.receipt,
        stage: 'delighting-pbr',
        evidence: [
          ...delighting.receipt.evidence,
          'consume-bz-delighting',
          'radiance-ready-channels',
          'delightingCommercialParityReady:false',
        ],
      })
    } else {
      stages.push({
        stage: 'delighting-pbr',
        status: 'skipped',
        evidence: ['no-clay-texture', 'bz-delighting-api-ready'],
      })
    }

    // LOD0/1/2 — deepen bw cascade
    const lod = buildMeshLodCascade({
      mesh,
      capabilityScore: score,
    })
    stages.push({
      ...lod.receipt,
      evidence: [...lod.receipt.evidence, 'native-conveyor-bw-lod', 'lod2-far-tier'],
    })
    lods = lod.lods
    mesh = lod.lods[0]?.mesh ?? mesh

    // V-HACD (fail-closed single on weak — still runs)
    vhacd = decomposeVhacdApproximate({
      mesh,
      maxHulls: input.maxHulls,
      capabilityScore: score,
      allowInlineOnWeakGpu: false,
    })
    stages.push(vhacd.receipt)
    vhacdReady = vhacd.vhacdReady

    // Heat diffusion skin
    skin = paintHeatDiffusionSkinWeights({ mesh })
    stages.push(skin.receipt)
    heatDiffusionReady = skin.heatDiffusionReady

    return { ok: true }
  }

  // VRAM pager window only when ONNX alloc could run; else CPU mesh path + Zero-UI note
  let pagerSnapshotState: string = 'idle'
  let pagerModelResident = false

  if (gate.onnxPathAllowed) {
    const pager = await runVramPagerNativeGenWindow({
      capabilityScore: score,
      dedicatedVramMb: input.dedicatedVramMb,
      preferCpuFallbackOnWeak: true,
      job: runMeshPipeline,
    })
    stages.unshift(...pager.receipts.filter((r) => r.stage === 'vram-pager'))
    if (pager.zeroUi) zeroUi = true
    jobOk = pager.jobOk
    pagerSnapshotState = pager.snapshot.state
    pagerModelResident = pager.snapshot.modelResident
  } else {
    const pager = await runVramPagerNativeGenWindow({
      capabilityScore: score,
      dedicatedVramMb: input.dedicatedVramMb,
      preferCpuFallbackOnWeak: true,
      job: async () => ({ ok: true }),
    })
    stages.push(...pager.receipts.filter((r) => r.stage === 'vram-pager'))
    zeroUi = true
    pagerSnapshotState = pager.snapshot.state
    pagerModelResident = pager.snapshot.modelResident
    // CPU mesh post-process still allowed when clay/splat provided
    if (input.mesh || input.splatCloud) {
      const meshResult = await runMeshPipeline()
      jobOk = meshResult.ok
    } else {
      if (!input.skipOnnx) {
        const onnx = submitOnnxNativeGenJob({
          kind: 'text-to-3d',
          prompt: input.prompt,
          projectId: input.projectId,
          capabilityScore: score,
          dedicatedVramMb: input.dedicatedVramMb,
        })
        stages.push(onnx.receipt)
      }
      jobOk = false
    }
  }

  const vramPagerReady = pagerSnapshotState === 'idle' && !pagerModelResident

  // FusionTx manifest stamp (Law XVI Trava II) — even when native $0 local
  if (mesh && input.fusionStore && jobOk) {
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
          nativeGenMesh: true,
          letter: NATIVE_GEN_LETTER,
          pipelineId: NATIVE_GEN_PIPELINE_ID,
          triangleHint: Math.floor((mesh.indices.length || 0) / 3),
          lodCount: lods?.length ?? 0,
          hullCount: vhacd?.hullCount ?? 0,
          heatDiffusionReady,
        }),
      )
      await commitCreativeFusionTransaction(tx.id, input.fusionStore)
      stages.push({
        stage: 'fusion-viewport',
        status: 'closed',
        evidence: ['creative-fusion-transaction', 'trava-ii', 'ctrl-z-atomic'],
      })
    } catch (err) {
      if (txId) {
        await abortCreativeFusionTransaction(txId, input.fusionStore).catch(() => undefined)
      }
      log.info('native_gen_fusion_abort', {
        error: err instanceof Error ? err.message : 'unknown',
      })
      stages.push({
        stage: 'fusion-viewport',
        status: 'rejected',
        evidence: ['fusion-abort'],
        heldReason: err instanceof Error ? err.message : 'fusion_failed',
      })
    }
  }

  const success = jobOk && !!mesh

  return {
    letter: NATIVE_GEN_LETTER,
    pipelineId: NATIVE_GEN_PIPELINE_ID,
    success,
    zeroUi,
    blockedReason: success
      ? undefined
      : stages.find((r) => r.heldReason)?.heldReason ?? 'native_gen_incomplete',
    stages,
    mesh,
    lods,
    vhacd,
    skin,
    delighting,
    nativeOnnxReady: false,
    vramPagerReady,
    splatToMeshReady,
    vhacdReady,
    heatDiffusionReady,
    instantMeshesParityReady: false,
    tripoLocalParityReady: false,
    notes,
  }
}

/** Fixture helper for Vitest — icosphere + synthetic splats. */
export function buildNativeGenTestFixtures() {
  return {
    mesh: buildTestIcosphere(2),
    splatCloud: buildSyntheticSplatCloud(192),
  }
}
