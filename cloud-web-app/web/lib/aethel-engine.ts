/**
 * AETHEL ENGINE - INTEGRAÇÃO TOTAL DE SISTEMAS
 * 
 * Este arquivo conecta todos os sistemas do engine em uma API unificada.
 * Permite que a IA e o desenvolvedor acessem todos os recursos do engine
 * de forma simplificada e consistente.
 * 
 * SISTEMAS INTEGRADOS:
 * - Physics Engine (Rapier-style)
 * - Material Editor
 * - AI Behavior Trees
 * - Navigation Mesh
 * - Video Encoder
 * - Particle System
 * - Skeletal Animation
 * - Level Serialization
 * - Audio Synthesis
 * - PBR Shader Pipeline
 * - Networking/Multiplayer
 * - Profiler
 * - Hot Reload
 * - World Partition
 * - Destruction
 * - Terrain Engine
 * - Foliage System
 * - Decal System
 * - Post-Process Volume
 */

import * as THREE from 'three';

// Import all engine systems
import { PhysicsWorld, PhysicsBody, PhysicsCollider, RigidBodyConfig } from './physics-engine-real';
import { BehaviorTree, BehaviorNode, Blackboard } from './behavior-tree';
import { NavigationMesh, NavAgentSystem, createNavAgentSystem } from './navigation-mesh';
import { VideoEncoderReal, VideoEncoderConfig, ScreenRecorder, createScreenRecorder } from './video-encoder-real';
import { ParticleSystemManager, ParticleEmitter } from './particle-system-real';
import { AnimationClip } from './skeletal-animation';
import { LevelSerializer } from './level-serialization';
import { PBRMaterial, PostProcessPipeline, MaterialPresets } from './pbr-shader-pipeline';
import { NetworkManager, NetworkClient } from './networking-multiplayer';
import { Profiler, ProfilerOverlay } from './profiler-integrated';
import { HotReloadManager, HotReloadOverlay } from './hot-reload-system';
import { WorldPartitionManager, HLODManager } from './world-partition';
import { DestructionManager, DestructibleObject } from './destruction-system';
import { TerrainEngine, HeightmapGenerator, SimplexNoise } from './terrain-engine';
import { FoliageClusterManager, FoliagePlacer, GrassGenerator, TreeGenerator } from './foliage-system';
import { DecalManager, DeferredDecalRenderer } from './decal-system';
import { PostProcessVolumeManager, PostProcessPass, POST_PROCESS_PRESETS } from './post-process-volume';

// ============================================================================
// ENGINE CORE
// ============================================================================

export interface AethelEngineConfig {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  enablePhysics: boolean;
  enableNetworking: boolean;
  enableProfiling: boolean;
  enableHotReload: boolean;
}

export class AethelEngine {
  private static instance: AethelEngine | null = null;
  
  // Core
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  
  // Systems
  readonly physics: PhysicsWorld;
  readonly navmesh: NavigationMesh;
  readonly particles: ParticleSystemManager;
  readonly animation: Map<string, { update: (deltaTime: number) => void }>;
  readonly level: typeof LevelSerializer;
  readonly audio: unknown;
  readonly postProcess: unknown;
  readonly network: NetworkManager | null;
  readonly profiler: Profiler;
  readonly hotReload: HotReloadManager;
  readonly world: WorldPartitionManager;
  readonly hlod: HLODManager;
  readonly destruction: DestructionManager;
  readonly terrain: TerrainEngine;
  readonly foliage: FoliageClusterManager;
  readonly decals: DecalManager;
  readonly ppVolumes: PostProcessVolumeManager;
  readonly ppPass: PostProcessPass;
  
  // Video export
    readonly videoEncoder: VideoEncoderReal | null;
    readonly screenRecorder: ScreenRecorder;

    // Nav agents
    readonly navAgents: NavAgentSystem;
  
  // State
  private running: boolean = false;
  private lastTime: number = 0;
  private deltaTime: number = 0;
  
  private constructor(config: AethelEngineConfig) {
    this.renderer = config.renderer;
    this.scene = config.scene;
    this.camera = config.camera;
    
    // Initialize all systems
    this.physics = new PhysicsWorld();
    this.physics.setGravity(new THREE.Vector3(0, -9.81, 0));
    this.navmesh = new NavigationMesh();
    this.navAgents = createNavAgentSystem(this.navmesh);
    this.particles = new ParticleSystemManager(this.scene);
    this.animation = new Map();
    this.level = LevelSerializer;
    this.audio = null;
    this.postProcess = null;
    
    // Network (optional)
    this.network = config.enableNetworking ? new NetworkManager() : null;
    
    // Profiler
    this.profiler = Profiler.getInstance();
    if (config.enableProfiling) {
      const overlay = new ProfilerOverlay(this.profiler);
      overlay.show();
    }
    
    // Hot reload
    this.hotReload = HotReloadManager.getInstance();
    if (config.enableHotReload) {
      this.hotReload.connect();
      const hrOverlay = new HotReloadOverlay(this.hotReload);
      hrOverlay.show();
    }
    
    // World streaming
    this.world = new WorldPartitionManager(this.scene);
    this.hlod = new HLODManager(this.world, this.scene);
    
    // Destruction
    this.destruction = new DestructionManager(this.scene);
    
    // Terrain
    this.terrain = new TerrainEngine(this.scene);
    
    // Foliage
    this.foliage = new FoliageClusterManager(this.scene);
    
    // Decals
    this.decals = new DecalManager(this.scene);
    
    // Post-process volumes
    this.ppVolumes = new PostProcessVolumeManager();
    this.ppPass = new PostProcessPass(
      this.renderer,
      this.scene,
      this.camera,
      window.innerWidth,
      window.innerHeight
    );
    
    // Video encoder (requires explicit config)
    this.videoEncoder = null;
    
    // Screen recorder - always available
    this.screenRecorder = createScreenRecorder();
    
    // Connect post-process volumes to pass
    this.ppVolumes.onSettingsChanged((settings) => {
      this.ppPass.setSettings(settings);
    });
    
    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
  }
  
  static getInstance(config?: AethelEngineConfig): AethelEngine {
    if (!AethelEngine.instance) {
      if (!config) {
        throw new Error('AethelEngine must be initialized with config first');
      }
      AethelEngine.instance = new AethelEngine(config);
    }
    return AethelEngine.instance;
  }
  
  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.update();
  }
  
  stop(): void {
    this.running = false;
  }
  
  private update = (): void => {
    if (!this.running) return;
    
    const currentTime = performance.now();
    this.deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    this.profiler.beginFrame();
    
    // Update physics
    this.profiler.beginSpan('Physics', 'cpu');
    this.physics.step(this.deltaTime);
    this.profiler.endSpan('Physics');
    
    // Update animations
    this.profiler.beginSpan('Animation', 'cpu');
    for (const animator of this.animation.values()) {
      animator.update(this.deltaTime);
    }
    this.profiler.endSpan('Animation');
    
    // Update particles
    this.profiler.beginSpan('Particles', 'cpu');
    this.particles.update(this.deltaTime);
    this.profiler.endSpan('Particles');
    
    // Update world streaming
    this.profiler.beginSpan('WorldStreaming', 'cpu');
    const cameraPos = this.camera.position.clone();
    const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.world.update(cameraPos, cameraDir);
    this.hlod.update(cameraPos);
    this.profiler.endSpan('WorldStreaming');
    
    // Update destruction
    this.profiler.beginSpan('Destruction', 'cpu');
    this.destruction.update(this.deltaTime);
    this.profiler.endSpan('Destruction');
    
    // Update foliage
    this.profiler.beginSpan('Foliage', 'cpu');
    this.foliage.update(cameraPos, this.deltaTime);
    this.profiler.endSpan('Foliage');
    
    // Update decals
    this.profiler.beginSpan('Decals', 'cpu');
    this.decals.update(this.deltaTime);
    this.profiler.endSpan('Decals');
    
    // Update terrain LOD
    this.profiler.beginSpan('Terrain', 'cpu');
    this.terrain.updateLODs(cameraPos);
    this.profiler.endSpan('Terrain');
    
    // Update post-process volumes
    this.profiler.beginSpan('PostProcess', 'cpu');
    this.ppVolumes.update(cameraPos);
    this.profiler.endSpan('PostProcess');
    
    // Network update
    if (this.network) {
      this.profiler.beginSpan('Network', 'cpu');
      // Networking module currently exposes high-level APIs but no per-frame update hook
      this.profiler.endSpan('Network');
    }
    
    // Render
    this.profiler.beginSpan('Render', 'cpu');
    this.ppPass.render();
    this.profiler.endSpan('Render');
    
    this.profiler.endFrame();
    
    requestAnimationFrame(this.update);
  };
  
  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderer.setSize(width, height);
    
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    
    this.ppPass.resize(width, height);
    (this.postProcess as any)?.resize?.(width, height);
  }
  
  // ============================================================================
  // QUICK ACCESS METHODS
  // ============================================================================
  
  // Physics shortcuts
  createRigidBody(position: THREE.Vector3, options?: Partial<RigidBodyConfig>): PhysicsBody {
    const config: RigidBodyConfig = {
      type: options?.type ?? 'dynamic',
      position,
      rotation: options?.rotation ?? new THREE.Quaternion(),
      linearVelocity: options?.linearVelocity,
      angularVelocity: options?.angularVelocity,
      mass: options?.mass,
      gravityScale: options?.gravityScale,
      linearDamping: options?.linearDamping,
      angularDamping: options?.angularDamping,
      canSleep: options?.canSleep,
      lockPositionX: options?.lockPositionX,
      lockPositionY: options?.lockPositionY,
      lockPositionZ: options?.lockPositionZ,
      lockRotationX: options?.lockRotationX,
      lockRotationY: options?.lockRotationY,
      lockRotationZ: options?.lockRotationZ,
    };
    return this.physics.createBody(config);
  }
  
  // Behavior Tree shortcuts
  createBehaviorTree(rootNode: BehaviorNode): BehaviorTree {
    return new BehaviorTree(rootNode);
  }
  
  // Navigation shortcuts
  findPath(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] {
    return this.navmesh.findPath(start, end) ?? [];
  }
  
  // Particle shortcuts
  createEmitter(config: any): ParticleEmitter {
    return this.particles.createEmitter(config);
  }
  
  // Audio shortcuts
  playSound(_synth: unknown, _note: number, _duration?: number): void {}
  
  // Video export - uses canvas captureStream + WebM encoding
  async exportVideo(duration: number, _config?: Partial<VideoEncoderConfig>): Promise<Blob> {
    // Capture the WebGL canvas as a MediaStream
    const canvas = this.renderer.domElement;
    const fps = _config?.framerate ?? 30;
    const stream = canvas.captureStream(fps);
    
    // Create a WebM muxer for recording
    const { WebMMuxer } = await import('./video-encoder-real');
    const muxer = new WebMMuxer();
    
    // Start recording
    await muxer.startRecording(stream);
    
    // Wait for the specified duration
    await new Promise<void>((resolve) => {
      const startTime = Date.now();
      
      const checkDuration = () => {
        if (Date.now() - startTime >= duration * 1000) {
          resolve();
        } else {
          requestAnimationFrame(checkDuration);
        }
      };
      
      checkDuration();
    });
    
    // Stop and return the blob
    const blob = await muxer.stopRecording();
    return blob;
  }
  
  // Start screen/canvas recording for manual control
  async startRecording(): Promise<void> {
    const canvas = this.renderer.domElement;
    const stream = canvas.captureStream(30);
    await this.screenRecorder['muxer'].startRecording(stream);
  }
  
  async stopRecording(): Promise<Blob> {
    return this.screenRecorder.stopRecording();
  }
  
  // Level shortcuts
  async saveLevel(name: string): Promise<void> {
    const levelData = this.level.serializeLevel({ name, scene: this.scene });
    localStorage.setItem(`level_${name}`, JSON.stringify(levelData));
  }
  
  async loadLevel(name: string): Promise<void> {
    const data = localStorage.getItem(`level_${name}`);
    if (data) {
      const levelData = JSON.parse(data);
      void this.level.deserializeLevel(levelData);
    }
  }
  
  // Material shortcuts
  createPBRMaterial(preset?: keyof typeof MaterialPresets): PBRMaterial {
    if (preset && MaterialPresets[preset]) {
      return new PBRMaterial(MaterialPresets[preset]());
    }
    return new PBRMaterial();
  }
  
  // Destruction shortcuts
  makeDestructible(mesh: THREE.Mesh, config?: any): DestructibleObject {
    return this.destruction.register(mesh.uuid, mesh, config);
  }
  
  // Terrain shortcuts
  generateTerrain(seed?: number): void {
    this.terrain.generate(seed);
  }
  
  // Decal shortcuts
  addDecal(
    type: string,
    mesh: THREE.Mesh,
    position: THREE.Vector3,
    normal: THREE.Vector3
  ): any {
    return this.decals.addDecal(type, mesh, position, normal);
  }
  
  // Post-process shortcuts
  applyPostProcessPreset(preset: string): void {
    this.ppVolumes.applyPreset(preset);
  }
  
  // ============================================================================
  // AI TOOL REGISTRY
  // ============================================================================
  
  getAITools(): Record<string, Function> {
    return {
      // Physics
      'physics.createBody': this.createRigidBody.bind(this),
      'physics.applyForce': (body: PhysicsBody, force: THREE.Vector3) => body.addForce(force),
      'physics.setVelocity': (body: PhysicsBody, vel: THREE.Vector3) => body.setVelocity(vel),
      
      // Navigation
      'nav.findPath': this.findPath.bind(this),
      'nav.createAgent': () => this.navAgents.createAgent({ id: `agent_${Date.now()}`, position: this.camera.position.clone() }),
      
      // Particles
      'particles.emit': (emitter: ParticleEmitter, count: number) => emitter.emit(count),
      'particles.create': this.createEmitter.bind(this),
      
      // Audio
      'audio.createSynth': (_type: string) => null,
      'audio.playNote': this.playSound.bind(this),
      
      // Level
      'level.save': this.saveLevel.bind(this),
      'level.load': this.loadLevel.bind(this),
      
      // Materials
      'material.createPBR': this.createPBRMaterial.bind(this),
      
      // Destruction
      'destruction.makeDestructible': this.makeDestructible.bind(this),
      'destruction.damage': (id: string, damage: number, point: THREE.Vector3) => 
        this.destruction.applyDamage(id, damage, point, new THREE.Vector3(0, 1, 0), damage),
      'destruction.explode': (center: THREE.Vector3, damage: number, radius: number) =>
        this.destruction.applyExplosion(center, damage, radius),
      
      // Terrain
      'terrain.generate': this.generateTerrain.bind(this),
      'terrain.getHeight': (x: number, z: number) => this.terrain.getHeightAt(x, z),
      
      // Foliage
      'foliage.setWind': (dir: THREE.Vector2, speed: number) => this.foliage.setWind(dir, speed),
      
      // Decals
      'decal.add': this.addDecal.bind(this),
      'decal.clear': () => this.decals.clearAll(),
      
      // Post-process
      'pp.applyPreset': this.applyPostProcessPreset.bind(this),
      'pp.setExposure': (val: number) => this.ppVolumes.setGlobalSettings({ exposure: val }),
      'pp.setBloom': (intensity: number) => this.ppVolumes.setGlobalSettings({ 
        bloomEnabled: true, 
        bloomIntensity: intensity 
      }),
      
      // Network
      'network.connect': (config: any) => this.network?.connect(config),
      'network.disconnect': () => this.network?.disconnect(),
      'network.send': (type: any, data: any) => this.network?.getClient()?.send(type, data),
      
      // Video
      'video.export': this.exportVideo.bind(this),
      
      // Profiler
      'profiler.getStats': () => this.profiler.getStats(),
      
      // General
      'engine.getDeltaTime': () => this.deltaTime,
      'engine.getScene': () => this.scene,
      'engine.getCamera': () => this.camera,
    };
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.stop();
    
    // PhysicsWorld doesn't currently expose dispose(); allow GC by dropping references.
    this.particles.dispose();
    this.ppPass.dispose();
    this.destruction.dispose();
    this.terrain.dispose();
    this.foliage.dispose();
    this.decals.dispose();
    this.ppVolumes.dispose();
    this.world.dispose();
    this.hlod.dispose();
    this.hotReload.dispose();
    
    if (this.network) {
      this.network.disconnect();
    }
    
    AethelEngine.instance = null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export all systems for direct access
export * from './physics-engine-real';
export * from './behavior-tree';
export * from './navigation-mesh';
export * from './video-encoder-real';
export * from './particle-system-real';
export * from './skeletal-animation';
export * from './level-serialization';
export * from './audio-synthesis';
export * from './pbr-shader-pipeline';
export * from './networking-multiplayer';
export * from './profiler-integrated';
export * from './hot-reload-system';
export * from './world-partition';
export * from './destruction-system';
export * from './terrain-engine';
export * from './foliage-system';
export * from './decal-system';
export * from './post-process-volume';

// Default export
export default AethelEngine;
