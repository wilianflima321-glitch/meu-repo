const physics = require('./physics');

describe('physics.js performance optimizations', () => {
  test('sampleTrajectory optimizations maintain correctness', () => {
    const v0 = 20;
    const angle = 45;
    const g = 9.81;
    
    const withDrag = physics.sampleTrajectory(v0, angle, g, 500, { 
      mass: 1, 
      dragCoef: 0.5, 
      dt: 0.02 
    });
    
    const noDrag = physics.sampleTrajectory(v0, angle, g, 500, { 
      mass: 1, 
      dragCoef: 0, 
      dt: 0.02 
    });
    
    expect(withDrag.length).toBeGreaterThan(0);
    expect(noDrag.length).toBeGreaterThan(0);
    
    // With drag should have shorter range
    const withDragRange = withDrag[withDrag.length - 1].x;
    const noDragRange = noDrag[noDrag.length - 1].x;
    expect(withDragRange).toBeLessThan(noDragRange);
    
    // All points should have y <= 0 at end (hit ground)
    expect(withDrag[withDrag.length - 1].y).toBeLessThanOrEqual(0);
    expect(noDrag[noDrag.length - 1].y).toBeLessThanOrEqual(0);
  });

  test('computeRangeWithDrag falls back to analytic when no drag', () => {
    const v0 = 25;
    const angle = 30;
    const g = 9.81;
    
    const analyticRange = physics.computeRange(v0, angle, g);
    const noDragRange = physics.computeRangeWithDrag(v0, angle, { g, mass: 1, dragCoef: 0 });
    
    // Should be equal when dragCoef = 0
    expect(noDragRange).toBeCloseTo(analyticRange, 5);
  });

  test('trajectoryIntersectsAABBs early exit on empty obstacles', () => {
    const trajectory = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1.5 },
      { x: 3, y: 1 },
      { x: 4, y: 0 }
    ];
    
    // Empty obstacles array should return false immediately
    const result = physics.trajectoryIntersectsAABBs(trajectory, []);
    expect(result).toBe(false);
  });

  test('trajectoryIntersectsAABBs early exit on first collision', () => {
    const trajectory = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1.5 },
      { x: 3, y: 1 },
      { x: 4, y: 0 }
    ];
    
    const obstacles = [
      { x: 1.5, y: 0.5, w: 1, h: 1 },  // Should collide at x=2
      { x: 10, y: 10, w: 1, h: 1 }     // This shouldn't even be checked
    ];
    
    const result = physics.trajectoryIntersectsAABBs(trajectory, obstacles);
    expect(result).toBe(true);
  });

  test('trajectoryIntersectsAABBs handles no collision', () => {
    const trajectory = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1.5 }
    ];
    
    const obstacles = [
      { x: 5, y: 5, w: 1, h: 1 }  // Far away
    ];
    
    const result = physics.trajectoryIntersectsAABBs(trajectory, obstacles);
    expect(result).toBe(false);
  });

  test('aabbIntersects basic collision detection', () => {
    const box1 = { x: 0, y: 0, z: 0, w: 2, h: 2, d: 2 };
    const box2 = { x: 1, y: 1, z: 1, w: 2, h: 2, d: 2 };
    
    const result = physics.aabbIntersects(box1, box2);
    expect(result).toBe(true);
  });

  test('aabbIntersects no collision', () => {
    const box1 = { x: 0, y: 0, z: 0, w: 1, h: 1, d: 1 };
    const box2 = { x: 5, y: 5, z: 5, w: 1, h: 1, d: 1 };
    
    const result = physics.aabbIntersects(box1, box2);
    expect(result).toBe(false);
  });

  test('sampleTrajectory with zero drag coefficient', () => {
    const v0 = 15;
    const angle = 60;
    
    const trajectory = physics.sampleTrajectory(v0, angle, 9.81, 100, { 
      mass: 1, 
      dragCoef: 0,
      dt: 0.05 
    });
    
    expect(trajectory.length).toBeGreaterThan(0);
    expect(trajectory[trajectory.length - 1].y).toBeLessThanOrEqual(0);
  });

  test('computeRange handles edge cases', () => {
    // Zero velocity
    expect(physics.computeRange(0, 45, 9.81)).toBe(0);
    
    // 90 degree angle (straight up)
    expect(physics.computeRange(10, 90, 9.81)).toBeCloseTo(0, 5);
    
    // Invalid gravity
    expect(physics.computeRange(10, 45, 0)).toBeNaN();
    expect(physics.computeRange(10, 45, -1)).toBeNaN();
  });
});
