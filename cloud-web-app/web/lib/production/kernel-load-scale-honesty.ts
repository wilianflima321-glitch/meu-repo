/**
 * CW2 — Kernel load-scale honesty catalog (web-side; Rust soaks live in kernel).
 * Documents micro-soak N≥2048 gates without claiming Chaos/Unreal AAA surpass.
 * Cross-links web Chaos fracture evidence fingerprint (still AAA HELD).
 * `xpbd_cloth_aaa_ready` is REAL on the Rust CPU substrate (verified via cargo
 * test, N=2304 cloth-grid, structural/shear/bending, flat-sheet drop, pin
 * stable, strain↓ with iterations, bit-identical replay) but the web catalog
 * cannot re-run desktop Tauri IPC soaks — the web-side flag stays false until
 * desktop IPC evidence is wired; `chaos_pbd_parity_ready` (GPU) remains HELD.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  CHAOS_DESTRUCTION_AAA_READY,
  UNREAL_CHAOS_PARITY_READY,
  runChaosDestructionEvidenceSoak,
} from '@/lib/destruction/chaos-destruction-evidence'

const log = createComponentLogger('kernel-load-scale-honesty')

export const CW2_LOAD_SCALE_MIN_N = 2048 as const
export const CW2_SOAK_WALL_BUDGET_SEC = 45 as const

export type KernelLoadScalePeer = {
  id: string
  letter: string
  soakN: number
  readyGateN: number
  ready: boolean
  aaaMarketingReady: false
  heldFlags: readonly string[]
}

export type KernelLoadScaleHonestyReport = {
  wave: 'CW2'
  overallStatus: 'PARTIAL'
  minPeerN: typeof CW2_LOAD_SCALE_MIN_N
  wallBudgetSec: typeof CW2_SOAK_WALL_BUDGET_SEC
  peers: KernelLoadScalePeer[]
  /** Web FractureGraph evidence soak (≠ Rust N≥2048 Chaos AAA). */
  webChaosEvidenceFingerprint: string | null
  webChaosEvidenceOk: boolean
  /** GPU memory matrix + full RTX 3060 soak — not proven from web. */
  gpuMemoryMatrixReady: false
  chaosDestructionAaaReady: false
  unrealChaosParityReady: false
  dualSphysicsParityReady: false
  fullLbmParityReady: false
  xpbdClothAaaReady: false
  marketingAllowed: false
  stamp: 'PARTIAL'
  heldReason: 'cw2_gpu_matrix_chaos_aaa_open'
  notes: string[]
}

/** Static catalog aligned with Progress §CW2 + kernel *_wire.rs soak gates. */
export function probeKernelLoadScaleHonesty(): KernelLoadScaleHonestyReport {
  const peers: KernelLoadScalePeer[] = [
    {
      id: 'matter_thermodynamics_sph_hash',
      letter: 'io',
      soakN: 2197,
      readyGateN: CW2_LOAD_SCALE_MIN_N,
      ready: true,
      aaaMarketingReady: false,
      heldFlags: ['dualsphysics_parity_ready', 'chaos_fluid_aaa_ready'],
    },
    {
      id: 'position_based_dynamics_xpbd',
      letter: 'ip',
      soakN: 2116,
      readyGateN: CW2_LOAD_SCALE_MIN_N,
      ready: true,
      aaaMarketingReady: false,
      heldFlags: ['chaos_pbd_parity_ready'],
    },
    {
      id: 'lattice_boltzmann_fluid',
      letter: 'ee',
      soakN: 2116,
      readyGateN: CW2_LOAD_SCALE_MIN_N,
      ready: true,
      aaaMarketingReady: false,
      heldFlags: ['full_lbm_parity_ready', 'chaos_fluid_aaa_ready'],
    },
    {
      id: 'gpu_fracture_voronoi',
      letter: 'cv',
      soakN: 2197,
      readyGateN: CW2_LOAD_SCALE_MIN_N,
      ready: true,
      aaaMarketingReady: false,
      heldFlags: ['chaos_destruction_aaa_ready', 'unreal_chaos_parity_ready'],
    },
  ]

  const chaosWeb = runChaosDestructionEvidenceSoak()
  const webChaosEvidenceOk =
    chaosWeb.ok === true &&
    chaosWeb.value.chaosDestructionAaaReady === false &&
    chaosWeb.value.unrealChaosParityReady === false &&
    CHAOS_DESTRUCTION_AAA_READY === false &&
    UNREAL_CHAOS_PARITY_READY === false
  const webChaosEvidenceFingerprint = chaosWeb.ok ? chaosWeb.value.fingerprint : null

  const notes = [
    'Micro-soaks N≥2048 executed in packages/aethel-kernel-rust (cargo test on E: target).',
    'Web catalog does not re-run Rust soaks — desktop Tauri IPC evidence required for ready flip.',
    'xpbd_cloth_aaa_ready is REAL on the Rust CPU substrate (cloth-grid N=2304, structural/shear/bending, flat-sheet drop non-penetrating, top-row pin stable, strain↓ with iterations, bit-identical replay — cargo test green) but web cannot prove it without desktop IPC; chaos_pbd_parity_ready (GPU) still HELD.',
    webChaosEvidenceOk
      ? `Web Chaos FractureGraph evidence fingerprint=${webChaosEvidenceFingerprint} (AAA still HELD).`
      : 'Web Chaos FractureGraph evidence soak failed — matrix stays PARTIAL.',
    'Chaos Destruction / DualSPHysics / full LBM / RTX 3060 GPU memory matrix remain HELD.',
  ]

  log.info('kernel_load_scale_honesty_probed', {
    peers: peers.length,
    minN: CW2_LOAD_SCALE_MIN_N,
    webChaosEvidenceOk,
    webChaosEvidenceFingerprint,
  })

  return {
    wave: 'CW2',
    overallStatus: 'PARTIAL',
    minPeerN: CW2_LOAD_SCALE_MIN_N,
    wallBudgetSec: CW2_SOAK_WALL_BUDGET_SEC,
    peers,
    webChaosEvidenceFingerprint,
    webChaosEvidenceOk,
    gpuMemoryMatrixReady: false,
    chaosDestructionAaaReady: false,
    unrealChaosParityReady: false,
    dualSphysicsParityReady: false,
    fullLbmParityReady: false,
    xpbdClothAaaReady: false,
    marketingAllowed: false,
    stamp: 'PARTIAL',
    heldReason: 'cw2_gpu_matrix_chaos_aaa_open',
    notes,
  }
}
