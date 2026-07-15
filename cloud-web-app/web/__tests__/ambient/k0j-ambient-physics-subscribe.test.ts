/**
 * K.0/J Ambient → World/Character physics subscribe (letter ba).
 * Missing CSI → classic no-op / Zero-UI; enhancement path applies posture/priority hints
 * without requiring hardware. Never auto-applies Rapier forces.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import {
  buildAmbientPhysicsPort,
  buildClassicAmbientPhysicsPort,
  createAethelAmbientApi,
  createGameplayHeuristicEmotionProvider,
  postureHintFromEmotion,
  resetAethelAmbientApiForTests,
  resetAmbientMoALiveWireForTests,
  resetAmbientPhysicsLiveWireForTests,
  resolveAmbientPhysicsPortForConsumer,
  silentAmbientStartupProbe,
  subscribeAmbientEmotionForPhysics,
  wireAmbientEmotionDeltaLive,
  type AmbientPhysicsPort,
} from '@/lib/ambient'

describe('Ambient → physics subscribe Zero-UI', () => {
  beforeEach(() => {
    resetAethelAmbientApiForTests()
    resetAmbientMoALiveWireForTests()
    resetAmbientPhysicsLiveWireForTests()
  })

  it('missing CSI: subscribe is safe, classic no-op, no error surface', () => {
    const api = createAethelAmbientApi({
      probeInput: { linkMedium: 'ethernet' },
      provider: createGameplayHeuristicEmotionProvider(),
    })
    const silent = silentAmbientStartupProbe(api, { linkMedium: 'ethernet' })
    expect(silent.csiReady).toBe(false)
    expect(silent.errorSurface).toBeNull()

    const ports: AmbientPhysicsPort[] = []
    const sub = subscribeAmbientEmotionForPhysics({
      api,
      onPhysicsHint: ({ physicsPort }) => ports.push(physicsPort),
    })

    expect(sub.errorSurface).toBeNull()
    expect(() =>
      api.ingestGameplayHeuristic({
        damageIntensity: 0.95,
        msSinceThreat: 50,
        nowMs: 1_000,
      }),
    ).not.toThrow()

    expect(ports.length).toBe(1)
    expect(ports[0].noop).toBe(true)
    expect(ports[0].enhancementActive).toBe(false)
    expect(ports[0].postureHint).toBe('classic')
    expect(ports[0].autoApplyForces).toBe(false)
    expect(ports[0].activeRagdollHeld).toBe(true)
    expect(sub.getLatestPhysicsPort()?.noop).toBe(true)

    const classic = api.toPhysicsPort(sub.getLatestEmotion())
    expect(classic.noop).toBe(true)
    expect(classic.postureHint).toBe('classic')

    sub.stop()
  })

  it('physics listener throw is swallowed (Zero-UI)', () => {
    const api = createAethelAmbientApi({
      probeInput: { linkMedium: 'none' },
      provider: createGameplayHeuristicEmotionProvider(),
    })
    const sub = subscribeAmbientEmotionForPhysics({
      api,
      onPhysicsHint: () => {
        throw new Error('physics consumer boom')
      },
    })
    expect(() =>
      api.ingestGameplayHeuristic({ damageIntensity: 0.2, nowMs: 2 }),
    ).not.toThrow()
    sub.stop()
  })
})

describe('Ambient → physics enhancement path (no hardware)', () => {
  beforeEach(() => {
    resetAethelAmbientApiForTests()
    resetAmbientMoALiveWireForTests()
    resetAmbientPhysicsLiveWireForTests()
  })

  it('enhancementActive applies posture + priority hint without CSI', () => {
    const api = createAethelAmbientApi({
      probeInput: { linkMedium: 'ethernet' },
      provider: createGameplayHeuristicEmotionProvider(),
    })
    expect(api.probeCapability().csiReady).toBe(false)

    const received: AmbientPhysicsPort[] = []
    const sub = subscribeAmbientEmotionForPhysics({
      api,
      enhancementActive: true,
      onPhysicsHint: ({ physicsPort, csiReady }) => {
        expect(csiReady).toBe(false)
        received.push(physicsPort)
      },
    })

    api.ingestGameplayHeuristic({
      damageIntensity: 0.95,
      msSinceThreat: 40,
      nowMs: 3_000,
    })

    expect(received.length).toBe(1)
    expect(received[0].noop).toBe(false)
    expect(received[0].enhancementActive).toBe(true)
    expect(received[0].emotionLabel).toBe('panicked')
    expect(received[0].postureHint).toBe('flinch_ready')
    expect(received[0].priorityBias).toBe('critical')
    expect(received[0].autoApplyForces).toBe(false)
    expect(received[0].physiologyHeld).toBe(true)

    expect(postureHintFromEmotion('stressed')).toBe('tense')
    expect(postureHintFromEmotion('calm')).toBe('relaxed')
    expect(postureHintFromEmotion('absent')).toBe('idle_absent')

    sub.stop()
  })

  it('wireAmbientEmotionDeltaLive forwards physics hints alongside BT', () => {
    const api = createAethelAmbientApi({
      provider: createGameplayHeuristicEmotionProvider(),
    })
    let physicsHint: AmbientPhysicsPort | undefined
    let btBias: string | undefined

    const wire = wireAmbientEmotionDeltaLive({
      api,
      physicsEnhancementActive: true,
      onBtEmotion: ({ priorityBias }) => {
        btBias = priorityBias
      },
      onPhysicsHint: ({ physicsPort }) => {
        physicsHint = physicsPort
      },
    })

    api.ingestGameplayHeuristic({
      damageIntensity: 0.4,
      msSinceThreat: 10_000,
      nowMs: 4_000,
    })

    expect(btBias).toBe('elevated')
    expect(physicsHint?.postureHint).toBe('tense')
    expect(physicsHint?.priorityBias).toBe('elevated')
    expect(wire.getLatestPhysicsPort()?.emotionLabel).toBe('stressed')

    wire.stop()
  })

  it('resolveAmbientPhysicsPortForConsumer never throws on probe fail', () => {
    const api = createAethelAmbientApi({
      probeInput: { linkMedium: 'none' },
      provider: createGameplayHeuristicEmotionProvider(),
    })
    const classic = resolveAmbientPhysicsPortForConsumer(api, undefined)
    expect(classic).toEqual(buildClassicAmbientPhysicsPort())

    const event = api.ingestGameplayHeuristic({
      damageIntensity: 0.9,
      nowMs: 5_000,
    })
    const enhanced = buildAmbientPhysicsPort(event.emotion, {
      enhancementActive: true,
    })
    expect(enhanced.postureHint).toBe('flinch_ready')
    expect(enhanced.noop).toBe(false)
  })
})
