/**
 * Letter cg — World Partition streaming Vitest.
 */

import { describe, expect, it } from 'vitest'
import {
  resolvePartitionStreamingConfig,
  PartitionCellStore,
  WorldPartitionStreamer,
  runPartitionStreamingSoak,
  provePartitionStreamingSoak,
  probePartitionHonesty,
  cellIdFromGrid,
  boundsForGridCell,
} from '@/lib/world-streaming'

describe('world partition streaming (cg)', () => {
  it('CapScore budgets shrink GT730 resident cells', () => {
    const low = resolvePartitionStreamingConfig(12)
    const high = resolvePartitionStreamingConfig(80)
    expect(low.maxResidentCells).toBeLessThan(high.maxResidentCells)
    expect(low.memoryBudgetBytes).toBeLessThan(high.memoryBudgetBytes)
  })

  it('cell load/unload API + memory budget eviction', async () => {
    const store = new PartitionCellStore(12)
    store.setBudgetBytes(100_000)
    store.registerCell({
      cellId: cellIdFromGrid(0, 0),
      bounds: boundsForGridCell(0, 0, 32),
      hlodLevel: 0,
      cookManifestRef: 'cook://a',
      streamingPriority: 0,
      estimatedBytes: 60_000,
    })
    store.registerCell({
      cellId: cellIdFromGrid(1, 0),
      bounds: boundsForGridCell(1, 0, 32),
      hlodLevel: 1,
      cookManifestRef: 'cook://b',
      streamingPriority: 5,
      estimatedBytes: 60_000,
    })
    const a = await store.loadCell(cellIdFromGrid(0, 0))
    expect(a?.fromCache).toBe(false)
    const b = await store.loadCell(cellIdFromGrid(1, 0))
    expect(b).not.toBeNull()
    expect(store.memoryUsedBytes()).toBeLessThanOrEqual(100_000)
    expect(store.unloadCell(cellIdFromGrid(1, 0))).toBe(true)
  })

  it('view tick surgical load/unload soak', async () => {
    const soak = await runPartitionStreamingSoak(38)
    expect(soak.passed).toBe(true)
    expect(soak.memoryOk).toBe(true)
    expect(soak.residentAfterMove).toBeGreaterThan(0)

    const streamer = new WorldPartitionStreamer(38)
    streamer.seedGrid(2)
    const s = await streamer.tick({ x: 0, z: 0 })
    expect(s.resident).toBeGreaterThan(0)
  })

  it('honesty: streaming ready; no-loading-screen / UE parity HELD', async () => {
    expect(await provePartitionStreamingSoak(38)).toBe(true)
    const honesty = await probePartitionHonesty()
    expect(honesty.letter).toBe('ck')
    expect(honesty.partitionCellApiReady).toBe(true)
    expect(honesty.partitionStreamingReady).toBe(true)
    expect(honesty.noLoadingScreenClaimAllowed).toBe(false)
    expect(honesty.ueWorldPartitionParityAllowed).toBe(false)
    expect(honesty.fiftyKmDesktopClaimAllowed).toBe(false)
  })
})
