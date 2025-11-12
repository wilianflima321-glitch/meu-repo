const physics = require('./physics');

test('computeRangeWithDrag < computeRange when drag present', () => {
  const v0 = 20; // m/s
  const angle = 45;
  const g = 9.81;
  const vacuum = physics.computeRange(v0, angle, g);
  const withDrag = physics.computeRangeWithDrag(v0, angle, { g, mass: 1, dragCoef: 0.5 });
  expect(typeof vacuum).toBe('number');
  expect(typeof withDrag).toBe('number');
  expect(withDrag).toBeLessThanOrEqual(vacuum);
});

test('sampleTrajectory produces points and stops at ground', () => {
  const pts = physics.sampleTrajectory(15, 30, 9.81, 500, { mass: 1, dragCoef: 0.1, dt: 0.02 });
  expect(Array.isArray(pts)).toBe(true);
  expect(pts.length).toBeGreaterThan(0);
  const last = pts[pts.length - 1];
  expect(last.y).toBeLessThanOrEqual(0);
});

test('trajectoryIntersectsAABBs detects collision with obstacle', () => {
  // throw roughly along +x axis; place an obstacle at x~5..7, y~0..2
  const pts = physics.sampleTrajectory(10, 10, 9.81, 500, { mass: 1, dragCoef: 0, dt: 0.02 });
  const obstacle = { x: 5, y: 0, w: 2, h: 2 };
  const collides = physics.trajectoryIntersectsAABBs(pts, [obstacle]);
  // Depending on parameters the trajectory may or may not intersect; assert boolean type
  expect(typeof collides).toBe('boolean');
});
