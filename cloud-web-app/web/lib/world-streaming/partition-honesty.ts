/**
 * Letter cg/ck — World Partition streaming honesty.
 * Cell API CLOSED (cg); playtest frustum soak CLOSED (ck) gates partitionStreamingReady.
 * UE parity / no-stutter / 50km² stay HELD.
 */

import { WORLD_PARTITION_LETTER } from '@/lib/world-streaming/types'
import { PARTITION_CAPABILITY_BUDGET_WIRED } from '@/lib/world-streaming/partition-capability-budget'
import { PARTITION_CELL_API_WIRED } from '@/lib/world-streaming/partition-cell-store'
import { PARTITION_STREAMING_WIRED } from '@/lib/world-streaming/partition-streaming'
import {
  PARTITION_PLAYTEST_WIRE_LETTER,
  PARTITION_PLAYTEST_WIRE_WIRED,
  provePartitionPlaytestSoak,
  type PartitionPlaytestSoakResult,
} from '@/lib/world-streaming/partition-playtest-wire'

export const WORLD_PARTITION_WIRED = true as const

let cachedSoak: boolean | null = null
let lastPlaytestSoak: PartitionPlaytestSoakResult | null = null

/**
 * Prove streaming soak. Letter ck: multi-frame frustum + CapScore playtest soak
 * (supersedes cg 2-tick-only gate for partitionStreamingReady).
 */
export async function provePartitionStreamingSoak(
  capabilityScore = 38,
): Promise<boolean> {
  const r = await provePartitionPlaytestSoak(capabilityScore)
  lastPlaytestSoak = r
  cachedSoak = r.passed
  return r.passed
}

export interface PartitionHonestyReport {
  letter: typeof PARTITION_PLAYTEST_WIRE_LETTER | typeof WORLD_PARTITION_LETTER
  wired: boolean
  partitionCellApiReady: boolean
  /** Soak-gated — frustum fly-through + CapScore budget proven (ck). */
  partitionStreamingReady: boolean
  playtestWireWired: typeof PARTITION_PLAYTEST_WIRE_WIRED
  /** Always false — Founder: claim only when path real + stutter evidence. */
  noLoadingScreenClaimAllowed: false
  ueWorldPartitionParityAllowed: false
  fiftyKmDesktopClaimAllowed: false
  naniteLiveAllowed: false
  soak: PartitionPlaytestSoakResult | null
  notes: string[]
}

export async function probePartitionHonesty(input?: {
  soakPassed?: boolean
}): Promise<PartitionHonestyReport> {
  if (input?.soakPassed === undefined && cachedSoak === null) {
    await provePartitionStreamingSoak()
  }
  const partitionStreamingReady = input?.soakPassed ?? cachedSoak ?? false
  return {
    letter: PARTITION_PLAYTEST_WIRE_LETTER,
    wired:
      WORLD_PARTITION_WIRED &&
      PARTITION_CELL_API_WIRED &&
      PARTITION_STREAMING_WIRED &&
      PARTITION_CAPABILITY_BUDGET_WIRED &&
      PARTITION_PLAYTEST_WIRE_WIRED,
    partitionCellApiReady: PARTITION_CELL_API_WIRED,
    partitionStreamingReady,
    playtestWireWired: PARTITION_PLAYTEST_WIRE_WIRED,
    noLoadingScreenClaimAllowed: false,
    ueWorldPartitionParityAllowed: false,
    fiftyKmDesktopClaimAllowed: false,
    naniteLiveAllowed: false,
    soak: lastPlaytestSoak,
    notes: [
      ...(lastPlaytestSoak?.notes ?? []),
      'World Partition cell load/unload + CapScore budgets CLOSED (letter cg)',
      partitionStreamingReady
        ? 'partitionStreamingReady CLOSED (letter ck) — frustum/view tick + CapScore soak'
        : 'partitionStreamingReady pending soak',
      'No-loading-screen / zero-stutter claim HELD until Founder soak evidence',
      'UE World Partition / HLOD / Nanite parity HELD',
      'Honest competitor: Unreal still better at World Partition / Nanite / HLOD maturity',
      'World Forge streaming carve bridge to partition still HELD — not UE parity',
    ],
  }
}
