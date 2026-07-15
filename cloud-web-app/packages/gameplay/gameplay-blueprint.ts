/**
 * gameplay-blueprint.ts
 *
 * Core type definitions for the Aethel Gameplay Orchestration Layer.
 * These types represent the complete schema of a generated gameplay system.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Combat
// ─────────────────────────────────────────────────────────────────────────────

export interface CombatStyleBlueprint {
  style: 'souls-like' | 'turn-based' | 'shooter' | 'hack-n-slash' | 'rhythm' | 'rts' | 'moba';
  damageTypes: string[];
  hasParry: boolean;
  parryWindowMs?: number;
  hasBlock?: boolean;
  hasDodge?: boolean;
  hasCover?: boolean;
  firingRates?: Record<string, number>;
  weaponCategories?: string[];
  criticalHitMultiplier?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Economy
// ─────────────────────────────────────────────────────────────────────────────

export interface EconomyBlueprint {
  model: 'loot' | 'crafting' | 'reputation' | 'permadeath' | 'roguelike' | 'trading' | 'mixed';
  currencies: string[];
  craftingInputs?: string[];
  merchantEnabled?: boolean;
  deathPenalty?: 'none' | 'xp_loss' | 'item_drop' | 'full_permadeath';
}

// ─────────────────────────────────────────────────────────────────────────────
// Abilities
// ─────────────────────────────────────────────────────────────────────────────

export interface AbilityConstraints {
  maxActiveAbilities: number;
  maxPassiveAbilities: number;
  resourceName: 'stamina' | 'mana' | 'sanity' | 'rage' | 'energy' | 'heat';
  resourceMax: number;
  resourceRegenRatePerSec: number;
  allowCombos: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Progression
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgressionBlueprint {
  maxLevel: number;
  xpCurve: 'linear' | 'exponential' | 'flat_milestone';
  xpExponent?: number;
  skillTreeBranches: string[];
  respecEnabled: boolean;
  prestigeEnabled: boolean;
  reputationFactions?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// AI / NPC
// ─────────────────────────────────────────────────────────────────────────────

export interface AIBehaviorProfile {
  complexity: 'simple' | 'tactical' | 'emergent' | 'goap';
  fleeOnLowHealth: boolean;
  callForReinforcements: boolean;
  useCover: boolean;
  memoryDurationMs: number;
  perceptionRange: number;
  factionAlignment: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Blueprint
// ─────────────────────────────────────────────────────────────────────────────

export interface GameplayBlueprint {
  id: string;
  version: 1;
  generatedAt: string;
  sourcePrompt: string;
  narrativeSeed: string;

  coreLoop: 'exploration' | 'combat' | 'crafting' | 'social' | 'puzzle' | 'survival' | 'roguelike' | 'hybrid';
  pillars: string[];
  winCondition: string;
  loseCondition: string;
  progressionFantasy: string;

  combatStyle: CombatStyleBlueprint;
  economy: EconomyBlueprint;
  abilityConstraints: AbilityConstraints;
  progression: ProgressionBlueprint;
  aiBehavior: AIBehaviorProfile;

  /** Generated ability/skill names for this world */
  suggestedAbilities: string[];
  /** World-specific enemy archetypes */
  enemyArchetypes: string[];
  /** Boss encounter templates */
  bossEncounters: string[];

  /** Balance metadata */
  balanceMeta: {
    targetSessionLengthMin: number;
    targetDifficultyRating: 1 | 2 | 3 | 4 | 5;
    coopSupported: boolean;
    pvpSupported: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function createBlankBlueprint(sourcePrompt: string, narrativeSeed: string): GameplayBlueprint {
  return {
    id: `gbp_${Date.now()}`,
    version: 1,
    generatedAt: new Date().toISOString(),
    sourcePrompt,
    narrativeSeed,
    coreLoop: 'exploration',
    pillars: [],
    winCondition: 'Survive and escape',
    loseCondition: 'Character death',
    progressionFantasy: 'From humble beginnings to legendary hero',
    combatStyle: {
      style: 'hack-n-slash',
      damageTypes: ['physical'],
      hasParry: false,
      hasDodge: true,
    },
    economy: {
      model: 'loot',
      currencies: ['gold'],
      deathPenalty: 'xp_loss',
    },
    abilityConstraints: {
      maxActiveAbilities: 4,
      maxPassiveAbilities: 2,
      resourceName: 'mana',
      resourceMax: 100,
      resourceRegenRatePerSec: 2,
      allowCombos: false,
    },
    progression: {
      maxLevel: 30,
      xpCurve: 'exponential',
      xpExponent: 1.5,
      skillTreeBranches: ['Combat', 'Magic', 'Survival'],
      respecEnabled: true,
      prestigeEnabled: false,
    },
    aiBehavior: {
      complexity: 'tactical',
      fleeOnLowHealth: true,
      callForReinforcements: true,
      useCover: false,
      memoryDurationMs: 30_000,
      perceptionRange: 20,
      factionAlignment: 'hostile',
    },
    suggestedAbilities: [],
    enemyArchetypes: [],
    bossEncounters: [],
    balanceMeta: {
      targetSessionLengthMin: 30,
      targetDifficultyRating: 3,
      coopSupported: false,
      pvpSupported: false,
    },
  };
}
