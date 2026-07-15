/**
 * Letter cg — Frente Delta Hardware Max Vitest.
 */

import { describe, expect, it } from 'vitest'
import {
  planCapabilityAutoDegrade,
  resolveWorkerPoolConfig,
  HardwareWorkerPoolScheduler,
  runWorkerPoolSchedulerSoak,
  AsyncComputeJobQueue,
  runAsyncComputeSoak,
  runBvhBuildJob,
  resolveFsrUpscalePlan,
  proveFsrSpatialWire,
  applyFsrSpatialSample,
  DLSS_NATIVE_WEB_HELD,
  proveHardwareMaxSoaks,
  probeHardwareMaxHonesty,
  HARDWARE_MAX_LETTER,
} from '@/lib/hardware'

describe('hardware max (cg)', () => {
  it('CapScore auto-degrade never allows OOM crash; GT730 fail-closes async', () => {
    const plan = planCapabilityAutoDegrade({
      capabilityScore: 12,
      estimatedVramMb: 400,
    })
    expect(plan.crashOomForbidden).toBe(true)
    expect(plan.oomRisk).toBe(true)
    expect(plan.actions.some((a) => a.subsystem === 'async_compute')).toBe(true)
  })

  it('worker pool scheduler soak completes physics+asset lanes', async () => {
    const cfg = resolveWorkerPoolConfig(12)
    expect(cfg.maxWorkersPerLane).toBeGreaterThanOrEqual(1)
    const soak = await runWorkerPoolSchedulerSoak(12)
    expect(soak.letter).toBe(HARDWARE_MAX_LETTER)
    expect(soak.passed).toBe(true)
    expect(soak.physicsResult).toBe(10)

    const pool = new HardwareWorkerPoolScheduler(12)
    pool.enqueue({
      lane: 'ai',
      payload: { n: 3 },
      run: (p) => p.n * 2,
    })
    const tick = await pool.tick(2)
    expect(tick.ran).toBe(1)
  })

  it('async compute fail-closed to main-thread on GT730', async () => {
    const soak = await runAsyncComputeSoak(12)
    expect(soak.passed).toBe(true)
    expect(soak.failClosedToMain).toBe(true)
    expect(runBvhBuildJob({ triangleCount: 10 }).nodes).toBe(5)

    const q = new AsyncComputeJobQueue()
    q.enqueue({
      kind: 'mesh_extract',
      payload: { verts: 8 },
      run: (p) => p.verts * 3,
    })
    const drain = await q.drain({
      capabilityScore: 80,
      webgpuComputeAvailable: true,
    })
    expect(drain.asyncComputeAllowed).toBe(true)
  })

  it('FSR spatial wire real; DLSS native web HELD', () => {
    expect(DLSS_NATIVE_WEB_HELD).toBe(true)
    const plan = resolveFsrUpscalePlan({ capabilityScore: 12 })
    expect(plan.dlssNativeAllowed).toBe(false)
    expect(plan.mode).toBe('performance')
    const proved = proveFsrSpatialWire()
    expect(proved.passed).toBe(true)
    const dst = applyFsrSpatialSample({
      srcWidth: 2,
      srcHeight: 2,
      src: new Float32Array([0, 1, 0, 1]),
      dstWidth: 2,
      dstHeight: 2,
    })
    expect(dst.length).toBe(4)
  })

  it('honesty flips ready fields; marketing stays false', async () => {
    const soaks = await proveHardwareMaxSoaks(12)
    expect(soaks.workerPool).toBe(true)
    expect(soaks.asyncFailClosed).toBe(true)
    expect(soaks.fsr).toBe(true)
    const honesty = await probeHardwareMaxHonesty({ capabilityScore: 12 })
    expect(honesty.letter).toBe('cg')
    expect(honesty.workerPoolSchedulerReady).toBe(true)
    expect(honesty.fsrSpatialReady).toBe(true)
    expect(honesty.dlssNativeWebAllowed).toBe(false)
    expect(honesty.zeroStutterMarketingAllowed).toBe(false)
    expect(honesty.naniteLiveAllowed).toBe(false)
  })
})
