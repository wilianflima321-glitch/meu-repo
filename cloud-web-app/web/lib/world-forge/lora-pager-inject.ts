/**
 * Letter cc — LoRA inject protocol into native-gen VRAM pager window.
 *
 * Pauses luxury viewport → isolate → (attempt) load LoRA adapter → generate → unload → resume.
 * Without soaked weights: held receipt + Zero-UI (BYOK clay / math world still OK).
 */

import {
  createVramPager,
  transitionVramPager,
  type VramPagerSnapshot,
} from '@/lib/native-gen/vram-pager'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'
import {
  getLoraClayPack,
  LORA_CLAY_READY,
  resolveLoraPromptBias,
  type LoraClayGenreId,
} from '@/lib/world-forge/lora-clay-registry'
import type { WorldForgeStageReceipt } from '@/lib/world-forge/types'
import { evaluateWorldForgeCapability } from '@/lib/world-forge/types'

export const LORA_PAGER_INJECT_WIRED = true as const

export interface LoraPagerInjectRequest {
  genreId: LoraClayGenreId
  prompt: string
  capabilityScore?: number
  dedicatedVramMb?: number | null
}

export interface LoraPagerInjectResult {
  ok: boolean
  zeroUi: boolean
  loraClayReady: false
  nativeOnnxReady: false
  biasedPrompt: string
  adapterPath: string
  pager: VramPagerSnapshot
  receipt: WorldForgeStageReceipt
}

/**
 * Run LoRA inject through VRAM pager happy path.
 * Never claims adapter resident when weights HELD.
 */
export function runLoraPagerInject(req: LoraPagerInjectRequest): LoraPagerInjectResult {
  const gate = evaluateWorldForgeCapability({
    capabilityScore: req.capabilityScore ?? 100,
  })
  const pack = getLoraClayPack(req.genreId)
  const biasedPrompt = resolveLoraPromptBias(req.genreId, req.prompt)

  let pager = createVramPager({
    capabilityScore: gate.capabilityScore,
    dedicatedVramMb: req.dedicatedVramMb,
  })

  const fail = (heldReason: string, zeroUi: boolean): LoraPagerInjectResult => ({
    ok: false,
    zeroUi,
    loraClayReady: false,
    nativeOnnxReady: false,
    biasedPrompt,
    adapterPath: pack.adapterRelativePath,
    pager,
    receipt: {
      stage: 'lora-inject',
      status: zeroUi ? 'zero-ui' : 'held',
      evidence: [
        'lora-registry',
        pack.id,
        `nativeOnnxReady=${NATIVE_ONNX_READY}`,
        `loraClayReady=${LORA_CLAY_READY}`,
      ],
      heldReason,
      metrics: {
        rank: pack.rank,
        alpha: pack.alpha,
        capabilityScore: gate.capabilityScore,
      },
    },
  })

  if (gate.zeroUiFallback) {
    return fail(
      'Law XV GT730 — LoRA/ONNX Zero-UI; use BYOK clay + math World Forge',
      true,
    )
  }

  // Drive pager pause → isolate (unload stays honest — no model resident without soak)
  const steps = ['pause_viewport', 'isolate_alloc'] as const
  for (const step of steps) {
    const tr = transitionVramPager(pager, step)
    pager = tr.snapshot
    if (!tr.ok) {
      return fail(tr.snapshot.lastError ?? 'VRAM pager transition failed', false)
    }
  }

  if (!Boolean(LORA_CLAY_READY) || !Boolean(NATIVE_ONNX_READY) || pack.weightsSoaked !== true) {
    // Unload/resume cleanly without claiming generate succeeded
    const unload = transitionVramPager(pager, 'unload_model')
    pager = unload.snapshot
    const resume = transitionVramPager(pager, 'resume_viewport')
    pager = resume.ok ? resume.snapshot : pager
    const idle = transitionVramPager(pager, 'idle')
    pager = idle.ok ? idle.snapshot : pager

    return fail(
      'LoRA+ONNX weight soak HELD — inject protocol ready; adapter not loaded; BYOK clay remains',
      false,
    )
  }

  // Unreachable until soak flips constants — kept for future honesty path
  const gen = transitionVramPager(pager, 'generate')
  pager = gen.snapshot
  const unload = transitionVramPager(pager, 'unload_model')
  pager = unload.snapshot
  const resume = transitionVramPager(pager, 'resume_viewport')
  pager = resume.snapshot
  const idle = transitionVramPager(pager, 'idle')
  pager = idle.snapshot

  return {
    ok: true,
    zeroUi: false,
    loraClayReady: false,
    nativeOnnxReady: false,
    biasedPrompt,
    adapterPath: pack.adapterRelativePath,
    pager,
    receipt: {
      stage: 'lora-inject',
      status: 'closed',
      evidence: ['lora-loaded', pack.id],
      metrics: { rank: pack.rank, alpha: pack.alpha },
    },
  }
}
