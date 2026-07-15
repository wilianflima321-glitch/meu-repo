/**
 * Letter cg — Law XV CapScore → World Partition cell budgets.
 */

import type { PartitionStreamingConfig } from '@/lib/world-streaming/types'

export const PARTITION_CAPABILITY_BUDGET_WIRED = true as const

export function resolvePartitionStreamingConfig(
  capabilityScore: number,
  overrides: Partial<PartitionStreamingConfig> = {},
): PartitionStreamingConfig {
  const score = Number.isFinite(capabilityScore)
    ? Math.max(0, Math.min(100, Math.round(capabilityScore)))
    : 0

  let cellSize = 64
  let loadRadiusCells = 2
  let unloadRadiusCells = 3
  let maxResidentCells = 16
  let memoryBudgetBytes = 48 * 1024 * 1024

  if (score < 20) {
    cellSize = 32
    loadRadiusCells = 1
    unloadRadiusCells = 2
    maxResidentCells = 6
    memoryBudgetBytes = 16 * 1024 * 1024
  } else if (score < 45) {
    cellSize = 48
    loadRadiusCells = 2
    unloadRadiusCells = 3
    maxResidentCells = 12
    memoryBudgetBytes = 32 * 1024 * 1024
  } else if (score >= 75) {
    cellSize = 128
    loadRadiusCells = 4
    unloadRadiusCells = 6
    maxResidentCells = 48
    memoryBudgetBytes = 256 * 1024 * 1024
  }

  return {
    cellSize,
    loadRadiusCells,
    unloadRadiusCells,
    maxResidentCells,
    memoryBudgetBytes,
    capabilityScore: score,
    ...overrides,
  }
}
