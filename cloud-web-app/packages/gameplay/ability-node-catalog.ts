/**
 * ability-node-catalog.ts
 *
 * Catalog of ability node types for the Ability Graph Compiler.
 * Mirrors the VisualScriptCompiler's node registry pattern but specialized
 * for gameplay ability authoring.
 */

export type AbilityNodeCategory =
  | 'trigger'
  | 'condition'
  | 'effect'
  | 'cost'
  | 'modifier'
  | 'flow';

export interface AbilityNodePort {
  name: string;
  type: 'exec' | 'float' | 'int' | 'bool' | 'string' | 'entity' | 'vector3';
  defaultValue?: unknown;
}

export interface AbilityNodeDefinition {
  type: string;
  category: AbilityNodeCategory;
  label: string;
  description: string;
  inputs: AbilityNodePort[];
  outputs: AbilityNodePort[];
  /** Estimated base damage for DPS heuristic. 0 for non-damaging nodes. */
  baseDamage?: number;
  /** Cooldown in seconds for balance validation. */
  baseCooldownSec?: number;
  /** Resource cost units */
  baseResourceCost?: number;
}

export const ABILITY_NODE_CATALOG: AbilityNodeDefinition[] = [
  // ── Triggers ──────────────────────────────────────────────────────────────
  {
    type: 'trigger_on_key_press',
    category: 'trigger',
    label: 'On Key Press',
    description: 'Fires when the assigned ability key is pressed.',
    inputs: [{ name: 'key', type: 'string', defaultValue: 'Q' }],
    outputs: [{ name: 'exec', type: 'exec' }],
  },
  {
    type: 'trigger_on_hit',
    category: 'trigger',
    label: 'On Hit Received',
    description: 'Fires when the owning entity takes damage.',
    inputs: [{ name: 'min_damage', type: 'float', defaultValue: 0 }],
    outputs: [{ name: 'exec', type: 'exec' }, { name: 'damage', type: 'float' }],
  },
  {
    type: 'trigger_on_death',
    category: 'trigger',
    label: 'On Death',
    description: 'Fires when the owning entity dies.',
    inputs: [],
    outputs: [{ name: 'exec', type: 'exec' }],
  },
  {
    type: 'trigger_on_combo',
    category: 'trigger',
    label: 'On Combo Count',
    description: 'Fires when the hit combo reaches a threshold.',
    inputs: [{ name: 'threshold', type: 'int', defaultValue: 5 }],
    outputs: [{ name: 'exec', type: 'exec' }, { name: 'combo_count', type: 'int' }],
  },

  // ── Conditions ────────────────────────────────────────────────────────────
  {
    type: 'condition_has_resource',
    category: 'condition',
    label: 'Has Resource',
    description: 'Checks whether the entity has sufficient resource.',
    inputs: [{ name: 'amount', type: 'float', defaultValue: 10 }],
    outputs: [{ name: 'true', type: 'exec' }, { name: 'false', type: 'exec' }, { name: 'current', type: 'float' }],
  },
  {
    type: 'condition_target_in_range',
    category: 'condition',
    label: 'Target In Range',
    description: 'True if any valid target is within range.',
    inputs: [{ name: 'range', type: 'float', defaultValue: 5 }, { name: 'faction', type: 'string', defaultValue: 'hostile' }],
    outputs: [{ name: 'true', type: 'exec' }, { name: 'false', type: 'exec' }, { name: 'target', type: 'entity' }],
  },
  {
    type: 'condition_on_cooldown',
    category: 'condition',
    label: 'Not On Cooldown',
    description: 'Branches based on cooldown state.',
    inputs: [{ name: 'ability_id', type: 'string', defaultValue: '' }],
    outputs: [{ name: 'ready', type: 'exec' }, { name: 'on_cooldown', type: 'exec' }, { name: 'remaining_sec', type: 'float' }],
  },

  // ── Effects ───────────────────────────────────────────────────────────────
  {
    type: 'effect_deal_damage',
    category: 'effect',
    label: 'Deal Damage',
    description: 'Deals damage to the target entity.',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'target', type: 'entity' },
      { name: 'damage', type: 'float', defaultValue: 50 },
      { name: 'damage_type', type: 'string', defaultValue: 'physical' },
    ],
    outputs: [{ name: 'exec', type: 'exec' }, { name: 'actual_damage', type: 'float' }],
    baseDamage: 50,
    baseCooldownSec: 0,
  },
  {
    type: 'effect_heal',
    category: 'effect',
    label: 'Heal',
    description: 'Restores health to an entity.',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'target', type: 'entity' },
      { name: 'amount', type: 'float', defaultValue: 30 },
    ],
    outputs: [{ name: 'exec', type: 'exec' }],
    baseDamage: 0,
  },
  {
    type: 'effect_launch_projectile',
    category: 'effect',
    label: 'Launch Projectile',
    description: 'Spawns and fires a projectile toward the target.',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'projectile_id', type: 'string', defaultValue: 'arrow' },
      { name: 'speed', type: 'float', defaultValue: 30 },
      { name: 'damage', type: 'float', defaultValue: 40 },
    ],
    outputs: [{ name: 'exec', type: 'exec' }],
    baseDamage: 40,
    baseCooldownSec: 0.5,
  },
  {
    type: 'effect_apply_status',
    category: 'effect',
    label: 'Apply Status Effect',
    description: 'Applies a status effect (burn, freeze, stun, etc.) to a target.',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'target', type: 'entity' },
      { name: 'status', type: 'string', defaultValue: 'stun' },
      { name: 'duration_sec', type: 'float', defaultValue: 2 },
    ],
    outputs: [{ name: 'exec', type: 'exec' }],
    baseDamage: 0,
  },
  {
    type: 'effect_teleport',
    category: 'effect',
    label: 'Teleport',
    description: 'Instantly moves the entity to a target position or behind an enemy.',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'position', type: 'vector3' },
    ],
    outputs: [{ name: 'exec', type: 'exec' }],
  },
  {
    type: 'effect_spawn_summon',
    category: 'effect',
    label: 'Spawn Summon',
    description: 'Spawns a temporary allied entity.',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'summon_id', type: 'string', defaultValue: 'skeletal_warrior' },
      { name: 'duration_sec', type: 'float', defaultValue: 30 },
    ],
    outputs: [{ name: 'exec', type: 'exec' }, { name: 'summon', type: 'entity' }],
  },

  // ── Costs ─────────────────────────────────────────────────────────────────
  {
    type: 'cost_consume_resource',
    category: 'cost',
    label: 'Consume Resource',
    description: 'Deducts resource from the entity. Blocks execution if insufficient.',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'amount', type: 'float', defaultValue: 20 },
    ],
    outputs: [{ name: 'exec', type: 'exec' }, { name: 'failed', type: 'exec' }],
    baseResourceCost: 20,
  },
  {
    type: 'cost_set_cooldown',
    category: 'cost',
    label: 'Set Cooldown',
    description: 'Starts a cooldown timer on the ability.',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'duration_sec', type: 'float', defaultValue: 5 },
    ],
    outputs: [{ name: 'exec', type: 'exec' }],
    baseCooldownSec: 5,
  },

  // ── Modifiers ─────────────────────────────────────────────────────────────
  {
    type: 'modifier_scale_damage',
    category: 'modifier',
    label: 'Scale Damage',
    description: 'Multiplies damage value by a stat-derived factor.',
    inputs: [
      { name: 'damage', type: 'float' },
      { name: 'multiplier', type: 'float', defaultValue: 1.5 },
    ],
    outputs: [{ name: 'scaled_damage', type: 'float' }],
    baseDamage: 0,
  },

  // ── Flow ──────────────────────────────────────────────────────────────────
  {
    type: 'flow_sequence',
    category: 'flow',
    label: 'Sequence',
    description: 'Executes outputs in order.',
    inputs: [{ name: 'exec', type: 'exec' }],
    outputs: [
      { name: 'then_1', type: 'exec' },
      { name: 'then_2', type: 'exec' },
      { name: 'then_3', type: 'exec' },
    ],
  },
  {
    type: 'flow_delay',
    category: 'flow',
    label: 'Delay',
    description: 'Waits a number of frames before continuing.',
    inputs: [
      { name: 'exec', type: 'exec' },
      { name: 'frames', type: 'int', defaultValue: 6 },
    ],
    outputs: [{ name: 'exec', type: 'exec' }],
  },
];

export function getNodeDefinition(type: string): AbilityNodeDefinition | undefined {
  return ABILITY_NODE_CATALOG.find(n => n.type === type);
}

export function getNodesByCategory(category: AbilityNodeCategory): AbilityNodeDefinition[] {
  return ABILITY_NODE_CATALOG.filter(n => n.category === category);
}
