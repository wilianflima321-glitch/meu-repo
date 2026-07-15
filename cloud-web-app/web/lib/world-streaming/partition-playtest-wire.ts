/**
 * Letter ck — World Partition streaming playtest wire (Zero-MVP).
 * Multi-frame frustum fly-through soak + CapScore budget contrast.
 * Not lib-only: SimulationTick / GameLoop opt-in ticks streamer from view pose.
 * UE World Partition / no-loading-screen / stutter marketing stay HELD.
 */

import {
  PARTITION_STREAMING_WIRED,
  WorldPartitionStreamer,
  cellIntersectsViewFrustum,
  runPartitionStreamingSoak,
} from '@/lib/world-streaming/partition-streaming'
import {
  PARTITION_CELL_API_WIRED,
  boundsForGridCell,
  cellIdFromGrid,
} from '@/lib/world-streaming/partition-cell-store'
import {
  PARTITION_CAPABILITY_BUDGET_WIRED,
  resolvePartitionStreamingConfig,
} from '@/lib/world-streaming/partition-capability-budget'
import type {
  PartitionStreamingStats,
  PartitionViewPose,
} from '@/lib/world-streaming/types'

export const PARTITION_PLAYTEST_WIRE_LETTER = 'ck' as const
export const PARTITION_PLAYTEST_WIRE_WIRED = true as const

/**
 * Tick streamer from camera/view pose. Null streamer → Zero-UI silent no-op.
 */
export async function tickPartitionFromView(
  streamer: WorldPartitionStreamer | null | undefined,
  view: PartitionViewPose,
): Promise<{
  stats: PartitionStreamingStats | null
  zeroUiUnavailable: boolean
}> {
  if (!streamer) {
    return { stats: null, zeroUiUnavailable: true }
  }
  const stats = await streamer.tick(view)
  return { stats, zeroUiUnavailable: false }
}

/**
 * Scripted fly-through poses: approach + look + retreat (frustum + hysteresis).
 */
export function buildPartitionFlythroughPoses(
  cellSize: number,
): PartitionViewPose[] {
  return [
    { x: 0, z: 0, forwardX: 1, forwardZ: 0, fovYRadians: Math.PI / 2.5 },
    {
      x: cellSize * 1.5,
      z: 0,
      forwardX: 1,
      forwardZ: 0,
      fovYRadians: Math.PI / 2.5,
    },
    {
      x: cellSize * 3,
      z: 0,
      forwardX: 1,
      forwardZ: 0.15,
      fovYRadians: Math.PI / 2.5,
    },
    // Look opposite — behind cells should drop from want set.
    {
      x: cellSize * 3,
      z: 0,
      forwardX: -1,
      forwardZ: 0,
      fovYRadians: Math.PI / 2.5,
    },
    // Retreat toward origin — unload hysteresis.
    {
      x: cellSize * 0.5,
      z: 0,
      forwardX: -1,
      forwardZ: 0,
      fovYRadians: Math.PI / 2.5,
    },
    { x: 0, z: 0, forwardX: 1, forwardZ: 0, fovYRadians: Math.PI / 2.5 },
  ]
}

export interface PartitionPlaytestSoakResult {
  letter: typeof PARTITION_PLAYTEST_WIRE_LETTER
  passed: boolean
  libWired: boolean
  frustumNarrowedWant: boolean
  budgetNeverExceeded: boolean
  unloadOnRetreat: boolean
  capScoreContrast: boolean
  framesProven: number
  residentPeak: number
  notes: string[]
}

/**
 * Multi-frame soak: frustum load/unload + CapScore GT730 vs high contrast.
 * Gates `partitionStreamingReady` (ck deepen of cg scaffold soak).
 */
export async function provePartitionPlaytestSoak(
  capabilityScore = 38,
): Promise<PartitionPlaytestSoakResult> {
  const notes: string[] = []
  const streamer = new WorldPartitionStreamer(capabilityScore)
  streamer.seedGrid(4, 24 * 1024)
  const cellSize = streamer.getConfig().cellSize
  const poses = buildPartitionFlythroughPoses(cellSize)

  let residentPeak = 0
  let budgetNeverExceeded = true
  let sawFrustum = false
  let residentAfterApproach = 0
  let frames = 0
  let aheadResidentAfterForward = false
  let aheadUnloadedAfterHome = false

  const approachX = cellSize * 3
  const cx = Math.floor(approachX / cellSize)
  const aheadBounds = boundsForGridCell(cx + 1, 0, cellSize)
  const aheadId = cellIdFromGrid(cx + 1, 0)
  const viewLookPlusX: PartitionViewPose = {
    x: approachX,
    z: 0,
    forwardX: 1,
    forwardZ: 0,
    fovYRadians: Math.PI / 2.5,
  }
  const viewLookMinusX: PartitionViewPose = {
    x: approachX,
    z: 0,
    forwardX: -1,
    forwardZ: 0,
    fovYRadians: Math.PI / 2.5,
  }
  const aheadVisibleForward = cellIntersectsViewFrustum(
    aheadBounds,
    viewLookPlusX,
  )
  const aheadVisibleBackward = cellIntersectsViewFrustum(
    aheadBounds,
    viewLookMinusX,
  )

  for (let i = 0; i < poses.length; i++) {
    const pose = poses[i]!
    const { stats, zeroUiUnavailable } = await tickPartitionFromView(
      streamer,
      pose,
    )
    if (zeroUiUnavailable || !stats) {
      notes.push('streamer unavailable mid-soak')
      break
    }
    frames += 1
    residentPeak = Math.max(residentPeak, stats.resident)
    if (stats.memoryUsedBytes > stats.memoryBudgetBytes) {
      budgetNeverExceeded = false
    }
    if (stats.resident > streamer.getConfig().maxResidentCells) {
      budgetNeverExceeded = false
    }
    if (stats.frustumFiltered) sawFrustum = true

    // Pose index 2 looks +X at approach; ahead cell should load.
    if (i === 2) {
      residentAfterApproach = stats.resident
      aheadResidentAfterForward =
        streamer.store.getCell(aheadId)?.state === 'resident'
    }
    // Final pose home at origin — far ahead cell must unload (Chebyshev > unloadRadius).
    if (i === poses.length - 1) {
      aheadUnloadedAfterHome =
        streamer.store.getCell(aheadId)?.state !== 'resident'
    }
  }

  const frustumNarrowedWant =
    sawFrustum &&
    aheadVisibleForward === true &&
    aheadVisibleBackward === false &&
    aheadResidentAfterForward

  if (!frustumNarrowedWant) {
    notes.push(
      'frustum soak failed — expected ahead cell visible/+loaded looking +X, culled looking −X',
    )
  }

  const unloadOnRetreat =
    residentAfterApproach > 0 && aheadUnloadedAfterHome

  if (!unloadOnRetreat) {
    notes.push(
      'retreat unload soak failed — expected far ahead cell unloaded after return to origin',
    )
  }

  // CapScore contrast: GT730 band tighter than high score.
  const lowCfg = resolvePartitionStreamingConfig(12)
  const highCfg = resolvePartitionStreamingConfig(80)
  const lowStreamer = new WorldPartitionStreamer(12)
  lowStreamer.seedGrid(3, 32 * 1024)
  const highStreamer = new WorldPartitionStreamer(80)
  highStreamer.seedGrid(3, 32 * 1024)
  const lowStats = await lowStreamer.tick({
    x: 0,
    z: 0,
    forwardX: 1,
    forwardZ: 0,
    fovYRadians: Math.PI / 2,
  })
  const highStats = await highStreamer.tick({
    x: 0,
    z: 0,
    forwardX: 1,
    forwardZ: 0,
    fovYRadians: Math.PI / 2,
  })
  const capScoreContrast =
    lowCfg.maxResidentCells < highCfg.maxResidentCells &&
    lowStats.resident <= lowCfg.maxResidentCells &&
    highStats.resident <= highCfg.maxResidentCells &&
    lowStats.resident <= highStats.resident

  if (!capScoreContrast) {
    notes.push('CapScore contrast soak failed — GT730 should tighten residents')
  }

  // Scaffold cg 2-tick soak still green.
  const scaffold = await runPartitionStreamingSoak(capabilityScore)
  if (!scaffold.passed) {
    notes.push('cg scaffold soak regress')
  }

  // Sanity: frustum helper rejects behind-camera cell when looking +X.
  const behindOk = !cellIntersectsViewFrustum(
    [cellSize * 2, -cellSize / 2, cellSize * 3, cellSize / 2],
    { x: 0, z: 0, forwardX: -1, forwardZ: 0, fovYRadians: Math.PI / 3 },
  )
  if (!behindOk) {
    notes.push('frustum helper failed behind-camera reject')
  }

  const passed =
    PARTITION_PLAYTEST_WIRE_WIRED &&
    PARTITION_STREAMING_WIRED &&
    PARTITION_CELL_API_WIRED &&
    PARTITION_CAPABILITY_BUDGET_WIRED &&
    frustumNarrowedWant &&
    budgetNeverExceeded &&
    unloadOnRetreat &&
    capScoreContrast &&
    scaffold.passed &&
    behindOk &&
    frames >= poses.length

  if (passed) {
    notes.push(
      'partitionStreamingReady soak CLOSED (letter ck) — frustum fly-through + CapScore budget proven',
    )
  }

  return {
    letter: PARTITION_PLAYTEST_WIRE_LETTER,
    passed,
    libWired: PARTITION_STREAMING_WIRED && PARTITION_CELL_API_WIRED,
    frustumNarrowedWant,
    budgetNeverExceeded,
    unloadOnRetreat,
    capScoreContrast,
    framesProven: passed ? frames : 0,
    residentPeak,
    notes,
  }
}
