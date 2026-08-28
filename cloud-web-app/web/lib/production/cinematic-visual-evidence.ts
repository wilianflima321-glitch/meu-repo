/**
 * J.9 / Decision #63 — Cinematic VisualEvidence attach.
 *
 * When a Director/Sequencer shoot ends (or a Fusion cinematic job completes),
 * capture real viewport WebM — or honest PNG + webmHeld — into the evidence ledger.
 * Law XVI: never IMPLEMENTED with empty blob/refs. Veo/Sora remain demoted (not default).
 * Final offline / G.8 footage export stays HELD.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { attachVisualEvidence } from '@/lib/production/apex-mission-evidence'
import {
  autoAttachViewportVisualEvidenceAfterApply,
  VISUAL_EVIDENCE_AUTO_ATTACH_EVENT,
  type AutoAttachVisualEvidenceInput,
} from '@/lib/production/visual-evidence-auto-attach'
import type {
  VisualEvidenceCaptureResult,
  ViewportCanvasLike,
} from '@/lib/production/visual-evidence-capture'
import { appendTaskEvidence, type TaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import {
  planCinematicDirectorShoot,
  type CinematicDirectorIntent,
  type CinematicDirectorPlan,
} from '@/lib/sequencer/cinematic-director-bridge'
import type { SequencerTimeline } from '@/lib/sequencer/core/types'
import {
  gateFilmPrevizMissionSuccess,
  type J9FilmPrevizSuccessVerdict,
} from '@/lib/production/j9-film-previz-barrier'

const log = createComponentLogger('cinematic-visual-evidence')

export const CINEMATIC_VISUAL_EVIDENCE_EVENT = 'aethel.cinematic-visual-evidence.attached' as const
export const CINEMATIC_VISUAL_EVIDENCE_WIRED = true as const
export const CINEMATIC_DOCTRINE_ID = '#63' as const

export type CinematicEvidenceSource =
  | 'sequencer-play-end'
  | 'fusion-cinematic-job'
  | 'director-manual'

export type CinematicVisualEvidenceInput = AutoAttachVisualEvidenceInput & {
  intent: CinematicDirectorIntent
  timelineId: string
  timelineLabel?: string
  shootDurationMs?: number
  source: CinematicEvidenceSource
  /** Fusion / Maestro job id when source is fusion-cinematic-job. */
  jobId?: string
}

export type CinematicVisualEvidenceResult = {
  visual: VisualEvidenceCaptureResult
  ledger?: TaskEvidenceLedger
  attachedImplemented: boolean
  /** Top-8 deepen — J.9 barrier fingerprint when success allowed. */
  previzBarrier?: J9FilmPrevizSuccessVerdict
  /** False when J.9 barrier refuses success without fingerprint. */
  filmPrevizSuccess: boolean
  shootBackend: 'engine_sequencer'
  veoDefault: false
  finalFootageHeld: true
  doctrine: typeof CINEMATIC_DOCTRINE_ID
  /** Receipt refs for cinematic-evidence-spine / continuity. */
  evidenceRefs: string[]
  source: CinematicEvidenceSource
  blockedReason?: string
}

/** Heuristic: Fusion prompt/job is cinematic-direct (engine shoot), not pixel-gen. */
export function isCinematicFusionJob(input: {
  prompt?: string
  domain?: string
  role?: string
}): boolean {
  const blob = [input.prompt, input.domain, input.role].filter(Boolean).join(' ').toLowerCase()
  if (!blob) return false
  if (/\b(veo|sora|runway|pixel[- ]?gen|ai[- ]?video)\b/.test(blob) && !/\b(director|sequencer|engine)\b/.test(blob)) {
    return false
  }
  return (
    /\b(cinematic|cutscene|director|sequencer|trailer|establishing|shot[- ]?list)\b/.test(blob) ||
    blob.includes('cinematic.direct') ||
    blob.includes('cinematic-director')
  )
}

function buildCinematicRefs(input: CinematicVisualEvidenceInput, visual: VisualEvidenceCaptureResult): string[] {
  const refs = [
    `doctrine:${CINEMATIC_DOCTRINE_ID}`,
    `shoot:engine_sequencer`,
    `veo:demoted`,
    `timeline:${input.timelineId}`,
    `intent:${input.intent}`,
    `source:${input.source}`,
    `finalFootage:HELD`,
    ...visual.refs,
  ]
  if (input.jobId) refs.push(`job:${input.jobId}`)
  if (input.timelineLabel) refs.push(`label:${input.timelineLabel}`)
  if (visual.status === 'IMPLEMENTED' && visual.refs.length > 0) {
    refs.push('engine render or cloud stream capture')
    refs.push('cutscene continuity receipt')
  }
  return Array.from(new Set(refs))
}

/**
 * Capture viewport evidence after a Director/Sequencer shoot (or Fusion cinematic job).
 * Prefers WebM; falls back to honest PNG + webmHeld or patch-hash. Never empty success.
 */
export async function attachCinematicVisualEvidenceAfterShoot(
  input: CinematicVisualEvidenceInput,
): Promise<CinematicVisualEvidenceResult> {
  const label =
    input.label ??
    `cinematic:${input.intent}:${input.timelineId}:${input.source}`

  const attach = await autoAttachViewportVisualEvidenceAfterApply({
    afterPatch:
      input.afterPatch ??
      JSON.stringify({
        doctrine: CINEMATIC_DOCTRINE_ID,
        intent: input.intent,
        timelineId: input.timelineId,
        source: input.source,
        shootBackend: 'engine_sequencer',
        veoDefault: false,
      }),
    label,
    canvas: input.canvas,
    canvasSelector: input.canvasSelector ?? 'canvas[data-aethel-viewport="true"]',
    resolveCanvas: input.resolveCanvas,
    durationMs: input.durationMs ?? Math.min(4000, Math.max(400, input.shootDurationMs ?? 2000)),
    ledger: input.ledger,
  })

  let visual = attach.visual
  // Law XVI belt-and-suspenders
  if (visual.status === 'IMPLEMENTED' && visual.refs.length === 0) {
    visual = {
      ...visual,
      status: 'HELD',
      message: 'Cinematic VisualEvidence refused IMPLEMENTED with empty refs (Law XVI / #63).',
      webmHeld: true,
    }
  }

  const evidenceRefs = buildCinematicRefs(input, visual)
  let ledger = attach.ledger

  if (ledger) {
    // Re-stamp visual event with cinematic continuity refs (attachVisualEvidence already ran once).
    ledger = appendTaskEvidence(ledger, {
      kind: 'artifact',
      title:
        visual.status === 'IMPLEMENTED'
          ? `Cinematic engine shoot (${visual.kind})`
          : `Cinematic engine shoot HELD (${visual.kind})`,
      summary: [
        visual.message,
        'Cinematic Director #63: Fusion directs; engine/GPU shoots; Veo demoted.',
        'Final footage / G.8 export remains HELD.',
      ].join(' '),
      refs: evidenceRefs,
      actor: 'cinematic-director',
    })

    if (visual.status === 'IMPLEMENTED' && visual.refs.length > 0) {
      ledger = attachVisualEvidence(ledger, {
        contentHash: visual.contentHash,
        status: visual.status,
        kind: `cinematic_${visual.kind}`,
        summary: `Director shoot evidence · timeline=${input.timelineId} · intent=${input.intent}`,
        mediaUrl: visual.dataUrl ? `data-ref:cinematic:${visual.kind}` : undefined,
        frameCount: visual.frames?.length,
        actor: 'cinematic-visual-evidence',
      })
    }
  }

  const attachedImplemented = visual.status === 'IMPLEMENTED' && visual.refs.length > 0
  const projectId = ledger?.projectId ?? `cinematic:${input.timelineId}`
  const gated = gateFilmPrevizMissionSuccess({
    projectId,
    proposedSuccess: attachedImplemented || visual.refs.length > 0,
    visual,
    attachedImplemented,
    source: input.source,
  })
  const filmPrevizSuccess = gated.success === true
  if (ledger && !filmPrevizSuccess && gated.blockedReason) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'J.9 film/previz success barrier refused',
      summary: gated.blockedReason,
      refs: [`j9-barrier:${gated.barrierCode ?? 'refuse'}`, ...evidenceRefs.slice(0, 4)],
      actor: 'j9-film-previz-barrier',
    })
  }

  const result: CinematicVisualEvidenceResult = {
    visual,
    ledger,
    attachedImplemented,
    previzBarrier: gated.verdict,
    filmPrevizSuccess,
    shootBackend: 'engine_sequencer',
    veoDefault: false,
    finalFootageHeld: true,
    doctrine: CINEMATIC_DOCTRINE_ID,
    evidenceRefs,
    source: input.source,
    blockedReason: filmPrevizSuccess ? undefined : gated.blockedReason,
  }

  log.info('cinematic_visual_evidence_attached', {
    timelineId: input.timelineId,
    intent: input.intent,
    source: input.source,
    status: visual.status,
    kind: visual.kind,
    webmHeld: visual.webmHeld ?? visual.kind !== 'webm',
    attachedImplemented: result.attachedImplemented,
    filmPrevizSuccess,
    refs: evidenceRefs.length,
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(CINEMATIC_VISUAL_EVIDENCE_EVENT, {
        detail: result,
      }),
    )
    // Also notify generic J.9 listeners
    window.dispatchEvent(
      new CustomEvent(VISUAL_EVIDENCE_AUTO_ATTACH_EVENT, {
        detail: { visual, label, cinematic: true },
      }),
    )
  }

  return result
}

/**
 * Plan a Director shoot then attach VisualEvidence (Sequencer play-end or Fusion job).
 * Engine shoot only — Veo demoted. Final footage remains HELD.
 */
export async function completeCinematicDirectorShootWithEvidence(input: {
  intent: CinematicDirectorIntent
  timeline?: SequencerTimeline
  source: CinematicEvidenceSource
  ledger?: TaskEvidenceLedger
  canvas?: ViewportCanvasLike | null
  resolveCanvas?: () => ViewportCanvasLike | null
  jobId?: string
  afterPatch?: string
}): Promise<{ plan: CinematicDirectorPlan; evidence: CinematicVisualEvidenceResult }> {
  const plan = planCinematicDirectorShoot({ intent: input.intent, timeline: input.timeline })
  const evidence = await attachCinematicVisualEvidenceAfterShoot({
    intent: plan.intent,
    timelineId: plan.timeline.id,
    timelineLabel: plan.timeline.label,
    shootDurationMs: plan.timeline.durationMs,
    source: input.source,
    ledger: input.ledger,
    canvas: input.canvas,
    resolveCanvas: input.resolveCanvas,
    jobId: input.jobId,
    afterPatch: input.afterPatch,
  })
  return { plan, evidence }
}
