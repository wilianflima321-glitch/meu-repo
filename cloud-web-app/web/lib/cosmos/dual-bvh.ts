/**
 * Letter cn — Dual-Space BVH for Radiance (solar coarse + 1km player fine).
 * Avoids one giant BVH at system scale.
 */

export const COSMOS_DUAL_BVH_WIRED = true as const

export type DualBvhSpace = 'coarse-solar' | 'fine-player'

export interface DualBvhAabb {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
}

export interface DualBvhLeaf {
  id: string
  space: DualBvhSpace
  aabb: DualBvhAabb
  /** Triangle / primitive count (budget signal). */
  primCount: number
}

export interface DualBvhTree {
  space: DualBvhSpace
  leaves: DualBvhLeaf[]
  /** Root AABB. */
  root: DualBvhAabb
  leafCount: number
}

export interface DualSpaceBvhPair {
  coarse: DualBvhTree
  fine: DualBvhTree
  /** Fine radius used (meters). */
  fineRadiusM: number
}

function emptyAabb(): DualBvhAabb {
  return {
    minX: Infinity,
    minY: Infinity,
    minZ: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    maxZ: -Infinity,
  }
}

function expand(a: DualBvhAabb, b: DualBvhAabb): DualBvhAabb {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    minZ: Math.min(a.minZ, b.minZ),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
    maxZ: Math.max(a.maxZ, b.maxZ),
  }
}

function aabbFromCenter(
  cx: number,
  cy: number,
  cz: number,
  hx: number,
  hy: number,
  hz: number,
): DualBvhAabb {
  return {
    minX: cx - hx,
    minY: cy - hy,
    minZ: cz - hz,
    maxX: cx + hx,
    maxY: cy + hy,
    maxZ: cz + hz,
  }
}

function pointInAabb(x: number, y: number, z: number, a: DualBvhAabb): boolean {
  return (
    x >= a.minX &&
    x <= a.maxX &&
    y >= a.minY &&
    y <= a.maxY &&
    z >= a.minZ &&
    z <= a.maxZ
  )
}

/**
 * Build dual BVH: coarse for solar-system bodies, fine for player 1km cluster.
 */
export function buildDualSpaceBvh(input: {
  solarBodies: Array<{ id: string; x: number; y: number; z: number; radiusM: number; primCount?: number }>
  localMeshes: Array<{ id: string; x: number; y: number; z: number; halfExtentM: number; primCount?: number }>
  playerX: number
  playerY: number
  playerZ: number
  fineRadiusM?: number
}): DualSpaceBvhPair {
  const fineRadiusM = input.fineRadiusM ?? 1000
  const coarseLeaves: DualBvhLeaf[] = input.solarBodies.map((b) => ({
    id: b.id,
    space: 'coarse-solar' as const,
    aabb: aabbFromCenter(b.x, b.y, b.z, b.radiusM, b.radiusM, b.radiusM),
    primCount: b.primCount ?? 1,
  }))
  let coarseRoot = emptyAabb()
  for (const leaf of coarseLeaves) {
    coarseRoot = expand(coarseRoot, leaf.aabb)
  }
  if (coarseLeaves.length === 0) {
    coarseRoot = aabbFromCenter(0, 0, 0, 1, 1, 1)
  }

  const fineLeaves: DualBvhLeaf[] = []
  for (const m of input.localMeshes) {
    const dx = m.x - input.playerX
    const dy = m.y - input.playerY
    const dz = m.z - input.playerZ
    if (dx * dx + dy * dy + dz * dz > fineRadiusM * fineRadiusM) continue
    fineLeaves.push({
      id: m.id,
      space: 'fine-player',
      aabb: aabbFromCenter(m.x, m.y, m.z, m.halfExtentM, m.halfExtentM, m.halfExtentM),
      primCount: m.primCount ?? 12,
    })
  }
  let fineRoot = emptyAabb()
  for (const leaf of fineLeaves) {
    fineRoot = expand(fineRoot, leaf.aabb)
  }
  if (fineLeaves.length === 0) {
    fineRoot = aabbFromCenter(input.playerX, input.playerY, input.playerZ, fineRadiusM, fineRadiusM, fineRadiusM)
  }

  return {
    coarse: {
      space: 'coarse-solar',
      leaves: coarseLeaves,
      root: coarseRoot,
      leafCount: coarseLeaves.length,
    },
    fine: {
      space: 'fine-player',
      leaves: fineLeaves,
      root: fineRoot,
      leafCount: fineLeaves.length,
    },
    fineRadiusM,
  }
}

/** Query which space a ray origin prefers for Radiance first bounce. */
export function selectBvhSpaceForRay(
  pair: DualSpaceBvhPair,
  ox: number,
  oy: number,
  oz: number,
): DualBvhSpace {
  if (pointInAabb(ox, oy, oz, pair.fine.root) && pair.fine.leafCount > 0) {
    return 'fine-player'
  }
  return 'coarse-solar'
}

export function proveDualSpaceBvh(): {
  passed: boolean
  coarseHasSolar: boolean
  fineCullsDistant: boolean
  notes: string[]
} {
  const pair = buildDualSpaceBvh({
    solarBodies: [
      { id: 'sun', x: 0, y: 0, z: 0, radiusM: 7e8 },
      { id: 'earth', x: 1.5e11, y: 0, z: 0, radiusM: 6.3e6 },
    ],
    localMeshes: [
      { id: 'asteroid-near', x: 10, y: 0, z: 0, halfExtentM: 5, primCount: 48 },
      { id: 'asteroid-far', x: 50_000, y: 0, z: 0, halfExtentM: 5, primCount: 48 },
    ],
    playerX: 0,
    playerY: 0,
    playerZ: 0,
    fineRadiusM: 1000,
  })
  const coarseHasSolar = pair.coarse.leafCount === 2
  const fineCullsDistant =
    pair.fine.leafCount === 1 && pair.fine.leaves[0]?.id === 'asteroid-near'
  const space = selectBvhSpaceForRay(pair, 5, 0, 0)
  return {
    passed: coarseHasSolar && fineCullsDistant && space === 'fine-player',
    coarseHasSolar,
    fineCullsDistant,
    notes: [
      'Dual-Space BVH CLOSED — solar coarse + 1km fine for Radiance',
      'HW RT / full Radiance GI at AU scale HELD',
    ],
  }
}
