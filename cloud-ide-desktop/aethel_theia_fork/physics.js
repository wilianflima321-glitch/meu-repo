// Enhanced physics utilities for scene verification
// - computeRange: vacuum range formula
// - computeRangeWithDrag: numerical integration with linear drag approximation
// - sampleTrajectory: returns sampled points for a trajectory (supports mass & drag)
// - aabbIntersects / trajectoryIntersectsAABBs: collision helpers

function toRad(deg) { return (deg * Math.PI) / 180; }

function computeRange(v0, angleDeg, g = 9.81) {
  const theta = toRad(angleDeg);
  if (typeof v0 !== 'number' || typeof angleDeg !== 'number' || g <= 0) return NaN;
  return (v0 * v0 * Math.sin(2 * theta)) / g;
}

// Numerical integration with a simple quadratic drag model: Fd = 0.5 * Cd * rho * A * v^2
// For simplicity we accept a combined drag coefficient 'k' where acceleration drag = -k * v^2 / m
function computeRangeWithDrag(v0, angleDeg, opts = {}) {
  const { g = 9.81, mass = 1, dragCoef = 0 } = opts;
  // if no drag, fallback to analytic
  if (!dragCoef || dragCoef === 0) return computeRange(v0, angleDeg, g);
  const pts = sampleTrajectory(v0, angleDeg, g, 1000, { mass, dragCoef, dt: 0.02 });
  if (!pts || pts.length === 0) return 0;
  const last = pts[pts.length - 1];
  return last.x;
}

function sampleTrajectory(v0, angleDeg, g = 9.81, steps = 100, opts = {}) {
  const theta = toRad(angleDeg);
  const mass = typeof opts.mass === 'number' ? opts.mass : 1;
  const dragCoef = typeof opts.dragCoef === 'number' ? opts.dragCoef : 0; // combined k
  const dt = typeof opts.dt === 'number' ? opts.dt : 0.05;
  const vx0 = v0 * Math.cos(theta);
  let vx = vx0;
  let vy = v0 * Math.sin(theta);
  let x = 0;
  let y = 0;
  const points = [];
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    // drag acceleration approx: a_drag_x = -k * v * vx / m ; a_drag_y = -k * v * vy / m
    const v = Math.sqrt(vx * vx + vy * vy) || 0;
    const a_drag_x = dragCoef && v > 0 ? (-dragCoef * v * vx) / mass : 0;
    const a_drag_y = dragCoef && v > 0 ? (-dragCoef * v * vy) / mass : 0;
    // integrate velocities
    vx = vx + a_drag_x * dt;
    vy = vy + (-g + a_drag_y) * dt;
    x = x + vx * dt;
    y = y + vy * dt;
    points.push({ t, x, y, vx, vy });
    if (y < 0) break; // hit ground
  }
  return points;

}

function aabbIntersects(a, b) {
  // a and b: { x, y, z, w, h, d } treated as min corner
  const ax1 = a.x || 0, ay1 = a.y || 0, az1 = a.z || 0;
  const ax2 = (a.x || 0) + (a.w || 0), ay2 = (a.y || 0) + (a.h || 0), az2 = (a.z || 0) + (a.d || 0);
  const bx1 = b.x || 0, by1 = b.y || 0, bz1 = b.z || 0;
  const bx2 = (b.x || 0) + (b.w || 0), by2 = (b.y || 0) + (b.h || 0), bz2 = (b.z || 0) + (b.d || 0);
  return !(ax2 < bx1 || ax1 > bx2 || ay2 < by1 || ay1 > by2 || az2 < bz1 || az1 > bz2);
}

function trajectoryIntersectsAABBs(trajPoints, aabbs) {
  if (!Array.isArray(trajPoints) || !Array.isArray(aabbs)) return false;
  for (const p of trajPoints) {
    const px = p.x || 0;
    const py = p.y || 0;
    const pz = 0; // 2D for now
    for (const box of aabbs) {
      // treat box as ground-aligned 2D rectangle on x/y
      const b = Object.assign({ z: 0, d: 1 }, box);
      // simple point-in-rect check
      const bx1 = b.x || 0, by1 = b.y || 0;
      const bx2 = bx1 + (b.w || 0), by2 = by1 + (b.h || 0);
      if (px >= bx1 && px <= bx2 && py >= by1 && py <= by2) return true;
    }
  }
  return false;
}

module.exports = { computeRange, computeRangeWithDrag, sampleTrajectory, aabbIntersects, trajectoryIntersectsAABBs };
