/**
 * Block 7A.5 — Visual Script port magnetism (critique #11 / IMPROVE-VS-012).
 * Pure geometry helper; ReactFlow uses connectionRadius={20} on the canvas.
 */

export const VS_PORT_SNAP_RADIUS_PX = 20

export type PortSnapPoint = {
  id: string
  x: number
  y: number
}

export type PortSnapResult = {
  snapped: boolean
  targetId: string | null
  distance: number
  point: PortSnapPoint | null
}

export function distance2d(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return Math.hypot(dx, dy)
}

/** Closest port within radius, or unsapped when none qualify. */
export function findPortSnapTarget(
  x: number,
  y: number,
  ports: readonly PortSnapPoint[],
  radius: number = VS_PORT_SNAP_RADIUS_PX,
): PortSnapResult {
  const safeRadius = Math.max(0, radius)
  let best: PortSnapPoint | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const port of ports) {
    const d = distance2d(x, y, port.x, port.y)
    if (d < bestDistance) {
      bestDistance = d
      best = port
    }
  }

  if (!best || bestDistance > safeRadius) {
    return { snapped: false, targetId: null, distance: bestDistance, point: null }
  }

  return {
    snapped: true,
    targetId: best.id,
    distance: bestDistance,
    point: best,
  }
}
