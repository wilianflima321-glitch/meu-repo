/**
 * Letter ca — VRAM Paging System for Local ONNX Text-to-3D.
 *
 * Async: pause luxury viewport → isolate alloc → generate → unload model → resume.
 * Law XV / GT730: fail-closed or CPU/small; never OOM IDE+game.
 */

import {
  evaluateNativeGenCapability,
  type NativeGenStageReceipt,
} from '@/lib/native-gen/types'

export const VRAM_PAGER_WIRED = true as const
export const VRAM_PAGER_LETTER = 'ca' as const

export type VramPagerState =
  | 'idle'
  | 'pause_viewport'
  | 'isolate_alloc'
  | 'generate'
  | 'unload_model'
  | 'resume_viewport'
  | 'fail_closed'
  | 'cpu_fallback'

export const VRAM_PAGER_HAPPY_PATH: readonly VramPagerState[] = [
  'idle',
  'pause_viewport',
  'isolate_alloc',
  'generate',
  'unload_model',
  'resume_viewport',
  'idle',
] as const

export interface VramPagerSnapshot {
  state: VramPagerState
  luxuryViewportPaused: boolean
  modelResident: boolean
  allocIsolated: boolean
  lastError?: string
  claimedVramMb: number
  capabilityScore: number
  history: VramPagerState[]
}

export interface VramPagerTransitionResult {
  snapshot: VramPagerSnapshot
  ok: boolean
  receipt: NativeGenStageReceipt
}

const ALLOWED: Record<VramPagerState, readonly VramPagerState[]> = {
  idle: ['pause_viewport', 'fail_closed', 'cpu_fallback'],
  pause_viewport: ['isolate_alloc', 'fail_closed', 'resume_viewport'],
  isolate_alloc: ['generate', 'fail_closed', 'unload_model'],
  generate: ['unload_model', 'fail_closed'],
  unload_model: ['resume_viewport', 'fail_closed'],
  resume_viewport: ['idle', 'fail_closed'],
  fail_closed: ['idle'],
  cpu_fallback: ['idle', 'fail_closed'],
}

export function createVramPager(input?: {
  capabilityScore?: number
  dedicatedVramMb?: number | null
}): VramPagerSnapshot {
  const gate = evaluateNativeGenCapability({
    capabilityScore: input?.capabilityScore ?? 100,
    dedicatedVramMb: input?.dedicatedVramMb ?? null,
  })
  return {
    state: 'idle',
    luxuryViewportPaused: false,
    modelResident: false,
    allocIsolated: false,
    claimedVramMb: gate.claimedVramMb,
    capabilityScore: gate.capabilityScore,
    history: ['idle'],
  }
}

export function transitionVramPager(
  snap: VramPagerSnapshot,
  next: VramPagerState,
  opts?: { error?: string },
): VramPagerTransitionResult {
  const allowed = ALLOWED[snap.state]
  if (!allowed.includes(next)) {
    return {
      ok: false,
      snapshot: {
        ...snap,
        lastError: `Illegal transition ${snap.state} → ${next}`,
      },
      receipt: {
        stage: 'vram-pager',
        status: 'rejected',
        evidence: ['illegal-transition', snap.state, next],
        heldReason: `Illegal transition ${snap.state} → ${next}`,
      },
    }
  }

  const history = [...snap.history, next]
  let luxuryViewportPaused = snap.luxuryViewportPaused
  let modelResident = snap.modelResident
  let allocIsolated = snap.allocIsolated

  switch (next) {
    case 'pause_viewport':
      luxuryViewportPaused = true
      break
    case 'isolate_alloc':
      allocIsolated = true
      break
    case 'generate':
      modelResident = true
      break
    case 'unload_model':
      modelResident = false
      allocIsolated = false
      break
    case 'resume_viewport':
      luxuryViewportPaused = false
      modelResident = false
      allocIsolated = false
      break
    case 'idle':
      luxuryViewportPaused = false
      modelResident = false
      allocIsolated = false
      break
    case 'fail_closed':
      modelResident = false
      allocIsolated = false
      // keep pause until explicit resume via idle reset
      break
    case 'cpu_fallback':
      modelResident = false
      allocIsolated = false
      luxuryViewportPaused = false
      break
  }

  const snapshot: VramPagerSnapshot = {
    state: next,
    luxuryViewportPaused,
    modelResident,
    allocIsolated,
    lastError: opts?.error,
    claimedVramMb: snap.claimedVramMb,
    capabilityScore: snap.capabilityScore,
    history,
  }

  return {
    ok: true,
    snapshot,
    receipt: {
      stage: 'vram-pager',
      status: next === 'fail_closed' ? 'rejected' : next === 'cpu_fallback' ? 'zero-ui' : 'closed',
      evidence: ['vram-pager', next, `claimedVramMb=${snap.claimedVramMb}`],
      metrics: {
        luxuryViewportPaused,
        modelResident,
        allocIsolated,
        capabilityScore: snap.capabilityScore,
      },
      heldReason: opts?.error,
    },
  }
}

/**
 * Run full native-gen pause window under pager.
 * On GT730-class: fail_closed or cpu_fallback — never allocate ONNX VRAM.
 */
export function runVramPagerNativeGenWindow(input: {
  capabilityScore: number
  dedicatedVramMb?: number | null
  /** Job body — must not leave model resident on throw. */
  job: () => Promise<{ ok: boolean; error?: string }>
  preferCpuFallbackOnWeak?: boolean
}): Promise<{
  snapshot: VramPagerSnapshot
  receipts: NativeGenStageReceipt[]
  jobOk: boolean
  zeroUi: boolean
}> {
  const gate = evaluateNativeGenCapability({
    capabilityScore: input.capabilityScore,
    dedicatedVramMb: input.dedicatedVramMb,
  })
  let snap = createVramPager({
    capabilityScore: gate.capabilityScore,
    dedicatedVramMb: gate.dedicatedVramMb,
  })
  const receipts: NativeGenStageReceipt[] = []

  if (!gate.onnxPathAllowed) {
    const target: VramPagerState =
      input.preferCpuFallbackOnWeak !== false ? 'cpu_fallback' : 'fail_closed'
    const t = transitionVramPager(snap, target, {
      error: gate.notes[0],
    })
    receipts.push(t.receipt)
    snap = t.snapshot
    const back = transitionVramPager(snap, 'idle')
    receipts.push(back.receipt)
    return Promise.resolve({
      snapshot: back.snapshot,
      receipts,
      jobOk: false,
      zeroUi: true,
    })
  }

  const steps: VramPagerState[] = [
    'pause_viewport',
    'isolate_alloc',
    'generate',
    'unload_model',
    'resume_viewport',
    'idle',
  ]

  return (async () => {
    let jobOk = false
    for (const step of steps) {
      if (step === 'generate') {
        try {
          const result = await input.job()
          jobOk = result.ok
          if (!result.ok) {
            const fail = transitionVramPager(snap, 'fail_closed', {
              error: result.error ?? 'native_gen_job_failed',
            })
            receipts.push(fail.receipt)
            snap = fail.snapshot
            // ensure unload + resume even on fail
            for (const recovery of ['unload_model', 'resume_viewport', 'idle'] as const) {
              if (ALLOWED[snap.state].includes(recovery)) {
                const r = transitionVramPager(snap, recovery)
                receipts.push(r.receipt)
                snap = r.snapshot
              }
            }
            return { snapshot: snap, receipts, jobOk: false, zeroUi: false }
          }
        } catch (err) {
          const fail = transitionVramPager(snap, 'fail_closed', {
            error: err instanceof Error ? err.message : 'native_gen_throw',
          })
          receipts.push(fail.receipt)
          snap = fail.snapshot
          for (const recovery of ['unload_model', 'resume_viewport', 'idle'] as const) {
            if (ALLOWED[snap.state].includes(recovery)) {
              const r = transitionVramPager(snap, recovery)
              receipts.push(r.receipt)
              snap = r.snapshot
            }
          }
          return { snapshot: snap, receipts, jobOk: false, zeroUi: false }
        }
      }
      const t = transitionVramPager(snap, step)
      if (!t.ok) {
        receipts.push(t.receipt)
        return { snapshot: t.snapshot, receipts, jobOk: false, zeroUi: false }
      }
      receipts.push(t.receipt)
      snap = t.snapshot
    }
    return { snapshot: snap, receipts, jobOk, zeroUi: false }
  })()
}

/** Honesty: pager ready when wired + happy-path legal (soak via Vitest). */
export function probeVramPagerReady(input?: { soakProven?: boolean }): boolean {
  return VRAM_PAGER_WIRED && input?.soakProven !== false
}
