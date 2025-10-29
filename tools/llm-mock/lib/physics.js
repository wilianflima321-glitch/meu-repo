// Minimal physics utilities for scene verification
// Provides simple ballistic computations and AABB intersection helpers.

function toRad(deg) { return (deg * Math.PI) / 180; }

function computeRange(v0, angleDeg, g = 9.81) {
  const theta = toRad(angleDeg);
  // R = v0^2 * sin(2*theta) / g
  if (typeof v0 !== 'number' || typeof angleDeg !== 'number' || g <= 0) return NaN;
  return (v0 * v0 * Math.sin(2 * theta)) / g;
}

function sampleTrajectory(v0, angleDeg, g = 9.81, steps = 10) {
  const theta = toRad(angleDeg);
  const vx = v0 * Math.cos(theta);
  const vy = v0 * Math.sin(theta);
  const dt = 0.1; // time step approx
  const points = [];
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    const x = vx * t;
    const y = vy * t - 0.5 * g * t * t;
    points.push({ t, x, y });
    if (y < 0) break; // hit ground
  }
  return points;
}

function aabbIntersects(a, b) {
  // a and b: { x, y, z, w, h, d } with x,y,z at center or min? We'll treat as min corner
  const ax1 = a.x, ay1 = a.y, az1 = a.z;
  const ax2 = a.x + a.w, ay2 = a.y + a.h, az2 = a.z + a.d;
  const bx1 = b.x, by1 = b.y, bz1 = b.z;
  const bx2 = b.x + b.w, by2 = b.y + b.h, bz2 = b.z + b.d;
  return !(ax2 < bx1 || ax1 > bx2 || ay2 < by1 || ay1 > by2 || az2 < bz1 || az1 > bz2);
}

module.exports = { computeRange, sampleTrajectory, aabbIntersects };
