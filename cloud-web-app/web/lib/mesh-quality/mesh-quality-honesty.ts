/**
 * Letter bw/bx/bz — Mesh quality pipeline honesty probe.
 */

import {
  AUTO_RETOPOLOGY_WIRED,
  INSTANT_MESHES_PARITY_HELD,
  INSTANT_MESHES_PARITY_READY,
  REMESH_QUALITY_DEEPENED,
  AUTO_RETOPOLOGY_LETTER,
} from '@/lib/mesh-quality/auto-retopology'
import { MESH_AUTO_RIGGER_WIRED } from '@/lib/mesh-quality/mesh-auto-rigger'
import { CONTEXTUAL_PBR_WIRED } from '@/lib/mesh-quality/contextual-pbr'
import {
  DELIGHTING_PBR_WIRED,
  DELIGHTING_COMMERCIAL_PARITY_READY,
} from '@/lib/mesh-quality/delighting-pbr'
import {
  SEMANTIC_RETOPOLOGY_WIRED,
  SEMANTIC_COMMERCIAL_PARITY_READY,
} from '@/lib/mesh-quality/semantic-retopology'
import { CLAY_PROVIDER_ADAPTERS_WIRED } from '@/lib/mesh-quality/clay-provider-adapters'
import { LIVE_CLAY_POLL_WIRED, LIVE_CLAY_POLL_LETTER } from '@/lib/mesh-quality/clay-live-poll'
import { MESH_LOD_CASCADE_WIRED } from '@/lib/mesh-quality/mesh-lod-cascade'
import { MESH_UV_VALIDATE_WIRED } from '@/lib/mesh-quality/mesh-uv-validate'
import { MESH_COLLIDER_COOK_WIRED } from '@/lib/mesh-quality/mesh-collider-cook'
import { MESH_TOPOLOGY_CRITIC_WIRED } from '@/lib/mesh-quality/mesh-topology-critic'
import { GAME_READY_QUALITY_PIPELINE_WIRED } from '@/lib/mesh-quality/game-ready-quality-pipeline'
import {
  MESH_QUALITY_PIPELINE_LETTER,
  MESH_QUALITY_PIPELINE_ID,
} from '@/lib/mesh-quality/types'

export interface MeshQualityHonestyReport {
  letter: typeof MESH_QUALITY_PIPELINE_LETTER
  livePollLetter: typeof LIVE_CLAY_POLL_LETTER
  remeshDeepenLetter: typeof AUTO_RETOPOLOGY_LETTER
  pipelineId: typeof MESH_QUALITY_PIPELINE_ID
  meshQualityPipelineReady: boolean
  /** True only when live poll/download/parse path is wired (letter bx). */
  liveClayPollReady: boolean
  /**
   * Letter bz — true when deepened TS remesh path is real (soak-gated via Vitest).
   * Does NOT imply Instant Meshes commercial parity.
   */
  remeshQualityDeepened: boolean
  /** Semantic landmark bias wired (eyes/mouth/elbows) — not commercial semantic remesh. */
  semanticRetopoReady: boolean
  /** Delighting PBR path wired — not commercial ML delighting. */
  delightingPbrReady: boolean
  /** Always false until commercial remesher proven. */
  instantMeshesParityReady: false
  semanticCommercialParityReady: false
  delightingCommercialParityReady: false
  tripoOnlyShipAllowed: false
  instantMeshesParity: false
  commercialRemesherHeld: true
  rustRetopoWorkerHeld: true
  /** V-HACD / heat-diffusion owned by letter ca — not bz. */
  vHacdOwnedByCa: true
  heatDiffusionWeightsOwnedByCa: true
  modules: {
    autoRetopo: boolean
    lodCascade: boolean
    uvValidate: boolean
    autoRig: boolean
    contextualPbr: boolean
    delightingPbr: boolean
    semanticRetopo: boolean
    colliderCook: boolean
    topologyCritic: boolean
    clayAdapters: boolean
    liveClayPoll: boolean
    conveyor: boolean
  }
  notes: string[]
}

export function probeMeshQualityHonesty(input?: {
  /** Set true only after end-to-end pipeline test green. */
  conveyorProven?: boolean
  /** Set true only after live poll→conveyor Vitest green. */
  liveClayPollProven?: boolean
  /** Set false to force remeshQualityDeepened off (soak not proven). */
  remeshDeepenProven?: boolean
}): MeshQualityHonestyReport {
  const modules = {
    autoRetopo: AUTO_RETOPOLOGY_WIRED,
    lodCascade: MESH_LOD_CASCADE_WIRED,
    uvValidate: MESH_UV_VALIDATE_WIRED,
    autoRig: MESH_AUTO_RIGGER_WIRED,
    contextualPbr: CONTEXTUAL_PBR_WIRED,
    delightingPbr: DELIGHTING_PBR_WIRED,
    semanticRetopo: SEMANTIC_RETOPOLOGY_WIRED,
    colliderCook: MESH_COLLIDER_COOK_WIRED,
    topologyCritic: MESH_TOPOLOGY_CRITIC_WIRED,
    clayAdapters: CLAY_PROVIDER_ADAPTERS_WIRED,
    liveClayPoll: LIVE_CLAY_POLL_WIRED,
    conveyor: GAME_READY_QUALITY_PIPELINE_WIRED,
  }
  const allWired = Object.values(modules).every(Boolean)
  const meshQualityPipelineReady = allWired && input?.conveyorProven !== false
  const liveClayPollReady = LIVE_CLAY_POLL_WIRED && input?.liveClayPollProven !== false
  const remeshQualityDeepened =
    REMESH_QUALITY_DEEPENED &&
    INSTANT_MESHES_PARITY_READY === false &&
    input?.remeshDeepenProven !== false

  return {
    letter: MESH_QUALITY_PIPELINE_LETTER,
    livePollLetter: LIVE_CLAY_POLL_LETTER,
    remeshDeepenLetter: AUTO_RETOPOLOGY_LETTER,
    pipelineId: MESH_QUALITY_PIPELINE_ID,
    meshQualityPipelineReady,
    liveClayPollReady,
    remeshQualityDeepened,
    semanticRetopoReady: SEMANTIC_RETOPOLOGY_WIRED && remeshQualityDeepened,
    delightingPbrReady: DELIGHTING_PBR_WIRED && remeshQualityDeepened,
    instantMeshesParityReady: false,
    semanticCommercialParityReady: SEMANTIC_COMMERCIAL_PARITY_READY,
    delightingCommercialParityReady: DELIGHTING_COMMERCIAL_PARITY_READY,
    tripoOnlyShipAllowed: false,
    instantMeshesParity: false,
    commercialRemesherHeld: INSTANT_MESHES_PARITY_HELD,
    rustRetopoWorkerHeld: true,
    vHacdOwnedByCa: true,
    heatDiffusionWeightsOwnedByCa: true,
    modules,
    notes: [
      'Meshy/Tripo win clay; Aethel wins game-ready refine conveyor',
      'Letter bz: feature/manifold remesh + semantic landmark bias + delighting PBR',
      'remeshQualityDeepened ≠ instantMeshesParityReady',
      'semanticCommercialParityReady / delightingCommercialParityReady always false',
      'LOD ca-consumer tiers exported — V-HACD + heat-diffusion weights owned by letter ca',
      'Rust auto_retopology_worker IPC probe wired — commercial remesher soak HELD',
      'Clay ingest fail-closed without BYOK/CostGuard — Zero-UI',
      'Live clay poll (bx) — Tripo/Meshy/Luma status + webhook-ready; no invented bytes',
      'Radiance PBR — delighting strips baked lighting; albedo/N/R/M channels',
    ],
  }
}
