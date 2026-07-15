// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
/**
 * SimulationTick — the "Tick de Simulação" half of Golden Rule 2 (Isolamento
 * do Game-Loop Líquido).
 *
 * Hard architectural constraint: this module MUST NOT import `AAARenderer`,
 * `RenderSystem`, or any drawing/canvas API. It only advances game state
 * (ECS, physics, visual scripts, cutscene transforms) and reports timing
 * stats. `RenderTick` (`render-tick.ts`) reads whatever state this produces
 * on its own independent clock — it never calls into this module to compute
 * anything.
 *
 * Why this split exists: Aethel's 2030 "Computação Líquida" pillar wants to
 * migrate physics/AI computation off a thermally-throttled phone onto the
 * Cloudflare Edge transparently. That is only possible if the simulation
 * step is a swappable, independently start/stoppable unit — not a few lines
 * fused into the same `requestAnimationFrame` callback as the renderer. With
 * this module isolated, an edge-backed `SimulationTick` implementation (or
 * simply calling `.stop()` on this one while a remote one takes over) can be
 * substituted without `RenderTick`/`GameLoop` consumers noticing, and the
 * screen keeps rendering at 60FPS the whole time.
 */
import { PhysicsWorld } from './physics-engine-real';
import { SequencerRuntime } from './sequencer-runtime';
import { VisualScriptSystem } from './visual-script-integration';
import { World, Entity, System, TransformComponent, RigidbodyComponent, ColliderComponent, EntityId } from './game-engine-core';
import { RigidBodyConfig, ColliderConfig } from './physics-engine-real';
import * as THREE from 'three';
import {
  createSharedTransformPhysicsBridge,
  type SharedTransformPhysicsBridge,
  type TransformPose,
} from './runtime/shared-transform-physics-bridge';
import {
  createPhysicsWorkerManager,
  type PhysicsWorkerManager,
} from './runtime/physics-worker-manager';
import type { PhysicsWorkerBodySeed } from './runtime/physics-worker-protocol';
import {
  createGameplayPoolBus,
  type GameplayPoolBus,
} from './runtime/gameplay-pool-bus';
import {
  createCharacterTopologyBus,
  type CharacterTopologyBus,
} from './character/character-topology-bus';
import type { DualQuaternionGpuDeviceLike } from './character/dual-quaternion-skinning';
import type { FixedPointRollbackSession } from './netcode/fixed-point-rollback-session';
import {
  evaluateAndFireWithEqs,
  type EqsGasFireTickResult,
} from './character/eqs-playtest-wire';
import type { EqsQueryInput } from './character/environment-query-system';
import {
  WorldPartitionStreamer,
} from './world-streaming/partition-streaming';
import {
  tickPartitionFromView,
} from './world-streaming/partition-playtest-wire';
import type {
  PartitionStreamingStats,
  PartitionViewPose,
} from './world-streaming/types';
import {
  tickOceanFromSimulation,
  type OceanBuoyancyTickResult,
} from './ocean/ocean-playtest-wire';
import type { BuoyancyBodySample } from './ocean/buoyancy';
import { getOceanViewportMesh } from './ocean/ocean-viewport-wire';
import type { PhysicsBody } from './physics-engine-real';
import {
  tickCosmosSimulation,
  type CosmosSimTickResult,
} from './cosmos/cosmos-sim-wire';
import {
  tickCosmosRender,
  type CosmosRenderTargets,
} from './cosmos/cosmos-render-wire';
import type { SweepObstacle, SweepSphere } from './cosmos/ccd-sweep';
import {
  clearGravityVolumes,
  registerGravityVolume,
} from './cosmos/gravity-volume';
import {
  clearNestedPhysicsGrids,
  createNestedPhysicsGrid,
  enterIsland,
  setHullMotion,
} from './cosmos/nested-physics-grid';
import {
  bindAcousticAudioBus,
  buildAtmosphereAcousticSamples,
  buildHullAcousticSamples,
  buildVacuumAcousticSamples,
  createAcousticMockBus,
  tickAcousticAtmosphere,
  type AcousticAtmosphereApplyResult,
  type AcousticAudioBusTarget,
} from './cosmos/acoustic-atmosphere-wire';
import type { AcousticSamplePoint } from './cosmos/acoustic-atmosphere';
import {
  createFractureMassPlaytestSession,
  tickFractureMassPlaytest,
  type FractureMassPlaytestSession,
  type FractureMassTickResult,
} from './playtest/fracture-mass-playtest-wire';
import type { GpuFractureGpuDeviceLike } from './destruction/gpu-fracture';
import type { GpuMassEcsGpuDeviceLike } from './mass-ecs/gpu-mass-step';import type { LwcVec3 } from './cosmos/types';

// ============================================================================
// SYSTEM: PHYSICS INTEGRATION
// Connects ECS Data (RigidbodyComponent) <-> Physics Engine (Rapier)
// ============================================================================
export class PhysicsIntegrationSystem implements System {
  name = 'PhysicsIntegration';
  requiredComponents = ['transform', 'rigidbody'];
  priority = 100; // Run early to apply physics results to transforms

  private bodyMap: Map<EntityId, import('./physics-engine-real').PhysicsBody> = new Map();
  /** Law I (bk) — SAB ring when COI; silent fallback-copy otherwise (Zero-UI). */
  private transformBridge: SharedTransformPhysicsBridge | null = null;
  private lastPublishedEpoch = 0;

  constructor(private physicsWorld: PhysicsWorld) {}

  /**
   * Enable shared-transform publish on sync (playtest / runtime path).
   * Safe without COOP/COEP — bridge uses fallback-copy, never throws.
   */
  enableSharedTransformBridge(capacity = 256): SharedTransformPhysicsBridge {
    this.transformBridge = createSharedTransformPhysicsBridge(capacity);
    return this.transformBridge;
  }

  getSharedTransformBridge(): SharedTransformPhysicsBridge | null {
    return this.transformBridge;
  }

  /** Letter cm — lookup registered Rapier body (null when missing). */
  getPhysicsBody(entityId: EntityId): PhysicsBody | undefined {
    return this.bodyMap.get(entityId);
  }

  /**
   * Letter cm/cq — collect dynamic body samples for ocean buoyancy.
   * Prefer explicit OceanBuoyancyVolume (cq CLOSED). AABB collider volume is
   * recorded only as heuristic HELD fallback data — compute path skips without
   * metadata unless allowAabbHeuristic is opted in.
   */
  collectBuoyancyBodySamples(
    world: World,
    maxBodies = 64,
    opts?: { allowAabbHeuristic?: boolean },
  ): BuoyancyBodySample[] {
    const out: BuoyancyBodySample[] = [];
    const allowAabb = opts?.allowAabbHeuristic === true;
    for (const [entityId, body] of this.bodyMap) {
      if (out.length >= maxBodies) break;
      if (!body.rawBody.isDynamic()) continue;
      const transform = world.getComponent<TransformComponent>(entityId, 'transform');
      const rb = world.getComponent<RigidbodyComponent>(entityId, 'rigidbody');
      if (!transform || !rb) continue;
      const collider = world.getComponent<ColliderComponent>(entityId, 'collider');
      let aabbVolume = 1;
      if (collider) {
        const s = collider.size;
        if (collider.shape === 'box') {
          aabbVolume = Math.max(0.01, s.x * s.y * s.z);
        } else if (collider.shape === 'sphere') {
          const r = s.x;
          aabbVolume = Math.max(0.01, (4 / 3) * Math.PI * r * r * r);
        } else {
          aabbVolume = Math.max(0.01, s.x * s.y * s.z);
        }
      }
      const explicit = world.getComponent<{
        type: 'oceanBuoyancyVolume';
        volumeM3: number;
        densityKgPerM3?: number;
        centerOffset?: { x: number; y: number; z: number };
        fluidDensityKgPerM3?: number;
      }>(entityId, 'oceanBuoyancyVolume');
      // Fail-closed: skip bodies without explicit volume unless AABB heuristic opted in.
      if (!explicit && !allowAabb) continue;
      const volumeM3 =
        explicit && Number.isFinite(explicit.volumeM3) && explicit.volumeM3 > 0
          ? explicit.volumeM3
          : aabbVolume;
      out.push({
        id: String(entityId),
        position: {
          x: transform.position.x,
          y: transform.position.y,
          z: transform.position.z,
        },
        volume: volumeM3,
        mass: rb.mass,
        explicitVolume: explicit
          ? {
              type: 'oceanBuoyancyVolume',
              entityId: String(entityId),
              volumeM3: explicit.volumeM3,
              densityKgPerM3: explicit.densityKgPerM3,
              centerOffset: explicit.centerOffset,
              fluidDensityKgPerM3: explicit.fluidDensityKgPerM3,
            }
          : undefined,
        requireExplicitVolume: !allowAabb,
      });
    }
    return out;
  }

  /**
   * Letter cm — apply buoyancy force results via Rapier addForce.
   * Returns count of bodies that received a non-zero force.
   */
  applyBuoyancyForceResults(
    forces: Array<{ bodyId: string; force: { x: number; y: number; z: number } }>,
  ): number {
    let n = 0;
    for (const f of forces) {
      if (f.force.x === 0 && f.force.y === 0 && f.force.z === 0) continue;
      const body = this.bodyMap.get(f.bodyId as EntityId);
      if (!body || !body.rawBody.isDynamic()) continue;
      body.addForce(new THREE.Vector3(f.force.x, f.force.y, f.force.z), 'force');
      n += 1;
    }
    return n;
  }

  onEntityAdded(_entity: Entity) {
    // Registration will happen via registerEntity with World context
  }

  onEntityRemoved(entity: Entity) {
    this.bodyMap.delete(entity.id);
  }

  update(_entities: Entity[], _dt: number) {
    // Sync happens explicitly via `syncTransformsFromPhysics` after the
    // physics step, since this ECS System interface doesn't carry a World
    // reference for writing components back.
  }

  syncTransformsFromPhysics(world: World) {
    const poses: TransformPose[] = [];

    this.bodyMap.forEach((body, entityId) => {
      if (!body.rawBody.isDynamic()) return;

      const transform = world.getComponent<TransformComponent>(entityId, 'transform');
      if (transform) {
        const pos = body.position;
        const rot = body.rotation;

        transform.position.set(pos.x, pos.y, pos.z);
        transform.rotation.setFromQuaternion(rot);

        if (this.transformBridge) {
          poses.push({
            px: pos.x,
            py: pos.y,
            pz: pos.z,
            qx: rot.x,
            qy: rot.y,
            qz: rot.z,
            qw: rot.w,
            sx: 1,
            sy: 1,
            sz: 1,
          });
        }
      }
    });

    if (this.transformBridge && poses.length > 0) {
      this.lastPublishedEpoch = this.transformBridge.publishPoses(poses);
      this.transformBridge.acquireEpoch(this.lastPublishedEpoch - 1);
    }
  }

  registerEntity(entity: Entity, world: World) {
    if (this.bodyMap.has(entity.id)) return;

    const rb = world.getComponent<RigidbodyComponent>(entity.id, 'rigidbody');
    const transform = world.getComponent<TransformComponent>(entity.id, 'transform');

    if (!rb || !transform) return;

    const bodyConfig: RigidBodyConfig = {
      type: rb.isKinematic ? 'kinematic' : 'dynamic',
      position: transform.position,
      rotation: new THREE.Quaternion().setFromEuler(transform.rotation),
      mass: rb.mass,
      linearDamping: rb.drag,
      angularDamping: rb.angularDrag,
      ccdEnabled: false,
    };

    if (!rb.useGravity) bodyConfig.gravityScale = 0;

    const body = this.physicsWorld.createBody(bodyConfig);
    this.bodyMap.set(entity.id, body);

    const collider = world.getComponent<ColliderComponent>(entity.id, 'collider');
    if (collider) {
      const colliderConfig: ColliderConfig = {
        shape: collider.shape as any,
        halfExtents: collider.shape === 'box' ? collider.size.clone().multiplyScalar(0.5) : undefined,
        radius: collider.shape === 'sphere' ? collider.size.x : undefined,
        height: collider.shape === 'capsule' ? collider.size.y : undefined,
        material: {
          friction: collider.physicMaterial?.friction ?? 0.5,
          restitution: collider.physicMaterial?.bounciness ?? 0.5,
          density: 1.0,
          frictionCombine: 'average',
          restitutionCombine: 'average',
        },
      };

      this.physicsWorld.addCollider(body.id, colliderConfig);
    }
  }
}

// Target: 60fps = 16.67ms per frame. Fixed-timestep physics runs independently
// of the render clock so it stays deterministic regardless of display refresh rate.
const FIXED_TIMESTEP = 1 / 60;
const MAX_ACCUMULATOR = 0.2; // cap at 4 missed frames to avoid the "spiral of death"

export interface SimulationTickStats {
  lastLogicMs: number;
  lastPhysicsMs: number;
  /** Active pooled projectiles after this step (letter bp). */
  activeProjectiles?: number;
  /** Letter ce — Rapier step skipped when competitive fixed-point is authority. */
  skippedRapierPhysics?: boolean;
  /** Letter cj — EQS→GAS fires resolved this step (Zero-UI when bus off). */
  eqsFiresResolved?: number;
  eqsAbilitiesFired?: number;
  /** Letter ck — partition streamer tick kicked this step (Zero-UI when off). */
  partitionStreamingTicked?: boolean;
  partitionResident?: number;
  /** Letter cm — ocean FFT/buoyancy tick this step (Zero-UI when off). */
  oceanViewportTicked?: boolean;
  oceanBuoyancyForcesApplied?: number;
  oceanFftResolution?: number;
  /** Letter cn — cosmos gravity/CCD assist this step (Zero-UI when off). */
  cosmosTicked?: boolean;
  cosmosGravitySamples?: number;
  cosmosCcdHits?: number;
  /** Letter cr — acoustic atmosphere bus apply this step (Zero-UI when cosmos off). */
  cosmosAcousticTicked?: boolean;
  cosmosAcousticTransmission?: number;
  /** Letter cy — GPU fracture + Mass ECS playtest tick (Zero-UI when off). */
  fractureMassPlaytestTicked?: boolean;
  fractureMassDebrisMoved?: boolean;
  fractureMassAgentsActive?: number;
}

export interface SimulationTickStepOptions {
  camera?: THREE.Camera;
  scene?: THREE.Scene;
  /**
   * Letter ce — when true, skip Rapier/worker physics step (fixed-point session
   * is the authority). ECS / visual scripts / pool still advance.
   */
  skipRapierPhysics?: boolean;
}

export interface SimulationTickInitOptions {
  /**
   * Opt-in Law I physics worker (bm). When true, attempts worker/SAB bind.
   * Unavailable Worker/COI → silent main-thread Rapier (Zero-UI).
   */
  physicsWorkerRequested?: boolean;
  /**
   * Opt-in gameplay pool bus (bp). Default true — Zero-UI; no chrome.
   * Set false only for isolated physics probes that must skip pool tick.
   */
  gameplayPoolRequested?: boolean;
  /**
   * Letter bu — character/GAS topology bus (biological bridge + GAS prediction).
   * Default false — opt-in so existing playtest paths stay unchanged.
   */
  characterTopologyRequested?: boolean;
  /**
   * Letter cj — EQS→GAS playtest drain on SimulationTick.step.
   * Implies topology bus when true. Default false (Zero-UI when off).
   */
  eqsPlaytestRequested?: boolean;
  /**
   * Letter ck — World Partition streaming tick on SimulationTick.step.
   * Seeds a playtest grid when enabled. Default false (Zero-UI when off).
   */
  partitionStreamingRequested?: boolean;
  /** Letter ck — half-extent cells for playtest seedGrid (default 3). */
  partitionSeedHalfExtent?: number;
  /**
   * Letter cm — Ocean FFT viewport + Rapier buoyancy on SimulationTick.step.
   * Default false (Zero-UI when off). CapScore degrades FFT resolution.
   */
  oceanViewportRequested?: boolean;
  /**
   * Letter cn/co — Aethel Cosmos assist (gravity volumes + CCD + nested grids).
   * Default false (Zero-UI when off). CapScore degrades budgets.
   * Letter co deepens live velocity/obstacles/render/dual-BVH (not no-op).
   */
  cosmosRequested?: boolean;
  /**
   * Letter cy — GPU Fracture + Mass ECS playtest on SimulationTick.step.
   * Default false (Zero-UI when off). CapScore GT730 → CPU fallback.
   */
  fractureMassPlaytestRequested?: boolean;
  /** Letter cy — optional WebGPU devices for fracture/mass compute (mock or real). */
  fractureGpuDevice?: GpuFractureGpuDeviceLike | null;
  massEcsGpuDevice?: GpuMassEcsGpuDeviceLike | null;
  /** Letter cy — library soak flags (cv/cw); playtest can still CPU without them. */
  fractureSoakPassed?: boolean;
  massEcsSoakPassed?: boolean;
  capabilityScore?: number;
  rollbackSession?: FixedPointRollbackSession | null;
  /**
   * Letter bv — optional WebGPU device / flags for DQ compute soak on topology bus.
   * Without device, `dqComputeSkinningReady` stays false (honest WebGL2/CPU fallback).
   */
  dqGpuDevice?: DualQuaternionGpuDeviceLike | null;
  webgpuAvailable?: boolean;
  webgpuComputeAvailable?: boolean;
}

export interface SequencerRenderTargets {
  camera: THREE.Camera;
  scene: THREE.Scene;
}

/**
 * Advances one wall-clock step of simulation: ECS logic, fixed-timestep
 * physics catch-up, and cutscene/sequencer transforms. Never draws a pixel.
 */
export class SimulationTick {
  public readonly world: World;
  public readonly physicsWorld: PhysicsWorld;
  public readonly physicsSystem: PhysicsIntegrationSystem;
  public readonly visualScriptSystem: VisualScriptSystem;
  public sequencer: SequencerRuntime | null = null;

  private accumulator = 0;
  private physicsWorker: PhysicsWorkerManager | null = null;
  private physicsWorkerActive = false;
  private gameplayPool: GameplayPoolBus | null = null;
  private characterTopology: CharacterTopologyBus | null = null;
  /** Letter cj — drain EQS→GAS fire queue each step when enabled. */
  private eqsPlaytestEnabled = false;
  private eqsFrame = 0;
  private pendingEqsFires: EqsQueryInput[] = [];
  /** Letter ck — World Partition streamer on playtest hot path. */
  private partitionStreamer: WorldPartitionStreamer | null = null;
  private partitionStreamingEnabled = false;
  private partitionView: PartitionViewPose | null = null;
  private lastPartitionStats: PartitionStreamingStats | null = null;
  private partitionTickInFlight = false;
  /** Letter cm — Ocean FFT + buoyancy on playtest hot path. */
  private oceanViewportEnabled = false;
  private oceanCapabilityScore = 38;
  private lastOceanBuoyancy: OceanBuoyancyTickResult | null = null;
  private lastOceanFftResolution = 0;
  private oceanSeed = 42;
  /** Letter cn/co — Cosmos planetary/space assist on playtest hot path. */
  private cosmosEnabled = false;
  private cosmosCapabilityScore = 38;
  private lastCosmosTick: CosmosSimTickResult | null = null;
  /** Letter co — previous body poses for CCD velocity (fix no-op hole). */
  private cosmosPrevPositions = new Map<string, LwcVec3>();
  /** Letter co — optional CCD obstacles (empty → Zero-UI soft, no false hits). */
  private cosmosObstacles: SweepObstacle[] = [];
  /** Letter co — optional render targets for floating-origin rebase. */
  private cosmosRenderTargets: CosmosRenderTargets | null = null;
  /** Letter co — camera-relative pose for floating-origin (optional). */
  private cosmosCameraRelative: { x: number; y: number; z: number } | null = null;
  private cosmosIslandBodyIds: string[] = [];
  private cosmosNestedGridId = 'playtest-ship';
  private cosmosHullFrame = 0;
  /** Letter cr — playtest audio bus for vacuum/hull/atmosphere transmission. */
  private cosmosAcousticBus: AcousticAudioBusTarget | null = null;
  private cosmosAcousticSamples: AcousticSamplePoint[] = buildAtmosphereAcousticSamples(1);
  private cosmosAcousticSourceInHull = false;
  private cosmosAcousticListenerInHull = false;
  private lastCosmosAcoustic: AcousticAtmosphereApplyResult | null = null;
  /** Letter cy — GPU fracture + Mass ECS playtest session on hot path. */
  private fractureMassPlaytestEnabled = false;
  private fractureMassSession: FractureMassPlaytestSession | null = null;
  private lastFractureMassTick: FractureMassTickResult | null = null;

  public lastLogicMs = 0;
  public lastPhysicsMs = 0;

  constructor(world: World, physicsWorld: PhysicsWorld, visualScriptSystem: VisualScriptSystem) {
    this.world = world;
    this.physicsWorld = physicsWorld;
    this.physicsSystem = new PhysicsIntegrationSystem(physicsWorld);
    this.visualScriptSystem = visualScriptSystem;
  }

  getPhysicsWorkerManager(): PhysicsWorkerManager | null {
    return this.physicsWorker;
  }

  isPhysicsWorkerActive(): boolean {
    return this.physicsWorkerActive;
  }

  /** Immunity M (bp) — pooled projectiles / scratch / frame arena bus. */
  getGameplayPoolBus(): GameplayPoolBus | null {
    return this.gameplayPool;
  }

  /** Letter bu — GAS / ragdoll / MM biological bridge bus. */
  getCharacterTopologyBus(): CharacterTopologyBus | null {
    return this.characterTopology;
  }

  /** Letter cj — true when EQS playtest drain is active on step(). */
  isEqsPlaytestEnabled(): boolean {
    return this.eqsPlaytestEnabled && this.characterTopology !== null;
  }

  /** Letter ck — true when partition streaming tick is active on step(). */
  isPartitionStreamingEnabled(): boolean {
    return this.partitionStreamingEnabled && this.partitionStreamer !== null;
  }

  /** Letter ck — live streamer (null when opt-out / unavailable). */
  getPartitionStreamer(): WorldPartitionStreamer | null {
    return this.partitionStreamer;
  }

  getLastPartitionStats(): PartitionStreamingStats | null {
    return this.lastPartitionStats ? { ...this.lastPartitionStats } : null;
  }

  /** Letter cm — true when ocean FFT/buoyancy tick is active on step(). */
  isOceanViewportEnabled(): boolean {
    return this.oceanViewportEnabled;
  }

  getLastOceanBuoyancy(): OceanBuoyancyTickResult | null {
    return this.lastOceanBuoyancy;
  }

  getLastOceanFftResolution(): number {
    return this.lastOceanFftResolution;
  }

  /** Letter cn/co — true when cosmos gravity/CCD assist is active on step(). */
  isCosmosEnabled(): boolean {
    return this.cosmosEnabled;
  }

  /** Letter cy — true when fracture + Mass ECS playtest tick is active on step(). */
  isFractureMassPlaytestEnabled(): boolean {
    return this.fractureMassPlaytestEnabled && this.fractureMassSession !== null;
  }

  getLastFractureMassTick(): FractureMassTickResult | null {
    return this.lastFractureMassTick;
  }

  getFractureMassPlaytestSession(): FractureMassPlaytestSession | null {
    return this.fractureMassSession;
  }

  getLastCosmosTick(): CosmosSimTickResult | null {
    return this.lastCosmosTick;
  }

  /** Letter cr — last acoustic bus apply (null when cosmos off / Zero-UI). */
  getLastCosmosAcoustic(): AcousticAtmosphereApplyResult | null {
    return this.lastCosmosAcoustic;
  }

  /**
   * Letter cr — bind external Web Audio / mock bus (null → unbind).
   * When cosmos enables without a bind, a playtest mock bus is auto-seeded.
   */
  setCosmosAcousticBus(target: AcousticAudioBusTarget | null): void {
    this.cosmosAcousticBus = target;
    bindAcousticAudioBus(target);
  }

  /**
   * Letter cr — density path + hull flags for playtest acoustic (Zero-UI when cosmos off).
   */
  setCosmosAcousticPath(input: {
    samples?: AcousticSamplePoint[];
    sourceInHull?: boolean;
    listenerInHull?: boolean;
    /** Convenience: 'vacuum' | 'atmosphere' | 'hull'. */
    preset?: 'vacuum' | 'atmosphere' | 'hull';
  }): void {
    if (input.preset === 'vacuum') {
      this.cosmosAcousticSamples = buildVacuumAcousticSamples();
      this.cosmosAcousticSourceInHull = false;
      this.cosmosAcousticListenerInHull = false;
    } else if (input.preset === 'hull') {
      this.cosmosAcousticSamples = buildHullAcousticSamples();
      this.cosmosAcousticSourceInHull = true;
      this.cosmosAcousticListenerInHull = true;
    } else if (input.preset === 'atmosphere') {
      this.cosmosAcousticSamples = buildAtmosphereAcousticSamples(1);
      this.cosmosAcousticSourceInHull = false;
      this.cosmosAcousticListenerInHull = false;
    }
    if (input.samples) this.cosmosAcousticSamples = input.samples;
    if (typeof input.sourceInHull === 'boolean') {
      this.cosmosAcousticSourceInHull = input.sourceInHull;
    }
    if (typeof input.listenerInHull === 'boolean') {
      this.cosmosAcousticListenerInHull = input.listenerInHull;
    }
  }

  /**
   * Letter cr — immediate acoustic bus tick (soak / BT hot path).
   * Returns null when cosmos disabled (Zero-UI).
   */
  tickCosmosAcousticNow(): AcousticAtmosphereApplyResult | null {
    if (!this.cosmosEnabled) return null;
    return this.runCosmosAcousticTick();
  }

  private runCosmosAcousticTick(): AcousticAtmosphereApplyResult {
    if (!this.cosmosAcousticBus) {
      this.cosmosAcousticBus = createAcousticMockBus().target;
      bindAcousticAudioBus(this.cosmosAcousticBus);
    }
    const result = tickAcousticAtmosphere({
      capabilityScore: this.cosmosCapabilityScore,
      userEnabled: true,
      cosmosEnabled: true,
      samples: this.cosmosAcousticSamples,
      sourceInHull: this.cosmosAcousticSourceInHull,
      listenerInHull: this.cosmosAcousticListenerInHull,
      target: this.cosmosAcousticBus,
    });
    this.lastCosmosAcoustic = result;
    return result;
  }

  /**
   * Letter co — inject CCD sweep obstacles for playtest (Zero-UI when empty).
   */
  setCosmosSweepObstacles(obstacles: SweepObstacle[]): void {
    this.cosmosObstacles = obstacles.slice();
  }

  /**
   * Letter co — bind camera/objects for floating-origin render assist.
   * Null clears (SimulationTick stays draw-free; only mutates duck-typed poses).
   */
  setCosmosRenderAssist(
    targets: CosmosRenderTargets | null,
    cameraRelative?: { x: number; y: number; z: number } | null,
  ): void {
    this.cosmosRenderTargets = targets;
    this.cosmosCameraRelative = cameraRelative ?? null;
  }

  /** Letter co — mark ECS body ids as nested-island locals. */
  setCosmosIslandBodies(bodyIds: string[], gridId = 'playtest-ship'): void {
    this.cosmosNestedGridId = gridId;
    this.cosmosIslandBodyIds = bodyIds.slice();
    for (const id of bodyIds) {
      enterIsland(gridId, id);
    }
  }

  /**
   * Letter co — immediate cosmos assist tick (soak / BT hot path).
   * Returns null when cosmos disabled (Zero-UI).
   */
  tickCosmosAssistNow(dt = 1 / 60): CosmosSimTickResult | null {
    if (!this.cosmosEnabled) return null;
    return this.runCosmosAssistTick(dt);
  }

  /**
   * Letter co — live cosmos assist: derive CCD velocity from pose delta,
   * nested island evidence, dual BVH query, floating-origin when targets bound.
   */
  private runCosmosAssistTick(dt: number): CosmosSimTickResult {
    const bodyPositions: Array<{ id: string; position: LwcVec3 }> = [];
    const movers: SweepSphere[] = [];
    const invDt = dt > 1e-9 ? 1 / dt : 60;

    for (const e of this.world.getAllEntities()) {
      const t = this.world.getComponent<TransformComponent>(e.id, 'transform');
      if (!t) continue;
      const position: LwcVec3 = {
        x: t.position.x,
        y: t.position.y,
        z: t.position.z,
      };
      bodyPositions.push({ id: e.id, position });

      const prev = this.cosmosPrevPositions.get(e.id);
      let vx = 0;
      let vy = 0;
      let vz = 0;
      if (prev) {
        vx = (position.x - prev.x) * invDt;
        vy = (position.y - prev.y) * invDt;
        vz = (position.z - prev.z) * invDt;
      }
      // Rigidbody linear velocity preferred when present (CCD evidence).
      const rb = this.world.getComponent<RigidbodyComponent>(e.id, 'rigidbody');
      if (rb && 'velocity' in rb && rb.velocity) {
        const v = rb.velocity as { x?: number; y?: number; z?: number };
        if (typeof v.x === 'number') vx = v.x;
        if (typeof v.y === 'number') vy = v.y;
        if (typeof v.z === 'number') vz = v.z;
      }
      if (movers.length < 4) {
        movers.push({
          id: e.id,
          x: position.x,
          y: position.y,
          z: position.z,
          radius: 0.5,
          vx,
          vy,
          vz,
        });
      }
      this.cosmosPrevPositions.set(e.id, { ...position });
    }

    // Advance nested hull so island isolation is exercised across frames.
    this.cosmosHullFrame += 1;
    setHullMotion(
      this.cosmosNestedGridId,
      { x: 1e7 + this.cosmosHullFrame * 100, y: 0, z: 0 },
      { x: 5000 + this.cosmosHullFrame * 10, y: 0, z: 0 },
    );

    const player =
      bodyPositions[0]?.position ??
      this.cosmosCameraRelative ??
      { x: 0, y: 0, z: 0 };

    const cosmosResult = tickCosmosSimulation({
      capabilityScore: this.cosmosCapabilityScore,
      bodyPositions,
      movers,
      obstacles: this.cosmosObstacles,
      dt,
      nestedGridId: this.cosmosNestedGridId,
      nestedIslandBodyIds:
        this.cosmosIslandBodyIds.length > 0
          ? this.cosmosIslandBodyIds
          : undefined,
      dualBvhQuery: {
        playerX: player.x,
        playerY: player.y,
        playerZ: player.z,
      },
      setBodyGravity: (_bodyId, _g) => true,
      setBodyCcd: (_bodyId, _en) => true,
    });
    this.lastCosmosTick = cosmosResult;

    // Floating-origin only when render assist bound (else Zero-UI soft — AAA path owns it).
    if (this.cosmosRenderTargets) {
      tickCosmosRender({
        capabilityScore: this.cosmosCapabilityScore,
        targets: this.cosmosRenderTargets,
        cameraRelative: this.cosmosCameraRelative ?? undefined,
        enableSky: false,
      });
    }

    // Letter cr — vacuum/hull/atmosphere transmission → playtest audio bus.
    this.runCosmosAcousticTick();

    return cosmosResult;
  }

  /**
   * Letter cj — enqueue EQS→GAS fire for next (or current) SimulationTick.step.
   * Zero-UI: silently ignored when topology/EQS playtest unavailable.
   */
  enqueueEqsPlaytestFire(input: EqsQueryInput): void {
    if (!this.eqsPlaytestEnabled || !this.characterTopology) return;
    this.pendingEqsFires.push(input);
  }

  /**
   * Letter cj — immediate EQS→GAS evaluate (BT / NPC hot path).
   * Returns null when bus unavailable (Zero-UI).
   */
  tickEqsGasFireNow(input: EqsQueryInput): EqsGasFireTickResult | null {
    if (!this.characterTopology) return null;
    this.eqsFrame += 1;
    return evaluateAndFireWithEqs(this.characterTopology, this.eqsFrame, input);
  }

  /**
   * Letter ck — set camera/view pose for next partition tick.
   * Zero-UI: silently ignored when streaming unavailable.
   */
  setPartitionViewPose(view: PartitionViewPose): void {
    if (!this.partitionStreamingEnabled || !this.partitionStreamer) return;
    this.partitionView = { ...view };
  }

  /**
   * Letter ck — immediate frustum/position tick (tests / BT hot path).
   * Returns null when streamer unavailable (Zero-UI).
   */
  async tickPartitionStreamingNow(
    view?: PartitionViewPose,
  ): Promise<PartitionStreamingStats | null> {
    if (!this.partitionStreamer) return null;
    const pose = view ?? this.partitionView ?? { x: 0, z: 0 };
    if (view) this.partitionView = { ...view };
    const { stats } = await tickPartitionFromView(this.partitionStreamer, pose);
    if (stats) this.lastPartitionStats = stats;
    return stats;
  }

  /**
   * Letter cm — immediate ocean FFT + buoyancy apply (tests / hot path).
   * Zero-UI when ocean opt-in off.
   */
  tickOceanBuoyancyNow(seed?: number): OceanBuoyancyTickResult | null {
    if (!this.oceanViewportEnabled) return null;
    this.oceanSeed = seed ?? this.oceanSeed + 1;
    const bodies = this.physicsSystem.collectBuoyancyBodySamples(this.world);
    const { displace, buoyancy, fftResolution } = tickOceanFromSimulation({
      capabilityScore: this.oceanCapabilityScore,
      userEnabled: true,
      applyBuoyancy: true,
      bodies,
      seed: this.oceanSeed,
      mesh: getOceanViewportMesh(),
      applyForce: (bodyId, force) => {
        const n = this.physicsSystem.applyBuoyancyForceResults([
          { bodyId, force },
        ]);
        return n > 0;
      },
    });
    this.lastOceanFftResolution = fftResolution;
    this.lastOceanBuoyancy = buoyancy;
    void displace;
    return buoyancy;
  }

  async init(options?: SimulationTickInitOptions): Promise<void> {
    const { initPhysicsEngine } = await import('./physics-engine-real');
    await initPhysicsEngine();
    this.physicsWorld.init(new THREE.Vector3(0, -9.81, 0));
    // Law I (bk) — playtest path: enable SAB/fallback transform bridge (Zero-UI if no COI).
    const bridge = this.physicsSystem.enableSharedTransformBridge(
      Math.max(256, this.world.getAllEntities().length + 64),
    );
    this.world.getAllEntities().forEach((e) => {
      this.physicsSystem.registerEntity(e, this.world);
    });

    // Law I (bm) — opt-in physics worker. Fail silent → main-thread Rapier.
    if (options?.physicsWorkerRequested === true) {
      await this.enablePhysicsWorker(bridge);
    }

    // Immunity M (bp) — gameplay pool bus on hot path (default on; Zero-UI).
    if (options?.gameplayPoolRequested !== false) {
      this.gameplayPool = createGameplayPoolBus({
        projectileCapacity: 256,
        scratchCapacity: 128,
        arenaBytes: 32_768,
      });
    }

    // Letter bu/bv/cj — character topology (GAS + DQ + EQS playtest when requested).
    const wantTopology =
      options?.characterTopologyRequested === true ||
      options?.eqsPlaytestRequested === true;
    if (wantTopology && options) {
      this.characterTopology = createCharacterTopologyBus({
        capabilityScore: options.capabilityScore,
        rollbackSession: options.rollbackSession ?? null,
        dqGpuDevice: options.dqGpuDevice ?? null,
        webgpuAvailable: options.webgpuAvailable === true,
        webgpuComputeAvailable: options.webgpuComputeAvailable === true,
      });
      if (
        options.webgpuAvailable === true &&
        options.webgpuComputeAvailable === true &&
        options.dqGpuDevice
      ) {
        this.characterTopology.runDqComputeSoak();
      }
    }
    // Letter cj — EQS drain on step when explicitly requested.
    this.eqsPlaytestEnabled =
      options?.eqsPlaytestRequested === true && this.characterTopology !== null;

    // Letter ck — World Partition streamer on playtest path (Zero-UI when off).
    if (options?.partitionStreamingRequested === true) {
      const score = options.capabilityScore ?? 38;
      this.partitionStreamer = new WorldPartitionStreamer(score);
      this.partitionStreamer.seedGrid(
        Math.max(1, options.partitionSeedHalfExtent ?? 3),
        24 * 1024,
      );
      this.partitionStreamingEnabled = true;
      this.partitionView = { x: 0, z: 0, forwardX: 1, forwardZ: 0 };
    } else {
      this.partitionStreamer = null;
      this.partitionStreamingEnabled = false;
      this.partitionView = null;
    }

    // Letter cm — Ocean FFT + buoyancy on playtest path (Zero-UI when off).
    if (options?.oceanViewportRequested === true) {
      this.oceanViewportEnabled = true;
      this.oceanCapabilityScore = options.capabilityScore ?? 38;
      this.oceanSeed = 42;
    } else {
      this.oceanViewportEnabled = false;
      this.lastOceanBuoyancy = null;
      this.lastOceanFftResolution = 0;
    }

    // Letter cn/co — Cosmos planetary/space assist (Zero-UI when off).
    // Letter cr — seed playtest acoustic audio bus when cosmos on.
    if (options?.cosmosRequested === true) {
      this.cosmosEnabled = true;
      this.cosmosCapabilityScore = options.capabilityScore ?? 38;
      this.lastCosmosTick = null;
      this.lastCosmosAcoustic = null;
      this.cosmosPrevPositions.clear();
      this.cosmosHullFrame = 0;
      // Seed playtest gravity + nested island so tick is not budget-only no-op.
      clearGravityVolumes();
      registerGravityVolume({
        id: 'playtest-planet',
        kind: 'spherical-planet',
        center: { x: 0, y: 0, z: 0 },
        radiusM: 1e8,
        surfaceGravity: 9.81,
        planetRadiusM: 6e6,
      });
      clearNestedPhysicsGrids();
      createNestedPhysicsGrid({
        id: this.cosmosNestedGridId,
        hullOrigin: { x: 1e7, y: 0, z: 0 },
      });
      setHullMotion(
        this.cosmosNestedGridId,
        { x: 1e7, y: 0, z: 0 },
        { x: 5000, y: 0, z: 0 },
      );
      // Letter cr — default atmosphere density path + mock bus (real GainNode via setCosmosAcousticBus).
      this.cosmosAcousticSamples = buildAtmosphereAcousticSamples(1);
      this.cosmosAcousticSourceInHull = false;
      this.cosmosAcousticListenerInHull = false;
      if (!this.cosmosAcousticBus) {
        this.cosmosAcousticBus = createAcousticMockBus().target;
      }
      bindAcousticAudioBus(this.cosmosAcousticBus);
    } else {
      this.cosmosEnabled = false;
      this.lastCosmosTick = null;
      this.lastCosmosAcoustic = null;
      this.cosmosPrevPositions.clear();
      this.cosmosObstacles = [];
      this.cosmosRenderTargets = null;
      this.cosmosCameraRelative = null;
      this.cosmosIslandBodyIds = [];
      bindAcousticAudioBus(null);
      this.cosmosAcousticBus = null;
    }

    // Letter cy — GPU Fracture + Mass ECS playtest on hot path (Zero-UI when off).
    if (options?.fractureMassPlaytestRequested === true) {
      this.fractureMassPlaytestEnabled = true;
      this.fractureMassSession = createFractureMassPlaytestSession({
        capabilityScore: options.capabilityScore ?? 38,
        webgpuAvailable: options.webgpuAvailable === true,
        webgpuComputeAvailable: options.webgpuComputeAvailable === true,
        fractureSoakPassed: options.fractureSoakPassed === true,
        massSoakPassed: options.massEcsSoakPassed === true,
        fractureDevice: options.fractureGpuDevice ?? null,
        massDevice: options.massEcsGpuDevice ?? null,
      });
      this.lastFractureMassTick = null;
    } else {
      this.fractureMassPlaytestEnabled = false;
      this.fractureMassSession = null;
      this.lastFractureMassTick = null;
    }
  }

  /**
   * Opt-in worker bind against the playtest transform bridge.
   * Returns false without throwing when Worker/SAB unavailable (Zero-UI).
   */
  async enablePhysicsWorker(
    bridge?: SharedTransformPhysicsBridge,
  ): Promise<boolean> {
    const target =
      bridge ??
      this.physicsSystem.getSharedTransformBridge() ??
      this.physicsSystem.enableSharedTransformBridge(
        Math.max(256, this.world.getAllEntities().length + 64),
      );

    const manager = createPhysicsWorkerManager({
      // Prefer in-process against shared buffer in Node/jsdom; real Worker in browser.
      preferWorker: typeof Worker !== 'undefined',
      allowInProcessFallback: true,
    });
    const ok = await manager.activate(target);
    if (!ok) {
      manager.destroy();
      this.physicsWorker = null;
      this.physicsWorkerActive = false;
      return false;
    }

    const seeds: PhysicsWorkerBodySeed[] = [];
    // Seed from currently registered dynamic bodies is left to callers;
    // empty register is valid — worker still proves bind/step protocol.
    await manager.registerBodies(seeds);

    this.physicsWorker = manager;
    this.physicsWorkerActive = true;
    return true;
  }

  resetAccumulator(): void {
    this.accumulator = 0;
  }

  /**
   * Advances state by `wallDelta` seconds. Pure computation — no drawing.
   * Pass `SimulationTickStepOptions.skipRapierPhysics` (letter ce) when
   * competitive fixed-point owns physics authority.
   */
  step(
    wallDelta: number,
    sequencerTargets?: SequencerRenderTargets | SimulationTickStepOptions,
  ): SimulationTickStats {
    const opts: SimulationTickStepOptions =
      sequencerTargets &&
      (sequencerTargets as SimulationTickStepOptions).skipRapierPhysics !== undefined
        ? (sequencerTargets as SimulationTickStepOptions)
        : sequencerTargets
          ? {
              camera: (sequencerTargets as SequencerRenderTargets).camera,
              scene: (sequencerTargets as SequencerRenderTargets).scene,
            }
          : {};
    const skipRapier = opts.skipRapierPhysics === true;
    const seqTargets: SequencerRenderTargets | undefined =
      opts.camera && opts.scene
        ? { camera: opts.camera, scene: opts.scene }
        : undefined;

    const clampedDelta = Math.min(wallDelta, MAX_ACCUMULATOR);

    // Immunity M (bp) — frame arena begin before logic scratch / projectiles.
    this.gameplayPool?.beginFrame();

    const logicStart = performance.now();
    this.world.update(clampedDelta);
    const scriptEntities = this.world.getAllEntities().filter((e) => this.world.getComponent(e.id, 'visualScript'));
    this.visualScriptSystem.update(scriptEntities, clampedDelta);

    // Pooled projectile integrate (no `new` after prewarm).
    let activeProjectiles = 0;
    if (this.gameplayPool) {
      activeProjectiles = this.gameplayPool.updateProjectiles(clampedDelta);
    }

    // Letter cj — drain EQS→GAS playtest fire queue (Zero-UI when disabled).
    let eqsFiresResolved = 0;
    let eqsAbilitiesFired = 0;
    if (this.eqsPlaytestEnabled && this.characterTopology && this.pendingEqsFires.length > 0) {
      const queue = this.pendingEqsFires.splice(0, this.pendingEqsFires.length);
      for (const input of queue) {
        this.eqsFrame += 1;
        const result = evaluateAndFireWithEqs(this.characterTopology, this.eqsFrame, input);
        eqsFiresResolved += 1;
        if (result.fired) eqsAbilitiesFired += 1;
      }
    }

    // Letter ck — fire-and-forget partition tick from last view pose (Zero-UI).
    let partitionStreamingTicked = false;
    if (
      this.partitionStreamingEnabled &&
      this.partitionStreamer &&
      this.partitionView &&
      !this.partitionTickInFlight
    ) {
      partitionStreamingTicked = true;
      this.partitionTickInFlight = true;
      const pose = this.partitionView;
      const streamer = this.partitionStreamer;
      void tickPartitionFromView(streamer, pose).then((result) => {
        if (result.stats) this.lastPartitionStats = result.stats;
        this.partitionTickInFlight = false;
      }).catch(() => {
        this.partitionTickInFlight = false;
      });
    }

    // Letter cm — FFT height + Rapier buoyancy before physics step (Zero-UI when off).
    let oceanViewportTicked = false;
    let oceanBuoyancyForcesApplied = 0;
    if (this.oceanViewportEnabled && !skipRapier) {
      oceanViewportTicked = true;
      this.oceanSeed += 1;
      const bodies = this.physicsSystem.collectBuoyancyBodySamples(this.world);
      const { displace, buoyancy, fftResolution } = tickOceanFromSimulation({
        capabilityScore: this.oceanCapabilityScore,
        userEnabled: true,
        applyBuoyancy: true,
        bodies,
        seed: this.oceanSeed,
        mesh: getOceanViewportMesh(),
        applyForce: (bodyId, force) => {
          const n = this.physicsSystem.applyBuoyancyForceResults([
            { bodyId, force },
          ]);
          return n > 0;
        },
      });
      this.lastOceanFftResolution = fftResolution;
      this.lastOceanBuoyancy = buoyancy;
      oceanBuoyancyForcesApplied = buoyancy.forcesApplied;
      void displace;
    }

    // Letter cn/co — gravity volumes + CCD + nested + dual BVH before physics (Zero-UI).
    // Letter cr — acoustic bus apply rides the same cosmos enable gate.
    let cosmosTicked = false;
    let cosmosGravitySamples = 0;
    let cosmosCcdHits = 0;
    let cosmosAcousticTicked = false;
    let cosmosAcousticTransmission = 0;
    if (this.cosmosEnabled && !skipRapier) {
      cosmosTicked = true;
      const cosmosResult = this.runCosmosAssistTick(FIXED_TIMESTEP);
      cosmosGravitySamples = cosmosResult.gravitySamples;
      cosmosCcdHits = cosmosResult.ccdHits;
      if (this.lastCosmosAcoustic?.applied) {
        cosmosAcousticTicked = true;
        cosmosAcousticTransmission = this.lastCosmosAcoustic.transmission;
      }
    }

    // Letter cy — GPU fracture debris + Mass ECS SoA step (Zero-UI when off).
    let fractureMassPlaytestTicked = false;
    let fractureMassDebrisMoved = false;
    let fractureMassAgentsActive = 0;
    if (this.fractureMassPlaytestEnabled && this.fractureMassSession) {
      fractureMassPlaytestTicked = true;
      const tick = tickFractureMassPlaytest({
        session: this.fractureMassSession,
        enabled: true,
        dt: FIXED_TIMESTEP,
      });
      this.lastFractureMassTick = tick;
      fractureMassDebrisMoved = tick.debrisMoved;
      fractureMassAgentsActive = tick.massAgentsActive;
    }

    this.lastLogicMs = performance.now() - logicStart;

    const physStart = performance.now();
    if (!skipRapier) {
      this.accumulator += clampedDelta;
      while (this.accumulator >= FIXED_TIMESTEP) {
        if (this.physicsWorkerActive && this.physicsWorker) {
          // Fire-and-forget step into worker/in-process shared ring — do not
          // block the render thread with Atomics.wait. Main-thread Rapier is
          // skipped while worker path is active (authority offloaded).
          void this.physicsWorker.step(FIXED_TIMESTEP);
        } else {
          this.physicsWorld.step(FIXED_TIMESTEP);
        }
        this.accumulator -= FIXED_TIMESTEP;
      }
      if (!this.physicsWorkerActive) {
        this.physicsSystem.syncTransformsFromPhysics(this.world);
      } else {
        // Acquire latest worker-published epoch without blocking.
        const bridge = this.physicsSystem.getSharedTransformBridge();
        if (bridge) {
          const snap = bridge.snapshot();
          bridge.acquireEpoch(Math.max(0, snap.writeEpoch - 1));
        }
      }
    } else {
      // Competitive authority (ce): drain accumulator without Rapier float step.
      this.accumulator = 0;
    }
    this.lastPhysicsMs = performance.now() - physStart;

    if (this.sequencer && seqTargets) {
      this.sequencer.update(clampedDelta, seqTargets);
    }

    this.gameplayPool?.endFrame();

    return {
      lastLogicMs: this.lastLogicMs,
      lastPhysicsMs: this.lastPhysicsMs,
      activeProjectiles,
      skippedRapierPhysics: skipRapier,
      eqsFiresResolved,
      eqsAbilitiesFired,
      partitionStreamingTicked,
      partitionResident: this.lastPartitionStats?.resident,
      oceanViewportTicked,
      oceanBuoyancyForcesApplied,
      oceanFftResolution: this.lastOceanFftResolution || undefined,
      cosmosTicked,
      cosmosGravitySamples,
      cosmosCcdHits,
      cosmosAcousticTicked,
      cosmosAcousticTransmission,
      fractureMassPlaytestTicked,
      fractureMassDebrisMoved,
      fractureMassAgentsActive,
    };
  }
}
