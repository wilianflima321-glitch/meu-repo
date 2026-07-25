// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
/**
 * GameLoop — orchestrator wiring `SimulationTick` (simulation-tick.ts) and
 * `RenderTick` (render-tick.ts) together (Golden Rule 2: Isolamento do
 * Game-Loop Líquido).
 *
 * This file intentionally contains almost no logic of its own: Simulation
 * and Render are separate, independently start/stoppable modules that only
 * share the live Three.js scene graph as passive state — never a function
 * call from one into the other. `GameLoop` just:
 *   1. Constructs both ticks against the same renderer/scene.
 *   2. Drives `SimulationTick.step()` on its own fixed-rate timer
 *      (`SIMULATION_HZ`), decoupled from `requestAnimationFrame`.
 *   3. Drives `RenderTick` on `requestAnimationFrame` via `RenderTick.start()`.
 *
 * Calling `pauseSimulation()` freezes gameplay/physics while the screen
 * keeps rendering the last simulated frame at 60FPS — the literal
 * requirement for the "Computação Líquida" edge-offload pillar: the
 * simulation clock can stop (or, later, be replaced by a remote tick
 * relaying state over the network) without the render clock ever noticing.
 *
 * CW3 present-path honesty: GameLoop → AAARenderer is the WebGL off-canvas /
 * playtest present (`web-aaa-webgl-offcanvas`). Studio/IDE canonical present
 * remains R3F/WebGL2 (`web-r3f-webgl2`). AAARenderer.render records the tick
 * via `recordPresentPathTick` — never claims WebGPU present.
 */
import { AAARenderer } from './aaa-renderer-impl';
import { PhysicsWorld } from './physics-engine-real';
import { SequencerRuntime } from './sequencer-runtime';
import { RenderSystem } from './render-system';
import { RenderTick } from './render-tick';
import { SimulationTick, PhysicsIntegrationSystem } from './simulation-tick';
import { VisualScriptSystem } from './visual-script-integration';
import { World } from './game-engine-core';

import { createComponentLogger } from '@/lib/observability/logger'
import { getLastPresentPathTick } from '@/lib/production/render-path-honesty'
import {
  resolvePhysicsAuthorityMode,
  competitiveModeUiOrNull,
  type PhysicsAuthorityMode,
  type CompetitiveSimModeResolution,
} from '@/lib/netcode/competitive-sim-mode'
import {
  createFixedPointRollbackSession,
  type FixedPointRollbackSession,
} from '@/lib/netcode/fixed-point-rollback-session'
import {
  tickCompetitiveAuthority,
} from '@/lib/netcode/competitive-rollback-soak'
import type { RollbackPlayerInput } from '@/lib/netcode/rollback-frame-buffer'
import {
  enableRadianceOnRenderer,
  type RadianceViewportEnableResult,
} from '@/lib/radiance/radiance-viewport-enable'
import {
  enableFsrOnRenderer,
  type FsrFrameWireEnableResult,
} from '@/lib/hardware/fsr-frame-wire'
import {
  enableCosmosReversedZOnCamera,
} from '@/lib/cosmos/cosmos-render-wire'

const log = createComponentLogger('game-loop')

export interface GameLoopConfig {
  physicsEnabled: boolean;
  sequencerEnabled: boolean;
  renderEnabled: boolean;
  /**
   * When true, select fixed-point competitive authority if path wired.
   * Default false → Rapier float. Zero-UI when unavailable.
   */
  competitiveRequested?: boolean;
  /**
   * Opt-in Law I physics worker (bm). Default false → main-thread Rapier.
   * Unavailable Worker/COI → silent fallback (Zero-UI).
   */
  physicsWorkerRequested?: boolean;
  /**
   * Immunity M gameplay pool bus (bp). Default true — Zero-UI.
   */
  gameplayPoolRequested?: boolean;
  /**
   * Letter cf — wire Radiance into AAARenderer frame. Default true (Zero-UI).
   * Weak GPU fail-closes RT/god-rays without chrome.
   */
  radianceRequested?: boolean;
  /** Law XV Capability Score for Radiance / FSR budgets (cf/ci). */
  capabilityScore?: number;
  /**
   * Letter ci — wire CapScore FSR spatial upscale into AAARenderer. Default true.
   * Native CapScore → Zero-UI (no upscale chrome). DLSS never enabled.
   */
  fsrRequested?: boolean;
  /**
   * Letter bu/cj — character topology bus (GAS + EQS). Default true for playtest.
   * Unavailable → Zero-UI (no EQS chrome).
   */
  characterTopologyRequested?: boolean;
  /**
   * Letter cj — EQS→GAS playtest drain on SimulationTick. Default true.
   * Requires topology bus. Zero-UI when off/unavailable.
   */
  eqsPlaytestRequested?: boolean;
  /**
   * Letter ck — World Partition streaming on SimulationTick. Default true.
   * Seeds playtest grid; setPartitionViewPose from camera. Zero-UI when off.
   */
  partitionStreamingRequested?: boolean;
  /**
   * Letter cm — Ocean FFT mesh + Rapier buoyancy on SimulationTick. Default true.
   * CapScore degrades FFT resolution. Zero-UI when off.
   */
  oceanViewportRequested?: boolean;
  /**
   * Letter cn — Aethel Cosmos (planetary/space scale) on SimulationTick + reverse-Z.
   * Default true. CapScore degrades interest/CCD/nested budgets. Zero-UI when off.
   */
  cosmosRequested?: boolean;
  /**
   * Letter cy — GPU Fracture + Mass ECS playtest on SimulationTick. Default true.
   * CapScore GT730 → CPU fallback. Zero-UI when off.
   */
  fractureMassPlaytestRequested?: boolean;
  /** Letter cy — optional WebGPU devices for fracture/mass compute. */
  fractureGpuDevice?: import('./destruction/gpu-fracture').GpuFractureGpuDeviceLike | null;
  massEcsGpuDevice?: import('./mass-ecs/gpu-mass-step').GpuMassEcsGpuDeviceLike | null;
  fractureSoakPassed?: boolean;
  massEcsSoakPassed?: boolean;
  webgpuAvailable?: boolean;
  webgpuComputeAvailable?: boolean;
}

// Simulation runs on its own fixed-rate clock, independent of display
// refresh rate — see module doc comment.
const SIMULATION_HZ = 60;
const SIMULATION_INTERVAL_MS = 1000 / SIMULATION_HZ;

export class GameLoop {
  public readonly world: World;
  public readonly simulation: SimulationTick;
  public readonly render: RenderTick;
  /** Resolved physics authority (Rapier float default). */
  public readonly physicsAuthority: CompetitiveSimModeResolution;
  /**
   * Competitive fixed-point session — only when mode is fixed-point-competitive.
   * Rapier SimulationTick remains the default playtest path.
   */
  public readonly competitiveSession: FixedPointRollbackSession | null;

  private simulationTimerId: ReturnType<typeof setInterval> | null = null;
  private lastSimTimestamp = 0;
  private deferredTasks: Array<() => void> = [];
  private readonly physicsWorkerRequested: boolean;
  private readonly gameplayPoolRequested: boolean;
  private readonly characterTopologyRequested: boolean;
  private readonly eqsPlaytestRequested: boolean;
  private readonly partitionStreamingRequested: boolean;
  private readonly oceanViewportRequested: boolean;
  private readonly cosmosRequested: boolean;
  private readonly fractureMassPlaytestRequested: boolean;
  private readonly fractureGpuDevice: import('./destruction/gpu-fracture').GpuFractureGpuDeviceLike | null;
  private readonly massEcsGpuDevice: import('./mass-ecs/gpu-mass-step').GpuMassEcsGpuDeviceLike | null;
  private readonly fractureSoakPassed: boolean;
  private readonly massEcsSoakPassed: boolean;
  private readonly webgpuAvailable: boolean;
  private readonly webgpuComputeAvailable: boolean;
  private readonly capabilityScore: number | undefined;
  /**
   * Letter ce — optional input provider for competitive authority ticks.
   * When null, competitive mode coasts (empty inputs / gravity only).
   */
  private competitiveInputProvider: (() => RollbackPlayerInput[]) | null = null;
  /** Last competitive state hash (debug / honesty probes). */
  private lastCompetitiveStateHash: string | null = null;
  /** Letter cf — Radiance viewport enable result (Zero-UI). */
  private radianceEnable: RadianceViewportEnableResult | null = null;
  /** Letter ci — FSR SRG frame wire result (Zero-UI). */
  private fsrEnable: FsrFrameWireEnableResult | null = null;

  constructor(canvas: HTMLCanvasElement, config?: Partial<GameLoopConfig>) {
    this.world = new World();
    this.physicsWorkerRequested = config?.physicsWorkerRequested === true;
    this.gameplayPoolRequested = config?.gameplayPoolRequested !== false;
    // Letter cj — playtest defaults ON so EQS→GAS is not lib-only.
    this.characterTopologyRequested = config?.characterTopologyRequested !== false;
    this.eqsPlaytestRequested = config?.eqsPlaytestRequested !== false;
    // Letter ck — partition streaming defaults ON so soak path is not lib-only.
    this.partitionStreamingRequested = config?.partitionStreamingRequested !== false;
    // Letter cm — ocean FFT + buoyancy defaults ON so path is not lib-only.
    this.oceanViewportRequested = config?.oceanViewportRequested !== false;
    // Letter cn — Cosmos planetary/space scale defaults ON so path is not lib-only.
    this.cosmosRequested = config?.cosmosRequested !== false;
    // Letter cy — fracture + Mass ECS playtest defaults ON so path is not lib-only.
    this.fractureMassPlaytestRequested = config?.fractureMassPlaytestRequested !== false;
    this.fractureGpuDevice = config?.fractureGpuDevice ?? null;
    this.massEcsGpuDevice = config?.massEcsGpuDevice ?? null;
    this.fractureSoakPassed = config?.fractureSoakPassed === true;
    this.massEcsSoakPassed = config?.massEcsSoakPassed === true;
    this.webgpuAvailable = config?.webgpuAvailable === true;
    this.webgpuComputeAvailable = config?.webgpuComputeAvailable === true;
    this.capabilityScore = config?.capabilityScore;

    this.physicsAuthority = resolvePhysicsAuthorityMode({
      competitiveRequested: config?.competitiveRequested === true,
    })
    // Zero-UI: never mount competitive chrome from resolution alone.
    void competitiveModeUiOrNull(this.physicsAuthority)

    this.competitiveSession =
      this.physicsAuthority.mode === 'fixed-point-competitive'
        ? createFixedPointRollbackSession({ capacity: 60 })
        : null

    // Rapier float world always constructed for default playtest / render sync.
    // Competitive mode sidesteps it for authority; does not remove the default path.
    const physicsWorld = new PhysicsWorld();
    const renderer = new AAARenderer(canvas, window.innerWidth, window.innerHeight);
    // Letter cf — real enableRadiance caller (bt/by had wire, zero callers).
    this.radianceEnable = enableRadianceOnRenderer(renderer, {
      capabilityScore: this.capabilityScore,
      radianceRequested: config?.radianceRequested !== false,
    })
    // Letter ci — CapScore FSR spatial → composer internal size / Present.
    this.fsrEnable = enableFsrOnRenderer(renderer, {
      capabilityScore: this.capabilityScore,
      fsrRequested: config?.fsrRequested !== false,
    })
    // Letter cn — reverse-Z infinite depth + dual BVH on AAA renderer.
    if (this.cosmosRequested) {
      renderer.enableCosmos(this.capabilityScore ?? 38)
      enableCosmosReversedZOnCamera(renderer.camera, this.capabilityScore ?? 38)
    }
    const renderSystem = new RenderSystem(this.world, renderer);
    this.render = new RenderTick(canvas, renderSystem, renderer);

    const visualScriptSystem = new VisualScriptSystem(this.render.renderer.scene);
    visualScriptSystem.setWorld(this.world);

    this.simulation = new SimulationTick(this.world, physicsWorld, visualScriptSystem);

    log.info('GameLoop physics authority resolved', {
      mode: this.physicsAuthority.mode,
      fixedPointNetcodeReady: this.physicsAuthority.fixedPointNetcodeReady,
      ggpoLive: this.physicsAuthority.ggpoLive,
      physicsWorkerRequested: this.physicsWorkerRequested,
      radianceEnabled: this.radianceEnable.enabled,
      radianceZeroUiFailClosed: this.radianceEnable.zeroUiFailClosed,
      fsrEnabled: this.fsrEnable.enabled,
      fsrUpscaleActive: this.fsrEnable.upscaleActive,
      fsrZeroUiFailClosed: this.fsrEnable.zeroUiFailClosed,
    })
  }

  getPhysicsAuthorityMode(): PhysicsAuthorityMode {
    return this.physicsAuthority.mode
  }

  /**
   * Letter ce — register competitive input provider (Zero-UI; no chrome).
   * Cleared when set to null.
   */
  setCompetitiveInputProvider(
    provider: (() => RollbackPlayerInput[]) | null,
  ): void {
    this.competitiveInputProvider = provider
  }

  /** Letter ce — last fixed-point authority hash after a competitive tick. */
  getLastCompetitiveStateHash(): string | null {
    return this.lastCompetitiveStateHash
  }

  /** True when GameLoop will drive fixed-point session and skip Rapier. */
  isCompetitiveAuthorityActive(): boolean {
    return (
      this.physicsAuthority.mode === 'fixed-point-competitive' &&
      this.competitiveSession !== null
    )
  }

  /** Letter cf — Radiance enable result from viewport/playtest path. */
  getRadianceEnableResult(): RadianceViewportEnableResult | null {
    return this.radianceEnable
  }

  /** Letter cf — true when enableRadiance was called on the live AAARenderer. */
  isRadianceViewportEnabled(): boolean {
    return this.radianceEnable?.enabled === true
  }

  /** Letter ci — FSR frame enable result. */
  getFsrEnableResult(): FsrFrameWireEnableResult | null {
    return this.fsrEnable
  }

  /** Letter ci — true when CapScore FSR wire ran on AAARenderer. */
  isFsrUpscaleEnabled(): boolean {
    return this.fsrEnable?.enabled === true
  }

  /** CW3 — last present-path tick recorded by AAARenderer (off-canvas WebGL; never WebGPU). */
  getLastPresentPathTick() {
    return getLastPresentPathTick()
  }

  async init() {
    await this.simulation.init({
      physicsWorkerRequested: this.physicsWorkerRequested,
      gameplayPoolRequested: this.gameplayPoolRequested,
      // Letter bu/cj — topology + EQS→GAS playtest (Zero-UI when off).
      characterTopologyRequested: this.characterTopologyRequested,
      eqsPlaytestRequested: this.eqsPlaytestRequested,
      // Letter ck — World Partition streaming playtest (Zero-UI when off).
      partitionStreamingRequested: this.partitionStreamingRequested,
      // Letter cm — Ocean FFT + buoyancy playtest (Zero-UI when off).
      oceanViewportRequested: this.oceanViewportRequested,
      // Letter cn — Cosmos gravity/CCD/nested/floating-origin assist.
      cosmosRequested: this.cosmosRequested,
      // Letter cy — GPU Fracture + Mass ECS playtest (Zero-UI when off).
      fractureMassPlaytestRequested: this.fractureMassPlaytestRequested,
      fractureGpuDevice: this.fractureGpuDevice,
      massEcsGpuDevice: this.massEcsGpuDevice,
      fractureSoakPassed: this.fractureSoakPassed,
      massEcsSoakPassed: this.massEcsSoakPassed,
      webgpuAvailable: this.webgpuAvailable,
      webgpuComputeAvailable: this.webgpuComputeAvailable,
      capabilityScore: this.capabilityScore,
      // Letter ce / bu — pass session into topology when competitive active.
      rollbackSession: this.competitiveSession,
    });
    log.info('Game Loop Initialized (Simulation and Render ticks are independent clocks)', {
      physicsWorkerActive: this.simulation.isPhysicsWorkerActive(),
      gameplayPoolWired: this.simulation.getGameplayPoolBus() !== null,
      competitiveAuthority: this.isCompetitiveAuthorityActive(),
      characterTopologyWired: this.simulation.getCharacterTopologyBus() !== null,
      eqsPlaytestEnabled: this.simulation.isEqsPlaytestEnabled(),
      partitionStreamingEnabled: this.simulation.isPartitionStreamingEnabled(),
      oceanViewportEnabled: this.simulation.isOceanViewportEnabled(),
      cosmosEnabled: this.simulation.isCosmosEnabled(),
      fractureMassPlaytestEnabled: this.simulation.isFractureMassPlaytestEnabled(),
    });
  }

  /** Starts both ticks. Equivalent to `startSimulation() + startRender()`. */
  start() {
    this.startSimulation();
    this.startRender();
  }

  /** Stops both ticks. */
  stop() {
    this.stopSimulation();
    this.stopRender();
  }

  /**
   * Starts only the simulation clock (fixed `SIMULATION_HZ`). Safe to call
   * independently of `startRender()` — this is the hook a future Cloudflare
   * Edge-backed simulation source would use in place of this local timer.
   */
  startSimulation(): void {
    if (this.simulationTimerId !== null) return;
    this.lastSimTimestamp = performance.now();
    this.simulation.resetAccumulator();
    const competitive = this.isCompetitiveAuthorityActive();
    this.simulationTimerId = setInterval(() => {
      const now = performance.now();
      const wallDelta = (now - this.lastSimTimestamp) / 1000;
      this.lastSimTimestamp = now;

      // Letter ce — when competitive authority selected, tick fixed-point session
      // and skip Rapier float step (session is authority; Rapier world unused).
      if (competitive && this.competitiveSession) {
        const inputs = this.competitiveInputProvider?.() ?? [];
        const advanced = tickCompetitiveAuthority(this.competitiveSession, inputs);
        this.lastCompetitiveStateHash = advanced.stateHash;
      }

      this.simulation.step(wallDelta, {
        camera: this.render.renderer.camera,
        scene: this.render.renderer.scene,
        skipRapierPhysics: competitive,
      });

      // Deferred heavy simulation-side work (LOD recompute, AI pathing) runs
      // after the tick, budget-limited so it never blows the physics cadence.
      const budgetDeadline = now + 10;
      while (this.deferredTasks.length > 0 && performance.now() < budgetDeadline) {
        const task = this.deferredTasks.shift();
        task?.();
      }
    }, SIMULATION_INTERVAL_MS);
  }

  /**
   * Stops only the simulation clock. The render clock (if running) keeps
   * drawing the last simulated state at full framerate — this is the
   * hermetic boundary Golden Rule 2 requires.
   */
  stopSimulation(): void {
    if (this.simulationTimerId === null) return;
    clearInterval(this.simulationTimerId);
    this.simulationTimerId = null;
  }

  startRender(): void {
    this.render.start();
  }

  stopRender(): void {
    this.render.stop();
  }

  get isSimulationRunning(): boolean {
    return this.simulationTimerId !== null;
  }

  set sequencer(sequencer: SequencerRuntime | null) {
    this.simulation.sequencer = sequencer;
  }

  get sequencer(): SequencerRuntime | null {
    return this.simulation.sequencer;
  }

  /** Schedule a heavy simulation-side task (LOD update, AI pathing, etc.) to run when budget allows. */
  scheduleDeferred(task: () => void): void {
    this.deferredTasks.push(task);
  }

  // ── Backward-compatible frame-stat accessors (previously flat fields) ────
  get lastLogicMs(): number {
    return this.simulation.lastLogicMs;
  }

  get lastPhysicsMs(): number {
    return this.simulation.lastPhysicsMs;
  }

  get lastRenderMs(): number {
    return this.render.lastRenderMs;
  }

  get lastFrameMs(): number {
    return this.render.lastFrameMs;
  }
}

export { PhysicsIntegrationSystem };
