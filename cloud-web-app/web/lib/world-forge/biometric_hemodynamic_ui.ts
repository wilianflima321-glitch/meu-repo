/**
 * P2b MEDIUM #42 — Biometric hemodynamic UI.
 *
 * HELD / NON-SHIP: prior revision claimed webcam TF.js blood-flow reading and
 * "Supervisor mode" UI collapse via console.log only — no camera / model wire.
 * Not exported from the World Forge barrel.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('world-forge-biometric-ui')

export const BIOMETRIC_HEMO_UI_SHIP_READY = false as const

export type BiometricUiResult = {
  ready: false
  heldReason: 'biometric_vision_pipeline_unavailable'
  fatigueLevel: number
}

export class BiometricHemodynamicUI {
  private userFatigueLevel = 0

  public analyzeBiologicalFlowState(bpm: number, blinkRatePerMin: number): BiometricUiResult {
    // Accept telemetry args for API stability but do not act on them as vision truth.
    void bpm
    void blinkRatePerMin
    this.userFatigueLevel = 0
    log.debug('biometric_ui_held', {
      heldReason: 'biometric_vision_pipeline_unavailable',
    })
    return {
      ready: false,
      heldReason: 'biometric_vision_pipeline_unavailable',
      fatigueLevel: this.userFatigueLevel,
    }
  }
}
