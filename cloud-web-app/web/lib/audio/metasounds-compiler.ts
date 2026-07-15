/**
 * Block 8 / S4.0 — MetaSounds graph compiler (wav + envelope → Web Audio recipe).
 * Play-log-only is forbidden as a production success path.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import type { SoundCue, SoundCueConnection, SoundCueNode, SoundNodeType } from '@/components/audio/sound-cue-models'

const log = createComponentLogger('metasounds-compiler')

export const METASOUNDS_COMPILER_VERSION = 'S4.0' as const
export const PLAY_LOG_ONLY_FORBIDDEN = true as const

export type MetaSoundsNodeOp =
  | { kind: 'tone'; nodeId: string; frequency: number; durationSec: number; gain: number }
  | { kind: 'buffer'; nodeId: string; bufferKey: string; gain: number; playbackRate: number }
  | { kind: 'envelope'; nodeId: string; attack: number; decay: number; sustain: number; release: number }
  | { kind: 'filter'; nodeId: string; type: BiquadFilterType; frequency: number; Q: number }
  | { kind: 'mixer'; nodeId: string; gain: number }
  | { kind: 'output'; nodeId: string }

export interface MetaSoundsCompiledRecipe {
  version: typeof METASOUNDS_COMPILER_VERSION
  dagHash: string
  ops: MetaSoundsNodeOp[]
  topoOrder: string[]
  sourceCount: number
  hasEnvelope: boolean
}

export type MetaSoundsCompileResult =
  | {
      ok: true
      held: false
      playLogOnly: false
      recipe: MetaSoundsCompiledRecipe
      claim: string
    }
  | {
      ok: false
      held: true
      playLogOnly: true
      reason: string
      claim: string
    }

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function stableHash(parts: string[]): string {
  let h = 2166136261
  const joined = parts.join('|')
  for (let i = 0; i < joined.length; i++) {
    h ^= joined.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `ms-${(h >>> 0).toString(16).padStart(8, '0')}`
}

function buildAdjacency(nodes: SoundCueNode[], connections: SoundCueConnection[]) {
  const outs = new Map<string, string[]>()
  const indeg = new Map<string, number>()
  for (const n of nodes) {
    outs.set(n.id, [])
    indeg.set(n.id, 0)
  }
  for (const c of connections) {
    if (!outs.has(c.sourceNode) || !indeg.has(c.targetNode)) continue
    outs.get(c.sourceNode)!.push(c.targetNode)
    indeg.set(c.targetNode, (indeg.get(c.targetNode) || 0) + 1)
  }
  return { outs, indeg }
}

function topoSort(nodes: SoundCueNode[], connections: SoundCueConnection[]): string[] | null {
  const { outs, indeg } = buildAdjacency(nodes, connections)
  const queue = nodes.filter((n) => (indeg.get(n.id) || 0) === 0).map((n) => n.id)
  const order: string[] = []
  while (queue.length) {
    const id = queue.shift()!
    order.push(id)
    for (const next of outs.get(id) || []) {
      const d = (indeg.get(next) || 0) - 1
      indeg.set(next, d)
      if (d === 0) queue.push(next)
    }
  }
  return order.length === nodes.length ? order : null
}

function opForNode(node: SoundCueNode): MetaSoundsNodeOp | null {
  const p = node.parameters || {}
  switch (node.type as SoundNodeType) {
    case 'wave_player':
      if (typeof p.bufferKey === 'string' && p.bufferKey.length > 0) {
        return {
          kind: 'buffer',
          nodeId: node.id,
          bufferKey: p.bufferKey,
          gain: asNumber(p.volume, 1),
          playbackRate: asNumber(p.pitch, 1),
        }
      }
      return {
        kind: 'tone',
        nodeId: node.id,
        frequency: asNumber(p.frequency, 440),
        durationSec: asNumber(p.duration, 0.35),
        gain: asNumber(p.volume, 0.35),
      }
    case 'modulator_envelope':
      return {
        kind: 'envelope',
        nodeId: node.id,
        attack: asNumber(p.attack, 0.02),
        decay: asNumber(p.decay, 0.1),
        sustain: asNumber(p.sustain, 0.7),
        release: asNumber(p.release, 0.15),
      }
    case 'effect_filter':
      return {
        kind: 'filter',
        nodeId: node.id,
        type: (typeof p.type === 'string' ? p.type : 'lowpass') as BiquadFilterType,
        frequency: asNumber(p.frequency, 1200),
        Q: asNumber(p.Q, 1),
      }
    case 'mixer':
    case 'crossfade':
      return { kind: 'mixer', nodeId: node.id, gain: asNumber(p.volume, 1) }
    case 'output':
      return { kind: 'output', nodeId: node.id }
    default:
      // Random/sequence/etc. — S4.1+; CORE maps unknown modulators to passthrough mixer
      if (node.type.startsWith('effect_') || node.type.startsWith('modulator_')) {
        return { kind: 'mixer', nodeId: node.id, gain: 1 }
      }
      return { kind: 'mixer', nodeId: node.id, gain: 1 }
  }
}

/**
 * Compile a SoundCue graph into a Web Audio recipe. Fail-closed → HELD play-log.
 */
export function compileMetaSoundsGraph(cue: Pick<SoundCue, 'id' | 'name' | 'nodes' | 'connections'>): MetaSoundsCompileResult {
  if (!cue.nodes?.length) {
    return {
      ok: false,
      held: true,
      playLogOnly: true,
      reason: 'empty_graph',
      claim: '[HELD] MetaSounds — empty graph cannot compile; play-log forbidden',
    }
  }

  const hasOutput = cue.nodes.some((n) => n.type === 'output')
  const hasSource = cue.nodes.some((n) => n.type === 'wave_player')
  if (!hasOutput || !hasSource) {
    return {
      ok: false,
      held: true,
      playLogOnly: true,
      reason: !hasSource ? 'missing_wave_player' : 'missing_output',
      claim: '[HELD] MetaSounds S4.0 requires wave_player + output — play-log is not production audio',
    }
  }

  const order = topoSort(cue.nodes, cue.connections || [])
  if (!order) {
    return {
      ok: false,
      held: true,
      playLogOnly: true,
      reason: 'cyclic_graph',
      claim: '[HELD] MetaSounds graph has a cycle — refuse play-log fallback',
    }
  }

  const byId = new Map(cue.nodes.map((n) => [n.id, n]))
  const ops: MetaSoundsNodeOp[] = []
  for (const id of order) {
    const node = byId.get(id)
    if (!node) continue
    const op = opForNode(node)
    if (op) ops.push(op)
  }

  const sourceCount = ops.filter((o) => o.kind === 'tone' || o.kind === 'buffer').length
  const hasEnvelope = ops.some((o) => o.kind === 'envelope')
  const dagHash = stableHash([
    METASOUNDS_COMPILER_VERSION,
    cue.id,
    ...ops.map((o) => JSON.stringify(o)),
    ...order,
  ])

  const recipe: MetaSoundsCompiledRecipe = {
    version: METASOUNDS_COMPILER_VERSION,
    dagHash,
    ops,
    topoOrder: order,
    sourceCount,
    hasEnvelope,
  }

  log.info('metasounds_compiled', { dagHash, sourceCount, hasEnvelope, nodes: cue.nodes.length })

  return {
    ok: true,
    held: false,
    playLogOnly: false,
    recipe,
    claim: `MetaSounds ${METASOUNDS_COMPILER_VERSION} compiled — Web Audio DAG ${dagHash}`,
  }
}

export interface MetaSoundsPlaybackHandle {
  dagHash: string
  stop: () => void
  /** True only when real AudioNodes were scheduled — never play-log. */
  webAudio: true
}

/**
 * Schedule a compiled recipe on a real AudioContext. Throws if context missing.
 */
export function playMetaSoundsRecipe(
  ctx: AudioContext,
  recipe: MetaSoundsCompiledRecipe,
  options: { buffers?: Map<string, AudioBuffer>; destination?: AudioNode; when?: number } = {},
): MetaSoundsPlaybackHandle {
  const when = options.when ?? ctx.currentTime
  const dest = options.destination ?? ctx.destination
  const master = ctx.createGain()
  master.gain.value = 1
  master.connect(dest)

  const stoppers: Array<() => void> = []
  let envelopeGain: GainNode | null = null

  for (const op of recipe.ops) {
    if (op.kind === 'envelope') {
      envelopeGain = ctx.createGain()
      const g = envelopeGain.gain
      g.setValueAtTime(0, when)
      g.linearRampToValueAtTime(1, when + op.attack)
      g.linearRampToValueAtTime(op.sustain, when + op.attack + op.decay)
      g.linearRampToValueAtTime(0, when + op.attack + op.decay + op.release + 0.2)
      envelopeGain.connect(master)
    }
  }

  const sink = envelopeGain ?? master

  for (const op of recipe.ops) {
    if (op.kind === 'tone') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = op.frequency
      gain.gain.value = op.gain
      osc.connect(gain)
      gain.connect(sink)
      osc.start(when)
      osc.stop(when + op.durationSec)
      stoppers.push(() => {
        try {
          osc.stop()
        } catch {
          /* already stopped */
        }
      })
    } else if (op.kind === 'buffer') {
      const buffer = options.buffers?.get(op.bufferKey)
      if (!buffer) {
        // Fail closed on missing asset — procedural tone stand-in would hide broken graphs
        throw new Error(`[HELD] MetaSounds buffer missing for key "${op.bufferKey}"`)
      }
      const src = ctx.createBufferSource()
      const gain = ctx.createGain()
      src.buffer = buffer
      src.playbackRate.value = op.playbackRate
      gain.gain.value = op.gain
      src.connect(gain)
      gain.connect(sink)
      src.start(when)
      stoppers.push(() => {
        try {
          src.stop()
        } catch {
          /* already stopped */
        }
      })
    }
  }

  return {
    dagHash: recipe.dagHash,
    webAudio: true,
    stop: () => {
      for (const s of stoppers) s()
      try {
        master.disconnect()
      } catch {
        /* noop */
      }
    },
  }
}

/** Golden-fixture helper — hash only (GATE-GOLDEN-AUDIO). */
export function hashMetaSoundsCue(cue: Pick<SoundCue, 'id' | 'name' | 'nodes' | 'connections'>): string | null {
  const result = compileMetaSoundsGraph(cue)
  return result.ok ? result.recipe.dagHash : null
}
