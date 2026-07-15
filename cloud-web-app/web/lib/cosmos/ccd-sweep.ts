/**
 * Letter cn — CCD / Swept volumes — hypervelocity never tunnels through asteroids.
 */

export const COSMOS_CCD_SWEEP_WIRED = true as const

export interface SweepSphere {
  id: string
  x: number
  y: number
  z: number
  radius: number
  vx: number
  vy: number
  vz: number
}

export interface SweepObstacle {
  id: string
  x: number
  y: number
  z: number
  radius: number
}

export interface SweepHit {
  obstacleId: string
  /** Time of impact in [0,1] of the step. */
  t: number
  /** Impact point. */
  x: number
  y: number
  z: number
}

/**
 * Sphere vs sphere continuous collision along linear motion for dt.
 * Returns earliest hit or null.
 */
export function sweepSphereVsSpheres(
  mover: SweepSphere,
  obstacles: SweepObstacle[],
  dt: number,
): SweepHit | null {
  const dx = mover.vx * dt
  const dy = mover.vy * dt
  const dz = mover.vz * dt
  let best: SweepHit | null = null

  for (const o of obstacles) {
    const r = mover.radius + o.radius
    // Relative start
    const ox = mover.x - o.x
    const oy = mover.y - o.y
    const oz = mover.z - o.z
    // Quadratic: |p + t*d|^2 = r^2
    const a = dx * dx + dy * dy + dz * dz
    const b = 2 * (ox * dx + oy * dy + oz * dz)
    const c = ox * ox + oy * oy + oz * oz - r * r
    if (a < 1e-20) {
      if (c <= 0) {
        const hit: SweepHit = { obstacleId: o.id, t: 0, x: mover.x, y: mover.y, z: mover.z }
        if (!best || hit.t < best.t) best = hit
      }
      continue
    }
    const disc = b * b - 4 * a * c
    if (disc < 0) continue
    const sqrt = Math.sqrt(disc)
    const t0 = (-b - sqrt) / (2 * a)
    const t1 = (-b + sqrt) / (2 * a)
    const t = t0 >= 0 && t0 <= 1 ? t0 : t1 >= 0 && t1 <= 1 ? t1 : -1
    if (t < 0) continue
    const hit: SweepHit = {
      obstacleId: o.id,
      t,
      x: mover.x + dx * t,
      y: mover.y + dy * t,
      z: mover.z + dz * t,
    }
    if (!best || hit.t < best.t) best = hit
  }
  return best
}

/**
 * Plan CCD enable for a body given speed and CapScore budget.
 */
export function planCcdForBody(input: {
  speedMps: number
  radiusM: number
  capabilityScore: number
  ccdBodiesUsed: number
  ccdBodiesMax: number
}): { ccdEnabled: boolean; reason: string } {
  if (input.ccdBodiesUsed >= input.ccdBodiesMax) {
    return { ccdEnabled: false, reason: 'ccd-budget-exhausted' }
  }
  // Tunnel risk when travel per frame > radius (60Hz).
  const travel = input.speedMps / 60
  const needsCcd = travel > input.radiusM * 0.5
  if (!needsCcd) return { ccdEnabled: false, reason: 'subcritical-speed' }
  if (input.capabilityScore < 20 && input.speedMps > 5_000) {
    // GT730: still enable for hypervelocity (safety > beauty).
    return { ccdEnabled: true, reason: 'hypervelocity-gt730-safety' }
  }
  return { ccdEnabled: true, reason: 'hypervelocity' }
}

export function proveCcdSweep(): {
  passed: boolean
  tunnelingCaught: boolean
  discreteWouldMiss: boolean
  notes: string[]
} {
  const mover: SweepSphere = {
    id: 'railgun',
    x: 0,
    y: 0,
    z: 0,
    radius: 0.5,
    vx: 12_000, // 12 km/s
    vy: 0,
    vz: 0,
  }
  const rock: SweepObstacle = { id: 'asteroid', x: 100, y: 0, z: 0, radius: 20 }
  const hit = sweepSphereVsSpheres(mover, [rock], 1 / 60)
  // Discrete check at end of frame would be at x=200 — past the rock center+radii.
  const endX = mover.x + mover.vx / 60
  const discreteWouldMiss =
    Math.abs(endX - rock.x) > mover.radius + rock.radius
  const tunnelingCaught = hit !== null && hit.obstacleId === 'asteroid' && hit.t < 1
  return {
    passed: tunnelingCaught && discreteWouldMiss,
    tunnelingCaught,
    discreteWouldMiss,
    notes: [
      'CCD / swept volumes CLOSED — hypervelocity sphere sweep',
      'Rapier enableCcd body soak at fleet scale HELD',
    ],
  }
}
