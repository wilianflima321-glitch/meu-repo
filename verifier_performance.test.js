const verifier = require('./verifier');

describe('verifier.js performance optimizations', () => {
  test('pre-compiled regex patterns work correctly', () => {
    const scene = {
      description: 'time travel back in time',
      dialogue: 'I want to die',
      entities: []
    };
    
    const errors = verifier.verifyScene(scene, ['chronology_checks', 'self_harm_phrase']);
    
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.reason === 'time_anomaly')).toBe(true);
    expect(errors.some(e => e.reason === 'self_harm_phrase')).toBe(true);
  });

  test('combined entity checks work correctly', () => {
    const scene = {
      entities: [
        { id: 1, holding: 'weapon' },
        { id: 2, properties: { smoke: true } },
        { id: 3, action: 'kill someone' },
        { id: 4, text: 'suicide note' },
        { id: 5, properties: { nudity: true } }
      ]
    };
    
    const errors = verifier.verifyScene(scene, [
      'no_weapons', 
      'no_smoke', 
      'no_violence', 
      'no_self_harm', 
      'no_nudity'
    ]);
    
    expect(errors.length).toBe(5);
    expect(errors.some(e => e.reason === 'weapon_present')).toBe(true);
    expect(errors.some(e => e.reason === 'smoke_present')).toBe(true);
    expect(errors.some(e => e.reason === 'violent_action')).toBe(true);
    expect(errors.some(e => e.reason === 'self_harm_content')).toBe(true);
    expect(errors.some(e => e.reason === 'nudity_present')).toBe(true);
  });

  test('entity Map optimization works for physics checks', () => {
    const scene = {
      entities: [
        { id: 'actor1', powers: { isMagic: true } },
        { id: 'actor2' }
      ],
      actions: [
        {
          verb: 'throw',
          actorId: 'actor1',
          params: { v0: 10, angleDeg: 45, targetDistance: 100 }
        },
        {
          verb: 'throw',
          actorId: 'actor2',
          params: { v0: 10, angleDeg: 45, targetDistance: 100 }
        }
      ]
    };
    
    const errors = verifier.verifyScene(scene, ['physics_checks']);
    
    // Actor1 has magic, should get fantasy_exception
    // Actor2 doesn't have magic, should get trajectory_impossible
    expect(errors.length).toBe(2);
    expect(errors.some(e => e.reason === 'fantasy_exception')).toBe(true);
    expect(errors.some(e => e.reason === 'trajectory_impossible')).toBe(true);
  });

  test('combined checks with no matching constraints returns no errors', () => {
    const scene = {
      entities: [
        { id: 1, holding: 'weapon' },
        { id: 2, properties: { smoke: true } }
      ]
    };
    
    // Use constraints that don't match the entity properties
    const errors = verifier.verifyScene(scene, ['no_nudity', 'no_drugs']);
    
    expect(errors.length).toBe(0);
  });

  test('early continue optimization in physics checks', () => {
    const scene = {
      entities: [{ id: 'actor1' }],
      actions: [
        { verb: 'walk', actorId: 'actor1' },  // Should be skipped
        { verb: 'run', actorId: 'actor1' },   // Should be skipped
        { verb: 'throw', actorId: 'actor1', params: { v0: 10, angleDeg: 45, targetDistance: 100 } }
      ]
    };
    
    const errors = verifier.verifyScene(scene, ['physics_checks']);
    
    // Only the throw action should be checked
    expect(errors.length).toBe(1);
    expect(errors[0].reason).toBe('trajectory_impossible');
  });

  test('relations and pose checks in combined function', () => {
    const scene = {
      entities: [
        { id: 1, role: 'vehicle', properties: { isHuman: true } },
        { id: 2, role: 'child', properties: { operatesHeavyMachinery: true } },
        { id: 3, properties: { pose: 'levitating' } }
      ]
    };
    
    const errors = verifier.verifyScene(scene, ['relations', 'pose']);
    
    expect(errors.length).toBe(3);
    expect(errors.some(e => e.reason === 'relation_inconsistent')).toBe(true);
    expect(errors.some(e => e.reason === 'child_operates_heavy_machinery')).toBe(true);
    expect(errors.some(e => e.reason === 'pose_impossible')).toBe(true);
  });

  test('drug checks with combined patterns', () => {
    const scene = {
      description: 'how to make meth and use cocaine'
    };
    
    const errors = verifier.verifyScene(scene, ['drug_checks']);
    
    expect(errors.length).toBe(2);
    expect(errors.some(e => e.reason === 'drug_instruction')).toBe(true);
    expect(errors.some(e => e.reason === 'drug_use')).toBe(true);
  });

  test('child safety checks', () => {
    const scene = {
      description: 'a child plays with a gun'
    };
    
    const errors = verifier.verifyScene(scene, ['child_safety']);
    
    expect(errors.length).toBe(1);
    expect(errors[0].reason).toBe('child_endangerment');
  });
});
