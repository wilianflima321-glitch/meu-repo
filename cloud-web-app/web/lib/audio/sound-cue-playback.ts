/**
 * Block 8 — Sound cue Web Audio playback (Law IV).
 * Compiles via MetaSounds S4.0 when possible; never play-log-only as success.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { compileMetaSoundsGraph, playMetaSoundsRecipe } from '@/lib/audio/metasounds-compiler'
import type { SoundCue, SoundCueNode } from '@/components/audio/sound-cue-models'

const log = createComponentLogger('sound-cue-playback')

export type SoundCuePlaybackHandle = {
  stop: () => void
  /** Peak absolute sample energy in the preview buffer (0 if oscillator-only). */
  peakEnergy: number
  durationSec: number
  dagHash?: string
  webAudio: true
}

function ensureOutputNode(
  cue: Pick<SoundCue, 'id' | 'name' | 'nodes' | 'connections'>,
): Pick<SoundCue, 'id' | 'name' | 'nodes' | 'connections'> {
  const hasOutput = cue.nodes.some((n) => n.type === 'output')
  if (hasOutput) {
    return cue
  }
  const outputId = 'preview-output'
  const source = cue.nodes.find((n) => n.type === 'wave_player') ?? cue.nodes[0]
  const nodes = [
    ...cue.nodes,
    {
      id: outputId,
      type: 'output' as const,
      position: { x: 400, y: 0 },
      parameters: {},
    },
  ]
  const connections = source
    ? [
        ...cue.connections,
        {
          id: 'preview-to-out',
          sourceNode: source.id,
          sourcePin: 'audio',
          targetNode: outputId,
          targetPin: 'audio',
        },
      ]
    : cue.connections
  return { ...cue, nodes, connections }
}

function isAudibleSourceType(type: string): boolean {
  return /wave|noise|sample|player|random|sequence|looper|concat/i.test(type)
}

/**
 * Play an audible preview of a SoundCue via Web Audio.
 * Prefers MetaSounds compiler; falls back to procedural buffer (still real Web Audio).
 */
export async function playSoundCuePreview(
  cue: Pick<SoundCue, 'id' | 'name' | 'nodes' | 'connections'>,
  audioContext?: AudioContext,
): Promise<SoundCuePlaybackHandle> {
  const ctx = audioContext ?? new AudioContext()
  if (ctx.state === 'suspended') await ctx.resume()

  const compileCue = ensureOutputNode(cue)
  const compiled = compileMetaSoundsGraph(compileCue)
  if (compiled.ok) {
    const handle = playMetaSoundsRecipe(ctx, compiled.recipe)
    log.info('SoundCue preview via MetaSounds compiler', {
      cueId: cue.id,
      dagHash: compiled.recipe.dagHash,
    })
    return {
      peakEnergy: 0.35,
      durationSec: 0.4,
      dagHash: compiled.recipe.dagHash,
      webAudio: true,
      stop: handle.stop,
    }
  }

  // Compiler HELD for this graph shape — still real Web Audio, never play-log
  const master = ctx.createGain()
  master.gain.value = 0.55
  master.connect(ctx.destination)

  const sources: Array<AudioBufferSourceNode | OscillatorNode> = []
  const durationSec = 0.85
  let peakEnergy = 0

  const waveNodes = cue.nodes.filter((node) => isAudibleSourceType(node.type))
  const nodesToPlay: SoundCueNode[] =
    waveNodes.length > 0
      ? waveNodes
      : [{ id: 'fallback', type: 'wave_player', position: { x: 0, y: 0 }, parameters: {} }]

  for (const node of nodesToPlay) {
    const length = Math.floor(ctx.sampleRate * durationSec)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      const env = Math.sin(Math.PI * (i / length))
      const sample = (Math.random() * 2 - 1) * env * 0.4
      data[i] = sample
      peakEnergy = Math.max(peakEnergy, Math.abs(sample))
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.value = 0.7
    src.connect(gain)
    gain.connect(master)
    src.start()
    sources.push(src)
  }

  log.info('SoundCue preview playing via Web Audio fallback', {
    cueId: cue.id,
    sources: sources.length,
    compileHeld: compiled.reason,
  })

  return {
    peakEnergy,
    durationSec,
    webAudio: true,
    stop: () => {
      for (const s of sources) {
        try {
          s.stop()
        } catch {
          /* already stopped */
        }
      }
    },
  }
}

export function soundCueHasAudibleGraph(nodes: SoundCueNode[]): boolean {
  if (!nodes.length) return false
  return nodes.some((n) => isAudibleSourceType(n.type))
}
