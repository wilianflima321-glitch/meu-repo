/**
 * Letter ck — World Partition streaming playtest Vitest.
 */

import { describe, expect, it } from 'vitest'
import {
  WorldPartitionStreamer,
  cellIntersectsViewFrustum,
  resolvePartitionStreamingConfig,
  tickPartitionFromView,
  provePartitionPlaytestSoak,
  buildPartitionFlythroughPoses,
  provePartitionStreamingSoak,
  probePartitionHonesty,
  PARTITION_PLAYTEST_WIRE_LETTER,
  boundsForGridCell,
  cellIdFromGrid,
} from '@/lib/world-streaming'

describe('partition streaming playtest soak (ck)', () => {
  it('frustum culls cells behind camera on XZ', () => {
    const size = 48
    const ahead = boundsForGridCell(2, 0, size)
    const behind = boundsForGridCell(-2, 0, size)
    const lookPlus: Parameters<typeof cellIntersectsViewFrustum>[1] = {
      x: 0,
      z: 0,
      forwardX: 1,
      forwardZ: 0,
      fovYRadians: Math.PI / 3,
    }
    expect(cellIntersectsViewFrustum(ahead, lookPlus)).toBe(true)
    expect(cellIntersectsViewFrustum(behind, lookPlus)).toBe(false)
    // Position-only pose never culls.
    expect(cellIntersectsViewFrustum(behind, { x: 0, z: 0 })).toBe(true)
  })

  it('view tick loads frustum cells and respects CapScore resident budget', async () => {
    const low = new WorldPartitionStreamer(12)
    low.seedGrid(3, 16 * 1024)
    const cfg = low.getConfig()
    expect(cfg.maxResidentCells).toBe(
      resolvePartitionStreamingConfig(12).maxResidentCells,
    )

    const s = await low.tick({
      x: 0,
      z: 0,
      forwardX: 1,
      forwardZ: 0,
      fovYRadians: Math.PI / 2.2,
    })
    expect(s.frustumFiltered).toBe(true)
    expect(s.resident).toBeGreaterThan(0)
    expect(s.resident).toBeLessThanOrEqual(cfg.maxResidentCells)
    expect(s.memoryUsedBytes).toBeLessThanOrEqual(s.memoryBudgetBytes)
    expect((s.wantCount ?? 0)).toBeGreaterThan(0)
  })

  it('fly-through unload on retreat + Zero-UI when streamer null', async () => {
    const nullTick = await tickPartitionFromView(null, { x: 0, z: 0 })
    expect(nullTick.zeroUiUnavailable).toBe(true)
    expect(nullTick.stats).toBeNull()

    const streamer = new WorldPartitionStreamer(38)
    streamer.seedGrid(4, 16 * 1024)
    const cellSize = streamer.getConfig().cellSize
    const poses = buildPartitionFlythroughPoses(cellSize)
    const approachX = cellSize * 3
    const aheadId = cellIdFromGrid(Math.floor(approachX / cellSize) + 1, 0)
    let peak = 0
    for (let i = 0; i < poses.length; i++) {
      const { stats } = await tickPartitionFromView(streamer, poses[i]!)
      peak = Math.max(peak, stats?.resident ?? 0)
    }
    expect(peak).toBeGreaterThan(0)
    expect(streamer.store.getCell(aheadId)?.state).not.toBe('resident')
  })

  it('soak + honesty partitionStreamingReady; marketing HELD', async () => {
    const soak = await provePartitionPlaytestSoak(38)
    expect(soak.letter).toBe(PARTITION_PLAYTEST_WIRE_LETTER)
    expect(soak.letter).toBe('ck')
    expect(soak.passed).toBe(true)
    expect(soak.frustumNarrowedWant).toBe(true)
    expect(soak.budgetNeverExceeded).toBe(true)
    expect(soak.capScoreContrast).toBe(true)
    expect(soak.framesProven).toBeGreaterThanOrEqual(6)

    expect(await provePartitionStreamingSoak(38)).toBe(true)
    const honesty = await probePartitionHonesty()
    expect(honesty.letter).toBe('ck')
    expect(honesty.partitionCellApiReady).toBe(true)
    expect(honesty.partitionStreamingReady).toBe(true)
    expect(honesty.playtestWireWired).toBe(true)
    expect(honesty.noLoadingScreenClaimAllowed).toBe(false)
    expect(honesty.ueWorldPartitionParityAllowed).toBe(false)
    expect(honesty.fiftyKmDesktopClaimAllowed).toBe(false)
    expect(honesty.naniteLiveAllowed).toBe(false)
  })

  it('SimulationTick-style view drain ticks streamer (playtest hot path)', async () => {
    // Mirrors SimulationTick.step partition drain without Rapier wasm init.
    const streamer = new WorldPartitionStreamer(38)
    streamer.seedGrid(2, 16 * 1024)
    let partitionView = {
      x: 0,
      z: 0,
      forwardX: 1,
      forwardZ: 0,
      fovYRadians: Math.PI / 2.5,
    }
    let lastResident = 0
    let ticks = 0

    const drain = async () => {
      const result = await tickPartitionFromView(streamer, partitionView)
      if (result.stats) {
        lastResident = result.stats.resident
        ticks += 1
      }
    }

    await drain()
    partitionView = {
      ...partitionView,
      x: streamer.getConfig().cellSize * 2,
    }
    await drain()

    expect(ticks).toBe(2)
    expect(lastResident).toBeGreaterThan(0)
    expect(streamer.store.getCell(cellIdFromGrid(0, 0))?.state).toBeDefined()
  })
})
