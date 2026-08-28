/**
 * J.9 film / previz success barrier (Law XVI + VisualEvidence).
 *
 * Refuse success:true without a durable visual evidence artifact fingerprint.
 * Aligns Trava honesty: never IMPLEMENTED/success with empty refs or theater.
 * Veo/Sora default demoted; final G.8 footage remains HELD.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import type { VisualEvidenceCaptureResult } from '@/lib/production/visual-evidence-capture'

const log = createComponentLogger('j9-film-previz-barrier')

export const J9_FILM_PREVIZ_BARRIER_LETTER = 'j9-film-previz-barrier' as const
export const J9_FILM_PREVIZ_BARRIER_WIRED = true as const

/** Always false — previz evidence ≠ final footage / Veo product path. */
export const VEO_DEFAULT_PATH = false as const
export const FINAL_FOOTAGE_READY = false as const
export const G8_OFFLINE_EXPORT_READY = false as const

export type J9FilmPrevizRejectCode =
  | 'invalid_input'
  | 'missing_visual_evidence'
  | 'empty_evidence_refs'
  | 'empty_content_hash'
  | 'theater_payload'
  | 'implemented_without_artifact'
  | 'claimed_success_without_evidence'

export type J9FilmPrevizResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: J9FilmPrevizRejectCode; message: string }

export interface J9FilmPrevizEvidenceInput {
  projectId: string
  /** Capture result from J.9 VisualEvidence path. */
  visual?: VisualEvidenceCaptureResult | null
  /** Explicit fingerprint override (must be non-theater). */
  evidenceFingerprint?: string | null
  attachedImplemented?: boolean
  sceneId?: string
  source?: 'sequencer-play-end' | 'fusion-cinematic-job' | 'director-manual' | 'unknown'
  now?: string
}

export interface J9FilmPrevizSuccessVerdict {
  allowed: boolean
  fingerprint: string
  visualKind: VisualEvidenceCaptureResult['kind'] | 'none'
  visualStatus: VisualEvidenceCaptureResult['status'] | 'none'
  refCount: number
  veoDefault: false
  finalFootageHeld: true
  g8OfflineExportReady: false
  reasons: string[]
  letter: typeof J9_FILM_PREVIZ_BARRIER_LETTER
}

const THEATER_IDS = new Set(['mock', 'empty', 'theater', 'placeholder', 'fake', 'veo-fake'])

function fingerprintParts(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32)
}

/**
 * Evaluate whether a film/previz mission may advertise success.
 */
export function evaluateJ9FilmPrevizSuccessBarrier(
  input: J9FilmPrevizEvidenceInput & { claimedSuccess?: boolean },
): J9FilmPrevizResult<J9FilmPrevizSuccessVerdict> {
  if (!input.projectId?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'projectId required' }
  }

  const scene = (input.sceneId ?? '').trim().toLowerCase()
  if (scene && THEATER_IDS.has(scene)) {
    return {
      ok: false,
      code: 'theater_payload',
      message: `Theater sceneId "${input.sceneId}" refused — J.9 no empty/mock success`,
    }
  }

  const visual = input.visual
  if (!visual) {
    return {
      ok: false,
      code: 'missing_visual_evidence',
      message: 'VisualEvidence artifact missing — film/previz success refused (J.9 / Trava)',
    }
  }

  if (!Array.isArray(visual.refs) || visual.refs.length === 0) {
    return {
      ok: false,
      code: 'empty_evidence_refs',
      message: 'VisualEvidence refs empty — Law XVI forbids success without artifact fingerprint',
    }
  }

  if (!visual.contentHash || visual.contentHash.trim().length < 8) {
    return {
      ok: false,
      code: 'empty_content_hash',
      message: 'VisualEvidence contentHash missing/short — success refused',
    }
  }

  if (/^(mock|fake|theater|empty|placeholder)/i.test(visual.contentHash)) {
    return {
      ok: false,
      code: 'theater_payload',
      message: 'Theater contentHash refused',
    }
  }

  // IMPLEMENTED requires real artifact bytes path — emptyImplementedGuard returns HELD
  if (visual.status === 'IMPLEMENTED' && (visual.byteLength === 0 || visual.refs.length === 0)) {
    return {
      ok: false,
      code: 'implemented_without_artifact',
      message: 'IMPLEMENTED without artifact bytes/refs — Law XVI refuse',
    }
  }

  if (input.claimedSuccess === false) {
    return {
      ok: false,
      code: 'claimed_success_without_evidence',
      message: 'Caller already marked success:false',
    }
  }

  const override = input.evidenceFingerprint?.trim()
  const fingerprint =
    override && override.length >= 8
      ? override
      : fingerprintParts([
          J9_FILM_PREVIZ_BARRIER_LETTER,
          input.projectId,
          visual.kind,
          visual.status,
          visual.contentHash,
          String(visual.refs.length),
          input.source ?? 'unknown',
          input.now ?? new Date().toISOString(),
        ])

  const verdict: J9FilmPrevizSuccessVerdict = {
    allowed: true,
    fingerprint,
    visualKind: visual.kind,
    visualStatus: visual.status,
    refCount: visual.refs.length,
    veoDefault: false,
    finalFootageHeld: true,
    g8OfflineExportReady: false,
    reasons: [
      `VisualEvidence present (${visual.kind}/${visual.status})`,
      `refs=${visual.refs.length} contentHash=${visual.contentHash.slice(0, 12)}…`,
      'Veo default demoted — engine_sequencer previz only',
      'Final footage / G.8 offline export HELD',
    ],
    letter: J9_FILM_PREVIZ_BARRIER_LETTER,
  }

  log.info('j9_film_previz_barrier_pass', {
    projectId: input.projectId,
    kind: visual.kind,
    fingerprint,
  })

  return { ok: true, value: verdict }
}

/**
 * Gate a film/previz success flag — returns success:false when barrier fails.
 */
export function gateFilmPrevizMissionSuccess(input: {
  projectId: string
  proposedSuccess: boolean
  visual?: VisualEvidenceCaptureResult | null
  evidenceFingerprint?: string | null
  attachedImplemented?: boolean
  sceneId?: string
  source?: J9FilmPrevizEvidenceInput['source']
}): {
  success: boolean
  blockedReason?: string
  barrierCode?: J9FilmPrevizRejectCode
  verdict?: J9FilmPrevizSuccessVerdict
} {
  if (!input.proposedSuccess) {
    return { success: false, blockedReason: 'proposed_success_false' }
  }

  const barrier = evaluateJ9FilmPrevizSuccessBarrier({
    projectId: input.projectId,
    visual: input.visual,
    evidenceFingerprint: input.evidenceFingerprint,
    attachedImplemented: input.attachedImplemented,
    sceneId: input.sceneId,
    source: input.source,
    claimedSuccess: true,
  })

  if (!barrier.ok) {
    log.warn('j9_film_previz_barrier_refuse', {
      projectId: input.projectId,
      code: barrier.code,
    })
    return {
      success: false,
      blockedReason: barrier.message,
      barrierCode: barrier.code,
    }
  }

  return { success: true, verdict: barrier.value }
}

export function probeJ9FilmPrevizBarrierReadiness(): {
  id: 'j9-film-previz-barrier'
  status: 'PARTIAL'
  ready: boolean
  path: string
  veoDefault: false
  finalFootageHeld: true
  note: string
} {
  const visual: VisualEvidenceCaptureResult = {
    status: 'HELD',
    kind: 'patch_hash',
    refs: ['sha256:abcdef0123456789'],
    message: 'probe',
    contentHash: 'abcdef0123456789abcdef0123456789',
    webmHeld: true,
  }
  const pass = evaluateJ9FilmPrevizSuccessBarrier({
    projectId: 'probe',
    visual,
    claimedSuccess: true,
    now: '2026-08-10T18:00:00.000Z',
  })
  const missing = evaluateJ9FilmPrevizSuccessBarrier({
    projectId: 'probe',
    visual: null,
    claimedSuccess: true,
  })
  const theater = evaluateJ9FilmPrevizSuccessBarrier({
    projectId: 'probe',
    visual,
    sceneId: 'mock',
    claimedSuccess: true,
  })
  const ready = pass.ok && !missing.ok && !theater.ok && VEO_DEFAULT_PATH === false

  return {
    id: 'j9-film-previz-barrier',
    status: 'PARTIAL',
    ready,
    path: 'lib/production/j9-film-previz-barrier.ts',
    veoDefault: false,
    finalFootageHeld: true,
    note:
      'Film/previz success requires VisualEvidence fingerprint; empty/theater/IMPLEMENTED-without-artifact fail-closed; Veo/G.8 HELD',
  }
}
