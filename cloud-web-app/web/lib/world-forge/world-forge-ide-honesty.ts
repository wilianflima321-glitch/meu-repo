/**
 * Letter cd — World Forge Studio IDE wire honesty probe.
 * loraClayReady / nativeOnnxReady remain false until ORT+LoRA soak (owned by cc/ca).
 */

import {
  WORLD_FORGE_IDE_LETTER,
  WORLD_FORGE_IDE_ROUTE_WIRED,
  selectWorldForgeRoute,
} from '@/lib/world-forge/world-forge-ide-route'
import { WORLD_FORGE_IDE_BRIDGE_WIRED } from '@/lib/world-forge/world-forge-ide-bridge'
import { WORLD_FORGE_CONVEYOR_WIRED } from '@/lib/world-forge/world-forge-conveyor'
import { LORA_CLAY_READY } from '@/lib/world-forge/lora-clay-registry'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'
import {
  SDF_FRACTAL_SCULPT_WIRED,
} from '@/lib/world-forge/sdf-fractal-sculpt'
import { PCG_HYBRID_SCATTER_WIRED } from '@/lib/world-forge/pcg-hybrid-scatter'
import { NAVMESH_REBUILD_WIRED } from '@/lib/world-forge/navmesh-rebuild'
import { SEMANTIC_BIOME_MASK_WIRED } from '@/lib/world-forge/semantic-biome-mask'

export interface WorldForgeIdeHonestyReport {
  letter: typeof WORLD_FORGE_IDE_LETTER
  /** IDE route + bridge wired (letter cd CLOSED when true + tests green). */
  worldForgeIdeReady: boolean
  /** Always false until ORT+LoRA — cc gate. */
  loraClayReady: false
  /** Always false until ORT soak — ca gate. */
  nativeOnnxReady: false
  /** Math PCG path always preferred when LoRA HELD. */
  defaultPathIsMathPcg: boolean
  mathWorldReady: true
  localMathStillFusionTx: true
  studioToolRegistered: boolean
  modules: {
    routeSelect: boolean
    ideBridge: boolean
    conveyor: boolean
    sdf: boolean
    biome: boolean
    pcg: boolean
    navmesh: boolean
  }
  notes: string[]
}

export function probeWorldForgeIdeHonesty(input?: {
  ideProven?: boolean
  studioToolRegistered?: boolean
}): WorldForgeIdeHonestyReport {
  const modules = {
    routeSelect: WORLD_FORGE_IDE_ROUTE_WIRED,
    ideBridge: WORLD_FORGE_IDE_BRIDGE_WIRED,
    conveyor: WORLD_FORGE_CONVEYOR_WIRED,
    sdf: SDF_FRACTAL_SCULPT_WIRED,
    biome: SEMANTIC_BIOME_MASK_WIRED,
    pcg: PCG_HYBRID_SCATTER_WIRED,
    navmesh: NAVMESH_REBUILD_WIRED,
  }
  const allWired = Object.values(modules).every(Boolean)
  const route = selectWorldForgeRoute()
  const worldForgeIdeReady = allWired && input?.ideProven !== false

  return {
    letter: WORLD_FORGE_IDE_LETTER,
    worldForgeIdeReady,
    loraClayReady: LORA_CLAY_READY as false,
    nativeOnnxReady: NATIVE_ONNX_READY as false,
    defaultPathIsMathPcg: route.path === 'math-pcg',
    mathWorldReady: true,
    localMathStillFusionTx: true,
    studioToolRegistered: input?.studioToolRegistered !== false,
    modules,
    notes: [
      'cd: Studio IDE Generate world → route → World Forge conveyor (cc)',
      'cd: loraClayReady HELD → math PCG; silent Zero-UI LoRA skip',
      'cd: SDF heightfield + biome + PCG scatter + NavMesh (ch GPU soak / CPU fallback) + FusionTx',
      'cd: honesty badges math-pcg vs lora-enriched — no Nanite/Partition/Unreal Recast claim',
      ...route.notes,
    ],
  }
}
