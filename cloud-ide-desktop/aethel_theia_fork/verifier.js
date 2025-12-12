const violentTerms = ['kill','attack','shoot','murder','stab','assault'];
const selfHarmTerms = ['suicide','self-harm','kill myself','end my life'];
const drugTerms = ['cocaine','heroin','meth','fentanyl','opioid'];
const physics = require('./physics');

function lower(s) { return (s || '').toString().toLowerCase(); }

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

    if (normalizedConstraints.includes('no_weapons')) checkNoWeapons(entities, errors);
    if (normalizedConstraints.includes('no_smoke')) checkNoSmoke(entities, errors);
    if (normalizedConstraints.includes('no_violence')) checkNoViolence(entities, errors);
    if (normalizedConstraints.includes('no_children_near_fire')) checkNoChildrenNearFire(entities, errors);
    // expanded rules
    if (normalizedConstraints.includes('no_self_harm')) checkNoSelfHarm(entities, errors);
    if (normalizedConstraints.includes('no_drugs')) checkNoDrugs(entities, errors);
    if (normalizedConstraints.includes('no_nudity')) checkNoNudity(entities, errors);
  if (normalizedConstraints.includes('no_time_anomaly') || normalizedConstraints.includes('chronology')) {
    checkChronology(scene, errors);
  }
  
  // --- New deterministic checks added ---------------
  // 1) Chronology: detect obvious time-travel or reversed time phrases
  if (normalizedConstraints.includes('checkChronology') || normalizedConstraints.includes('chronology_checks')) {
    const text = (scene && scene.description) ? scene.description.toLowerCase() : '';
    if (/\b(before|after) (he|she|they) (was|were) born\b/.test(text)) {
      errors.push({ reason: 'chronology_error', message: 'possible inconsistent chronology detected' });
    }
    if (/\b(time travel|travelled back in time|went back in time|from the future)\b/.test(text)) {
      errors.push({ reason: 'time_anomaly', message: 'explicit time-travel mentioned' });
    }
  }

  // 2) Self-harm phrasing: detect first-person self-harm or ideation phrasing
  if (normalizedConstraints.includes('checkSelfHarmPhrasing') || normalizedConstraints.includes('self_harm_phrase')) {
    const text = ((scene && (scene.dialogue || scene.description || '')).toLowerCase() || '');
    if (/\b(i want to die|i am going to kill myself|i will kill myself|i can't go on)\b/.test(text)) {
      errors.push({ reason: 'self_harm_phrase', message: 'first-person self-harm phrasing detected' });
    }
  }

  // 3) Drug mentions with intent: simplistic detection of illicit drug usage or procurement
  if (normalizedConstraints.includes('checkDrugMentions') || normalizedConstraints.includes('drug_checks')) {
    const text = (scene && (scene.description || scene.dialogue || '')).toLowerCase();
    if (/\b(buy meth|where to get heroin|how to make meth|order pills online|needle exchange)\b/.test(text)) {
      errors.push({ reason: 'drug_instruction', message: 'possible illicit drug instructions or procurement' });
    }
    if (/\b(cocaine|heroin|methamphetamine|fentanyl)\b/.test(text) && /\b(use|inject|smoke|snort|consume)\b/.test(text)) {
      errors.push({ reason: 'drug_use', message: 'explicit drug use mentioned' });
    }
  }

  // 4) Age-involved risky scenarios: child + dangerous activity
  if (normalizedConstraints.includes('checkChildSafety') || normalizedConstraints.includes('child_safety')) {
    const text = (scene && (scene.description || scene.dialogue || '')).toLowerCase();
    if (/\b(child|kid|toddler|baby)\b/.test(text) && /\b(fire|gun|weapon|chainsaw|dangerous|machine)\b/.test(text)) {
      errors.push({ reason: 'child_endangerment', message: 'child near dangerous activity' });
    }
  }
  
  if (normalizedConstraints.includes('no_relations_inconsistent') || normalizedConstraints.includes('relations')) checkRelations(entities, errors);
  if (normalizedConstraints.includes('no_pose_anomalies') || normalizedConstraints.includes('pose')) checkPoseAnomalies(entities, errors);
    // physics / trajectory checks
    if (normalizedConstraints.includes('physics_checks') || normalizedConstraints.includes('trajectory_checks')) {
      try {
        // look for actions of type 'throw' or 'launch' in scene.actions
        const actions = (scene && Array.isArray(scene.actions)) ? scene.actions : [];
        const obstacles = (scene && Array.isArray(scene.obstacles)) ? scene.obstacles : (scene && scene.world && scene.world.obstacles) || [];
        const hasObstacles = obstacles.length > 0;
        for (const a of actions) {
          try {
            const normalizedVerb = String((a && a.verb) || (a && a.action) || '').toLowerCase();
            if (normalizedVerb === 'throw' || normalizedVerb === 'launch') {
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
                  const validXs = trajectoryPoints
                    .filter(point => point && typeof point.x === 'number')
                    .map(point => point.x);
                  if (validXs.length) {
                    rangeWithDrag = Math.max(...validXs);
                  }
                }
              }

              // sample trajectory and check for obstacle collisions
              const collides = hasObstacles && trajectoryPoints
                ? physics.trajectoryIntersectsAABBs(trajectoryPoints, obstacles)
                : false;

              // find actor entity to check magic exceptions
              const actorId = a.actorId || a.actor || (a.params && a.params.actorId) || null;
              const actor = actorId ? entities.find(e => String(e.id) === String(actorId)) : null;
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
