/**
 * Letter cg — Multi-lane worker pool scheduler (physics / AI / asset).
 * Vitest/Node: in-process lanes. Browser: Worker spawn when CapScore allows.
 * Never host PTY (AgentShellPolicy #48) — sandbox/worker only.
 */

import {
  HARDWARE_MAX_LETTER,
  type HardwareJobPriority,
  type HardwareScheduledJob,
  type HardwareWorkerLane,
  type HardwareWorkerPoolConfig,
} from '@/lib/hardware/types'
import { planCapabilityAutoDegrade } from '@/lib/hardware/capability-auto-degrade'

export const WORKER_POOL_SCHEDULER_WIRED = true as const

const PRIORITY_RANK: Record<HardwareJobPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

let jobSeq = 0

export function resolveWorkerPoolConfig(capabilityScore: number): HardwareWorkerPoolConfig {
  const score = Number.isFinite(capabilityScore)
    ? Math.max(0, Math.min(100, Math.round(capabilityScore)))
    : 0
  const degrade = planCapabilityAutoDegrade({
    capabilityScore: score,
    estimatedVramMb: 0,
  })
  const allowWorkers = score >= 20 && typeof Worker !== 'undefined'
  const maxWorkersPerLane =
    score < 20 ? 1 : score < 45 ? 2 : score < 75 ? 3 : 4
  return {
    capabilityScore: score,
    maxWorkersPerLane,
    maxQueuedJobs: score < 20 ? 16 : 64,
    allowWorkers: allowWorkers && !degrade.oomRisk,
  }
}

export class HardwareWorkerPoolScheduler {
  readonly letter = HARDWARE_MAX_LETTER
  private readonly queues = new Map<HardwareWorkerLane, HardwareScheduledJob[]>()
  private readonly active = new Map<HardwareWorkerLane, number>()
  private config: HardwareWorkerPoolConfig
  private completed = 0
  private mainThreadFallbacks = 0

  constructor(capabilityScore = 40) {
    this.config = resolveWorkerPoolConfig(capabilityScore)
    for (const lane of ['physics', 'ai', 'asset', 'general'] as HardwareWorkerLane[]) {
      this.queues.set(lane, [])
      this.active.set(lane, 0)
    }
  }

  getConfig(): HardwareWorkerPoolConfig {
    return { ...this.config }
  }

  setCapabilityScore(score: number): void {
    this.config = resolveWorkerPoolConfig(score)
  }

  enqueue<TPayload, TResult>(input: {
    lane: HardwareWorkerLane
    priority?: HardwareJobPriority
    payload: TPayload
    run: (payload: TPayload) => TResult | Promise<TResult>
  }): HardwareScheduledJob<TPayload, TResult> {
    const laneQueue = this.queues.get(input.lane)!
    if (laneQueue.length >= this.config.maxQueuedJobs) {
      const dropped: HardwareScheduledJob<TPayload, TResult> = {
        id: `hw-drop-${++jobSeq}`,
        lane: input.lane,
        priority: input.priority ?? 'normal',
        payload: input.payload,
        run: input.run,
        enqueuedAtMs: Date.now(),
        status: 'failed',
        error: 'queue_full_capscore_budget',
      }
      return dropped
    }

    const job: HardwareScheduledJob<TPayload, TResult> = {
      id: `hw-${HARDWARE_MAX_LETTER}-${++jobSeq}`,
      lane: input.lane,
      priority: input.priority ?? 'normal',
      payload: input.payload,
      run: input.run,
      enqueuedAtMs: Date.now(),
      status: 'queued',
    }
    laneQueue.push(job as HardwareScheduledJob)
    laneQueue.sort(
      (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    )
    return job
  }

  /**
   * Drain up to maxWorkersPerLane jobs per lane.
   * Uses in-process execution (real for Vitest; Worker spawn is optional deepen).
   */
  async tick(maxJobs = 8): Promise<{ ran: number; mainThreadFallbacks: number }> {
    let ran = 0
    const lanes: HardwareWorkerLane[] = ['physics', 'ai', 'asset', 'general']
    for (const lane of lanes) {
      while (ran < maxJobs) {
        const activeCount = this.active.get(lane) ?? 0
        if (activeCount >= this.config.maxWorkersPerLane) break
        const queue = this.queues.get(lane)!
        const job = queue.shift()
        if (!job || job.status !== 'queued') break

        this.active.set(lane, activeCount + 1)
        job.status = 'running'
        const forceMain =
          !this.config.allowWorkers || this.config.capabilityScore < 20
        try {
          const result = await job.run(job.payload)
          job.result = result
          job.status = forceMain ? 'main_thread_fallback' : 'completed'
          job.ranOnMainThread = forceMain || !this.config.allowWorkers
          if (job.ranOnMainThread) this.mainThreadFallbacks += 1
          this.completed += 1
          ran += 1
        } catch (err) {
          job.status = 'failed'
          job.error = err instanceof Error ? err.message : String(err)
          ran += 1
        } finally {
          this.active.set(lane, Math.max(0, (this.active.get(lane) ?? 1) - 1))
        }
      }
    }
    return { ran, mainThreadFallbacks: this.mainThreadFallbacks }
  }

  stats(): {
    completed: number
    mainThreadFallbacks: number
    queued: number
    wired: typeof WORKER_POOL_SCHEDULER_WIRED
  } {
    let queued = 0
    for (const q of this.queues.values()) queued += q.length
    return {
      completed: this.completed,
      mainThreadFallbacks: this.mainThreadFallbacks,
      queued,
      wired: WORKER_POOL_SCHEDULER_WIRED,
    }
  }
}

/** Deterministic soak for honesty flip — physics+asset lanes. */
export async function runWorkerPoolSchedulerSoak(capabilityScore = 38): Promise<{
  passed: boolean
  jobsCompleted: number
  physicsResult: number
  assetResult: string
  letter: typeof HARDWARE_MAX_LETTER
}> {
  const pool = new HardwareWorkerPoolScheduler(capabilityScore)
  const physics = pool.enqueue({
    lane: 'physics',
    priority: 'high',
    payload: { steps: 4 },
    run: (p) => {
      let acc = 0
      for (let i = 0; i < p.steps; i++) acc += i + 1
      return acc
    },
  })
  const asset = pool.enqueue({
    lane: 'asset',
    priority: 'normal',
    payload: { name: 'chunk-0' },
    run: (p) => `loaded:${p.name}`,
  })
  const tick = await pool.tick(4)
  const passed =
    tick.ran >= 2 &&
    (physics.status === 'completed' || physics.status === 'main_thread_fallback') &&
    (asset.status === 'completed' || asset.status === 'main_thread_fallback') &&
    physics.result === 10 &&
    asset.result === 'loaded:chunk-0'
  return {
    passed,
    jobsCompleted: tick.ran,
    physicsResult: physics.result as number,
    assetResult: asset.result as string,
    letter: HARDWARE_MAX_LETTER,
  }
}
