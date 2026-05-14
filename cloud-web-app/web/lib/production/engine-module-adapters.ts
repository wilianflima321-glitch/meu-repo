import { Easings, type SequenceConfig, type TrackType } from '@/lib/sequencer-cinematics';
import type {
  BloomSettings,
  ColorGradingSettings,
  PostProcessingSettings,
} from '@/lib/postprocessing/post-processing-system';
import type { ParticleSystemSettings } from '@/lib/particles/advanced-particle-system';
import type { ParticleEmitterConfig } from '@/lib/particle-system-real';
import type { BehaviorTree } from '@/lib/ai/behavior-tree-system';
import type { StreamingConfig } from '@/lib/world/world-streaming';
import type { ControlRigConfig } from '@/lib/control-rig-system';
import type { FacialConfig } from '@/lib/facial-animation-system';

export type EngineModuleAdapterSurface =
  | '/studio/film'
  | '/studio/level'
  | '/studio/vfx'
  | '/studio/rig'
  | '/studio/facial'
  | '/studio/landscape';

export type EngineModuleRuntimeBoundary = 'summary-adapter' | 'type-contract' | 'render-gated';

export interface EngineModuleAdapter {
  modulePath: string;
  ownerSurface: EngineModuleAdapterSurface;
  contractKind: string;
  runtimeBoundary: EngineModuleRuntimeBoundary;
  exportedContracts: string[];
  evidenceSignals: string[];
}

export interface SequencerAdapterSummary {
  sequence: SequenceConfig;
  trackTypes: TrackType[];
  easingKeys: string[];
}

export interface PostProcessingAdapterSummary {
  base: Pick<PostProcessingSettings, 'enabled' | 'antialiasing' | 'tonemapping' | 'exposure'>;
  bloom: Pick<BloomSettings, 'enabled' | 'intensity' | 'threshold' | 'radius'>;
  colorGrading: Pick<ColorGradingSettings, 'enabled' | 'contrast' | 'saturation' | 'lutIntensity'>;
}

export interface ParticleAdapterSummary {
  advanced: Pick<ParticleSystemSettings, 'id' | 'name' | 'duration' | 'looping' | 'maxParticles'>;
  realtime: Pick<ParticleEmitterConfig, 'maxParticles' | 'emissionRate' | 'blendMode' | 'worldSpace'>;
}

export interface CharacterRigAdapterSummary {
  rigContract: keyof ControlRigConfig;
  facialContract: keyof FacialConfig;
  behaviorTreeContract: keyof BehaviorTree;
}

export interface WorldStreamingAdapterSummary {
  streamingContract: keyof StreamingConfig;
  memoryBudgetSignal: 'memoryBudgetMB';
}

export const ENGINE_MODULE_ADAPTERS: EngineModuleAdapter[] = [
  {
    modulePath: 'lib/sequencer-cinematics.ts',
    ownerSurface: '/studio/film',
    contractKind: 'shot-sequence-summary',
    runtimeBoundary: 'summary-adapter',
    exportedContracts: ['SequenceConfig', 'TrackType', 'Easings'],
    evidenceSignals: ['shot-id', 'sequence-duration', 'render-evidence-link'],
  },
  {
    modulePath: 'lib/postprocessing/post-processing-system.ts',
    ownerSurface: '/studio/level',
    contractKind: 'viewport-quality-preset',
    runtimeBoundary: 'render-gated',
    exportedContracts: ['PostProcessingSettings', 'BloomSettings', 'ColorGradingSettings'],
    evidenceSignals: ['quality-preset', 'render-readiness', 'postfx-cost-class'],
  },
  {
    modulePath: 'lib/particles/advanced-particle-system.ts',
    ownerSurface: '/studio/vfx',
    contractKind: 'vfx-particle-preset',
    runtimeBoundary: 'summary-adapter',
    exportedContracts: ['ParticleSystemSettings', 'EmitterSettings', 'CollisionSettings'],
    evidenceSignals: ['emitter-shape', 'max-particles', 'collision-enabled'],
  },
  {
    modulePath: 'lib/particle-system-real.ts',
    ownerSurface: '/studio/vfx',
    contractKind: 'gpu-particle-runtime',
    runtimeBoundary: 'render-gated',
    exportedContracts: ['ParticleEmitterConfig', 'ParticleForce', 'ParticleCollider'],
    evidenceSignals: ['gpu-runtime', 'blend-mode', 'world-space'],
  },
  {
    modulePath: 'lib/ai/behavior-tree-system.tsx',
    ownerSurface: '/studio/level',
    contractKind: 'gameplay-validation-graph',
    runtimeBoundary: 'type-contract',
    exportedContracts: ['BehaviorTree', 'AIAgent', 'BehaviorNode'],
    evidenceSignals: ['npc-decision-path', 'playtest-failure-link', 'agent-scope-lock'],
  },
  {
    modulePath: 'lib/world/world-streaming.tsx',
    ownerSurface: '/studio/landscape',
    contractKind: 'world-partition-summary',
    runtimeBoundary: 'summary-adapter',
    exportedContracts: ['StreamingConfig', 'WorldChunk', 'WorldStreamingSystem'],
    evidenceSignals: ['chunk-budget', 'loaded-chunks', 'memory-budget-mb'],
  },
  {
    modulePath: 'lib/control-rig-system.ts',
    ownerSurface: '/studio/rig',
    contractKind: 'character-rig-validation',
    runtimeBoundary: 'type-contract',
    exportedContracts: ['ControlRigConfig', 'RigHierarchy', 'RigControl'],
    evidenceSignals: ['ik-targets', 'constraint-count', 'rig-review-packet'],
  },
  {
    modulePath: 'lib/facial-animation-system.ts',
    ownerSurface: '/studio/facial',
    contractKind: 'facial-animation-review',
    runtimeBoundary: 'type-contract',
    exportedContracts: ['FacialConfig', 'FACSPose', 'LipSyncData'],
    evidenceSignals: ['facs-pose', 'lip-sync-evidence', 'emotion-state'],
  },
];

export function createSequencerAdapterSummary(): SequencerAdapterSummary {
  return {
    sequence: {
      duration: 30,
      playbackSpeed: 1,
      loop: false,
    },
    trackTypes: ['camera', 'transform', 'light', 'audio', 'event', 'material', 'visibility'],
    easingKeys: Object.keys(Easings),
  };
}

export function listEngineModuleAdapters(surface?: EngineModuleAdapterSurface): EngineModuleAdapter[] {
  return surface
    ? ENGINE_MODULE_ADAPTERS.filter((adapter) => adapter.ownerSurface === surface)
    : [...ENGINE_MODULE_ADAPTERS];
}

export function validateEngineModuleAdapters(adapters: EngineModuleAdapter[] = ENGINE_MODULE_ADAPTERS): string[] {
  const failures: string[] = [];
  const seen = new Set<string>();

  for (const adapter of adapters) {
    if (seen.has(adapter.modulePath)) failures.push(`${adapter.modulePath}: duplicate adapter`);
    seen.add(adapter.modulePath);
    if (!adapter.ownerSurface.startsWith('/studio/')) failures.push(`${adapter.modulePath}: missing Studio owner`);
    if (adapter.exportedContracts.length < 2) failures.push(`${adapter.modulePath}: needs exported contracts`);
    if (adapter.evidenceSignals.length < 2) failures.push(`${adapter.modulePath}: needs evidence signals`);
  }

  return failures;
}
