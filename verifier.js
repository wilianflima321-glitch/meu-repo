const violentTerms = ['kill','attack','shoot','murder','stab','assault'];
const selfHarmTerms = ['suicide','self-harm','kill myself','end my life'];
const drugTerms = ['cocaine','heroin','meth','fentanyl','opioid'];
const physics = require('./physics');

// Pre-compile regex patterns for better performance
const CHRONOLOGY_PATTERN = /\b(before|after) (he|she|they) (was|were) born\b/;
const TIME_TRAVEL_PATTERN = /\b(time travel|travelled back in time|went back in time|from the future)\b/;
const SELF_HARM_PHRASE_PATTERN = /\b(i want to die|i am going to kill myself|i will kill myself|i can't go on)\b/;
const DRUG_INSTRUCTION_PATTERN = /\b(buy meth|where to get heroin|how to make meth|order pills online|needle exchange)\b/;
const DRUG_SUBSTANCE_PATTERN = /\b(cocaine|heroin|methamphetamine|fentanyl)\b/;
const DRUG_ACTION_PATTERN = /\b(use|inject|smoke|snort|consume)\b/;
const CHILD_PATTERN = /\b(child|kid|toddler|baby)\b/;
const DANGER_PATTERN = /\b(fire|gun|weapon|chainsaw|dangerous|machine)\b/;

function lower(s) { return (s || '').toString().toLowerCase(); }

// Optimized: Combined entity checks to reduce loop iterations
function checkEntitiesCombined(entities, constraints, errors) {
  const needWeapons = constraints.includes('no_weapons');
  const needSmoke = constraints.includes('no_smoke');
  const needViolence = constraints.includes('no_violence');
  const needSelfHarm = constraints.includes('no_self_harm');
  const needDrugs = constraints.includes('no_drugs');
  const needNudity = constraints.includes('no_nudity');
  const needRelations = constraints.includes('no_relations_inconsistent') || constraints.includes('relations');
  const needPose = constraints.includes('no_pose_anomalies') || constraints.includes('pose');
  
  // Single pass through entities for multiple checks
  for (const e of entities) {
    // Check weapons
    if (needWeapons) {
      const holding = (e && (e.holding || (e.properties && e.properties.holding))) || null;
      if (holding && typeof holding === 'string' && lower(holding).includes('weapon')) {
        errors.push({ entityId: e.id || null, reason: 'weapon_present' });
      }
    }
    
    // Check smoke
    if (needSmoke) {
      const hasSmoke = e && (e.properties && e.properties.smoke) || false;
      if (hasSmoke) errors.push({ entityId: e.id || null, reason: 'smoke_present' });
    }
    
    // Check violence
    if (needViolence) {
      const action = (e && (e.action || (e.properties && e.properties.action))) || '';
      const actionText = lower(action);
      for (const t of violentTerms) {
        if (actionText.includes(t)) {
          errors.push({ entityId: e.id || null, reason: 'violent_action' });
          break;
        }
      }
    }
    
    // Check self-harm and drugs (reuse text extraction)
    if (needSelfHarm || needDrugs) {
      const text = lower(e && (e.text || e.action || (e.properties && e.properties.description) || ''));
      
      if (needSelfHarm) {
        for (const t of selfHarmTerms) {
          if (text.includes(t)) {
            errors.push({ entityId: e.id || null, reason: 'self_harm_content' });
            break;
          }
        }
      }
      
      if (needDrugs) {
        for (const t of drugTerms) {
          if (text.includes(t)) {
            errors.push({ entityId: e.id || null, reason: 'drug_content' });
            break;
          }
        }
      }
    }
    
    // Check nudity
    if (needNudity) {
      const hasNudity = e && (e.properties && e.properties.nudity) || false;
      if (hasNudity) errors.push({ entityId: e.id || null, reason: 'nudity_present' });
    }
    
    // Check relations
    if (needRelations) {
      try {
        if (e && e.role === 'vehicle' && e.properties && e.properties.isHuman) {
          errors.push({ entityId: e.id || null, reason: 'relation_inconsistent' });
        }
        if (e && (e.role === 'child' || (typeof e.age === 'number' && e.age < 18)) && e.properties && e.properties.operatesHeavyMachinery) {
          errors.push({ entityId: e.id || null, reason: 'child_operates_heavy_machinery' });
        }
      } catch (ex) { /* noop */ }
    }
    
    // Check pose anomalies
    if (needPose) {
      try {
        const pose = e && e.properties && e.properties.pose;
        const impossiblePoses = ['levitating', 'hovering', 'impossible_pose'];
        if (pose && typeof pose === 'string' && impossiblePoses.includes(lower(pose))) {
          errors.push({ entityId: e.id || null, reason: 'pose_impossible' });
        }
      } catch (ex) { /* noop */ }
    }
  }
}

// Keep original functions for backwards compatibility and specific constraint checks
function checkNoWeapons(entities, errors) {
  for (const e of entities) {
    const holding = (e && (e.holding || (e.properties && e.properties.holding))) || null;
    if (holding && typeof holding === 'string' && lower(holding).includes('weapon')) {
      errors.push({ entityId: e.id || null, reason: 'weapon_present' });
    }
  }
}

function checkNoSmoke(entities, errors) {
  for (const e of entities) {
    const hasSmoke = e && (e.properties && e.properties.smoke) || false;
    if (hasSmoke) errors.push({ entityId: e.id || null, reason: 'smoke_present' });
  }
}

function checkNoViolence(entities, errors) {
  for (const e of entities) {
    const action = (e && (e.action || (e.properties && e.properties.action))) || '';
    const text = lower(action);
    for (const t of violentTerms) {
      if (text.includes(t)) {
        errors.push({ entityId: e.id || null, reason: 'violent_action' });
        break;
      }
    }
  }
}

function checkNoChildrenNearFire(entities, errors) {
  const hasFire = entities.some(e => e && e.properties && e.properties.fire);
  if (hasFire) {
    for (const e of entities) {
      const role = (e && e.role) || null;
      const age = (e && e.age) || null;
      if ((role === 'child') || (typeof age === 'number' && age < 18)) {
        errors.push({ entityId: e.id || null, reason: 'child_near_fire' });
      }
    }
  }
}

function checkNoSelfHarm(entities, errors) {
  for (const e of entities) {
    const text = lower(e && (e.text || e.action || (e.properties && e.properties.description) || ''));
    for (const t of selfHarmTerms) {
      if (text.includes(t)) {
        errors.push({ entityId: e.id || null, reason: 'self_harm_content' });
        break;
      }
    }
  }
}

function checkNoDrugs(entities, errors) {
  for (const e of entities) {
    const text = lower(e && (e.text || e.action || (e.properties && e.properties.description) || ''));
    for (const t of drugTerms) {
      if (text.includes(t)) {
        errors.push({ entityId: e.id || null, reason: 'drug_content' });
        break;
      }
    }
  }
}

function checkNoNudity(entities, errors) {
  for (const e of entities) {
    const hasNudity = e && (e.properties && e.properties.nudity) || false;
    if (hasNudity) errors.push({ entityId: e.id || null, reason: 'nudity_present' });
  }
}

function checkChronology(scene, errors) {
  try {
    const now = Date.now();
    const entities = (scene && scene.entities) || [];
    // check for timestamps far in the future
    for (const e of entities) {
      const ts = e && (e.timestamp || (e.properties && e.properties.timestamp));
      if (ts) {
        const tnum = typeof ts === 'number' ? ts : Date.parse(ts);
        if (!isNaN(tnum) && tnum > (now + 24 * 3600 * 1000)) {
          errors.push({ entityId: e.id || null, reason: 'time_anomaly' });
        }
      }
      // birth/death consistency when provided as years
      if (e && e.properties) {
        const by = e.properties.birthYear;
        const dy = e.properties.deathYear;
        if (typeof by === 'number' && typeof dy === 'number' && by > dy) {
          errors.push({ entityId: e.id || null, reason: 'chronology_error' });
        }
      }
    }
  } catch (e) { /* noop */ }
}

function checkRelations(entities, errors) {
  for (const e of entities) {
    try {
      // simple inconsistency: vehicles marked as human
      if (e && e.role === 'vehicle' && e.properties && e.properties.isHuman) {
        errors.push({ entityId: e.id || null, reason: 'relation_inconsistent' });
      }
      // if a 'child' is marked as having heavy machinery in properties, flag
      if (e && (e.role === 'child' || (typeof e.age === 'number' && e.age < 18)) && e.properties && e.properties.operatesHeavyMachinery) {
        errors.push({ entityId: e.id || null, reason: 'child_operates_heavy_machinery' });
      }
    } catch (ex) { /* noop */ }
  }
}

function checkPoseAnomalies(entities, errors) {
  const impossiblePoses = ['levitating', 'hovering', 'impossible_pose'];
  for (const e of entities) {
    try {
      const pose = e && e.properties && e.properties.pose;
      if (pose && typeof pose === 'string' && impossiblePoses.includes(lower(pose))) {
        errors.push({ entityId: e.id || null, reason: 'pose_impossible' });
      }
    } catch (ex) { /* noop */ }
  }
}

function verifyScene(scene, constraints) {
  const errors = [];
  try {
    const entities = (scene && scene.entities) || [];
    const normalizedConstraints = Array.isArray(constraints) ? constraints : (typeof constraints === 'string' ? [constraints] : []);

    // Optimize: Use combined entity check for common constraint combinations
    const entityChecks = ['no_weapons', 'no_smoke', 'no_violence', 'no_self_harm', 'no_drugs', 'no_nudity', 'no_relations_inconsistent', 'relations', 'no_pose_anomalies', 'pose'];
    const hasEntityChecks = entityChecks.some(c => normalizedConstraints.includes(c));
    
    if (hasEntityChecks) {
      // Single-pass through entities for multiple checks (performance optimization)
      checkEntitiesCombined(entities, normalizedConstraints, errors);
    }
    
    // Special case: children near fire requires two passes
    if (normalizedConstraints.includes('no_children_near_fire')) checkNoChildrenNearFire(entities, errors);
    
  if (normalizedConstraints.includes('no_time_anomaly') || normalizedConstraints.includes('chronology')) {
    checkChronology(scene, errors);
  }
  
  // --- New deterministic checks added ---------------
  // 1) Chronology: detect obvious time-travel or reversed time phrases
  if (normalizedConstraints.includes('checkChronology') || normalizedConstraints.includes('chronology_checks')) {
    const text = (scene && scene.description) ? scene.description.toLowerCase() : '';
    if (CHRONOLOGY_PATTERN.test(text)) {
      errors.push({ reason: 'chronology_error', message: 'possible inconsistent chronology detected' });
    }
    if (TIME_TRAVEL_PATTERN.test(text)) {
      errors.push({ reason: 'time_anomaly', message: 'explicit time-travel mentioned' });
    }
  }

  // 2) Self-harm phrasing: detect first-person self-harm or ideation phrasing
  if (normalizedConstraints.includes('checkSelfHarmPhrasing') || normalizedConstraints.includes('self_harm_phrase')) {
    const text = ((scene && (scene.dialogue || scene.description || '')).toLowerCase() || '');
    if (SELF_HARM_PHRASE_PATTERN.test(text)) {
      errors.push({ reason: 'self_harm_phrase', message: 'first-person self-harm phrasing detected' });
    }
  }

  // 3) Drug mentions with intent: simplistic detection of illicit drug usage or procurement
  if (normalizedConstraints.includes('checkDrugMentions') || normalizedConstraints.includes('drug_checks')) {
    const text = (scene && (scene.description || scene.dialogue || '')).toLowerCase();
    if (DRUG_INSTRUCTION_PATTERN.test(text)) {
      errors.push({ reason: 'drug_instruction', message: 'possible illicit drug instructions or procurement' });
    }
    if (DRUG_SUBSTANCE_PATTERN.test(text) && DRUG_ACTION_PATTERN.test(text)) {
      errors.push({ reason: 'drug_use', message: 'explicit drug use mentioned' });
    }
  }

  // 4) Age-involved risky scenarios: child + dangerous activity
  if (normalizedConstraints.includes('checkChildSafety') || normalizedConstraints.includes('child_safety')) {
    const text = (scene && (scene.description || scene.dialogue || '')).toLowerCase();
    if (CHILD_PATTERN.test(text) && DANGER_PATTERN.test(text)) {
      errors.push({ reason: 'child_endangerment', message: 'child near dangerous activity' });
    }
  }
  
    // physics / trajectory checks
    if (normalizedConstraints.includes('physics_checks') || normalizedConstraints.includes('trajectory_checks')) {
      try {
        // look for actions of type 'throw' or 'launch' in scene.actions
        const actions = (scene && Array.isArray(scene.actions)) ? scene.actions : [];
        const obstacles = (scene && Array.isArray(scene.obstacles)) ? scene.obstacles : (scene && scene.world && scene.world.obstacles) || [];
        const hasObstacles = obstacles.length > 0;
        
        // Optimize: Create entity lookup map for O(1) access
        const entityMap = new Map();
        for (const e of entities) {
          if (e && e.id) entityMap.set(String(e.id), e);
        }
        
        for (const a of actions) {
          try {
            const normalizedVerb = String((a && a.verb) || (a && a.action) || '').toLowerCase();
            // Optimize: Single string comparison instead of two separate checks
            if (normalizedVerb !== 'throw' && normalizedVerb !== 'launch') continue;
            
            const params = a.params || {};
            const v0 = Number(params.v0 || params.speed || 0);
            const angle = Number(params.angleDeg || params.angle || 45);
            const g = (scene && scene.worldRules && typeof scene.worldRules.gravity === 'number') ? scene.worldRules.gravity : 9.81;
            const mass = Number(params.mass || (a.actorProps && a.actorProps.mass) || 1);
            const dragCoef = Number(params.dragCoef || (a.params && a.params.dragCoef) || 0);

            // compute vacuum and drag-aware ranges
            const rangeVac = physics.computeRange(v0, angle, g);
            const targetDistance = Number(params.targetDistance || (a.target && a.target.distance) || NaN);
            const hasTargetDistance = Number.isFinite(targetDistance);
            const shouldSimulateTrajectory = hasObstacles || (dragCoef !== 0 && hasTargetDistance);

            let rangeWithDrag = rangeVac;
            let trajectoryPoints = null;

            if (shouldSimulateTrajectory) {
              trajectoryPoints = physics.sampleTrajectory(v0, angle, g, 1000, { mass, dragCoef, dt: 0.02 });
              if (trajectoryPoints.length > 0) {
                let rangeFromTrajectory = rangeWithDrag;
                for (const point of trajectoryPoints) {
                  if (point && typeof point.x === 'number' && point.x > rangeFromTrajectory) {
                    rangeFromTrajectory = point.x;
                  }
                }
                rangeWithDrag = rangeFromTrajectory;
              }
            }

            // sample trajectory and check for obstacle collisions
            const collides = hasObstacles && trajectoryPoints
              ? physics.trajectoryIntersectsAABBs(trajectoryPoints, obstacles)
              : false;

            // Optimize: Use Map for O(1) entity lookup instead of find()
            const actorId = a.actorId || a.actor || (a.params && a.params.actorId) || null;
            const actor = actorId ? entityMap.get(String(actorId)) : null;
            const isMagic = !!(actor && actor.powers && actor.powers.isMagic);

            if (collides) {
              errors.push({ reason: 'trajectory_collision', message: 'trajectory intersects an obstacle before reaching target', details: { action: a, actorId } });
            }

            // if desired target is farther than physics allow, flag
            if (!isNaN(targetDistance) && !isNaN(rangeWithDrag) && rangeWithDrag + 0.001 < targetDistance) {
              if (isMagic) {
                const cost = (actor && actor.powers && (actor.powers.magicCost || actor.powers.manaCost)) ? (actor.powers.magicCost || actor.powers.manaCost) : undefined;
                errors.push({ reason: 'fantasy_exception', message: `magic exception: actor ${actorId} allowed to exceed physics`, details: { v0, angle, g, rangeVac, rangeWithDrag, targetDistance, action: a, actorId, cost } });
              } else {
                errors.push({ reason: 'trajectory_impossible', message: `computed (drag) range ${Number(rangeWithDrag).toFixed(2)} < target ${targetDistance}`, details: { v0, angle, g, rangeVac, rangeWithDrag, targetDistance, action: a } });
              }
            }
          } catch (e) { /* noop per-action */ }
        }
      } catch (e) { /* noop physics */ }
    }
  } catch (e) {
    // best-effort: return internal error marker
    errors.push({ reason: 'internal_error' });
  }
  return errors;
}

module.exports = { verifyScene };
