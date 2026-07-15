/**
 * Gameplay ability presets and sample content.
 *
 * Kept outside the runtime manager so the core ability system stays lean while
 * preserving the public exports from gameplay-ability-system.ts.
 */

import type { AttributeDefinition, GameplayAbilitySpec, GameplayTag } from './gameplay-ability-system';

type GameplayTagConstructor = new (name: string) => GameplayTag;

export function buildCommonAttributes(): AttributeDefinition[] {
  return ATTRIBUTES;
}

const ATTRIBUTES: AttributeDefinition[] = [
  { name: 'Health', baseValue: 100, minValue: 0, maxValue: 100, regenRate: 0 },
  { name: 'MaxHealth', baseValue: 100, minValue: 1 },
  { name: 'Mana', baseValue: 50, minValue: 0, maxValue: 50, regenRate: 2 },
  { name: 'MaxMana', baseValue: 50, minValue: 1 },
  { name: 'Stamina', baseValue: 100, minValue: 0, maxValue: 100, regenRate: 10 },
  { name: 'MaxStamina', baseValue: 100, minValue: 1 },
  { name: 'Strength', baseValue: 10, minValue: 1 },
  { name: 'Dexterity', baseValue: 10, minValue: 1 },
  { name: 'Intelligence', baseValue: 10, minValue: 1 },
  { name: 'Armor', baseValue: 0, minValue: 0 },
  { name: 'MagicResist', baseValue: 0, minValue: 0 },
  { name: 'AttackPower', baseValue: 10, minValue: 0 },
  { name: 'SpellPower', baseValue: 10, minValue: 0 },
  { name: 'CritChance', baseValue: 0.05, minValue: 0, maxValue: 1 },
  { name: 'CritDamage', baseValue: 1.5, minValue: 1 },
  { name: 'AttackSpeed', baseValue: 1, minValue: 0.1, maxValue: 5 },
  { name: 'MovementSpeed', baseValue: 5, minValue: 0 },
  { name: 'CooldownReduction', baseValue: 0, minValue: 0, maxValue: 0.5 },
];

export function buildCommonTags(GameplayTagClass: GameplayTagConstructor) {
  return {
  // Status
  Status: {
    Stunned: new GameplayTagClass('Status.Stunned'),
    Rooted: new GameplayTagClass('Status.Rooted'),
    Silenced: new GameplayTagClass('Status.Silenced'),
    Invulnerable: new GameplayTagClass('Status.Invulnerable'),
    Invisible: new GameplayTagClass('Status.Invisible'),
    Burning: new GameplayTagClass('Status.Burning'),
    Frozen: new GameplayTagClass('Status.Frozen'),
    Poisoned: new GameplayTagClass('Status.Poisoned'),
    Bleeding: new GameplayTagClass('Status.Bleeding'),
  },

  // Actions
  Action: {
    Attacking: new GameplayTagClass('Action.Attacking'),
    Casting: new GameplayTagClass('Action.Casting'),
    Moving: new GameplayTagClass('Action.Moving'),
    Jumping: new GameplayTagClass('Action.Jumping'),
    Dashing: new GameplayTagClass('Action.Dashing'),
    Blocking: new GameplayTagClass('Action.Blocking'),
    Channeling: new GameplayTagClass('Action.Channeling'),
  },

  // Damage Types
  Damage: {
    Physical: new GameplayTagClass('Damage.Physical'),
    Magic: new GameplayTagClass('Damage.Magic'),
    Fire: new GameplayTagClass('Damage.Fire'),
    Ice: new GameplayTagClass('Damage.Ice'),
    Lightning: new GameplayTagClass('Damage.Lightning'),
    Poison: new GameplayTagClass('Damage.Poison'),
    True: new GameplayTagClass('Damage.True'),
  },

  // Ability Types
  Ability: {
    Melee: new GameplayTagClass('Ability.Melee'),
    Ranged: new GameplayTagClass('Ability.Ranged'),
    AOE: new GameplayTagClass('Ability.AOE'),
    Projectile: new GameplayTagClass('Ability.Projectile'),
    Ultimate: new GameplayTagClass('Ability.Ultimate'),
  },
} as const;
}

export type CommonGameplayTags = ReturnType<typeof buildCommonTags>;

export function buildSampleAbilities(
  GameplayTagClass: GameplayTagConstructor,
  CommonTags: CommonGameplayTags
): GameplayAbilitySpec[] {
  return [
  {
    id: 'fireball',
    name: 'Fireball',
    description: 'Launch a ball of fire that deals magic damage to enemies.',
    icon: '🔥',
    activationType: 'triggered',
    targetingMode: 'projectile',
    costs: [{ attribute: 'Mana', value: 25 }],
    cooldown: { duration: 5, tags: [new GameplayTagClass('Cooldown.Fireball')] },
    range: 30,
    tags: {
      ability: [CommonTags.Action.Casting, CommonTags.Damage.Fire],
      cancel: [],
      block: [CommonTags.Status.Silenced],
      activation: {
        required: [],
        blocked: [CommonTags.Status.Stunned, CommonTags.Status.Silenced],
      },
    },
    effects: [
      {
        id: 'fireball_damage',
        name: 'Fireball Damage',
        description: 'Deals fire damage',
        durationType: 'instant',
        modifiers: [],
        grantedTags: [],
        applicationTags: [CommonTags.Damage.Fire],
        removalTags: [],
        requiredTags: [],
        blockedTags: [CommonTags.Status.Invulnerable],
        stackingPolicy: 'none',
        maxStacks: 1,
      },
    ],
  },
  {
    id: 'heal',
    name: 'Heal',
    description: 'Restore health to yourself or an ally.',
    icon: '💚',
    activationType: 'triggered',
    targetingMode: 'single',
    costs: [{ attribute: 'Mana', value: 30 }],
    cooldown: { duration: 8, tags: [new GameplayTagClass('Cooldown.Heal')] },
    range: 20,
    tags: {
      ability: [CommonTags.Action.Casting],
      cancel: [],
      block: [CommonTags.Status.Silenced],
      activation: {
        required: [],
        blocked: [CommonTags.Status.Stunned, CommonTags.Status.Silenced],
      },
    },
    effects: [
      {
        id: 'heal_effect',
        name: 'Healing',
        description: 'Restores health',
        durationType: 'instant',
        modifiers: [
          { id: 'heal_mod', attribute: 'Health', operation: 'add', value: 50 },
        ],
        grantedTags: [],
        applicationTags: [],
        removalTags: [],
        requiredTags: [],
        blockedTags: [],
        stackingPolicy: 'none',
        maxStacks: 1,
      },
    ],
  },
  {
    id: 'dash',
    name: 'Dash',
    description: 'Quickly dash in the direction you are facing.',
    icon: '💨',
    activationType: 'triggered',
    targetingMode: 'self',
    costs: [{ attribute: 'Stamina', value: 20 }],
    cooldown: { duration: 3, tags: [new GameplayTagClass('Cooldown.Dash')] },
    tags: {
      ability: [CommonTags.Action.Dashing],
      cancel: [CommonTags.Action.Attacking],
      block: [],
      activation: {
        required: [],
        blocked: [CommonTags.Status.Stunned, CommonTags.Status.Rooted],
      },
    },
    effects: [
      {
        id: 'dash_speed',
        name: 'Dash Speed Boost',
        description: 'Temporarily increases movement speed',
        durationType: 'duration',
        duration: 0.3,
        modifiers: [
          { id: 'dash_speed_mod', attribute: 'MovementSpeed', operation: 'multiply', value: 3 },
        ],
        grantedTags: [CommonTags.Status.Invulnerable],
        applicationTags: [],
        removalTags: [],
        requiredTags: [],
        blockedTags: [],
        stackingPolicy: 'none',
        maxStacks: 1,
      },
    ],
  },
  {
    id: 'poison_cloud',
    name: 'Poison Cloud',
    description: 'Create a cloud of poison that damages enemies over time.',
    icon: '☠️',
    activationType: 'triggered',
    targetingMode: 'aoe',
    costs: [{ attribute: 'Mana', value: 40 }],
    cooldown: { duration: 12, tags: [new GameplayTagClass('Cooldown.PoisonCloud')] },
    range: 25,
    aoeRadius: 5,
    tags: {
      ability: [CommonTags.Action.Casting, CommonTags.Damage.Poison],
      cancel: [],
      block: [CommonTags.Status.Silenced],
      activation: {
        required: [],
        blocked: [CommonTags.Status.Stunned, CommonTags.Status.Silenced],
      },
    },
    effects: [
      {
        id: 'poison_dot',
        name: 'Poison',
        description: 'Deals poison damage over time',
        durationType: 'duration',
        duration: 6,
        period: 1,
        modifiers: [
          { id: 'poison_damage', attribute: 'Health', operation: 'add', value: -10 },
        ],
        grantedTags: [CommonTags.Status.Poisoned],
        applicationTags: [CommonTags.Damage.Poison],
        removalTags: [],
        requiredTags: [],
        blockedTags: [CommonTags.Status.Invulnerable],
        stackingPolicy: 'refresh',
        maxStacks: 1,
        onPeriodTick: (target) => {
          const current = target.attributes.getBaseValue('Health');
          target.attributes.setBaseValue('Health', current - 10);
        },
      },
    ],
  },
];
}
