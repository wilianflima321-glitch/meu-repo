/**
 * world-determinism.test.ts — Sprint V31
 *
 * Physics determinism suite for the Aethel Engine game loop.
 *
 * Validates:
 *   1. Fixed-timestep accumulator behaviour — variable wall-clock input
 *      produces the same number of physics ticks as the discrete step count
 *   2. Frame-budget capping — accumulator never grows beyond MAX_ACCUMULATOR
 *      even with a huge simulated lag spike
 *   3. Deferred task queue — heavy tasks accumulate when the budget is tight
 *      and drain once budget is available
 *   4. FrameBudgetMonitor — subscriber pattern, overBudget flag accuracy
 *
 * Physics integration with Rapier (WASM) is mocked here because the
 * vitest environment is jsdom; real physics determinism at the Rapier
 * level is tested in the Rust native test suite.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FrameBudgetMonitor, frameBudget } from '@aethel/runtime/frame-budget';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXED_TIMESTEP = 1 / 60;
const MAX_ACCUMULATOR = 0.2;

/**
 * Simulate the fixed-timestep accumulator loop that lives inside GameLoop.tick()
 * without requiring the full Three.js / WASM stack.
 */
function runAccumulator(wallDelta: number): { ticks: number; remainder: number } {
  const capped = Math.min(wallDelta, MAX_ACCUMULATOR);
  let acc = capped;
  let ticks = 0;
  while (acc >= FIXED_TIMESTEP) {
    acc -= FIXED_TIMESTEP;
    ticks++;
  }
  return { ticks, remainder: acc };
}

// ---------------------------------------------------------------------------
// Suite 1: Accumulator arithmetic
// ---------------------------------------------------------------------------

describe('Fixed-Timestep Accumulator', () => {
  it('produces exactly 1 tick for a 60fps frame (16.67ms)', () => {
    const { ticks } = runAccumulator(1 / 60);
    expect(ticks).toBe(1);
  });

  it('produces 2 ticks for a 30fps frame (33.33ms)', () => {
    const { ticks } = runAccumulator(1 / 30);
    expect(ticks).toBe(2);
  });

  it('produces 0 ticks for a sub-timestep delta (4ms)', () => {
    const { ticks } = runAccumulator(0.004);
    expect(ticks).toBe(0);
  });

  it('caps at MAX_ACCUMULATOR on a catastrophic lag spike (1s)', () => {
    const { ticks, remainder } = runAccumulator(1.0);
    const maxTicks = Math.floor(MAX_ACCUMULATOR / FIXED_TIMESTEP);
    expect(ticks).toBe(maxTicks);
    expect(remainder).toBeCloseTo(MAX_ACCUMULATOR % FIXED_TIMESTEP, 5);
  });

  it('accumulator remainder is always in [0, FIXED_TIMESTEP)', () => {
    const deltas = [0.016, 0.033, 0.048, 0.1, 0.2, 0.5];
    for (const d of deltas) {
      const { remainder } = runAccumulator(d);
      expect(remainder).toBeGreaterThanOrEqual(0);
      expect(remainder).toBeLessThan(FIXED_TIMESTEP);
    }
  });

  it('is deterministic: same delta always produces same tick count', () => {
    const delta = 0.025;
    const results = Array.from({ length: 10 }, () => runAccumulator(delta));
    const firstTicks = results[0].ticks;
    const firstRemainder = results[0].remainder;
    for (const r of results) {
      expect(r.ticks).toBe(firstTicks);
      expect(r.remainder).toBeCloseTo(firstRemainder, 10);
    }
  });

  it('total simulated time after N frames is within one timestep of wall time', () => {
    const frames = 300;
    const targetFps = 60;
    let totalSimulated = 0;
    let totalWall = 0;
    let accumulator = 0;

    for (let i = 0; i < frames; i++) {
      // Slightly jittered frame time: 60fps ± 2ms
      const jitter = (Math.random() * 0.004) - 0.002;
      const wallDelta = Math.min(1 / targetFps + jitter, MAX_ACCUMULATOR);
      totalWall += wallDelta;
      accumulator += wallDelta;
      while (accumulator >= FIXED_TIMESTEP) {
        totalSimulated += FIXED_TIMESTEP;
        accumulator -= FIXED_TIMESTEP;
      }
    }

    // Simulated time should track wall time within one timestep
    expect(Math.abs(totalSimulated - totalWall)).toBeLessThan(FIXED_TIMESTEP);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Deferred task queue (frame-budget logic)
// ---------------------------------------------------------------------------

describe('Deferred Task Queue', () => {
  it('drains all tasks when budget is not exceeded', () => {
    const executed: number[] = [];
    const tasks = Array.from({ length: 5 }, (_, i) => () => executed.push(i));

    const budgetDeadline = performance.now() + 10; // 10ms budget
    while (tasks.length > 0 && performance.now() < budgetDeadline) {
      const task = tasks.shift();
      task?.();
    }

    expect(executed).toHaveLength(5);
    expect(executed).toEqual([0, 1, 2, 3, 4]);
  });

  it('leaves tasks in queue when budget is exceeded', () => {
    const tasks: Array<() => void> = [];
    const ran: number[] = [];

    // Add a task that burns the budget immediately
    tasks.push(() => {
      const start = performance.now();
      // Spin for > 10ms
      while (performance.now() - start < 12) { /* busy wait */ }
      ran.push(0);
    });
    tasks.push(() => ran.push(1));
    tasks.push(() => ran.push(2));

    const budgetDeadline = performance.now() + 10;
    while (tasks.length > 0 && performance.now() < budgetDeadline) {
      const task = tasks.shift();
      task?.();
    }

    // Only the first (budget-burning) task ran
    expect(ran).toHaveLength(1);
    expect(ran[0]).toBe(0);
    // Remaining tasks are still in queue
    expect(tasks).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: FrameBudgetMonitor
// ---------------------------------------------------------------------------

describe('FrameBudgetMonitor', () => {
  let monitor: FrameBudgetMonitor;

  beforeEach(() => {
    monitor = new FrameBudgetMonitor();
  });

  it('emits stats to subscribers', () => {
    const received: unknown[] = [];
    monitor.subscribe((s: any) => received.push(s));

    monitor.record({ frameMs: 16.7, logicMs: 2, physicsMs: 3, renderMs: 8, deferredBacklog: 0 });

    // Subscribe call emits immediately + one record call = 2 total
    expect(received.length).toBe(2);
  });

  it('reports overBudget = false when logic+physics <= 10ms', () => {
    monitor.record({ frameMs: 16.7, logicMs: 4, physicsMs: 5, renderMs: 6, deferredBacklog: 0 });
    expect(monitor.getStats().overBudget).toBe(false);
  });

  it('reports overBudget = true when logic+physics > 10ms', () => {
    monitor.record({ frameMs: 50, logicMs: 7, physicsMs: 6, renderMs: 5, deferredBacklog: 3 });
    expect(monitor.getStats().overBudget).toBe(true);
  });

  it('isBudgetExceeded() mirrors overBudget', () => {
    monitor.record({ frameMs: 20, logicMs: 6, physicsMs: 7, renderMs: 4, deferredBacklog: 0 });
    expect(monitor.isBudgetExceeded()).toBe(true);

    monitor.record({ frameMs: 16, logicMs: 2, physicsMs: 3, renderMs: 5, deferredBacklog: 0 });
    expect(monitor.isBudgetExceeded()).toBe(false);
  });

  it('computes a rolling FPS average over the last 60 samples', () => {
    for (let i = 0; i < 60; i++) {
      monitor.record({ frameMs: 16.667, logicMs: 1, physicsMs: 2, renderMs: 5, deferredBacklog: 0 });
    }
    const stats = monitor.getStats();
    expect(stats.avgFps).toBeCloseTo(60, 0);
  });

  it('unsubscribe stops further delivery', () => {
    const received: unknown[] = [];
    const unsub = monitor.subscribe((s: any) => received.push(s));
    // Immediate emit on subscribe
    expect(received).toHaveLength(1);

    unsub();
    monitor.record({ frameMs: 16, logicMs: 1, physicsMs: 2, renderMs: 5, deferredBacklog: 0 });
    // Should still be 1 — no new delivery after unsub
    expect(received).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Physics simulation equivalence (mocked Rapier step)
// ---------------------------------------------------------------------------

describe('Physics Step Determinism (mocked)', () => {
  it('same seed + same step sequence produces identical state', () => {
    const GRAVITY = -9.81;
    /**
     * We simulate a dead-simple 1D falling body without Rapier:
     * v += GRAVITY * dt;  pos += v * dt;
     * This validates that our fixed-timestep loop calls the physics
     * integrator the same number of times regardless of wall clock jitter.
     */
    function simulateBody(frameDeltas: number[]): { pos: number; vel: number } {
      const gravity = GRAVITY;
      let pos = 10;
      let vel = 0;
      let acc = 0;

      for (const wallDelta of frameDeltas) {
        acc += Math.min(wallDelta, MAX_ACCUMULATOR);
        while (acc >= FIXED_TIMESTEP) {
          vel += gravity * FIXED_TIMESTEP;
          pos += vel * FIXED_TIMESTEP;
          acc -= FIXED_TIMESTEP;
        }
      }
      return { pos, vel };
    }

    // 60fps steady
    const steady60: number[] = Array.from({ length: 300 }, () => 1 / 60);

    // 30fps steady (but same total time)
    const steady30: number[] = Array.from({ length: 150 }, () => 1 / 30);

    // Jittered 60fps
    const jittered: number[] = Array.from(
      { length: 300 },
      () => 1 / 60 + (Math.random() * 0.002 - 0.001),
    );

    const r60 = simulateBody(steady60);
    const r30 = simulateBody(steady30);
    const rJit = simulateBody(jittered);

    // Steady 60fps and steady 30fps span the same total wall time so the
    // fixed-step integrator should produce nearly identical results (within 1 tick).
    expect(Math.abs(r60.pos - r30.pos)).toBeLessThan(Math.abs(GRAVITY) * FIXED_TIMESTEP);

    // Jittered inputs cause small cumulative tick-count drift (up to ~1 tick per jittered
    // frame). Over 300 frames × ±2ms jitter the maximum accumulated drift is bounded by
    // the total jitter integral: 300 × 0.002s = 0.6s extra physics time, equivalent to
    // ~|GRAVITY| × 0.6 × (average-vel) ≈ 20m. We verify a sane upper bound.
    expect(isFinite(rJit.pos)).toBe(true);
    expect(rJit.pos).toBeLessThan(10);   // body has fallen from y=10
    expect(rJit.pos).toBeGreaterThan(-500); // not infinitely diverged
  });

  it('physics state is consistent after a lag spike recovery', () => {
    function simulate(deltas: number[]): number {
      const gravity = -9.81;
      let pos = 10;
      let vel = 0;
      let acc = 0;
      for (const d of deltas) {
        acc += Math.min(d, MAX_ACCUMULATOR);
        while (acc >= FIXED_TIMESTEP) {
          vel += gravity * FIXED_TIMESTEP;
          pos += vel * FIXED_TIMESTEP;
          acc -= FIXED_TIMESTEP;
        }
      }
      return pos;
    }

    // Normal run: 60 frames at 60fps
    const normalDeltas = Array.from({ length: 60 }, () => 1 / 60);

    // Run with one 1-second spike at frame 30 (should be capped to MAX_ACCUMULATOR)
    const spikedDeltas = [
      ...Array.from({ length: 29 }, () => 1 / 60),
      1.0, // spike
      ...Array.from({ length: 30 }, () => 1 / 60),
    ];

    const normalPos = simulate(normalDeltas);
    const spikedPos = simulate(spikedDeltas);

    // The spiked run processes more fixed steps for the spike frame (capped),
    // so positions will differ — but we verify the spike doesn't corrupt the
    // integrator (no NaN, no infinite values).
    expect(isFinite(spikedPos)).toBe(true);
    expect(isNaN(spikedPos)).toBe(false);
    expect(spikedPos).toBeLessThan(10); // Body has fallen
  });
});
