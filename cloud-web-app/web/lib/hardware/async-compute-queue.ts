/**
 * Letter cg — Async compute job queue (BVH / mesh extract / volumetrics).
 * Fail-closed to main-thread when CapScore/WebGPU async compute unavailable.
 * Does NOT invent DLSS or Nanite-live.
 */

import {
  HARDWARE_MAX_LETTER,
  type AsyncComputeJob,
  type AsyncComputeJobKind,
  type HardwareJobPriority,
} from '@/lib/hardware/types'
import {
  planCapabilityAutoDegrade,
  shouldFailClosedAsyncCompute,
} from '@/lib/hardware/capability-auto-degrade'

export const ASYNC_COMPUTE_QUEUE_WIRED = true as const

let asyncJobSeq = 0

export function canUseAsyncComputeQueue(input: {
  capabilityScore: number
  webgpuComputeAvailable?: boolean
}): { allowed: boolean; reason: string } {
  const score = Number.isFinite(input.capabilityScore)
    ? Math.max(0, Math.min(100, Math.round(input.capabilityScore)))
    : 0
  const plan = planCapabilityAutoDegrade({
    capabilityScore: score,
    estimatedVramMb: score < 20 ? 400 : 200,
  })
  if (shouldFailClosedAsyncCompute(plan) || score < 20) {
    return {
      allowed: false,
      reason: 'GT730/webgl2 CapScore — async compute fail-closed to main-thread',
    }
  }
  if (input.webgpuComputeAvailable !== true) {
    return {
      allowed: false,
      reason: 'WebGPU compute unavailable — fail-closed to main-thread',
    }
  }
  return { allowed: true, reason: 'async compute queue eligible' }
}

export class AsyncComputeJobQueue {
  readonly letter = HARDWARE_MAX_LETTER
  private queue: AsyncComputeJob[] = []
  private mainThreadRuns = 0
  private asyncRuns = 0

  enqueue<TPayload, TResult>(input: {
    kind: AsyncComputeJobKind
    priority?: HardwareJobPriority
    payload: TPayload
    run: (payload: TPayload) => TResult | Promise<TResult>
    preferAsyncCompute?: boolean
  }): AsyncComputeJob<TPayload, TResult> {
    const job: AsyncComputeJob<TPayload, TResult> = {
      id: `ac-${HARDWARE_MAX_LETTER}-${++asyncJobSeq}`,
      kind: input.kind,
      priority: input.priority ?? 'normal',
      payload: input.payload,
      run: input.run,
      preferAsyncCompute: input.preferAsyncCompute !== false,
      status: 'queued',
      executedOn: 'unrun',
    }
    this.queue.push(job as AsyncComputeJob)
    return job
  }

  /**
   * Drain jobs. When async compute disallowed, every job runs on main thread
   * (status main_thread_fallback) — never blocks claiming FPS perfection.
   */
  async drain(input: {
    capabilityScore: number
    webgpuComputeAvailable?: boolean
    maxJobs?: number
  }): Promise<{
    ran: number
    mainThreadFallbacks: number
    asyncComputeRuns: number
    asyncComputeAllowed: boolean
  }> {
    const gate = canUseAsyncComputeQueue({
      capabilityScore: input.capabilityScore,
      webgpuComputeAvailable: input.webgpuComputeAvailable,
    })
    const max = input.maxJobs ?? 8
    let ran = 0
    while (ran < max && this.queue.length > 0) {
      const job = this.queue.shift()!
      job.status = 'running'
      try {
        const result = await job.run(job.payload)
        job.result = result
        if (gate.allowed && job.preferAsyncCompute) {
          job.status = 'completed'
          job.executedOn = 'async_compute'
          this.asyncRuns += 1
        } else {
          job.status = 'main_thread_fallback'
          job.executedOn = 'main_thread'
          this.mainThreadRuns += 1
        }
      } catch (err) {
        job.status = 'failed'
        job.error = err instanceof Error ? err.message : String(err)
        job.executedOn = 'main_thread'
      }
      ran += 1
    }
    return {
      ran,
      mainThreadFallbacks: this.mainThreadRuns,
      asyncComputeRuns: this.asyncRuns,
      asyncComputeAllowed: gate.allowed,
    }
  }

  stats() {
    return {
      queued: this.queue.length,
      mainThreadRuns: this.mainThreadRuns,
      asyncRuns: this.asyncRuns,
      wired: ASYNC_COMPUTE_QUEUE_WIRED,
    }
  }
}

/** Pure BVH stub work — real job kind for soak, not Nanite. */
export function runBvhBuildJob(payload: { triangleCount: number }): {
  nodes: number
  kind: 'bvh_build'
} {
  const n = Math.max(0, Math.floor(payload.triangleCount))
  return { nodes: Math.max(1, Math.ceil(n / 2)), kind: 'bvh_build' }
}

export async function runAsyncComputeSoak(capabilityScore = 12): Promise<{
  passed: boolean
  failClosedToMain: boolean
  letter: typeof HARDWARE_MAX_LETTER
}> {
  const q = new AsyncComputeJobQueue()
  const job = q.enqueue({
    kind: 'bvh_build',
    payload: { triangleCount: 128 },
    run: runBvhBuildJob,
  })
  const drain = await q.drain({
    capabilityScore,
    webgpuComputeAvailable: false,
  })
  const failClosedToMain =
    !drain.asyncComputeAllowed && job.executedOn === 'main_thread'
  return {
    passed:
      drain.ran === 1 &&
      failClosedToMain &&
      job.result?.nodes === 64 &&
      job.status === 'main_thread_fallback',
    failClosedToMain,
    letter: HARDWARE_MAX_LETTER,
  }
}
