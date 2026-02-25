import * as THREE from 'three';
import { BehaviorTree } from './behavior-tree';
import { LevelHistory, LevelManager } from './level-serialization';
import { NavigationMesh } from './navigation-mesh';
import { ParticleSystemManager } from './particle-system-real';
import { PhysicsWorld } from './physics-engine-real';
import { AnimationMixer, Skeleton } from './skeletal-animation';
import { PolySynth, Sampler, createAudioContext } from './audio-synthesis';
import { VideoEncoderReal, VideoExportPipeline } from './video-encoder-real';

export interface EngineState {
  physicsWorld: PhysicsWorld | null;
  scene: THREE.Scene | null;
  levelManager: LevelManager | null;
  levelHistory: LevelHistory | null;
  particleManager: ParticleSystemManager | null;
  audioContext: AudioContext | null;
  synths: Map<string, PolySynth>;
  samplers: Map<string, Sampler>;
  behaviorTrees: Map<string, BehaviorTree>;
  navMeshes: Map<string, NavigationMesh>;
  skeletons: Map<string, Skeleton>;
  animationMixers: Map<string, AnimationMixer>;
  videoEncoder: VideoEncoderReal | null;
  exportPipeline: VideoExportPipeline | null;
}

export const engineState: EngineState = {
  physicsWorld: null,
  scene: null,
  levelManager: null,
  levelHistory: null,
  particleManager: null,
  audioContext: null,
  synths: new Map(),
  samplers: new Map(),
  behaviorTrees: new Map(),
  navMeshes: new Map(),
  skeletons: new Map(),
  animationMixers: new Map(),
  videoEncoder: null,
  exportPipeline: null,
};

export async function initializeEngineState(): Promise<void> {
  engineState.scene = new THREE.Scene();
  engineState.physicsWorld = new PhysicsWorld();
  engineState.levelManager = new LevelManager();
  engineState.levelHistory = new LevelHistory();
  await engineState.levelManager.newLevel('New Level');
  engineState.particleManager = new ParticleSystemManager(engineState.scene);
  engineState.audioContext = await createAudioContext();
  engineState.exportPipeline = new VideoExportPipeline();
}
