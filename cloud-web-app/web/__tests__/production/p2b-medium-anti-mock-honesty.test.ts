/**
 * P2b MEDIUM Anti-MOCK honesty — #31–#47 fail-closed / theater removal.
 */

import { describe, expect, it, vi } from 'vitest'

import {
  classifyRoomReverbFromAverageDistance,
  SpatialAudioAdvancedSystem,
} from '@/lib/audio/spatial-audio-occlusion'
import { UniversalSceneManager } from '@/lib/production/usd-gltf-exporter'
import { CognitiveFramePrefetch, COGNITIVE_FRAME_PREFETCH_SHIP_READY } from '@/lib/world-forge/cognitive_frame_prefetch'
import { DarwinianRecoverySystem, DARWINIAN_RECOVERY_SHIP_READY } from '@/lib/world-forge/darwinian_recovery_system'
import { AdversarialQaMaestro, ADVERSARIAL_QA_SHIP_READY } from '@/lib/world-forge/adversarial_qa_maestro'
import { BiometricHemodynamicUI, BIOMETRIC_HEMO_UI_SHIP_READY } from '@/lib/world-forge/biometric_hemodynamic_ui'
import { SemanticGenomicExchange, SEMANTIC_GENOMIC_EXCHANGE_SHIP_READY } from '@/lib/world-forge/semantic_genomic_exchange'
import { AUTOGENESIS_DIRECTOR_SHIP_READY } from '@/lib/world-forge/autogenesis_director'
import { DopaminergicQaDirector, DOPAMINERGIC_QA_SHIP_READY } from '@/lib/world-forge/dopaminergic_qa_loop'
import { SpineAiRouter, SPINE_AI_ROUTER_SHIP_READY } from '@/lib/world-forge/spine_ai_router'
import { AethelForesightOrchestrator, AETHEL_FORESIGHT_SHIP_READY } from '@/lib/world-forge/aethel-foresight'
import { MultiagentSpineOrchestrator, MULTIAGENT_SPINE_SHIP_READY } from '@/lib/world-forge/multiagent_spine_orchestrator'
import { SemanticGBufferQA } from '@/lib/world-forge/semantic_gbuffer_qa'
import type { SemanticWorldIntent } from '@/lib/world-forge/world-forge-maestro'

describe('P2b MEDIUM #31 — USD exporter remains fail-closed (no TODO theater path)', () => {
  it('import never succeeds without a real parser', async () => {
    const result = await UniversalSceneManager.importSemanticAsset(new ArrayBuffer(16), 'gltf', {
      autoRig: false,
      inferPhysics: false,
      extractMetadata: false,
    })
    expect(result.success).toBe(false)
  })

  it('export never returns an empty success artifact', async () => {
    const result = await UniversalSceneManager.exportToIndustryStandard('scene-1', 'gltf')
    expect(result.success).toBe(false)
  })
})

describe('P2b MEDIUM #32 — room acoustics IR classification + Convolver apply', () => {
  it('classifies distance bands into reverb presets', () => {
    expect(classifyRoomReverbFromAverageDistance(3)).toBe('small_room')
    expect(classifyRoomReverbFromAverageDistance(12)).toBe('medium_room')
    expect(classifyRoomReverbFromAverageDistance(30)).toBe('large_hall')
    expect(classifyRoomReverbFromAverageDistance(80)).toBe('outdoor')
    expect(classifyRoomReverbFromAverageDistance(Number.NaN)).toBe('none')
  })

  it('updateRoomAcoustics applies setReverbPreset on the audio manager', () => {
    const setReverbPreset = vi.fn()
    const getReverbPreset = vi.fn(() => 'outdoor' as const)
    const audioManager = {
      setReverbPreset,
      getReverbPreset,
      activeSounds: new Map(),
      context: null,
    }
    const scene = { children: [] } as unknown as import('three').Scene
    const sys = new SpatialAudioAdvancedSystem(audioManager as never, scene)
    const probe = sys.updateRoomAcoustics({ x: 0, y: 0, z: 0 } as never)
    expect(setReverbPreset).toHaveBeenCalledWith('outdoor')
    expect(probe.preset).toBe('outdoor')
    expect(probe.applied).toBe(true)
  })
})

describe('P2b MEDIUM #39–#47 — world-forge theater modules HELD / fail-closed', () => {
  const intent: SemanticWorldIntent = {
    environmentType: 'forest',
    density: 0.5,
    mood: 'calm',
    suggestedPropDistribution: {},
  }

  it('cognitive prefetch never fabricates confidence', () => {
    expect(COGNITIVE_FRAME_PREFETCH_SHIP_READY).toBe(false)
    const r = new CognitiveFramePrefetch().preemptUserIntent(10, 20, true)
    expect(r.ready).toBe(false)
    expect(r.confidence).toBe(0)
  })

  it('darwinian recovery does not claim neural evolution', () => {
    expect(DARWINIAN_RECOVERY_SHIP_READY).toBe(false)
    const r = new DarwinianRecoverySystem().consumeFailedSeed('abc', 'too noisy')
    expect(r.ready).toBe(false)
  })

  it('adversarial QA never invents kernel survival', () => {
    expect(ADVERSARIAL_QA_SHIP_READY).toBe(false)
    const r = new AdversarialQaMaestro().hallucinatePhysicsCrash()
    expect(r.ready).toBe(false)
    expect(r.kernelSurvived).toBeNull()
  })

  it('biometric UI stays HELD without vision pipeline', () => {
    expect(BIOMETRIC_HEMO_UI_SHIP_READY).toBe(false)
    const r = new BiometricHemodynamicUI().analyzeBiologicalFlowState(60, 30)
    expect(r.ready).toBe(false)
  })

  it('genomic exchange fails closed (no fabricated DNA hash)', () => {
    expect(SEMANTIC_GENOMIC_EXCHANGE_SHIP_READY).toBe(false)
    const r = new SemanticGenomicExchange().mintGenerativeSeed('author', 'gothic')
    expect(r.success).toBe(false)
    expect(r.genomicHash).toBeNull()
  })

  it('autogenesis / dopaminergic / foresight / spine router stay HELD', () => {
    expect(AUTOGENESIS_DIRECTOR_SHIP_READY).toBe(false)
    expect(DOPAMINERGIC_QA_SHIP_READY).toBe(false)
    expect(AETHEL_FORESIGHT_SHIP_READY).toBe(false)
    expect(SPINE_AI_ROUTER_SHIP_READY).toBe(false)

    const dopamine = new DopaminergicQaDirector().analyzeBiologicalState({
      pupilDilationDelta: 1,
      heartRateVariability: 2,
      cortisolSpikeProbable: true,
    })
    expect(dopamine.microWinInjected).toBe(false)

    const foresight = new AethelForesightOrchestrator().preemptiveBranching(intent)
    expect(foresight.ready).toBe(false)
    expect(foresight.activeGhostBranches).toBe(0)

    const route = new SpineAiRouter().routePrompt('short')
    expect(route.ready).toBe(false)
    expect(route.heuristicHint).toBe('LOCAL_HEURISTIC')
  })

  it('multiagent spine fails closed; gbuffer QA validates without ship claim', async () => {
    expect(MULTIAGENT_SPINE_SHIP_READY).toBe(false)
    const swarm = await new MultiagentSpineOrchestrator().orchestrateSwarmIntent('castle')
    expect(swarm.success).toBe(false)

    const qa = new SemanticGBufferQA()
    const ok = qa.validatePhysicalIntegrity(
      {
        depthMap: new Float32Array([1, 2, 3]),
        collisionNormals: new Float32Array([0, 1, 0]),
        entityIds: new Uint32Array([7]),
      },
      7,
    )
    expect(ok).toBe(true)
  })
})
