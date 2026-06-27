/**
 * ai-behavior-generator.ts
 *
 * Generates NPC and enemy AI behavior trees / GOAP plans
 * matching the project's gameplay style.
 *
 * Supports:
 *   - GOAP (Goal-Oriented Action Planning) — A* search over action space
 *   - Behavior Trees — hierarchical BT serialized as JSON
 *   - Utility AI — scored decision-making for emergent behavior
 */

import type { GameplayBlueprint } from './gameplay-blueprint';

// ─────────────────────────────────────────────────────────────────────────────
// GOAP
// ─────────────────────────────────────────────────────────────────────────────

export interface GOAPAction {
  name: string;
  preconditions: Record<string, boolean>;
  effects: Record<string, boolean>;
  cost: number;
}

export interface GOAPGoal {
  name: string;
  targetState: Record<string, boolean>;
  priority: number;
}

export class GOAPPlanner {
  /**
   * A* search over GOAP action space.
   * Returns ordered list of actions to satisfy goal, or null if impossible.
   */
  solvePlan(
    actions: GOAPAction[],
    currentState: Record<string, boolean>,
    goal: GOAPGoal
  ): GOAPAction[] | null {
    type Node = { state: Record<string, boolean>; plan: GOAPAction[]; cost: number };

    const openList: Node[] = [{ state: { ...currentState }, plan: [], cost: 0 }];
    const closedSig = new Set<string>();

    const satisfied = (state: Record<string, boolean>) =>
      Object.entries(goal.targetState).every(([k, v]) => state[k] === v);

    const stateSig = (state: Record<string, boolean>) =>
      Object.keys(state).sort().map(k => `${k}:${state[k]}`).join('|');

    while (openList.length > 0) {
      // Sort by cost (greedy)
      openList.sort((a, b) => a.cost - b.cost);
      const { state, plan, cost } = openList.shift()!;

      if (satisfied(state)) return plan;

      const sig = stateSig(state);
      if (closedSig.has(sig)) continue;
      closedSig.add(sig);

      for (const action of actions) {
        const presMet = Object.entries(action.preconditions).every(([k, v]) => state[k] === v);
        if (!presMet) continue;

        const newState = { ...state };
        for (const [k, v] of Object.entries(action.effects)) newState[k] = v;

        openList.push({ state: newState, plan: [...plan, action], cost: cost + action.cost });
      }
    }

    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Behavior Tree (serializable JSON format)
// ─────────────────────────────────────────────────────────────────────────────

export type BTNodeType =
  | 'selector' | 'sequence' | 'parallel'
  | 'condition' | 'action' | 'decorator';

export interface BTNode {
  id: string;
  type: BTNodeType;
  name: string;
  children?: BTNode[];
  params?: Record<string, unknown>;
}

function btCondition(name: string, params?: Record<string, unknown>): BTNode {
  return { id: `cond_${name}`, type: 'condition', name, params };
}
function btAction(name: string, params?: Record<string, unknown>): BTNode {
  return { id: `act_${name}`, type: 'action', name, params };
}
function btSequence(name: string, children: BTNode[]): BTNode {
  return { id: `seq_${name}`, type: 'sequence', name, children };
}
function btSelector(name: string, children: BTNode[]): BTNode {
  return { id: `sel_${name}`, type: 'selector', name, children };
}

function buildCombatBT(complexity: string, style: string, hasCover: boolean): BTNode {
  const coverNodes = hasCover ? [
    btSequence('seek_cover', [
      btCondition('is_under_fire'),
      btAction('move_to_cover'),
      btAction('take_cover'),
    ]),
  ] : [];

  const baseTree = btSelector('root', [
    // 1. Self-preservation
    btSequence('heal_self', [
      btCondition('is_low_health', { threshold: 0.25 }),
      btCondition('has_heal_item'),
      btAction('use_heal'),
    ]),
    // 2. Cover (shooters)
    ...coverNodes,
    // 3. Flanking (tactical/emergent)
    ...(complexity !== 'simple' ? [
      btSequence('flank', [
        btCondition('has_ally'),
        btCondition('target_in_range', { range: 20 }),
        btAction('coordinate_flank'),
      ]),
    ] : []),
    // 4. Attack
    btSequence('attack', [
      btCondition('target_in_range', { range: style === 'shooter' ? 30 : 3 }),
      btAction('attack_target'),
      btAction('reset_cooldown'),
    ]),
    // 5. Chase
    btSequence('chase', [
      btCondition('target_detected'),
      btAction('move_toward_target'),
    ]),
    // 6. Patrol
    btAction('patrol_waypoints'),
  ]);

  return baseTree;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility AI
// ─────────────────────────────────────────────────────────────────────────────

export interface UtilityAction {
  name: string;
  /** Returns a 0..1 score given world state */
  scorer: string; // serialized JS function body
  action: string; // action identifier
}

function buildUtilityActions(blueprint: GameplayBlueprint): UtilityAction[] {
  return [
    {
      name: 'Attack Nearest',
      scorer: 'return target_proximity * 0.8 + aggression * 0.2;',
      action: 'attack_nearest',
    },
    {
      name: 'Flee if Low HP',
      scorer: 'return (1 - health_normalized) * flee_tendency;',
      action: 'flee',
    },
    {
      name: 'Call Reinforcements',
      scorer: 'return (1 - health_normalized) * 0.5 + (1 - target_count_normalized) * 0.5;',
      action: 'call_backup',
    },
    {
      name: 'Use Special Ability',
      scorer: 'return ability_charged ? 0.9 : 0.0;',
      action: 'use_special',
    },
    {
      name: 'Take Cover',
      scorer: blueprint.combatStyle.hasCover ? 'return under_fire ? 0.95 : 0.1;' : 'return 0;',
      action: 'seek_cover',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAP Action Templates
// ─────────────────────────────────────────────────────────────────────────────

function buildGOAPActions(style: string): GOAPAction[] {
  const actions: GOAPAction[] = [
    { name: 'MoveToTarget', preconditions: { target_detected: true, in_range: false }, effects: { in_range: true }, cost: 1 },
    { name: 'AttackTarget', preconditions: { in_range: true, can_attack: true }, effects: { target_damaged: true, can_attack: false }, cost: 2 },
    { name: 'Heal', preconditions: { low_health: true, has_heal: true }, effects: { low_health: false, has_heal: false }, cost: 1 },
    { name: 'Flee', preconditions: { low_health: true }, effects: { safe: true }, cost: 3 },
    { name: 'CallBackup', preconditions: { low_health: true, ally_available: true }, effects: { backup_called: true }, cost: 2 },
  ];

  if (style === 'shooter') {
    actions.push({ name: 'SeekCover', preconditions: { under_fire: true }, effects: { under_fire: false }, cost: 1 });
    actions.push({ name: 'SuppressionFire', preconditions: { in_range: true, has_ammo: true }, effects: { target_suppressed: true }, cost: 3 });
  }

  if (style === 'souls-like') {
    actions.push({ name: 'BackstepAfterAttack', preconditions: { just_attacked: true }, effects: { just_attacked: false, in_range: false }, cost: 1 });
    actions.push({ name: 'ParryOpportunity', preconditions: { target_attacking: true, stamina_high: true }, effects: { target_staggered: true }, cost: 2 });
  }

  return actions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generated AI Profile
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedAIProfile {
  complexity: string;
  behaviorTree: BTNode;
  goapActions: GOAPAction[];
  goapGoals: GOAPGoal[];
  utilityActions: UtilityAction[];
  archetypeOverrides: Record<string, Partial<GeneratedAIProfile>>;
}

export class AIBehaviorGenerator {
  private planner = new GOAPPlanner();

  generate(blueprint: GameplayBlueprint): GeneratedAIProfile {
    const { complexity } = blueprint.aiBehavior;
    const style = blueprint.combatStyle.style;

    const behaviorTree = buildCombatBT(complexity, style, blueprint.combatStyle.hasCover ?? false);
    const goapActions = buildGOAPActions(style);
    const utilityActions = buildUtilityActions(blueprint);

    const goapGoals: GOAPGoal[] = [
      { name: 'KillTarget', targetState: { target_damaged: true }, priority: 10 },
      { name: 'Survive', targetState: { safe: true }, priority: 5 },
      { name: 'Alert', targetState: { backup_called: true }, priority: 3 },
    ];

    // Build per-archetype overrides
    const archetypeOverrides: Record<string, Partial<GeneratedAIProfile>> = {};
    for (const archetype of blueprint.enemyArchetypes) {
      if (/archer|ranger|sniper/i.test(archetype)) {
        archetypeOverrides[archetype] = {
          goapActions: [...goapActions, { name: 'KeepDistance', preconditions: { in_melee_range: true }, effects: { in_melee_range: false }, cost: 1 }],
        };
      }
      if (/brute|berserker/i.test(archetype)) {
        archetypeOverrides[archetype] = {
          goapActions: goapActions.map(a => a.name === 'Flee' ? { ...a, cost: 99 } : a),
        };
      }
    }

    return { complexity, behaviorTree, goapActions, goapGoals, utilityActions, archetypeOverrides };
  }

  solvePlanFor(profile: GeneratedAIProfile, currentState: Record<string, boolean>, goalName: string): GOAPAction[] | null {
    const goal = profile.goapGoals.find(g => g.name === goalName);
    if (!goal) return null;
    return this.planner.solvePlan(profile.goapActions, currentState, goal);
  }
}

export const aiBehaviorGenerator = new AIBehaviorGenerator();
