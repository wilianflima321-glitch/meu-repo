/**
 * Letter cc — World Forge honesty aggregate.
 * Letter ch — GPU Recast heightfield→walkable soak-gated; Unreal Recast parity HELD.
 * Letter ct — Detour agent/off-mesh soak-gated `detourNavReady`; UE parity + editor HELD.
 * Flip Ready flags only with real soak — never Nanite / Substance / city-from-prompt / UE Recast.
 */

import { WORLD_FORGE_LETTER, WORLD_FORGE_PIPELINE_ID } from '@/lib/world-forge/types'
import {
  LORA_CLAY_REGISTRY_WIRED,
  LORA_CLAY_READY,
  LORA_WEIGHTS_HELD,
  probeLoraClayReadiness,
} from '@/lib/world-forge/lora-clay-registry'
import { LORA_PAGER_INJECT_WIRED } from '@/lib/world-forge/lora-pager-inject'
import {
  SDF_FRACTAL_SCULPT_WIRED,
  SDF_STREAMING_CARVE_READY,
} from '@/lib/world-forge/sdf-fractal-sculpt'
import {
  SEAMLESS_PBR_BAKE_WIRED,
  SUBSTANCE_CLASS_PARITY_READY,
} from '@/lib/world-forge/seamless-pbr-bake'
import { SEMANTIC_BIOME_MASK_WIRED } from '@/lib/world-forge/semantic-biome-mask'
import {
  PCG_HYBRID_SCATTER_WIRED,
  PCG_CITY_FROM_PROMPT_READY,
  WFC_FULL_PARITY_READY,
} from '@/lib/world-forge/pcg-hybrid-scatter'
import { SCATTER_COLLIDER_LOD_WIRED } from '@/lib/world-forge/scatter-collider-lod'
import { NAVMESH_REBUILD_WIRED } from '@/lib/world-forge/navmesh-rebuild'
import {
  GPU_RECAST_NAVMESH_WIRED,
  NAVMESH_UNREAL_RECAST_PARITY_READY,
  probeGpuRecastHonesty,
  type GpuRecastComputeSoakResult,
} from '@/lib/world-forge/gpu-recast-navmesh'
import {
  DETOUR_NAV_WIRED,
  probeDetourNavHonesty,
  type DetourNavSoakResult,
} from '@/lib/world-forge/detour-navmesh'
import { WORLD_FORGE_MAESTRO_WIRED } from '@/lib/world-forge/world-forge-maestro'
import { WORLD_FORGE_CONVEYOR_WIRED } from '@/lib/world-forge/world-forge-conveyor'
import { INSTANCE_CAPABILITY_BUDGET_WIRED } from '@/lib/world-forge/instance-capability-budget'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'

export interface WorldForgeHonestyReport {
  letter: typeof WORLD_FORGE_LETTER
  pipelineId: typeof WORLD_FORGE_PIPELINE_ID
  /** Scaffold only until ORT+LoRA soak. */
  loraClayReady: false
  nativeOnnxReady: false
  sdfSculptReady: boolean
  seamlessPbrBakeReady: boolean
  biomeMaskReady: boolean
  pcgHybridScatterReady: boolean
  colliderLodReady: boolean
  navmeshCpuRebuildReady: boolean
  instanceBudgetReady: boolean
  maestroPlanReady: boolean
  conveyorReady: boolean
  /** Always false — honest competitor posture. */
  cityFromPromptReady: false
  substanceClassParityReady: false
  wfcFullParityReady: false
  /**
   * Letter ch — true only when GPU heightfield→walkable soak proven.
   * Module default without soak remains false (Zero-MVP).
   */
  gpuRecastReady: boolean
  /**
   * Letter ct — true only when Detour agent A* + off-mesh soak proven.
   * Distinct from gpuRecastReady (ch) and unrealRecastParityReady (always false).
   */
  detourNavReady: boolean
  /** Always false — Unreal Recast/Detour full polygon/area parity HELD. */
  unrealRecastParityReady: false
  streamingCarveReady: false
  surpassUnrealUnityAaaRuntime: false
  leadMeshyTripoOnGameReadyRefine: true
  beatMeshyTripoOnRawClayQuality: false
  modules: {
    loraRegistry: boolean
    loraInject: boolean
    sdf: boolean
    seamlessPbr: boolean
    biome: boolean
    pcg: boolean
    colliderLod: boolean
    navmesh: boolean
    gpuRecast: boolean
    detourNav: boolean
    budget: boolean
    maestro: boolean
    conveyor: boolean
  }
  notes: string[]
}

export function probeWorldForgeHonesty(input?: {
  sdfProven?: boolean
  seamlessProven?: boolean
  biomeProven?: boolean
  pcgProven?: boolean
  navmeshProven?: boolean
  conveyorProven?: boolean
  /** Letter ch soak evidence — required to flip gpuRecastReady. */
  gpuRecastSoak?: GpuRecastComputeSoakResult
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  capabilityScore?: number
  /** Letter ct soak evidence — required to flip detourNavReady. */
  detourNavSoak?: DetourNavSoakResult
}): WorldForgeHonestyReport {
  const lora = probeLoraClayReadiness()
  const gpuProbe = probeGpuRecastHonesty({
    soak: input?.gpuRecastSoak,
    webgpuAvailable: input?.webgpuAvailable,
    webgpuComputeAvailable: input?.webgpuComputeAvailable,
    capabilityScore: input?.capabilityScore,
  })
  const detourProbe = probeDetourNavHonesty({
    soak: input?.detourNavSoak,
    navmeshProven: input?.navmeshProven,
  })
  const modules = {
    loraRegistry: LORA_CLAY_REGISTRY_WIRED,
    loraInject: LORA_PAGER_INJECT_WIRED,
    sdf: SDF_FRACTAL_SCULPT_WIRED,
    seamlessPbr: SEAMLESS_PBR_BAKE_WIRED,
    biome: SEMANTIC_BIOME_MASK_WIRED,
    pcg: PCG_HYBRID_SCATTER_WIRED,
    colliderLod: SCATTER_COLLIDER_LOD_WIRED,
    navmesh: NAVMESH_REBUILD_WIRED,
    gpuRecast: GPU_RECAST_NAVMESH_WIRED,
    detourNav: DETOUR_NAV_WIRED,
    budget: INSTANCE_CAPABILITY_BUDGET_WIRED,
    maestro: WORLD_FORGE_MAESTRO_WIRED,
    conveyor: WORLD_FORGE_CONVEYOR_WIRED,
  }

  const sdfSculptReady = SDF_FRACTAL_SCULPT_WIRED && input?.sdfProven !== false
  const seamlessPbrBakeReady = SEAMLESS_PBR_BAKE_WIRED && input?.seamlessProven !== false
  const biomeMaskReady = SEMANTIC_BIOME_MASK_WIRED && input?.biomeProven !== false
  const pcgHybridScatterReady = PCG_HYBRID_SCATTER_WIRED && input?.pcgProven !== false
  const navmeshCpuRebuildReady = NAVMESH_REBUILD_WIRED && input?.navmeshProven !== false
  const conveyorReady =
    WORLD_FORGE_CONVEYOR_WIRED &&
    sdfSculptReady &&
    pcgHybridScatterReady &&
    navmeshCpuRebuildReady &&
    input?.conveyorProven !== false

  return {
    letter: WORLD_FORGE_LETTER,
    pipelineId: WORLD_FORGE_PIPELINE_ID,
    loraClayReady: LORA_CLAY_READY as false,
    nativeOnnxReady: NATIVE_ONNX_READY as false,
    sdfSculptReady,
    seamlessPbrBakeReady,
    biomeMaskReady,
    pcgHybridScatterReady,
    colliderLodReady: SCATTER_COLLIDER_LOD_WIRED,
    navmeshCpuRebuildReady,
    instanceBudgetReady: INSTANCE_CAPABILITY_BUDGET_WIRED,
    maestroPlanReady: WORLD_FORGE_MAESTRO_WIRED,
    conveyorReady,
    cityFromPromptReady: PCG_CITY_FROM_PROMPT_READY,
    substanceClassParityReady: SUBSTANCE_CLASS_PARITY_READY,
    wfcFullParityReady: WFC_FULL_PARITY_READY,
    gpuRecastReady: gpuProbe.gpuRecastReady,
    detourNavReady: detourProbe.detourNavReady,
    unrealRecastParityReady: NAVMESH_UNREAL_RECAST_PARITY_READY,
    streamingCarveReady: SDF_STREAMING_CARVE_READY,
    surpassUnrealUnityAaaRuntime: false,
    leadMeshyTripoOnGameReadyRefine: true,
    beatMeshyTripoOnRawClayQuality: false,
    modules,
    notes: [
      'cc: World Forge deepen — worlds wedge, not one better chair',
      'ch: GPU Recast heightfield→walkable soak-gated; Unreal Recast/Detour parity HELD',
      'ct: Detour agent A* + off-mesh + rebuild after gen; detourNavReady soak-gated; editor HELD',
      'HONEST: NOT surpassed Unreal/Unity AAA runtime (Nanite/Lumen/World Partition/editor maturity)',
      'vs Meshy/Tripo: lead game-ready refine (bw/bz/ca); raw clay quality HELD (nativeOnnxReady)',
      lora.note,
      LORA_WEIGHTS_HELD ? 'loraClayReady false until ORT+LoRA soak' : 'lora weights ready',
      'SDF→heightfield CLOSED; streaming carve HELD',
      'Seamless math bake CLOSED; Substance-class HELD',
      'Biome mask filter CLOSED (no pine on lava)',
      'PCG hybrid InstancedMesh CLOSED; city-from-prompt / full WFC HELD',
      gpuProbe.gpuRecastReady
        ? 'GPU Recast heightfield→walkable CLOSED (soak proven); Unreal Recast parity HELD'
        : 'CPU NavMesh rebuild CLOSED; GPU Recast ready only after soak evidence',
      detourProbe.detourNavReady
        ? 'Detour agent/off-mesh CLOSED (soak proven); UE Recast parity + NavMesh editor HELD'
        : 'Detour agent/off-mesh wired; detourNavReady only after soak evidence',
      'V-HACD hero props only; instances share proxy',
      'Law XV instance budget — no 5M Nanite cinema marketing',
      'Empty-honest Zero-UI: math world + BYOK when native ONNX/LoRA HELD',
      ...gpuProbe.notes.slice(0, 2),
      ...detourProbe.notes.slice(0, 2),
    ],
  }
}
