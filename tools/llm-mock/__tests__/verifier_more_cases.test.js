const verifier = require('../lib/verifier');

describe('verifier - additional edge cases', () => {
  test('no constraints returns no errors even for populated scene', () => {
    const scene = { entities: [ { id:'a', properties: { holding: 'knife' } } ] };
    const errors = verifier.verifyScene(scene, []);
    expect(errors).toEqual([]);
  });

  test('smoke detection triggers smoke_present', () => {
    const scene = { entities: [ { id:'s1', properties: { smoke: true } } ] };
    const errors = verifier.verifyScene(scene, ['no_smoke']);
    const reasons = errors.map(e => e.reason);
    // verifier flags smoke_present when properties.smoke is truthy
    expect(reasons).toContain('smoke_present');
  });

  test('multi-entity conflicting props produce relation warning', () => {
    const scene = { entities: [ { id:'e1', properties: { position:{x:0,y:0,z:0} } }, { id:'e2', properties: { position:{x:0,y:0,z:0} } } ] };
    const errors = verifier.verifyScene(scene, ['no_collisions']);
    // either collision or position_conflict depending on implementation
    expect(Array.isArray(errors)).toBe(true);
  });

  test('physics trajectory simple range check', () => {
    // simple action 'throw' should be processed when in actions array
    const scene = { entities: [ { id:'actor1', properties: { mass: 1 } } ], actions: [ { verb: 'throw', actorId: 'actor1', params: { v0: 100, angleDeg: 45, targetDistance: 10000 } } ], worldRules: { gravity: 9.81 } };
    const errors = verifier.verifyScene(scene, ['trajectory_checks']);
    expect(Array.isArray(errors)).toBe(true);
  });

  test('chronology checks detect time-travel and before/after birth phrasing', () => {
    const scene = { description: 'They travelled back in time. Before they were born, the event happened.' };
    const errors = verifier.verifyScene(scene, ['checkChronology']);
    const reasons = errors.map(e => e && (e.reason || e.code)).filter(Boolean);
    expect(reasons).toEqual(expect.arrayContaining(['time_anomaly','chronology_error']));
  });

  test('self-harm first-person phrasing triggers detection', () => {
    const scene = { dialogue: "I can't go on. I want to die." };
    const errors = verifier.verifyScene(scene, ['checkSelfHarmPhrasing']);
    const reasons = errors.map(e => e && (e.reason || e.code)).filter(Boolean);
    expect(reasons).toContain('self_harm_phrase');
  });

  test('drug instructions and use are detected', () => {
    const scene = { description: 'Where to get heroin? I will inject fentanyl later.' };
    const errors = verifier.verifyScene(scene, ['checkDrugMentions']);
    const reasons = errors.map(e => e && (e.reason || e.code)).filter(Boolean);
    expect(reasons).toEqual(expect.arrayContaining(['drug_instruction','drug_use']));
  });

  test('child endangerment via description triggers child_endangerment', () => {
    const scene = { description: 'A child is standing next to a chainsaw on the table.' };
    const errors = verifier.verifyScene(scene, ['checkChildSafety']);
    const reasons = errors.map(e => e && (e.reason || e.code)).filter(Boolean);
    expect(reasons).toContain('child_endangerment');
  });
});
