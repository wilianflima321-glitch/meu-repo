const verifier = require('../lib/verifier');

test('verifier: empty scene and empty constraints yields no errors', () => {
  const scene = { entities: [] };
  const errors = verifier.verifyScene(scene, []);
  expect(Array.isArray(errors)).toBe(true);
  expect(errors.length).toBe(0);
});

test('verifier: weapon present triggers weapon_present error', () => {
  const scene = { entities: [ { id: 'e1', properties: { holding: 'knife' } } ] };
  const errors = verifier.verifyScene(scene, ['no_weapons']);
  expect(errors.length).toBeGreaterThan(0);
  const reasons = errors.map(e => e.reason);
  expect(reasons).toContain('weapon_present');
});
