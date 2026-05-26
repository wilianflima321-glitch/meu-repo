import { describe, expect, it } from 'vitest'

import {
  ENGINE_MODULE_ADAPTERS,
  createAIAudioAdapterSummary,
  createAssetImportPipelineAdapterSummary,
  createAssetImporterAdapterSummary,
  createAudioEngineAdapterSummary,
  createAudioRuntimeAdapterSummary,
  createCameraRuntimeAdapterSummary,
  createCharacterRigAdapterSummary,
  createDayNightAdapterSummary,
  createDialogueRuntimeAdapterSummary,
  createDotsEcsAdapterSummary,
  createFoliageAdapterSummary,
  createHapticsAdapterSummary,
  createEngineModuleEvidencePacket,
  createLegacyPhysicsEngineAdapterSummary,
  createLevelStreamingAdapterSummary,
  createMaterialSystemAdapterSummary,
  createMultiplayerNetcodeAdapterSummary,
  createNaniteAdapterSummary,
  createParticleAdapterSummary,
  createPhysicsAdapterSummary,
  createPostProcessVolumeAdapterSummary,
  createPostProcessingAdapterSummary,
  createQuestMissionAdapterSummary,
  createRayTracingAdapterSummary,
  createMotionMatchingAdapterSummary,
  createSpatialAudioAdapterSummary,
  createSequencerAdapterSummary,
  createTerrainAdapterSummary,
  createVirtualTextureAdapterSummary,
  createVolumetricCloudAdapterSummary,
  createWeatherAdapterSummary,
  createWebXRAdapterSummary,
  createWorldStreamingAdapterSummary,
  listEngineModuleEvidencePackets,
  validateEngineModuleAdapters,
} from '@/lib/production/engine-module-adapters'
import {
  ENGINE_MODULE_INTEGRATION_DECISIONS,
  listEngineModuleDecisions,
  validateEngineModuleIntegrationPlan,
} from '@/lib/production/engine-module-integration-plan'

describe('engine module integration plan', () => {
  it('forces every low-import engine module into a wire or retire decision', () => {
    expect(ENGINE_MODULE_INTEGRATION_DECISIONS.map((item) => item.modulePath)).toEqual(
      expect.arrayContaining([
        'lib/sequencer-cinematics.ts',
        'lib/postprocessing/post-processing-system.ts',
        'lib/particles/advanced-particle-system.ts',
        'lib/particle-system-real.ts',
        'lib/ai/behavior-tree-system.tsx',
        'lib/control-rig-system.ts',
        'lib/facial-animation-system.ts',
        'lib/world/world-streaming.tsx',
        'lib/ray-tracing.ts',
        'lib/nanite-virtualized-geometry.ts',
        'lib/assets/asset-importer.ts',
        'lib/engine/audio-manager.ts',
        'lib/audio/spatial-audio-system.ts',
        'lib/physics/physics-system.ts',
        'lib/terrain/terrain-system.ts',
        'lib/volumetric-clouds.ts',
        'lib/dialogue/dialogue-system.tsx',
        'lib/webxr-vr-system.ts',
        'lib/motion-matching-system.ts',
        'lib/input/haptics-system.tsx',
        'lib/environment/weather-system.tsx',
        'lib/camera/camera-system.tsx',
        'lib/engine/physics-engine.ts',
        'lib/quest-mission-system.ts',
        'lib/ecs-dots-system.ts',
        'lib/streaming/level-streaming-system.tsx',
        'lib/networking-multiplayer.ts',
        'lib/foliage-system.ts',
        'lib/virtual-texture-system.ts',
        'lib/ai-audio-engine.ts',
        'lib/environment/day-night-cycle.tsx',
        'lib/asset-import-pipeline.ts',
        'lib/audio-engine.ts',
        'lib/post-process-volume.ts',
        'lib/aaa-material-system.ts',
        'lib/commands/command-handlers.tsx',
        'lib/hooks/useTheiaSystemsHooks.ts',
        'lib/workspace/workspace-service.ts',
        'lib/events/event-bus-system.tsx',
        'lib/health-check.ts',
        'lib/collaboration/collaboration-realtime.ts',
        'lib/theme-service.ts',
        'lib/workspace-store.ts',
      ])
    )
    expect(validateEngineModuleIntegrationPlan()).toEqual([])
  })

  it('keeps wire decisions attached to visible Studio owner surfaces', () => {
    const wired = listEngineModuleDecisions('wire')

    expect(wired.length).toBeGreaterThanOrEqual(6)
    expect(wired.every((item) => item.ownerSurface.startsWith('/studio/'))).toBe(true)
    expect(wired.every((item) => item.status === 'adapter-wired')).toBe(true)
    expect(wired.flatMap((item) => item.acceptanceCriteria).join(' ')).toContain('evidence')
  })

  it('keeps executable adapters attached to evidence-bearing contracts', () => {
    expect(validateEngineModuleAdapters()).toEqual([])
    expect(ENGINE_MODULE_ADAPTERS.map((adapter) => adapter.modulePath)).toEqual(
      expect.arrayContaining([
        'lib/sequencer-cinematics.ts',
        'lib/postprocessing/post-processing-system.ts',
        'lib/particles/advanced-particle-system.ts',
        'lib/world/world-streaming.tsx',
        'lib/ray-tracing.ts',
        'lib/nanite-virtualized-geometry.ts',
        'lib/assets/asset-importer.ts',
        'lib/engine/audio-manager.ts',
        'lib/dialogue/dialogue-system.tsx',
        'lib/webxr-vr-system.ts',
        'lib/motion-matching-system.ts',
        'lib/foliage-system.ts',
        'lib/virtual-texture-system.ts',
        'lib/aaa-material-system.ts',
      ])
    )
    expect(ENGINE_MODULE_ADAPTERS.every((adapter) => adapter.evidenceSignals.length >= 2)).toBe(true)
    expect(createSequencerAdapterSummary().easingKeys).toContain('linear')
  })

  it('exposes lightweight summaries for every wired engine runtime', () => {
    expect(createPostProcessingAdapterSummary().base.tonemapping).toBe('aces')
    expect(createParticleAdapterSummary().realtime.blendMode).toBe('additive')
    expect(createCharacterRigAdapterSummary().behaviorTreeContract).toBe('tick')
    expect(createWorldStreamingAdapterSummary().memoryBudgetSignal).toBe('memoryBudgetMB')
    expect(createRayTracingAdapterSummary().renderGate).toBe('performance-trace-required')
    expect(createNaniteAdapterSummary().meshContract).toBe('totalTriangles')
    expect(createAssetImporterAdapterSummary().executionBoundary).toBe('worker-or-studio-local')
    expect(createAudioRuntimeAdapterSummary().reviewGate).toBe('mix-evidence-required')
    expect(createSpatialAudioAdapterSummary().reverbKeys).toContain('wetDry')
    expect(createPhysicsAdapterSummary().settingsKeys).toContain('fixedTimeStep')
    expect(createTerrainAdapterSummary().settingsKeys).toContain('generateCollider')
    expect(createVolumetricCloudAdapterSummary().renderGate).toBe('webgpu-or-cloud-trace-required')
    expect(createDialogueRuntimeAdapterSummary().conversationKeys).toContain('nodes')
    expect(createWebXRAdapterSummary().optionalFeatures).toContain('hand-tracking')
    expect(createMotionMatchingAdapterSummary().resultKey).toBe('cost')
    expect(createHapticsAdapterSummary().supportedMotors).toContain('both')
    expect(createWeatherAdapterSummary().weatherTypes).toContain('thunderstorm')
    expect(createCameraRuntimeAdapterSummary().modes).toContain('cinematic')
    expect(createLegacyPhysicsEngineAdapterSummary().migrationTarget).toBe('lib/physics/physics-system.ts')
    expect(createQuestMissionAdapterSummary().evidenceGate).toBe('branch-balance-localization-review')
    expect(createDotsEcsAdapterSummary().mutationBoundary).toBe('system-scheduler-held')
    expect(createLevelStreamingAdapterSummary().executionGate).toBe('worker-or-sidecar')
    expect(createMultiplayerNetcodeAdapterSummary().evidenceGate).toBe('latency-rollback-authority-trace')
    expect(createFoliageAdapterSummary().renderGate).toBe('lod-culling-performance-trace')
    expect(createVirtualTextureAdapterSummary().renderGate).toBe('tile-cache-feedback-trace')
    expect(createAIAudioAdapterSummary().evidenceGate).toBe('emotion-context-human-review')
    expect(createDayNightAdapterSummary().gameplayGate).toBe('time-state-playtest-required')
    expect(createAssetImportPipelineAdapterSummary().evidenceGate).toBe('license-checksum-lod-pbr-review')
    expect(createAudioEngineAdapterSummary().executionBoundary).toBe('no-autoplay-in-browser')
    expect(createPostProcessVolumeAdapterSummary().executionBoundary).toBe('review-quality-only')
    expect(createMaterialSystemAdapterSummary().evidenceGate).toBe('pbr-texture-license-review')

    const packets = listEngineModuleEvidencePackets()
    expect(packets).toHaveLength(ENGINE_MODULE_ADAPTERS.length)
    expect(packets.every((packet) => packet.summaryKeys.length > 0)).toBe(true)
    expect(packets.find((packet) => packet.ownerSurface === '/studio/vfx')?.evidenceSignals).toContain('emitter-shape')
  })

  it('keeps evidence packets immutable from adapter source definitions', () => {
    const adapter = ENGINE_MODULE_ADAPTERS[0]
    const packet = createEngineModuleEvidencePacket(adapter)

    packet.exportedContracts.push('MutatedContract')
    packet.evidenceSignals.push('mutated-signal')

    expect(adapter.exportedContracts).not.toContain('MutatedContract')
    expect(adapter.evidenceSignals).not.toContain('mutated-signal')
  })
})
