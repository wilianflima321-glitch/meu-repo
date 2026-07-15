/**
 * Letter cb — Native Gen → Studio IDE route selection.
 *
 * text → prefer native pager when nativeOnnxReady else BYOK clay (bx/bw)
 * Zero-UI when native ONNX unavailable (silent MoA fallback, no error spam).
 * Never invent ORT weights — nativeOnnxReady stays false until soak.
 */

import { resolveNativeOnnxReadyFlag } from '@/lib/native-gen/onnx-job-protocol'

export const NATIVE_GEN_IDE_LETTER = 'cb' as const
export const NATIVE_GEN_IDE_ROUTE_WIRED = true as const

/** Honesty badge: which path the IDE will actually take. */
export type NativeGenIdeHonestyBadge = 'native' | 'byok'

/** Selected generation path for Studio "Generate game-ready character". */
export type NativeGenIdePath = 'native-pager' | 'byok-clay'

export interface NativeGenIdeRouteDecision {
  letter: typeof NATIVE_GEN_IDE_LETTER
  path: NativeGenIdePath
  /** Mirror of soak gate — false until ORT+weights proven. */
  nativeOnnxReady: boolean
  /** Cloud clay must choke through CreativeBridge + CostGuard. */
  creativeBridgeRequired: boolean
  /** Local native is $0; still FusionTx for manifest/viewport. */
  localNativeCostUsd: 0
  /** Honesty chip for Studio chrome. */
  honestyBadge: NativeGenIdeHonestyBadge
  /** True when fallback is silent (no native-unavailable toast spam). */
  zeroUiSilentFallback: boolean
  notes: string[]
}

/**
 * Prefer native pager when ready; otherwise BYOK clay poll/ingest (bx/bw).
 * Default uses resolveNativeOnnxReadyFlag (cu soak; HELD → BYOK).
 */
export function selectGameReadyCharacterRoute(input?: {
  /** Override for tests / future soak flip — never invent true in production. */
  nativeOnnxReady?: boolean
}): NativeGenIdeRouteDecision {
  const nativeOnnxReady = input?.nativeOnnxReady ?? resolveNativeOnnxReadyFlag()

  if (nativeOnnxReady) {
    return {
      letter: NATIVE_GEN_IDE_LETTER,
      path: 'native-pager',
      nativeOnnxReady: true,
      creativeBridgeRequired: false,
      localNativeCostUsd: 0,
      honestyBadge: 'native',
      zeroUiSilentFallback: false,
      notes: [
        'cb: native pager preferred — local $0; FusionTx still stamps viewport',
        'cb: CreativeBridge not required for native clay bytes',
      ],
    }
  }

  return {
    letter: NATIVE_GEN_IDE_LETTER,
    path: 'byok-clay',
    nativeOnnxReady: false,
    creativeBridgeRequired: true,
    localNativeCostUsd: 0,
    honestyBadge: 'byok',
    zeroUiSilentFallback: true,
    notes: [
      'cb: nativeOnnxReady HELD — silent MoA/BYOK clay fallback (Zero-UI)',
      'cb: cloud clay → CreativeBridge + CostGuard; settle:0 on deny',
      'cb: no ORT weight invention; no error spam when native unavailable',
    ],
  }
}
