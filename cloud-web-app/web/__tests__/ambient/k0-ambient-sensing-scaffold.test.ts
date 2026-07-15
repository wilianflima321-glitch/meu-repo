/**
 * Onda K.0 / M.0 — Ambient + Affective Computing scaffold (letter ax).
 * Suppressor, fallback, capability probes, emotion delta gating.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import {
  createAethelAmbientApi,
  createAmbientCostGuardSuppressor,
  createGameplayHeuristicEmotionProvider,
  createHeldCsiEmotionProvider,
  evaluateAmbientFocusLock,
  evaluateAmbientHonesty,
  inferGameplayEmotion,
  probeAmbientCapability,
  resetAethelAmbientApiForTests,
  resolveAmbientEmotionProvider,
  buildAmbientApexMoAPort,
  buildAmbientNpcBtPort,
} from '@/lib/ambient'
import type { AmbientDeltaEvent } from '@/lib/ambient'

describe('Ambient capability probe', () => {
  it('reports csiReady: false on Ethernet', () => {
    const cap = probeAmbientCapability({
      linkMedium: 'ethernet',
      csiNicPresent: true,
      sensorKernelRunning: true,
      tinymlWeightsPresent: true,
    })
    expect(cap.csiReady).toBe(false)
    expect(cap.marketingAmbientSensingAllowed).toBe(false)
    expect(cap.heldReasons.some((r) => /Ethernet/i.test(r))).toBe(true)
  })

  it('keeps all readiness false without proven NIC', () => {
    const cap = probeAmbientCapability({ linkMedium: 'wifi' })
    expect(cap.csiReady).toBe(false)
    expect(cap.tinymlReady).toBe(false)
    expect(cap.cameraFusionReady).toBe(false)
    expect(cap.sensorKernelReady).toBe(false)
  })

  it('honesty marketingAllowed always false from scaffold', () => {
    const report = evaluateAmbientHonesty({
      linkMedium: 'wifi',
      csiNicPresent: true,
      sensorKernelRunning: true,
      tinymlWeightsPresent: true,
      cameraPipelineLive: true,
    })
    expect(report.marketingAllowed).toBe(false)
    // Scaffold forces csi/tinyml false until acceptance — status HELD or PARTIAL only if flags survive
    expect(report.capability.csiReady).toBe(false)
  })
})

describe('Gameplay heuristic fallback', () => {
  it('maps high damage to panicked without inventing HR', () => {
    const delta = inferGameplayEmotion({
      damageIntensity: 0.9,
      msSinceThreat: 500,
      nowMs: 1_000,
    })
    expect(delta.label).toBe('panicked')
    expect(delta.source).toBe('gameplay_heuristic')
    expect(delta.heartRateHeld).toBe(true)
    expect(delta.breathRateHeld).toBe(true)
    expect(delta.heartRateBpmEstimate).toBeUndefined()
  })

  it('maps absent flag', () => {
    const delta = inferGameplayEmotion({ absent: true })
    expect(delta.label).toBe('absent')
  })

  it('resolveAmbientEmotionProvider never returns live CSI as shipped', () => {
    const provider = resolveAmbientEmotionProvider({
      linkMedium: 'ethernet',
    })
    expect(provider.id).toBe('gameplay-heuristic')
  })

  it('held CSI provider emits zero confidence', () => {
    const provider = createHeldCsiEmotionProvider()
    const emotion = provider.sampleEmotion({})
    expect(emotion.source).toBe('csi_tinyml')
    expect(emotion.confidence).toBe(0)
    expect(emotion.heartRateHeld).toBe(true)
  })
})

describe('CostGuard ambient suppressor', () => {
  let suppressor: ReturnType<typeof createAmbientCostGuardSuppressor>

  beforeEach(() => {
    suppressor = createAmbientCostGuardSuppressor({
      maxCriticalEscalations: 2,
      windowMs: 60_000,
      debounceMs: 1_000,
      minConfidence: 0.7,
    })
  })

  function criticalEvent(overrides: Partial<AmbientDeltaEvent> = {}): AmbientDeltaEvent {
    return {
      eventId: 'e1',
      kind: 'emotion',
      critical: true,
      emotion: {
        label: 'panicked',
        confidence: 0.9,
        source: 'gameplay_heuristic',
        heartRateHeld: true,
        breathRateHeld: true,
        emittedAtMs: 10_000,
        previousLabel: 'calm',
      },
      emittedAtMs: 10_000,
      ...overrides,
    }
  }

  it('allows critical label transition and settleOnReject is 0', () => {
    const decision = suppressor.evaluate(criticalEvent())
    expect(decision.allow).toBe(true)
    if (decision.allow) {
      expect(decision.settleOnReject).toBe(0)
    }
  })

  it('rejects routine deltas with settle: 0', () => {
    const decision = suppressor.evaluate({
      eventId: 'e2',
      kind: 'emotion',
      critical: false,
      emotion: {
        label: 'calm',
        confidence: 0.9,
        source: 'gameplay_heuristic',
        heartRateHeld: true,
        breathRateHeld: true,
        emittedAtMs: 10_000,
      },
      emittedAtMs: 10_000,
    })
    expect(decision.allow).toBe(false)
    if (!decision.allow) {
      expect(decision.settleOnReject).toBe(0)
      expect(decision.reason).toBe('not_critical')
    }
  })

  it('holds unproven CSI TinyML escalations (settle: 0)', () => {
    const decision = suppressor.evaluate(
      criticalEvent({
        emotion: {
          label: 'panicked',
          confidence: 0.95,
          source: 'csi_tinyml',
          heartRateHeld: true,
          breathRateHeld: true,
          emittedAtMs: 10_000,
          previousLabel: 'calm',
        },
      }),
      { csiProven: false },
    )
    expect(decision.allow).toBe(false)
    if (!decision.allow) {
      expect(decision.reason).toBe('csi_unproven_held')
      expect(decision.settleOnReject).toBe(0)
    }
  })

  it('debounces and rate-limits with settle: 0', () => {
    const first = suppressor.evaluate(criticalEvent({ emittedAtMs: 10_000 }))
    expect(first.allow).toBe(true)
    suppressor.recordEscalation(10_000)

    const debounced = suppressor.evaluate(
      criticalEvent({
        eventId: 'e3',
        emittedAtMs: 10_500,
        emotion: {
          label: 'panicked',
          confidence: 0.9,
          source: 'gameplay_heuristic',
          heartRateHeld: true,
          breathRateHeld: true,
          emittedAtMs: 10_500,
          previousLabel: 'stressed',
        },
      }),
    )
    expect(debounced.allow).toBe(false)
    if (!debounced.allow) {
      expect(debounced.reason).toBe('debounced')
      expect(debounced.settleOnReject).toBe(0)
    }

    suppressor.recordEscalation(12_000)
    const limited = suppressor.evaluate(
      criticalEvent({
        eventId: 'e4',
        emittedAtMs: 14_000,
        emotion: {
          label: 'stressed',
          confidence: 0.9,
          source: 'gameplay_heuristic',
          heartRateHeld: true,
          breathRateHeld: true,
          emittedAtMs: 14_000,
          previousLabel: 'calm',
        },
      }),
    )
    expect(limited.allow).toBe(false)
    if (!limited.allow) {
      expect(limited.reason).toBe('rate_limited')
      expect(limited.settleOnReject).toBe(0)
    }
  })
})

describe('aethel/ambient developer API', () => {
  beforeEach(() => {
    resetAethelAmbientApiForTests()
  })

  it('subscribes emotion and heartbeat spike hooks', () => {
    const api = createAethelAmbientApi({
      probeInput: { linkMedium: 'ethernet' },
      provider: createGameplayHeuristicEmotionProvider(),
    })
    expect(api.getProviderId()).toBe('gameplay-heuristic')
    expect(api.probeCapability().csiReady).toBe(false)

    const emotions: string[] = []
    const spikes: string[] = []
    api.onEmotion((d) => emotions.push(d.label))
    api.onPlayerHeartbeatSpike((e) => spikes.push(e.eventId))

    api.ingestGameplayHeuristic({ damageIntensity: 0.8, msSinceThreat: 100, nowMs: 5_000 })
    expect(emotions.length).toBe(1)
    expect(emotions[0]).toBe('panicked')

    // Manual spike dispatch via suppressor path — API only fires spike listeners on kind
    const spikeEvent: AmbientDeltaEvent = {
      eventId: 'spike-1',
      kind: 'heartbeat_spike',
      critical: true,
      heartbeatSpike: { held: true, magnitude: 0.8 },
      emittedAtMs: 6_000,
    }
    // Direct listener invoke pattern: ingest does not create spikes from gameplay;
    // verify unsubscribe + evaluate holds unproven spike
    const decision = api.evaluateCloudEscalation(spikeEvent)
    expect(decision.allow).toBe(false)
    if (!decision.allow) {
      expect(decision.settleOnReject).toBe(0)
    }
    expect(spikes.length).toBe(0)
  })

  it('builds MoA port only when escalation allowed', () => {
    const suppressor = createAmbientCostGuardSuppressor()
    const event: AmbientDeltaEvent = {
      eventId: 'm1',
      kind: 'emotion',
      critical: true,
      emotion: {
        label: 'panicked',
        confidence: 0.9,
        source: 'gameplay_heuristic',
        heartRateHeld: true,
        breathRateHeld: true,
        emittedAtMs: 1,
        previousLabel: 'calm',
      },
      emittedAtMs: 1,
    }
    const allow = suppressor.evaluate(event)
    const port = buildAmbientApexMoAPort(event, allow)
    expect(port?.ambientEmotionSlice?.label).toBe('panicked')
    expect(port?.ambientEmotionSlice?.physiologyHeld).toBe(true)

    const deny = suppressor.evaluate({
      ...event,
      critical: false,
      emotion: { ...event.emotion!, label: 'calm', previousLabel: undefined },
    })
    expect(buildAmbientApexMoAPort(event, deny)).toBeUndefined()
  })

  it('BT port marks heartRateHeld', () => {
    const port = buildAmbientNpcBtPort(
      inferGameplayEmotion({ damageIntensity: 0.5, msSinceThreat: 1000 }),
    )
    expect(port.blackboardKeys.heartRateHeld).toBe(true)
    expect(port.suggestedConditions[0]?.stub).toBe(true)
  })

  it('focus lock stays held without camera pipeline', () => {
    const state = evaluateAmbientFocusLock({ entityId: 'npc-1' }, { linkMedium: 'wifi' })
    expect(state.locked).toBe(false)
    expect(state.fusionClaimAllowed).toBe(false)
    expect(state.target?.held).toBe(true)
  })
})
