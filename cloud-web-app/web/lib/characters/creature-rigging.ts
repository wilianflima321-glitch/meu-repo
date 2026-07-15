/**
 * creature-rigging.ts
 *
 * Rigging and retargeting framework for non-humanoid creatures.
 * Handles: multi-limbed, amorphous, flying, swimming, and swarm types.
 *
 * Templates provide predefined bone hierarchies. The mesh auto-binder
 * maps vertices to bones using proximity and volume weighting.
 */

export type CreatureArchetype =
  | 'quadruped'
  | 'biped_monster'
  | 'serpentine'
  | 'arachnid'
  | 'avian'
  | 'aquatic'
  | 'amorphous'
  | 'insectoid'
  | 'centipede'
  | 'dragon';

export interface CreatureBone {
  name: string;
  parentIndex: number;
  restPosition: [number, number, number];
  restRotation: [number, number, number, number]; // quaternion
  length: number;
  isIKTarget?: boolean;
  isIKPole?: boolean;
  ikChainLength?: number;
}

export interface CreatureRig {
  archetype: CreatureArchetype;
  bones: CreatureBone[];
  limbGroups: LimbGroup[];
  locomotionMode: 'walk' | 'fly' | 'swim' | 'slither' | 'crawl';
}

export interface LimbGroup {
  name: string;
  boneNames: string[];
  ikEnabled: boolean;
  footIKEnabled: boolean;
  mirrorEnabled: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rig Templates
// ─────────────────────────────────────────────────────────────────────────────

const QUADRUPED_TEMPLATE: CreatureRig = {
  archetype: 'quadruped',
  locomotionMode: 'walk',
  bones: [
    { name: 'pelvis', parentIndex: -1, restPosition: [0, 1.0, 0], restRotation: [0, 0, 0, 1], length: 0.3 },
    { name: 'spine_01', parentIndex: 0, restPosition: [0.3, 1.0, 0], restRotation: [0, 0, 0, 1], length: 0.35 },
    { name: 'spine_02', parentIndex: 1, restPosition: [0.6, 1.05, 0], restRotation: [0, 0, 0, 1], length: 0.35 },
    { name: 'neck', parentIndex: 2, restPosition: [0.9, 1.15, 0], restRotation: [0, 0, 0, 1], length: 0.3 },
    { name: 'head', parentIndex: 3, restPosition: [1.15, 1.2, 0], restRotation: [0, 0, 0, 1], length: 0.25 },
    // Front left leg
    { name: 'fl_shoulder', parentIndex: 2, restPosition: [0.7, 0.85, 0.25], restRotation: [0, 0, 0, 1], length: 0.2 },
    { name: 'fl_upper', parentIndex: 5, restPosition: [0.7, 0.6, 0.25], restRotation: [0, 0, 0, 1], length: 0.35 },
    { name: 'fl_lower', parentIndex: 6, restPosition: [0.7, 0.25, 0.25], restRotation: [0, 0, 0, 1], length: 0.3, isIKTarget: false },
    { name: 'fl_foot', parentIndex: 7, restPosition: [0.7, 0.02, 0.25], restRotation: [0, 0, 0, 1], length: 0.12, isIKTarget: true, ikChainLength: 3 },
    // Front right leg (mirrored)
    { name: 'fr_shoulder', parentIndex: 2, restPosition: [0.7, 0.85, -0.25], restRotation: [0, 0, 0, 1], length: 0.2 },
    { name: 'fr_upper', parentIndex: 9, restPosition: [0.7, 0.6, -0.25], restRotation: [0, 0, 0, 1], length: 0.35 },
    { name: 'fr_lower', parentIndex: 10, restPosition: [0.7, 0.25, -0.25], restRotation: [0, 0, 0, 1], length: 0.3 },
    { name: 'fr_foot', parentIndex: 11, restPosition: [0.7, 0.02, -0.25], restRotation: [0, 0, 0, 1], length: 0.12, isIKTarget: true, ikChainLength: 3 },
    // Rear left leg
    { name: 'rl_upper', parentIndex: 0, restPosition: [0, 0.7, 0.25], restRotation: [0, 0, 0, 1], length: 0.4 },
    { name: 'rl_lower', parentIndex: 13, restPosition: [0.1, 0.3, 0.25], restRotation: [0, 0, 0, 1], length: 0.38 },
    { name: 'rl_foot', parentIndex: 14, restPosition: [0.05, 0.02, 0.25], restRotation: [0, 0, 0, 1], length: 0.12, isIKTarget: true, ikChainLength: 2 },
    // Rear right leg
    { name: 'rr_upper', parentIndex: 0, restPosition: [0, 0.7, -0.25], restRotation: [0, 0, 0, 1], length: 0.4 },
    { name: 'rr_lower', parentIndex: 16, restPosition: [0.1, 0.3, -0.25], restRotation: [0, 0, 0, 1], length: 0.38 },
    { name: 'rr_foot', parentIndex: 17, restPosition: [0.05, 0.02, -0.25], restRotation: [0, 0, 0, 1], length: 0.12, isIKTarget: true, ikChainLength: 2 },
    // Tail
    { name: 'tail_01', parentIndex: 0, restPosition: [-0.25, 1.0, 0], restRotation: [0, 0, 0, 1], length: 0.3 },
    { name: 'tail_02', parentIndex: 19, restPosition: [-0.55, 0.9, 0], restRotation: [0, 0, 0, 1], length: 0.3 },
    { name: 'tail_03', parentIndex: 20, restPosition: [-0.85, 0.75, 0], restRotation: [0, 0, 0, 1], length: 0.3 },
  ],
  limbGroups: [
    { name: 'front_left_leg', boneNames: ['fl_shoulder', 'fl_upper', 'fl_lower', 'fl_foot'], ikEnabled: true, footIKEnabled: true, mirrorEnabled: false },
    { name: 'front_right_leg', boneNames: ['fr_shoulder', 'fr_upper', 'fr_lower', 'fr_foot'], ikEnabled: true, footIKEnabled: true, mirrorEnabled: false },
    { name: 'rear_left_leg', boneNames: ['rl_upper', 'rl_lower', 'rl_foot'], ikEnabled: true, footIKEnabled: true, mirrorEnabled: false },
    { name: 'rear_right_leg', boneNames: ['rr_upper', 'rr_lower', 'rr_foot'], ikEnabled: true, footIKEnabled: true, mirrorEnabled: false },
    { name: 'spine', boneNames: ['pelvis', 'spine_01', 'spine_02', 'neck', 'head'], ikEnabled: false, footIKEnabled: false, mirrorEnabled: false },
    { name: 'tail', boneNames: ['tail_01', 'tail_02', 'tail_03'], ikEnabled: false, footIKEnabled: false, mirrorEnabled: false },
  ],
};

const AVIAN_TEMPLATE: CreatureRig = {
  archetype: 'avian',
  locomotionMode: 'fly',
  bones: [
    { name: 'pelvis', parentIndex: -1, restPosition: [0, 0.8, 0], restRotation: [0, 0, 0, 1], length: 0.2 },
    { name: 'spine', parentIndex: 0, restPosition: [0.15, 0.9, 0], restRotation: [0, 0, 0, 1], length: 0.25 },
    { name: 'neck', parentIndex: 1, restPosition: [0.35, 1.0, 0], restRotation: [0, 0, 0, 1], length: 0.2 },
    { name: 'head', parentIndex: 2, restPosition: [0.5, 1.15, 0], restRotation: [0, 0, 0, 1], length: 0.18 },
    { name: 'beak', parentIndex: 3, restPosition: [0.65, 1.15, 0], restRotation: [0, 0, 0, 1], length: 0.12 },
    // Left wing
    { name: 'l_wing_root', parentIndex: 1, restPosition: [0.2, 0.95, 0.2], restRotation: [0, 0, 0, 1], length: 0.3 },
    { name: 'l_wing_mid', parentIndex: 5, restPosition: [0.2, 0.95, 0.55], restRotation: [0, 0, 0, 1], length: 0.35 },
    { name: 'l_wing_tip', parentIndex: 6, restPosition: [0.2, 0.9, 0.95], restRotation: [0, 0, 0, 1], length: 0.25 },
    // Right wing (symmetric)
    { name: 'r_wing_root', parentIndex: 1, restPosition: [0.2, 0.95, -0.2], restRotation: [0, 0, 0, 1], length: 0.3 },
    { name: 'r_wing_mid', parentIndex: 8, restPosition: [0.2, 0.95, -0.55], restRotation: [0, 0, 0, 1], length: 0.35 },
    { name: 'r_wing_tip', parentIndex: 9, restPosition: [0.2, 0.9, -0.95], restRotation: [0, 0, 0, 1], length: 0.25 },
    // Legs
    { name: 'l_leg', parentIndex: 0, restPosition: [0, 0.5, 0.1], restRotation: [0, 0, 0, 1], length: 0.25 },
    { name: 'l_talon', parentIndex: 11, restPosition: [0, 0.25, 0.1], restRotation: [0, 0, 0, 1], length: 0.18, isIKTarget: true, ikChainLength: 2 },
    { name: 'r_leg', parentIndex: 0, restPosition: [0, 0.5, -0.1], restRotation: [0, 0, 0, 1], length: 0.25 },
    { name: 'r_talon', parentIndex: 13, restPosition: [0, 0.25, -0.1], restRotation: [0, 0, 0, 1], length: 0.18, isIKTarget: true, ikChainLength: 2 },
    // Tail feathers
    { name: 'tail_01', parentIndex: 0, restPosition: [-0.2, 0.8, 0], restRotation: [0, 0, 0, 1], length: 0.2 },
    { name: 'tail_02', parentIndex: 15, restPosition: [-0.4, 0.75, 0], restRotation: [0, 0, 0, 1], length: 0.2 },
  ],
  limbGroups: [
    { name: 'left_wing', boneNames: ['l_wing_root', 'l_wing_mid', 'l_wing_tip'], ikEnabled: false, footIKEnabled: false, mirrorEnabled: true },
    { name: 'right_wing', boneNames: ['r_wing_root', 'r_wing_mid', 'r_wing_tip'], ikEnabled: false, footIKEnabled: false, mirrorEnabled: true },
    { name: 'legs', boneNames: ['l_leg', 'l_talon', 'r_leg', 'r_talon'], ikEnabled: true, footIKEnabled: true, mirrorEnabled: false },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Template Registry
// ─────────────────────────────────────────────────────────────────────────────

const CREATURE_TEMPLATES: Partial<Record<CreatureArchetype, CreatureRig>> = {
  quadruped: QUADRUPED_TEMPLATE,
  avian: AVIAN_TEMPLATE,
};

export function getCreatureRig(archetype: CreatureArchetype): CreatureRig {
  const template = CREATURE_TEMPLATES[archetype];
  if (template) return JSON.parse(JSON.stringify(template)) as CreatureRig;

  // Fallback: generate a minimal procedural rig
  return generateProceduralRig(archetype);
}

function generateProceduralRig(archetype: CreatureArchetype): CreatureRig {
  const boneCount = archetype === 'serpentine' ? 20 :
    archetype === 'arachnid' ? 18 :
    archetype === 'insectoid' ? 14 : 8;

  const bones: CreatureBone[] = [
    { name: 'root', parentIndex: -1, restPosition: [0, 0, 0], restRotation: [0, 0, 0, 1], length: 0.3 },
  ];

  for (let i = 1; i < boneCount; i++) {
    bones.push({
      name: `bone_${i.toString().padStart(2, '0')}`,
      parentIndex: Math.floor(i * 0.7),
      restPosition: [i * 0.3, 0.5, 0],
      restRotation: [0, 0, 0, 1],
      length: 0.3,
    });
  }

  const locomotion: CreatureRig['locomotionMode'] =
    archetype === 'aquatic' ? 'swim' :
    archetype === 'avian' ? 'fly' :
    archetype === 'serpentine' ? 'slither' :
    archetype === 'arachnid' || archetype === 'insectoid' ? 'crawl' : 'walk';

  return {
    archetype,
    locomotionMode: locomotion,
    bones,
    limbGroups: [
      { name: 'body', boneNames: bones.map(b => b.name), ikEnabled: false, footIKEnabled: false, mirrorEnabled: false },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Skinning weight computation (proximity-based)
// ─────────────────────────────────────────────────────────────────────────────

export interface SkinVertex {
  position: [number, number, number];
  jointIndices: [number, number, number, number];
  weights: [number, number, number, number];
}

export function computeSkinWeights(
  positions: Float32Array,
  rig: CreatureRig,
  influenceCount = 4
): SkinVertex[] {
  const vertices: SkinVertex[] = [];

  for (let i = 0; i < positions.length; i += 3) {
    const vx = positions[i], vy = positions[i + 1], vz = positions[i + 2];

    // Compute distance to each bone's rest position
    const dists = rig.bones.map((bone, bi) => {
      const dx = vx - bone.restPosition[0];
      const dy = vy - bone.restPosition[1];
      const dz = vz - bone.restPosition[2];
      return { bi, dist: Math.sqrt(dx * dx + dy * dy + dz * dz) };
    });

    dists.sort((a, b) => a.dist - b.dist);
    const nearest = dists.slice(0, influenceCount);

    // Softmax-style weight normalization
    const rawWeights = nearest.map(({ dist }) => 1 / (dist + 0.001));
    const total = rawWeights.reduce((s, w) => s + w, 0);
    const norm = rawWeights.map(w => w / total);

    const indices: [number, number, number, number] = [0, 0, 0, 0];
    const weights: [number, number, number, number] = [0, 0, 0, 0];
    for (let k = 0; k < 4; k++) {
      indices[k] = nearest[k]?.bi ?? 0;
      weights[k] = norm[k] ?? 0;
    }

    vertices.push({ position: [vx, vy, vz], jointIndices: indices, weights });
  }

  return vertices;
}
