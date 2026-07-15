/**
 * Letter ca — Native 3D Generation honesty aggregate.
 * Letter cu — ORT weights soak: nativeOnnxReady only with evidence.
 * Letter da — fixture honesty: redistributable text-to-3d ONNX HELD (size/license).
 * Flip Ready flags only when path is real / soak-proven — never Instant Meshes / Tripo local.
 */

import { NATIVE_GEN_LETTER, NATIVE_GEN_PIPELINE_ID } from '@/lib/native-gen/types'
import { VRAM_PAGER_WIRED, probeVramPagerReady } from '@/lib/native-gen/vram-pager'
import {
  ONNX_JOB_PROTOCOL_WIRED,
  areNativeOnnxModelsHeld,
  probeOnnxNativeSession,
  resolveNativeOnnxReadyFlag,
} from '@/lib/native-gen/onnx-job-protocol'
import { probeNativeOnnxOrtHonesty } from '@/lib/native-gen/onnx-ort-session'
import { probeNativeOnnxFixtureHonesty } from '@/lib/native-gen/onnx-fixture-honesty'
import { SPLAT_TO_MESH_WIRED, probeSplatToMeshReady, POISSON_COMMERCIAL_PARITY_READY } from '@/lib/native-gen/splat-to-mesh'
import { VHACD_WIRED, probeVhacdReady, VHACD_COMMERCIAL_PARITY_READY } from '@/lib/native-gen/vhacd-decomposition'
import {
  HEAT_DIFFUSION_SKIN_WIRED,
  probeHeatDiffusionReady,
} from '@/lib/native-gen/heat-diffusion-skin'
import { NATIVE_GEN_CONVEYOR_WIRED } from '@/lib/native-gen/native-gen-conveyor'
import { MESH_LOD_CASCADE_WIRED } from '@/lib/mesh-quality/mesh-lod-cascade'
import { SEMANTIC_RETOPOLOGY_WIRED, SEMANTIC_COMMERCIAL_PARITY_READY } from '@/lib/mesh-quality/semantic-retopology'
import { DELIGHTING_PBR_WIRED, DELIGHTING_COMMERCIAL_PARITY_READY } from '@/lib/mesh-quality/delighting-pbr'

export interface NativeGenHonestyReport {
  letter: typeof NATIVE_GEN_LETTER
  pipelineId: typeof NATIVE_GEN_PIPELINE_ID
  /** cu: true only after ORT weights + runtime + soak evidence. */
  nativeOnnxReady: boolean
  vramPagerReady: boolean
  splatToMeshReady: boolean
  vhacdReady: boolean
  heatDiffusionReady: boolean
  lodCascadeReady: boolean
  /** Consumed from bz — not duplicated. */
  semanticRetopoConsumed: boolean
  delightingConsumed: boolean
  conveyorReady: boolean
  instantMeshesParityReady: false
  tripoLocalParityReady: false
  poissonCommercialParityReady: false
  vhacdCommercialParityReady: false
  semanticCommercialParityReady: false
  delightingCommercialParityReady: false
  onnxModelsHeld: boolean
  modules: {
    vramPager: boolean
    onnxProtocol: boolean
    splatToMesh: boolean
    vhacd: boolean
    heatSkin: boolean
    lodCascade: boolean
    semanticBz: boolean
    delightingBz: boolean
    conveyor: boolean
  }
  notes: string[]
}

export function probeNativeGenHonesty(input?: {
  vramPagerProven?: boolean
  splatToMeshProven?: boolean
  vhacdProven?: boolean
  heatDiffusionProven?: boolean
  conveyorProven?: boolean
}): NativeGenHonestyReport {
  const onnx = probeOnnxNativeSession()
  const ortHonesty = probeNativeOnnxOrtHonesty()
  const fixtureHonesty = probeNativeOnnxFixtureHonesty()
  const modules = {
    vramPager: VRAM_PAGER_WIRED,
    onnxProtocol: ONNX_JOB_PROTOCOL_WIRED,
    splatToMesh: SPLAT_TO_MESH_WIRED,
    vhacd: VHACD_WIRED,
    heatSkin: HEAT_DIFFUSION_SKIN_WIRED,
    lodCascade: MESH_LOD_CASCADE_WIRED,
    semanticBz: SEMANTIC_RETOPOLOGY_WIRED,
    delightingBz: DELIGHTING_PBR_WIRED,
    conveyor: NATIVE_GEN_CONVEYOR_WIRED,
  }

  const vramPagerReady = probeVramPagerReady({ soakProven: input?.vramPagerProven })
  const splatToMeshReady = probeSplatToMeshReady({ soakProven: input?.splatToMeshProven })
  const vhacdReady = probeVhacdReady({ soakProven: input?.vhacdProven })
  const heatDiffusionReady = probeHeatDiffusionReady({
    soakProven: input?.heatDiffusionProven,
  })
  const conveyorReady =
    NATIVE_GEN_CONVEYOR_WIRED &&
    vramPagerReady &&
    splatToMeshReady &&
    vhacdReady &&
    input?.conveyorProven !== false

  const nativeOnnxReady =
    resolveNativeOnnxReadyFlag() &&
    ortHonesty.nativeOnnxReady &&
    fixtureHonesty.nativeOnnxReady

  return {
    letter: NATIVE_GEN_LETTER,
    pipelineId: NATIVE_GEN_PIPELINE_ID,
    nativeOnnxReady,
    vramPagerReady,
    splatToMeshReady,
    vhacdReady,
    heatDiffusionReady,
    lodCascadeReady: MESH_LOD_CASCADE_WIRED,
    semanticRetopoConsumed: SEMANTIC_RETOPOLOGY_WIRED,
    delightingConsumed: DELIGHTING_PBR_WIRED,
    conveyorReady,
    instantMeshesParityReady: false,
    tripoLocalParityReady: false,
    poissonCommercialParityReady: POISSON_COMMERCIAL_PARITY_READY,
    vhacdCommercialParityReady: VHACD_COMMERCIAL_PARITY_READY,
    semanticCommercialParityReady: SEMANTIC_COMMERCIAL_PARITY_READY,
    delightingCommercialParityReady: DELIGHTING_COMMERCIAL_PARITY_READY,
    onnxModelsHeld: areNativeOnnxModelsHeld(),
    modules,
    notes: [
      'ca: VRAM pager CLOSED — pause→isolate→generate→unload→resume',
      'ca: Splat→Mesh MC CLOSED — Poisson commercial HELD',
      'ca: consume bz semantic + delighting (no forever duplicate)',
      'ca: V-HACD hierarchical approx CLOSED — library parity HELD; fail-closed single convex',
      'ca: LOD0/1/2 via bw cascade inside native conveyor',
      'ca: heat-diffusion skin CLOSED — empty-honest non-humanoid; MM/DQ compatible',
      'cu: nativeOnnxReady only with ORT weights+runtime+soak — weights missing ≠ ready; BYOK MoA clay (cb) remains',
      'da: redistributable text-to-3d .onnx HELD (size/license) — do not invent Identity as text-to-3d; fixture honesty fail-closed',
      onnx.note,
      ...ortHonesty.notes.slice(0, 3),
      ...fixtureHonesty.notes.slice(0, 2),
      'Never claim Instant Meshes / Tripo local / 8GB VRAM on GT730',
    ],
  }
}
