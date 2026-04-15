export type TrajectoryPoint = {
  t: number
  x: number
  y: number
  vx: number
  vy: number
}

export type PhysicsBox2D = {
  x: number
  y: number
  w: number
  h: number
}

export type PhysicsOptions = {
  g?: number
  mass?: number
  dragCoef?: number
  dt?: number
}

const toRad = (deg: number) => (deg * Math.PI) / 180

export function computeRange(v0: number, angleDeg: number, g = 9.81) {
  if (!Number.isFinite(v0) || !Number.isFinite(angleDeg) || g <= 0) return Number.NaN
  const theta = toRad(angleDeg)
  return (v0 * v0 * Math.sin(2 * theta)) / g
}

export function sampleTrajectory(
  v0: number,
  angleDeg: number,
  g = 9.81,
  steps = 100,
  opts: PhysicsOptions = {},
): TrajectoryPoint[] {
  const theta = toRad(angleDeg)
  const mass = typeof opts.mass === 'number' ? opts.mass : 1
  const dragCoef = typeof opts.dragCoef === 'number' ? opts.dragCoef : 0
  const dt = typeof opts.dt === 'number' ? opts.dt : 0.05

  let vx = v0 * Math.cos(theta)
  let vy = v0 * Math.sin(theta)
  let x = 0
  let y = 0

  const points: TrajectoryPoint[] = []
  const hasDrag = dragCoef !== 0
  const dragOverMass = hasDrag ? dragCoef / Math.max(mass, 0.001) : 0

  for (let i = 0; i < steps; i += 1) {
    const t = i * dt

    let aDragX = 0
    let aDragY = 0

    if (hasDrag) {
      const speed = Math.sqrt(vx * vx + vy * vy)
      if (speed > 0) {
        const dragFactor = -dragOverMass * speed
        aDragX = dragFactor * vx
        aDragY = dragFactor * vy
      }
    }

    vx += aDragX * dt
    vy += (-g + aDragY) * dt
    x += vx * dt
    y += vy * dt
    points.push({ t, x, y, vx, vy })

    if (y < 0) break
  }

  return points
}

export function computeRangeWithDrag(v0: number, angleDeg: number, opts: PhysicsOptions = {}) {
  const { g = 9.81, mass = 1, dragCoef = 0 } = opts
  if (!dragCoef) return computeRange(v0, angleDeg, g)
  const points = sampleTrajectory(v0, angleDeg, g, 1000, { mass, dragCoef, dt: opts.dt ?? 0.02 })
  return points.at(-1)?.x ?? 0
}

export function aabbIntersects(a: { x: number; y: number; z?: number; w: number; h: number; d?: number }, b: { x: number; y: number; z?: number; w: number; h: number; d?: number }) {
  const ax1 = a.x ?? 0
  const ay1 = a.y ?? 0
  const az1 = a.z ?? 0
  const ax2 = ax1 + (a.w ?? 0)
  const ay2 = ay1 + (a.h ?? 0)
  const az2 = az1 + (a.d ?? 0)

  const bx1 = b.x ?? 0
  const by1 = b.y ?? 0
  const bz1 = b.z ?? 0
  const bx2 = bx1 + (b.w ?? 0)
  const by2 = by1 + (b.h ?? 0)
  const bz2 = bz1 + (b.d ?? 0)

  return !(ax2 < bx1 || ax1 > bx2 || ay2 < by1 || ay1 > by2 || az2 < bz1 || az1 > bz2)
}

export function trajectoryIntersectsAABBs(trajPoints: TrajectoryPoint[], boxes: PhysicsBox2D[]) {
  if (!Array.isArray(trajPoints) || !Array.isArray(boxes) || boxes.length === 0) return false

  for (const point of trajPoints) {
    for (const box of boxes) {
      const bx1 = box.x ?? 0
      const by1 = box.y ?? 0
      const bx2 = bx1 + (box.w ?? 0)
      const by2 = by1 + (box.h ?? 0)

      if (point.x >= bx1 && point.x <= bx2 && point.y >= by1 && point.y <= by2) {
        return true
      }
    }
  }

  return false
}
