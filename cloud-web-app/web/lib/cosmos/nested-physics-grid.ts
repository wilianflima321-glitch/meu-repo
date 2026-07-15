/**
 * Letter cn — Nested Physics Grids (ship-interior island vs exterior absolute).
 * Isolates local players from Mach hull motion — Star Citizen / UE nested grids pattern.
 */

import type { CosmosPhysicsSpace, LwcVec3 } from '@/lib/cosmos/types'

export const COSMOS_NESTED_PHYSICS_GRID_WIRED = true as const

export interface NestedPhysicsGrid {
  id: string
  /** Parent exterior absolute transform origin (LWC). */
  hullOrigin: LwcVec3
  /** Local island space for interiors (relative to hull). */
  islandOrigin: LwcVec3
  /** Hull linear velocity absolute (m/s) — not applied to island locals. */
  hullVelocity: LwcVec3
  /** Bodies currently in island space. */
  islandBodyIds: Set<string>
}

export interface NestedGridLocalPose {
  gridId: string
  space: CosmosPhysicsSpace
  /** Position in active space (island-local or absolute). */
  x: number
  y: number
  z: number
}

const grids = new Map<string, NestedPhysicsGrid>()

export function clearNestedPhysicsGrids(): void {
  grids.clear()
}

export function createNestedPhysicsGrid(input: {
  id: string
  hullOrigin: LwcVec3
  islandOrigin?: LwcVec3
}): NestedPhysicsGrid {
  const grid: NestedPhysicsGrid = {
    id: input.id,
    hullOrigin: { ...input.hullOrigin },
    islandOrigin: input.islandOrigin ? { ...input.islandOrigin } : { x: 0, y: 0, z: 0 },
    hullVelocity: { x: 0, y: 0, z: 0 },
    islandBodyIds: new Set(),
  }
  grids.set(grid.id, grid)
  return grid
}

export function setHullMotion(
  gridId: string,
  origin: LwcVec3,
  velocity: LwcVec3,
): boolean {
  const g = grids.get(gridId)
  if (!g) return false
  g.hullOrigin = { ...origin }
  g.hullVelocity = { ...velocity }
  return true
}

export function enterIsland(gridId: string, bodyId: string): boolean {
  const g = grids.get(gridId)
  if (!g) return false
  g.islandBodyIds.add(bodyId)
  return true
}

export function exitIsland(gridId: string, bodyId: string): boolean {
  const g = grids.get(gridId)
  if (!g) return false
  return g.islandBodyIds.delete(bodyId)
}

export function isIslandBody(gridId: string, bodyId: string): boolean {
  return grids.get(gridId)?.islandBodyIds.has(bodyId) === true
}

/**
 * Resolve effective velocity for a body.
 * Island locals see zero hull velocity (isolated from Mach motion).
 */
export function resolveBodyVelocity(input: {
  gridId: string
  bodyId: string
  localVelocity: LwcVec3
}): LwcVec3 {
  const g = grids.get(input.gridId)
  if (!g) return { ...input.localVelocity }
  if (g.islandBodyIds.has(input.bodyId)) {
    // Interior island — hull Mach velocity NOT added.
    return { ...input.localVelocity }
  }
  return {
    x: input.localVelocity.x + g.hullVelocity.x,
    y: input.localVelocity.y + g.hullVelocity.y,
    z: input.localVelocity.z + g.hullVelocity.z,
  }
}

/**
 * Convert island-local pose → absolute LWC (for exterior handoff).
 */
export function islandLocalToAbsolute(
  gridId: string,
  local: LwcVec3,
): LwcVec3 | null {
  const g = grids.get(gridId)
  if (!g) return null
  return {
    x: g.hullOrigin.x + g.islandOrigin.x + local.x,
    y: g.hullOrigin.y + g.islandOrigin.y + local.y,
    z: g.hullOrigin.z + g.islandOrigin.z + local.z,
  }
}

export function proveNestedPhysicsGrid(): {
  passed: boolean
  islandIsolatedFromHull: boolean
  exteriorInheritsHull: boolean
  notes: string[]
} {
  clearNestedPhysicsGrids()
  createNestedPhysicsGrid({
    id: 'ship-a',
    hullOrigin: { x: 1e9, y: 0, z: 0 },
  })
  setHullMotion('ship-a', { x: 1e9, y: 0, z: 0 }, { x: 8_000, y: 0, z: 0 }) // Mach-ish
  enterIsland('ship-a', 'mug')
  const islandVel = resolveBodyVelocity({
    gridId: 'ship-a',
    bodyId: 'mug',
    localVelocity: { x: 0.1, y: 0, z: 0 },
  })
  const exteriorVel = resolveBodyVelocity({
    gridId: 'ship-a',
    bodyId: 'drone',
    localVelocity: { x: 0.1, y: 0, z: 0 },
  })
  const islandIsolatedFromHull =
    Math.abs(islandVel.x - 0.1) < 1e-9 && Math.abs(islandVel.x) < 1
  const exteriorInheritsHull = Math.abs(exteriorVel.x - 8000.1) < 1e-6
  clearNestedPhysicsGrids()
  return {
    passed: islandIsolatedFromHull && exteriorInheritsHull,
    islandIsolatedFromHull,
    exteriorInheritsHull,
    notes: [
      'Nested Physics Grids CLOSED — island isolates from hull Mach velocity',
      'Live multi-Rapier-world soak / Star Citizen parity HELD',
    ],
  }
}
