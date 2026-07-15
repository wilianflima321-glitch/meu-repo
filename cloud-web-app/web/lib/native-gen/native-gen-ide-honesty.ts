/**
 * Letter cb — Studio IDE + CreativeBridge wire honesty probe.
 * nativeOnnxReady flips only after cu ORT soak evidence (else BYOK clay).
 */

import {
  NATIVE_GEN_IDE_LETTER,
  NATIVE_GEN_IDE_ROUTE_WIRED,
  selectGameReadyCharacterRoute,
} from '@/lib/native-gen/native-gen-ide-route'
import { NATIVE_GEN_IDE_BRIDGE_WIRED } from '@/lib/native-gen/native-gen-ide-bridge'
import { resolveNativeOnnxReadyFlag } from '@/lib/native-gen/onnx-job-protocol'
import { NATIVE_GEN_CONVEYOR_WIRED } from '@/lib/native-gen/native-gen-conveyor'
import { LIVE_CLAY_POLL_WIRED } from '@/lib/mesh-quality/clay-live-poll'
import { GAME_READY_QUALITY_PIPELINE_WIRED } from '@/lib/mesh-quality/game-ready-quality-pipeline'
import { CLAY_PROVIDER_ADAPTERS_WIRED } from '@/lib/mesh-quality/clay-provider-adapters'

export interface NativeGenIdeHonestyReport {
  letter: typeof NATIVE_GEN_IDE_LETTER
  /** IDE route + bridge wired (letter cb CLOSED when true + tests green). */
  nativeGenIdeReady: boolean
  /** cu gate — false without weights+soak; BYOK clay remains. */
  nativeOnnxReady: boolean
  defaultPathIsByok: boolean
  creativeBridgeChokeForCloudClay: true
  localNativeStillFusionTx: true
  studioToolRegistered: boolean
  modules: {
    routeSelect: boolean
    ideBridge: boolean
    nativeConveyor: boolean
    liveClayPoll: boolean
    qualityPipeline: boolean
    clayAdapters: boolean
  }
  notes: string[]
}

export function probeNativeGenIdeHonesty(input?: {
  ideProven?: boolean
  studioToolRegistered?: boolean
}): NativeGenIdeHonestyReport {
  const modules = {
    routeSelect: NATIVE_GEN_IDE_ROUTE_WIRED,
    ideBridge: NATIVE_GEN_IDE_BRIDGE_WIRED,
    nativeConveyor: NATIVE_GEN_CONVEYOR_WIRED,
    liveClayPoll: LIVE_CLAY_POLL_WIRED,
    qualityPipeline: GAME_READY_QUALITY_PIPELINE_WIRED,
    clayAdapters: CLAY_PROVIDER_ADAPTERS_WIRED,
  }
  const allWired = Object.values(modules).every(Boolean)
  const nativeOnnxReady = resolveNativeOnnxReadyFlag()
  const route = selectGameReadyCharacterRoute({ nativeOnnxReady })
  const nativeGenIdeReady = allWired && input?.ideProven !== false

  return {
    letter: NATIVE_GEN_IDE_LETTER,
    nativeGenIdeReady,
    nativeOnnxReady,
    defaultPathIsByok: route.path === 'byok-clay',
    creativeBridgeChokeForCloudClay: true,
    localNativeStillFusionTx: true,
    studioToolRegistered: input?.studioToolRegistered !== false,
    modules,
    notes: [
      'cb: Studio IDE Generate game-ready character → route → conveyor',
      nativeOnnxReady
        ? 'cb+cu: nativeOnnxReady true — prefer native pager'
        : 'cb+cu: nativeOnnxReady HELD → BYOK clay; silent Zero-UI MoA fallback',
      'cb: cloud clay CreativeBridge+CostGuard; native $0 still FusionTx',
      'cb: honesty badges native vs BYOK — no Instant Meshes / Tripo local claim',
      ...route.notes,
    ],
  }
}
