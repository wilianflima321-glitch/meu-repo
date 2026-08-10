/**
 * §23.A — GPU Priority Mux honesty probe + interface.
 * Finance Ring-0 priority is architectural intent only.
 * Real ORT/wgpu surgical eviction (~50ms hot-swap) is HELD — do not claim it works.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { ONNX_FIXTURE_HONESTY_WIRED } from '@/lib/native-gen/onnx-fixture-honesty'

const log = createComponentLogger('quant-gpu-priority-mux')

export type GpuTenant = 'game_mini_ia' | 'quant_mini_ia'

export type GpuMuxStatus = 'HELD' | 'PARTIAL'

export interface GpuPriorityMuxReport {
  /** Always false until real ORT/wgpu eviction + soak exist. */
  hotSwapReady: false
  /** Always false — 50ms invisible eviction is an unverified claim. */
  claimed50msEvictionProven: false
  status: GpuMuxStatus
  heldReason:
    | 'ort_wgpu_eviction_not_implemented'
    | 'finance_game_vram_mux_unproven'
  activeTenant: GpuTenant | null
  financeRing0PriorityDeclared: true
  vramExclusiveAtPeakDeclared: true
  onnxFixtureWired: boolean
  path: string
  note: string
}

export interface GpuMuxRequest {
  from: GpuTenant
  to: GpuTenant
  reason: string
}

export type GpuMuxResult =
  | { ok: false; code: 'mux_held'; message: string; report: GpuPriorityMuxReport }
  | { ok: true; report: GpuPriorityMuxReport }

/**
 * Probe — reports HELD. Never claims successful VRAM hot-swap.
 */
export function probeGpuPriorityMux(): GpuPriorityMuxReport {
  const report: GpuPriorityMuxReport = {
    hotSwapReady: false,
    claimed50msEvictionProven: false,
    status: 'HELD',
    heldReason: 'ort_wgpu_eviction_not_implemented',
    activeTenant: null,
    financeRing0PriorityDeclared: true,
    vramExclusiveAtPeakDeclared: true,
    onnxFixtureWired: ONNX_FIXTURE_HONESTY_WIRED,
    path: 'lib/server/quant/gpu-priority-mux.ts',
    note:
      'Interface + honesty only — no ORT/wgpu eviction path; do not market 50ms surgical hot-swap.',
  }
  log.info('gpu_priority_mux_probed', {
    hotSwapReady: false,
    status: 'HELD',
    onnxFixtureWired: report.onnxFixtureWired,
  })
  return report
}

/**
 * Request eviction — always fail-closed until real kernel mux ships.
 */
export function requestGpuPrioritySwap(req: GpuMuxRequest): GpuMuxResult {
  const report = probeGpuPriorityMux()
  return {
    ok: false,
    code: 'mux_held',
    message: `GPU Priority Mux HELD — cannot swap ${req.from} → ${req.to} (${req.reason}); no ORT/wgpu eviction`,
    report,
  }
}

export function isGpuPriorityMuxReady(): boolean {
  return probeGpuPriorityMux().hotSwapReady
}
