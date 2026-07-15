/**
 * frame-budget.ts
 *
 * Tracks per-frame timing across the game loop subsystems and exposes
 * reactive status signals so the UI (LocalRuntimeStatusPanel, DevHUD) can
 * display accurate frame health without reading internal GameLoop fields.
 *
 * Architecture:
 *   GameLoop → FrameBudgetMonitor.record(...) each tick
 *   React UI  → FrameBudgetMonitor.subscribe(callback) for live updates
 *   Deferred scheduler inside GameLoop reads .isBudgetExceeded() before
 *   draining the heavy-task queue.
 */

export interface FrameStats {
  /** Wall-clock time of the last frame in ms. */
  frameMs: number;
  /** Time spent on ECS logic + visual scripts. */
  logicMs: number;
  /** Time spent on physics catchup ticks. */
  physicsMs: number;
  /** Time spent on render pass. */
  renderMs: number;
  /** Rolling average FPS over the last 60 samples. */
  avgFps: number;
  /** Whether the last frame exceeded the FRAME_BUDGET_MS threshold. */
  overBudget: boolean;
  /** Approximate number of pending deferred tasks (heavy work backlog). */
  deferredBacklog: number;
}

type FrameStatsListener = (stats: FrameStats) => void;

const BUDGET_MS = 10;
const FPS_WINDOW = 60;

export class FrameBudgetMonitor {
  private listeners: Set<FrameStatsListener> = new Set();
  private fpsSamples: number[] = [];
  private current: FrameStats = {
    frameMs: 0,
    logicMs: 0,
    physicsMs: 0,
    renderMs: 0,
    avgFps: 60,
    overBudget: false,
    deferredBacklog: 0,
  };

  record(params: {
    frameMs: number;
    logicMs: number;
    physicsMs: number;
    renderMs: number;
    deferredBacklog: number;
  }): void {
    const fps = params.frameMs > 0 ? 1000 / params.frameMs : 60;
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > FPS_WINDOW) this.fpsSamples.shift();

    const avgFps =
      this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;

    this.current = {
      ...params,
      avgFps,
      overBudget: params.logicMs + params.physicsMs > BUDGET_MS,
    };

    this.listeners.forEach((cb) => cb(this.current));
  }

  /** Returns true if the last frame used more than the logic+physics budget. */
  isBudgetExceeded(): boolean {
    return this.current.overBudget;
  }

  getStats(): Readonly<FrameStats> {
    return this.current;
  }

  subscribe(listener: FrameStatsListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state to new subscriber
    listener(this.current);
    return () => this.listeners.delete(listener);
  }
}

/** Singleton accessible across the web runtime. */
export const frameBudget = new FrameBudgetMonitor();
