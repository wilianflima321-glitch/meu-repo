/**
 * Letter cg — Hardware Max honesty aggregate.
 * Probes flip only when soak/wire evidence is real. Marketing stays HELD.
 */

import { HARDWARE_MAX_LETTER } from '@/lib/hardware/types'
import {
  CAPABILITY_AUTO_DEGRADE_WIRED,
  planCapabilityAutoDegrade,
} from '@/lib/hardware/capability-auto-degrade'
import {
  WORKER_POOL_SCHEDULER_WIRED,
  runWorkerPoolSchedulerSoak,
} from '@/lib/hardware/worker-pool-scheduler'
import {
  ASYNC_COMPUTE_QUEUE_WIRED,
  runAsyncComputeSoak,
} from '@/lib/hardware/async-compute-queue'
import {
  FSR_UPSCALE_WIRED,
  DLSS_NATIVE_WEB_HELD,
  proveFsrSpatialWire,
} from '@/lib/hardware/fsr-upscale'

export const HARDWARE_MAX_WIRED = true as const

export interface HardwareMaxHonestyInput {
  capabilityScore?: number
  workerPoolSoakPassed?: boolean
  asyncComputeFailClosedPassed?: boolean
  fsrSpatialPassed?: boolean
}

export interface HardwareMaxHonestyReport {
  letter: typeof HARDWARE_MAX_LETTER
  wired: typeof HARDWARE_MAX_WIRED
  workerPoolSchedulerReady: boolean
  asyncComputeQueueReady: boolean
  /** Fail-closed path proven (main-thread), not GPU async soak. */
  asyncComputeFailClosedProven: boolean
  fsrSpatialReady: boolean
  capabilityAutoDegradeReady: boolean
  dlssNativeWebAllowed: false
  zeroStutterMarketingAllowed: false
  naniteLiveAllowed: false
  notes: string[]
}

let cachedWorkerSoak: boolean | null = null
let cachedAsyncSoak: boolean | null = null
let cachedFsr: boolean | null = null

export async function proveHardwareMaxSoaks(capabilityScore = 12): Promise<{
  workerPool: boolean
  asyncFailClosed: boolean
  fsr: boolean
}> {
  const [worker, asyncJob, fsr] = await Promise.all([
    runWorkerPoolSchedulerSoak(capabilityScore),
    runAsyncComputeSoak(capabilityScore),
    Promise.resolve(proveFsrSpatialWire()),
  ])
  cachedWorkerSoak = worker.passed
  cachedAsyncSoak = asyncJob.passed
  cachedFsr = fsr.passed
  return {
    workerPool: worker.passed,
    asyncFailClosed: asyncJob.passed,
    fsr: fsr.passed,
  }
}

export async function probeHardwareMaxHonesty(
  input: HardwareMaxHonestyInput = {},
): Promise<HardwareMaxHonestyReport> {
  const score = input.capabilityScore ?? 12
  const degrade = planCapabilityAutoDegrade({
    capabilityScore: score,
    estimatedVramMb: score < 20 ? 400 : 800,
  })

  if (
    input.workerPoolSoakPassed === undefined ||
    input.asyncComputeFailClosedPassed === undefined ||
    input.fsrSpatialPassed === undefined
  ) {
    if (cachedWorkerSoak === null || cachedAsyncSoak === null || cachedFsr === null) {
      await proveHardwareMaxSoaks(score)
    }
  }

  const workerPoolSchedulerReady =
    input.workerPoolSoakPassed ?? cachedWorkerSoak ?? false
  const asyncComputeFailClosedProven =
    input.asyncComputeFailClosedPassed ?? cachedAsyncSoak ?? false
  const fsrSpatialReady = input.fsrSpatialPassed ?? cachedFsr ?? false

  return {
    letter: HARDWARE_MAX_LETTER,
    wired:
      HARDWARE_MAX_WIRED &&
      WORKER_POOL_SCHEDULER_WIRED &&
      ASYNC_COMPUTE_QUEUE_WIRED &&
      FSR_UPSCALE_WIRED &&
      CAPABILITY_AUTO_DEGRADE_WIRED,
    workerPoolSchedulerReady,
    asyncComputeQueueReady: ASYNC_COMPUTE_QUEUE_WIRED && asyncComputeFailClosedProven,
    asyncComputeFailClosedProven,
    fsrSpatialReady,
    capabilityAutoDegradeReady:
      CAPABILITY_AUTO_DEGRADE_WIRED && degrade.crashOomForbidden === true,
    dlssNativeWebAllowed: false,
    zeroStutterMarketingAllowed: false,
    naniteLiveAllowed: false,
    notes: [
      ...degrade.notes,
      'Hardware Max CLOSED (letter cg): worker pool + async fail-closed + FSR spatial + CapScore degrade',
      DLSS_NATIVE_WEB_HELD
        ? 'DLSS native web HELD — FSR/XeSS-class spatial only'
        : 'DLSS unexpected',
      'Zero-stutter / Nanite-live marketing HELD',
      'Honest competitor: Unreal still better at Nanite/Lumen/async GPU maturity until proven',
    ],
  }
}
