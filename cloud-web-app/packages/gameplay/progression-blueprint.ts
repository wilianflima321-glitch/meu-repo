/**
 * progression-blueprint.ts
 *
 * Plans leveling curves, roguelike loops, reputation scales, and
 * crafting parameters based on the project GameplayBlueprint.
 */

import type { GameplayBlueprint } from './gameplay-blueprint';

// ─────────────────────────────────────────────────────────────────────────────
// Level Curve
// ─────────────────────────────────────────────────────────────────────────────

export interface LevelEntry {
  level: number;
  xpRequired: number;
  cumulativeXP: number;
  statBonus: {
    hp: number;
    damage: number;
    defense: number;
    speed: number;
  };
  unlockedAbilitySlots: number;
  skillPoints: number;
}

function buildXPCurve(
  maxLevel: number,
  curve: 'linear' | 'exponential' | 'flat_milestone',
  exponent = 1.5
): LevelEntry[] {
  const entries: LevelEntry[] = [];
  let cumulativeXP = 0;

  for (let level = 1; level <= maxLevel; level++) {
    let xpRequired: number;
    switch (curve) {
      case 'linear':
        xpRequired = 100 * level;
        break;
      case 'flat_milestone':
        // Flat until milestone levels (5, 10, 20, 30 …) then big jump
        xpRequired = level % 5 === 0 ? 500 * level : 200;
        break;
      default: // exponential
        xpRequired = Math.round(100 * Math.pow(level, exponent));
    }

    cumulativeXP += xpRequired;

    entries.push({
      level,
      xpRequired,
      cumulativeXP,
      statBonus: {
        hp: Math.round(20 + level * 8),
        damage: Math.round(2 + level * 1.2),
        defense: Math.round(1 + level * 0.5),
        speed: level % 10 === 0 ? 0.05 : 0,
      },
      unlockedAbilitySlots: Math.min(Math.floor(level / 5) + 1, 6),
      skillPoints: level % 3 === 0 ? 2 : 1,
    });
  }

  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skill Tree
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillNode {
  id: string;
  name: string;
  branch: string;
  tier: number;
  description: string;
  requires?: string[];
  effects: Record<string, number | string>;
  cost: number;
}

function buildSkillTree(branches: string[], coreLoop: string): SkillNode[] {
  const nodes: SkillNode[] = [];

  for (const branch of branches) {
    for (let tier = 1; tier <= 4; tier++) {
      const perTier = tier === 1 ? 3 : tier === 2 ? 2 : 1;
      for (let j = 0; j < perTier; j++) {
        const id = `${branch.toLowerCase().replace(/\s+/g, '_')}_t${tier}_${j}`;
        const prev = tier > 1 ? [`${branch.toLowerCase().replace(/\s+/g, '_')}_t${tier - 1}_0`] : undefined;

        nodes.push({
          id,
          name: `${branch} ${['Novice', 'Adept', 'Expert', 'Master'][tier - 1]} ${j > 0 ? `(Alt ${j})` : ''}`,
          branch,
          tier,
          description: `Improves ${branch.toLowerCase()} capabilities.`,
          requires: prev,
          effects: {
            [`${branch.toLowerCase()}_bonus`]: tier * 0.1,
          },
          cost: tier * 2,
        });
      }
    }
  }

  // Add a loop-specific signature skill
  if (coreLoop === 'roguelike') {
    nodes.push({
      id: 'roguelike_restart_mastery',
      name: 'Death Mastery',
      branch: branches[0] ?? 'Combat',
      tier: 4,
      description: 'Each run death permanently unlocks a minor buff.',
      effects: { permanent_buff_on_death: 0.02 },
      cost: 5,
    });
  }

  return nodes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reputation System
// ─────────────────────────────────────────────────────────────────────────────

export interface FactionReputation {
  faction: string;
  tiers: Array<{ name: string; threshold: number; rewards: string[] }>;
}

function buildReputationSystems(factions: string[]): FactionReputation[] {
  return factions.map(faction => ({
    faction,
    tiers: [
      { name: 'Hostile', threshold: -100, rewards: [] },
      { name: 'Neutral', threshold: 0, rewards: [`${faction} Safe Passage`] },
      { name: 'Friendly', threshold: 500, rewards: [`${faction} Discount`, `${faction} Guard Aid`] },
      { name: 'Honored', threshold: 2000, rewards: [`${faction} Exclusive Gear`, `${faction} Questline`] },
      { name: 'Exalted', threshold: 5000, rewards: [`${faction} Champion Title`, `${faction} Mount`, `Secret Quest`] },
    ],
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Roguelike Meta-Progression
// ─────────────────────────────────────────────────────────────────────────────

export interface RoguelikeRunConfig {
  maxRunLengthMin: number;
  floorCount: number;
  relicCount: number;
  metaProgressionCurrency: string;
  permanentUnlocks: string[];
  bossPerFloor: boolean;
  boonCategories: string[];
}

function buildRoguelikeConfig(): RoguelikeRunConfig {
  return {
    maxRunLengthMin: 35,
    floorCount: 4,
    relicCount: 3,
    metaProgressionCurrency: 'Void Shards',
    permanentUnlocks: [
      'Starting HP Upgrade',
      'Starting Resource Upgrade',
      'Ability Unlock',
      'Elite Room Skip',
      'Shop Discount',
    ],
    bossPerFloor: true,
    boonCategories: ['offensive', 'defensive', 'utility', 'movement', 'resource'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Crafting System
// ─────────────────────────────────────────────────────────────────────────────

export interface CraftingBlueprint {
  resourceCategories: string[];
  craftingStations: string[];
  recipes: Array<{ output: string; inputs: string[]; station: string; difficulty: 1 | 2 | 3 }>;
}

function buildCraftingBlueprint(): CraftingBlueprint {
  return {
    resourceCategories: ['Wood', 'Stone', 'Metal', 'Magic Essence', 'Rare Components'],
    craftingStations: ['Forge', 'Alchemy Table', 'Enchanting Table', 'Workbench'],
    recipes: [
      { output: 'Iron Sword', inputs: ['Metal x3', 'Wood x1'], station: 'Forge', difficulty: 1 },
      { output: 'Health Potion', inputs: ['Magic Essence x2', 'Herb x3'], station: 'Alchemy Table', difficulty: 1 },
      { output: 'Enchanted Armor', inputs: ['Metal x5', 'Magic Essence x5', 'Rare Components x1'], station: 'Enchanting Table', difficulty: 3 },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Progression Blueprint Generator
// ─────────────────────────────────────────────────────────────────────────────

export interface FullProgressionBlueprint {
  levelCurve: LevelEntry[];
  skillTree: SkillNode[];
  reputationSystems: FactionReputation[];
  roguelikeConfig?: RoguelikeRunConfig;
  craftingBlueprint?: CraftingBlueprint;
}

export class ProgressionBlueprintGenerator {
  generate(blueprint: GameplayBlueprint): FullProgressionBlueprint {
    const { progression, coreLoop } = blueprint;

    const levelCurve = buildXPCurve(
      progression.maxLevel,
      progression.xpCurve,
      progression.xpExponent
    );

    const skillTree = buildSkillTree(progression.skillTreeBranches, coreLoop);

    const reputationSystems = buildReputationSystems(
      progression.reputationFactions ?? []
    );

    return {
      levelCurve,
      skillTree,
      reputationSystems,
      roguelikeConfig: coreLoop === 'roguelike' ? buildRoguelikeConfig() : undefined,
      craftingBlueprint: ['crafting', 'survival'].includes(coreLoop) ? buildCraftingBlueprint() : undefined,
    };
  }
}

export const progressionBlueprintGenerator = new ProgressionBlueprintGenerator();
