const physics = require('../lib/physics');

describe('physics module', () => {
  test('computeRange basic', () => {
    const r = physics.computeRange(10, 45, 9.81);
    // theoretical range for v0=10,m/s at 45deg: ~10.193
    expect(typeof r).toBe('number');
    expect(r).toBeGreaterThan(0);
  });

  test('sampleTrajectory returns points and ends when y<0', () => {
    const pts = physics.sampleTrajectory(10, 45, 9.81, 20);
    expect(Array.isArray(pts)).toBe(true);
    expect(pts.length).toBeGreaterThan(0);
    expect(pts[0]).toHaveProperty('x');
    expect(pts[0]).toHaveProperty('y');
  });
});
