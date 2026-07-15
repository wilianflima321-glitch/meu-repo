const { verifyScene } = require('../lib/verifier');

describe('verifier additional deterministic checks', () => {
  test('chronology: birthYear > deathYear -> chronology_error', () => {
    const scene = { entities: [{ id: 'e1', properties: { birthYear: 2000, deathYear: 1990 } }] };
    const errors = verifyScene(scene, ['chronology']);
    expect(errors.some(e => e.reason === 'chronology_error')).toBeTruthy();
  });

  test('time anomaly: timestamp far in future -> time_anomaly', () => {
    const future = Date.now() + (48 * 3600 * 1000); // 48 hours ahead
    const scene = { entities: [{ id: 'e2', timestamp: future }] };
    const errors = verifyScene(scene, ['no_time_anomaly']);
    expect(errors.some(e => e.reason === 'time_anomaly')).toBeTruthy();
  });

  test('self-harm phrasing detection via self_harm_phrase', () => {
    const scene = { dialogue: 'I want to die, I cannot go on' };
    const errors = verifyScene(scene, ['self_harm_phrase']);
    expect(errors.some(e => e.reason === 'self_harm_phrase')).toBeTruthy();
  });

  test('drug instruction and use detection via drug_checks', () => {
    const scene1 = { description: 'how to make meth in the basement' };
  const scene2 = { description: 'He will use fentanyl and inject it' };
    const e1 = verifyScene(scene1, ['drug_checks']);
    const e2 = verifyScene(scene2, ['drug_checks']);
    expect(e1.some(x => x.reason === 'drug_instruction')).toBeTruthy();
    expect(e2.some(x => x.reason === 'drug_use')).toBeTruthy();
  });

  test('child safety: child near chainsaw -> child_endangerment', () => {
    const scene = { description: 'A child playing next to a chainsaw', entities: [] };
    const errors = verifyScene(scene, ['child_safety']);
    expect(errors.some(e => e.reason === 'child_endangerment')).toBeTruthy();
  });

  test('physics: impossible trajectory flagged', () => {
    const scene = {
      worldRules: { gravity: 9.81 },
      entities: [{ id: 'actor-1' }],
      actions: [{ actorId: 'actor-1', verb: 'throw', params: { v0: 1, angleDeg: 20, targetDistance: 100 } }]
    };
    const errors = verifyScene(scene, ['physics_checks']);
    expect(errors.some(e => e.reason === 'trajectory_impossible' || e.reason === 'fantasy_exception')).toBeTruthy();
  });
});
