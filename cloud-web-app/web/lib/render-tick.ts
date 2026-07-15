// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
/**
 * RenderTick — the "Tick de Renderização" half of Golden Rule 2 (Isolamento
 * do Game-Loop Líquido).
 *
 * Hard architectural constraint: this module MUST NOT import `PhysicsWorld`,
 * `World`/ECS types, or step any simulation logic. It only draws whatever
 * the scene graph currently looks like, on its own `requestAnimationFrame`
 * clock. It "listens to the state of the Simulation" passively — by reading
 * the live Three.js scene the simulation already mutated in place — instead
 * of calling into `SimulationTick` to compute anything.
 *
 * This is what makes "Computação Líquida" (moving physics/AI to the
 * Cloudflare Edge on thermal throttling, per the 2030 vision doc) safe: a
 * `RenderTick` never stops just because `SimulationTick.stop()` was called
 * elsewhere — the game keeps rendering at 60FPS on the last known state
 * while a remote simulation tick catches back up.
 */
import { AAARenderer } from './aaa-renderer-impl';
import { RenderSystem } from './render-system';

export interface RenderTickStats {
  lastRenderMs: number;
  lastFrameMs: number;
}

export class RenderTick {
  public readonly renderer: AAARenderer;
  private readonly renderSystem: RenderSystem;

  private isRunning = false;
  private frameId = 0;
  private lastTime = 0;
  private readonly onResize: () => void;

  public lastRenderMs = 0;
  public lastFrameMs = 0;

  constructor(canvas: HTMLCanvasElement, renderSystem: RenderSystem, renderer?: AAARenderer) {
    this.renderer = renderer ?? new AAARenderer(canvas, window.innerWidth, window.innerHeight);
    this.renderSystem = renderSystem;

    this.onResize = () => this.renderer.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', this.onResize);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  /**
   * Stops drawing. Distinct from `SimulationTick.stop()` on purpose — the
   * two ticks never share a stop switch, which is the whole point of the
   * split (see module doc comment).
   */
  stop(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.frameId);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
  }

  private tick = (timestamp: number) => {
    if (!this.isRunning) return;

    const wallDelta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.lastFrameMs = wallDelta * 1000;

    const renderStart = performance.now();
    this.renderSystem.update();
    this.renderer.render(wallDelta);
    this.lastRenderMs = performance.now() - renderStart;

    this.frameId = requestAnimationFrame(this.tick);
  };
}
