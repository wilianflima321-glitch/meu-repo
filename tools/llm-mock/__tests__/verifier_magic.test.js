const { verifyScene } = require('../lib/verifier');

describe('verifier magic exceptions', () => {
  test('trajectory impossible becomes fantasy_exception when actor is magic', () => {
    const scene = {
      worldRules: { gravity: 9.81 },
      entities: [
        { id: 'hero-1', powers: { isMagic: true, magicCost: 10 } }
      ],
      actions: [
        { actorId: 'hero-1', verb: 'throw', params: { v0: 1, angleDeg: 20, targetDistance: 50 } }
      ]
    };
    const errs = verifyScene(scene, ['physics_checks']);
    expect(errs.some(e => e.reason === 'fantasy_exception')).toBe(true);
  });

  test('trajectory impossible becomes trajectory_impossible when actor is normal', () => {
    const scene = {
      worldRules: { gravity: 9.81 },
      entities: [
        { id: 'npc-1' }
      ],
      actions: [
        { actorId: 'npc-1', verb: 'throw', params: { v0: 1, angleDeg: 20, targetDistance: 50 } }
      ]
    };
    const errs = verifyScene(scene, ['physics_checks']);
    expect(errs.some(e => e.reason === 'trajectory_impossible')).toBe(true);
  });
});
