/**
 * Letter cg — World Partition cell load/unload API (surgical SSD↔RAM sim).
 * Web: in-memory CAS. Desktop native SSD path remains deepen / HELD for maturity.
 * No loading-screen / zero-stutter claim until path proven in soak + Founder.
 */

import { WORLD_PARTITION_LETTER, type PartitionLoadResult, type WorldPartitionCell } from '@/lib/world-streaming/types'
import { resolvePartitionStreamingConfig } from '@/lib/world-streaming/partition-capability-budget'

export const PARTITION_CELL_API_WIRED = true as const

/** In-memory CAS stand-in for SSD↔RAM surgical load (web-honest). */
export class PartitionCellStore {
  readonly letter = WORLD_PARTITION_LETTER
  private cells = new Map<string, WorldPartitionCell>()
  private cas = new Map<string, { bytes: number; payload: unknown }>()
  private memoryUsed = 0
  private budgetBytes: number

  constructor(capabilityScore = 38) {
    this.budgetBytes = resolvePartitionStreamingConfig(capabilityScore).memoryBudgetBytes
  }

  setBudgetBytes(bytes: number): void {
    this.budgetBytes = Math.max(1024, bytes)
  }

  registerCell(
    cell: Omit<WorldPartitionCell, 'state' | 'payload'> & {
      payload?: unknown
    },
  ): WorldPartitionCell {
    const existing = this.cells.get(cell.cellId)
    if (existing) return existing
    const registered: WorldPartitionCell = {
      ...cell,
      state: 'unloaded',
      payload: null,
    }
    this.cells.set(cell.cellId, registered)
    this.cas.set(cell.cellId, {
      bytes: cell.estimatedBytes,
      payload: cell.payload ?? { cellId: cell.cellId, cooked: true },
    })
    return registered
  }

  getCell(cellId: string): WorldPartitionCell | undefined {
    return this.cells.get(cellId)
  }

  listCells(): WorldPartitionCell[] {
    return [...this.cells.values()]
  }

  memoryUsedBytes(): number {
    return this.memoryUsed
  }

  memoryBudgetBytes(): number {
    return this.budgetBytes
  }

  /**
   * Surgical load: pull from CAS into resident RAM if budget allows.
   * Evicts lowest-priority resident cells when over budget (never throws OOM).
   */
  async loadCell(cellId: string): Promise<PartitionLoadResult | null> {
    const cell = this.cells.get(cellId)
    const cas = this.cas.get(cellId)
    if (!cell || !cas) return null
    if (cell.state === 'resident' && cell.payload != null) {
      return {
        cellId,
        bytes: cas.bytes,
        fromCache: true,
        payload: cell.payload,
      }
    }

    cell.state = 'loading'
    // Yield to the event loop before promoting in-memory CAS → resident RAM.
    // Does NOT claim disk/SSD I/O — CAS payload is already in-process.
    await Promise.resolve()

    while (
      this.memoryUsed + cas.bytes > this.budgetBytes &&
      this.evictLowestPriorityExcept(cellId)
    ) {
      // keep evicting until budget ok or nothing left
    }

    if (this.memoryUsed + cas.bytes > this.budgetBytes) {
      cell.state = 'error'
      return null
    }

    cell.payload = cas.payload
    cell.state = 'resident'
    this.memoryUsed += cas.bytes
    return {
      cellId,
      bytes: cas.bytes,
      fromCache: false,
      payload: cas.payload,
    }
  }

  unloadCell(cellId: string): boolean {
    const cell = this.cells.get(cellId)
    const cas = this.cas.get(cellId)
    if (!cell || cell.state !== 'resident') return false
    cell.state = 'unloading'
    cell.payload = null
    cell.state = 'unloaded'
    if (cas) this.memoryUsed = Math.max(0, this.memoryUsed - cas.bytes)
    return true
  }

  private evictLowestPriorityExcept(keepId: string): boolean {
    let victim: WorldPartitionCell | null = null
    for (const c of this.cells.values()) {
      if (c.cellId === keepId || c.state !== 'resident') continue
      if (!victim || c.streamingPriority > victim.streamingPriority) {
        victim = c
      }
    }
    if (!victim) return false
    return this.unloadCell(victim.cellId)
  }
}

export function cellIdFromGrid(ix: number, iz: number): string {
  return `cell_${ix}_${iz}`
}

export function boundsForGridCell(
  ix: number,
  iz: number,
  cellSize: number,
): [number, number, number, number] {
  const xmin = ix * cellSize
  const zmin = iz * cellSize
  return [xmin, zmin, xmin + cellSize, zmin + cellSize]
}
