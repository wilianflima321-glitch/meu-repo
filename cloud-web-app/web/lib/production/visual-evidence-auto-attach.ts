/**
 * J.9 — Auto-attach viewport VisualEvidence after FusionTx / creative APPLY.
 *
 * Runs browser capture when APIs allow; otherwise honest PNG / patch-hash HELD.
 * Never invents a fake WebM or returns success with an empty blob.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { attachVisualEvidence } from '@/lib/production/apex-mission-evidence'
import type { TaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import {
  captureViewportVisualEvidenceAuto,
  resolveVisualEvidenceCascade,
  type VisualEvidenceCaptureResult,
  type ViewportCanvasLike,
} from '@/lib/production/visual-evidence-capture'

const log = createComponentLogger('visual-evidence-auto-attach')

export const VISUAL_EVIDENCE_AUTO_ATTACH_EVENT = 'aethel.visual-evidence.attached' as const

export type AutoAttachVisualEvidenceInput = {
  afterPatch?: string
  label?: string
  canvas?: ViewportCanvasLike | null
  canvasSelector?: string
  resolveCanvas?: () => ViewportCanvasLike | null
  durationMs?: number
  /** Existing ledger to append into (optional). */
  ledger?: TaskEvidenceLedger
}

export type AutoAttachVisualEvidenceResult = {
  visual: VisualEvidenceCaptureResult
  ledger?: TaskEvidenceLedger
  /** True only when browser WebM/PNG produced non-empty refs. */
  attachedImplemented: boolean
}

/**
 * Capture viewport evidence and cascade into patch-hash when needed.
 * Safe on Node/SSR: returns HELD patch-hash / no-canvas without throwing.
 */
export async function autoAttachViewportVisualEvidenceAfterApply(
  input: AutoAttachVisualEvidenceInput,
): Promise<AutoAttachVisualEvidenceResult> {
  const browserCapture = await captureViewportVisualEvidenceAuto({
    canvas: input.canvas,
    canvasSelector: input.canvasSelector,
    resolveCanvas: input.resolveCanvas,
    durationMs: input.durationMs,
    label: input.label,
  })

  const visual = resolveVisualEvidenceCascade({
    afterPatch: input.afterPatch,
    label: input.label,
    browserCapture,
  })

  // Law XVI: never promote empty refs
  if (visual.status === 'IMPLEMENTED' && visual.refs.length === 0) {
    const held: VisualEvidenceCaptureResult = {
      ...visual,
      status: 'HELD',
      message: 'VisualEvidence refused IMPLEMENTED with empty refs (Law XVI).',
      webmHeld: true,
    }
    log.warn('visual_evidence_empty_implemented_refused', { label: input.label })
    return { visual: held, attachedImplemented: false }
  }

  let ledger = input.ledger
  if (ledger) {
    ledger = attachVisualEvidence(ledger, {
      contentHash: visual.contentHash,
      status: visual.status,
      kind: visual.kind,
      summary: visual.message,
      mediaUrl: visual.dataUrl ? `data-ref:${visual.kind}` : undefined,
      frameCount: visual.frames?.length,
      actor: 'visual-evidence-auto-attach',
    })
  }

  log.info('visual_evidence_auto_attach', {
    label: input.label,
    status: visual.status,
    kind: visual.kind,
    webmHeld: visual.webmHeld ?? visual.kind !== 'webm',
    refs: visual.refs.length,
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(VISUAL_EVIDENCE_AUTO_ATTACH_EVENT, {
        detail: { visual, label: input.label },
      }),
    )
  }

  return {
    visual,
    ledger,
    attachedImplemented: visual.status === 'IMPLEMENTED' && visual.refs.length > 0,
  }
}
