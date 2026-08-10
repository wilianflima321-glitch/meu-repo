/**
 * Law IV — MetaSounds graph evidence (not play-log theater).
 *
 * Seals compile DAG hash + scheduled Web Audio node counts as evidence.
 * Play-log-only paths never count as ship evidence; AAA MetaSounds marketing stays false.
 */

import { createHash } from 'node:crypto'

import {
  compileMetaSoundsGraph,
  METASOUNDS_COMPILER_VERSION,
  PLAY_LOG_ONLY_FORBIDDEN,
  playMetaSoundsRecipe,
  type MetaSoundsCompiledRecipe,
} from '@/lib/audio/metasounds-compiler'
import type { SoundCue } from '@/components/audio/sound-cue-models'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('metasounds-graph-evidence')

export const METASOUNDS_AAA_READY = false as const
export const METASOUNDS_AAA_MARKETING_ALLOWED = false as const
export const PLAY_LOG_SHIP_EVIDENCE_FORBIDDEN = true as const

export type MetaSoundsEvidenceRejectCode =
  | 'compile_held'
  | 'play_log_forbidden'
  | 'no_web_audio'
  | 'empty_schedule'
  | 'aaa_claim_held'

export type MetaSoundsEvidenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: MetaSoundsEvidenceRejectCode; message: string }

export type MetaSoundsGraphEvidence = {
  version: 1
  compilerVersion: typeof METASOUNDS_COMPILER_VERSION
  cueId: string
  dagHash: string
  opCount: number
  sourceCount: number
  hasEnvelope: boolean
  /** True only when AudioNodes were scheduled (or OfflineAudioContext rendered). */
  webAudioScheduled: true
  scheduledSourceNodes: number
  playLogOnly: false
  fingerprint: string
  metasoundsAaaReady: false
  marketingAllowed: false
}

type CuePick = Pick<SoundCue, 'id' | 'name' | 'nodes' | 'connections'>

function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

/** Minimal wave_player → output cue for evidence soak (tone path when no bufferKey). */
export function buildMetaSoundsEvidenceCue(id = 'ms-evidence-cue'): CuePick {
  return {
    id,
    name: 'MetaSounds evidence soak',
    nodes: [
      {
        id: 'wave',
        type: 'wave_player',
        position: { x: 0, y: 0 },
        parameters: { frequency: 440, duration: 0.05, volume: 0.2 },
      },
      { id: 'out', type: 'output', position: { x: 200, y: 0 }, parameters: {} },
    ],
    connections: [
      { id: 'c1', sourceNode: 'wave', sourcePin: 'audio', targetNode: 'out', targetPin: 'audio' },
    ],
  }
}

function createEvidenceAudioContext(): AudioContext | null {
  try {
    const AC =
      typeof AudioContext !== 'undefined'
        ? AudioContext
        : (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    return new AC()
  } catch {
    return null
  }
}

function countScheduledSources(recipe: MetaSoundsCompiledRecipe): number {
  return recipe.ops.filter((o) => o.kind === 'tone' || o.kind === 'buffer').length
}

/**
 * Compile + schedule MetaSounds graph; seal evidence only when Web Audio nodes run.
 * Play-log-only compile failures never produce ok evidence.
 */
export async function recordMetaSoundsGraphEvidence(input?: {
  cue?: CuePick
}): Promise<MetaSoundsEvidenceResult<MetaSoundsGraphEvidence>> {
  const cue = input?.cue ?? buildMetaSoundsEvidenceCue()
  const compiled = compileMetaSoundsGraph(cue)

  if (!compiled.ok) {
    const code: MetaSoundsEvidenceRejectCode =
      compiled.playLogOnly && PLAY_LOG_ONLY_FORBIDDEN ? 'play_log_forbidden' : 'compile_held'
    return {
      ok: false,
      code,
      message: `${compiled.claim} — refuse ship evidence`,
    }
  }

  if (compiled.playLogOnly || compiled.recipe.sourceCount <= 0) {
    return {
      ok: false,
      code: 'play_log_forbidden',
      message: 'Play-log / empty source recipe cannot seal MetaSounds ship evidence (Law IV)',
    }
  }

  const ctx = createEvidenceAudioContext()
  if (!ctx) {
    return {
      ok: false,
      code: 'no_web_audio',
      message: 'No AudioContext — cannot seal Web Audio schedule evidence',
    }
  }

  const scheduledSources = countScheduledSources(compiled.recipe)
  if (scheduledSources <= 0) {
    return {
      ok: false,
      code: 'empty_schedule',
      message: 'Compiled recipe has no schedulable sources',
    }
  }

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    const handle = playMetaSoundsRecipe(ctx, compiled.recipe, { when: ctx.currentTime })
    if (!handle.webAudio) {
      return {
        ok: false,
        code: 'play_log_forbidden',
        message: 'Playback handle missing webAudio — refuse play-log theater',
      }
    }
    handle.stop()
    await ctx.close().catch(() => undefined)
  } catch (err) {
    await ctx.close().catch(() => undefined)
    return {
      ok: false,
      code: 'no_web_audio',
      message: `Web Audio schedule failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  const fp = fingerprint([
    METASOUNDS_COMPILER_VERSION,
    cue.id,
    compiled.recipe.dagHash,
    String(compiled.recipe.ops.length),
    String(scheduledSources),
    'webAudio:true',
  ])

  const evidence: MetaSoundsGraphEvidence = {
    version: 1,
    compilerVersion: METASOUNDS_COMPILER_VERSION,
    cueId: cue.id,
    dagHash: compiled.recipe.dagHash,
    opCount: compiled.recipe.ops.length,
    sourceCount: compiled.recipe.sourceCount,
    hasEnvelope: compiled.recipe.hasEnvelope,
    webAudioScheduled: true,
    scheduledSourceNodes: scheduledSources,
    playLogOnly: false,
    fingerprint: fp,
    metasoundsAaaReady: false,
    marketingAllowed: false,
  }

  log.info('metasounds_graph_evidence_sealed', {
    fingerprint: fp,
    dagHash: evidence.dagHash,
    ops: evidence.opCount,
    aaa: false,
  })

  return { ok: true, value: evidence }
}

/** Explicit refuse: play-log as production ship evidence. */
export function claimPlayLogOnlyAsShipEvidence(): MetaSoundsEvidenceResult<never> {
  return {
    ok: false,
    code: 'play_log_forbidden',
    message: 'PLAY_LOG_SHIP_EVIDENCE_FORBIDDEN — console play-log is not Law IV production audio',
  }
}

export function claimMetaSoundsAaa(): MetaSoundsEvidenceResult<never> {
  return {
    ok: false,
    code: 'aaa_claim_held',
    message: 'METASOUNDS_AAA_READY=false — S4.0 Web Audio graph ≠ MetaSounds AAA / GPU field',
  }
}

export async function probeMetaSoundsGraphEvidenceReadiness(): Promise<{
  id: 'metasounds-graph-evidence'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  metasoundsAaaReady: false
  marketingAllowed: false
  playLogShipForbidden: true
  path: string
  note: string
}> {
  const ok = await recordMetaSoundsGraphEvidence()
  const empty = await recordMetaSoundsGraphEvidence({
    cue: { id: 'empty', name: 'empty', nodes: [], connections: [] },
  })
  const playLog = claimPlayLogOnlyAsShipEvidence()
  const aaa = claimMetaSoundsAaa()

  const ready =
    ok.ok &&
    ok.value.webAudioScheduled === true &&
    ok.value.playLogOnly === false &&
    ok.value.fingerprint.length >= 8 &&
    ok.value.dagHash.startsWith('ms-') &&
    !empty.ok &&
    empty.code === 'play_log_forbidden' &&
    !playLog.ok &&
    !aaa.ok &&
    METASOUNDS_AAA_READY === false &&
    METASOUNDS_AAA_MARKETING_ALLOWED === false &&
    PLAY_LOG_SHIP_EVIDENCE_FORBIDDEN === true

  return {
    id: 'metasounds-graph-evidence',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    metasoundsAaaReady: false,
    marketingAllowed: false,
    playLogShipForbidden: true,
    path: 'lib/audio/metasounds-graph-evidence.ts',
    note: ready
      ? 'MetaSounds S4.0 compile+Web Audio schedule evidence PARTIAL; play-log ship + AAA marketing HELD.'
      : ok.ok
        ? 'MetaSounds graph evidence probe failed.'
        : `MetaSounds graph evidence probe failed: ${ok.message}`,
  }
}
