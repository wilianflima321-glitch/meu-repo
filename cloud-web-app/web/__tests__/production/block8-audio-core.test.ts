/**
 * Block 8 Audio / VR / publish CORE — AUDIO-001/002, library-first Foley, VR honesty, bake gate.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { installMockAudioContext } from './mock-audio-context'
import {
  buildSyntheticImpulseResponse,
  SpatialAudioManagerCore,
} from '@/lib/audio/spatial-audio-manager-core'
import { synthesizeFormantVoiceBuffer } from '@/lib/ai-audio-engine'
import type { VoiceProfile } from '@/lib/ai-audio-engine-contracts'
import { playSoundCuePreview } from '@/lib/audio/sound-cue-playback'
import {
  resolveFoleyProviderLane,
  searchAudioLibrary,
} from '@/lib/audio/audio-library-search'
import {
  evaluateWebXrHonesty,
  WEBXR_VIEWPORT_ENTRY_WIRED,
} from '@/lib/webxr/webxr-honesty-capability'
import {
  buildPublishPipelinePlan,
  evaluateBakedLightingPublishGate,
} from '@/lib/production/publish-pipeline-orchestrator'

beforeAll(() => {
  installMockAudioContext()
})

const voiceProfile: VoiceProfile = {
  id: 'test',
  name: 'Test',
  gender: 'neutral',
  age: 'adult',
  pitch: 0.5,
  speed: 1,
  breathiness: 0.1,
  roughness: 0.1,
  emotionMod: {
    joyPitchMod: 0,
    sadnessPitchMod: 0,
    angerSpeedMod: 0,
    fearBreathMod: 0,
  },
}

describe('Block 8 — AUDIO-001 reverb send', () => {
  it('builds a non-silent impulse and wires convolver on initialize', async () => {
    const ctx = new AudioContext()
    const ir = buildSyntheticImpulseResponse(ctx, 0.5, 1)
    const data = ir.getChannelData(0)
    let energy = 0
    for (let i = 0; i < data.length; i++) energy += Math.abs(data[i])
    expect(energy).toBeGreaterThan(0.01)
    await ctx.close()

    const manager = new SpatialAudioManagerCore()
    await manager.initialize()
    expect(manager.isReverbSendWired()).toBe(true)
    manager.setReverbPreset('medium_room')
    expect(manager.getReverbPreset()).toBe('medium_room')
  })
})

describe('Block 8 — AUDIO-002 audible voice', () => {
  it('formant synth never returns a silent buffer', () => {
    const ctx = new AudioContext()
    const buffer = synthesizeFormantVoiceBuffer(ctx, 'Hello Aethel Engine', voiceProfile)
    const data = buffer.getChannelData(0)
    let peak = 0
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]))
    expect(buffer.duration).toBeGreaterThan(0.2)
    expect(peak).toBeGreaterThan(0.01)
  })
})

describe('Block 8 — MetaSounds preview (Law IV)', () => {
  it('plays Web Audio preview with measurable peak energy', async () => {
    const handle = await playSoundCuePreview({
      id: 'cue-1',
      name: 'Test',
      nodes: [
        {
          id: 'wave',
          type: 'wave_player',
          position: { x: 0, y: 0 },
          parameters: {},
        },
      ],
      connections: [],
    })
    expect(handle.peakEnergy).toBeGreaterThan(0.01)
    expect(handle.durationSec).toBeGreaterThan(0.1)
    expect(handle.webAudio).toBe(true)
    handle.stop()
  })

  it('compiles wave_player + output to a DAG hash (S4.0)', async () => {
    const { compileMetaSoundsGraph } = await import('@/lib/audio/metasounds-compiler')
    const result = compileMetaSoundsGraph({
      id: 'cue-compile',
      name: 'Compile',
      nodes: [
        { id: 'wave', type: 'wave_player', position: { x: 0, y: 0 }, parameters: { frequency: 440 } },
        { id: 'out', type: 'output', position: { x: 200, y: 0 }, parameters: {} },
      ],
      connections: [
        { id: 'c1', sourceNode: 'wave', sourcePin: 'audio', targetNode: 'out', targetPin: 'audio' },
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.playLogOnly).toBe(false)
      expect(result.recipe.dagHash).toMatch(/^ms-/)
    }
  })
})

describe('Block 8 — #64 library-first Foley', () => {
  it('searches Freesound/first-party and demotes generative Foley', () => {
    const result = searchAudioLibrary('footstep')
    expect(result.routing).toBe('library-first')
    expect(result.generativeFoleyAllowed).toBe(false)
    expect(result.hits.length).toBeGreaterThan(0)
    expect(result.hits.every((h) => h.foleyEligible)).toBe(true)
    expect(resolveFoleyProviderLane('foley')).toEqual({
      lane: 'library',
      generativeDefault: false,
    })
  })

  it('routes speech to Plan B gen via CostGuard path', async () => {
    const { routeAudioIntent, mustRefuseGenerativeFoley } = await import(
      '@/lib/production/audio-foley-router'
    )
    expect(mustRefuseGenerativeFoley('play shotgun footstep')).toBe(true)
    const speech = routeAudioIntent({ prompt: 'NPC says player name via TTS speech' })
    expect(speech.path).toBe('generative-plan-b')
    expect(speech.requiresCostGuard).toBe(true)
  })
})

describe('Block 8 — VR-001 honesty', () => {
  it('blocks XR marketing when viewport entry is unwired', () => {
    expect(WEBXR_VIEWPORT_ENTRY_WIRED).toBe(false)
    const report = evaluateWebXrHonesty({
      webxrApiAvailable: true,
      sessionActive: false,
      foveationWiredInFrameLoop: true,
      viewportEntryWired: false,
    })
    expect(report.marketingAllowed).toBe(false)
    expect(report.shipStatus).toBe('PARTIAL')
  })
})

describe('Block 8 — baked-lighting publish gate', () => {
  it('includes baked-lighting stage and fail-closes web-static without receipt', () => {
    const plan = buildPublishPipelinePlan({
      projectId: 'p1',
      target: 'web-static',
      quality: 'studio-local-optimized',
      requestedByUserId: 'u1',
      multiplayer: { enabled: false },
      monetization: { enabled: false },
    })
    expect(plan.stages.some((s) => s.id === 'baked-lighting')).toBe(true)

    const blocked = evaluateBakedLightingPublishGate({ target: 'web-static' })
    expect(blocked.allowed).toBe(false)
    expect(blocked.shipStatus).toBe('HELD')

    const ok = evaluateBakedLightingPublishGate({
      target: 'web-static',
      bakeReceiptRef: 'bake:project-1:v1',
      lightmapBytes: 4096,
    })
    expect(ok.allowed).toBe(true)
    expect(ok.shipStatus).toBe('IMPLEMENTED')
  })
})
