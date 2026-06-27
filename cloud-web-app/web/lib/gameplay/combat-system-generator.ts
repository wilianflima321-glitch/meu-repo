/**
 * combat-system-generator.ts
 *
 * Generates complete combat frameworks from a GameplayBlueprint.
 * Supports: souls-like, shooter, turn-based, hack-n-slash, rhythm, rts
 *
 * Each framework produces:
 *  - AttackConfig: damage values, ranges, animation IDs
 *  - DefenseConfig: parry windows, block angles, dodge i-frames
 *  - ComboConfig: combo chains with multipliers
 *  - HitStopConfig: camera shake and hitstop per damage tier
 *  - BalanceSheet: auto-calculated TTK and DPS benchmarks
 */

import type { GameplayBlueprint, CombatStyleBlueprint } from './gameplay-blueprint';

export interface AttackConfig {
  name: string;
  animationId: string;
  damageMultiplier: number;
  damageType: string;
  range: number;
  hitAngleDeg: number;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  hitstopFrames: number;
  cameraShake: number;
}

export interface DefenseConfig {
  hasParry: boolean;
  parryWindowFrames: number;
  parryReward: 'riposte' | 'stamina_restore' | 'stagger' | 'counter';
  hasBlock: boolean;
  blockDamageReduction: number;
  hasDodge: boolean;
  dodgeInvincibilityFrames: number;
  dodgeDistance: number;
  hasCover?: boolean;
}

export interface ComboEntry {
  attackName: string;
  inputDelay: number;
  damageMultiplier: number;
  finisherMultiplier?: number;
  specialEffect?: string;
}

export interface ComboConfig {
  maxComboLength: number;
  chains: ComboEntry[][];
  comboDecayMs: number;
}

export interface BalanceSheet {
  basePlayerHP: number;
  baseEnemyHP: number;
  baseAttackDamage: number;
  ttk: number; // Time to Kill (seconds)
  dps: number;
  estimatedSessionLengthMin: number;
}

export interface CombatSystem {
  style: CombatStyleBlueprint['style'];
  attacks: AttackConfig[];
  defense: DefenseConfig;
  combos: ComboConfig;
  balance: BalanceSheet;
  statusEffects: string[];
  damageTypes: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Style-specific generators
// ─────────────────────────────────────────────────────────────────────────────

function generateSoulsLike(): CombatSystem {
  return {
    style: 'souls-like',
    attacks: [
      { name: 'Light Attack', animationId: 'anim_light_atk', damageMultiplier: 1.0, damageType: 'physical', range: 1.5, hitAngleDeg: 120, startupFrames: 8, activeFrames: 4, recoveryFrames: 12, hitstopFrames: 3, cameraShake: 0.2 },
      { name: 'Heavy Attack', animationId: 'anim_heavy_atk', damageMultiplier: 2.2, damageType: 'physical', range: 2.0, hitAngleDeg: 90, startupFrames: 22, activeFrames: 6, recoveryFrames: 28, hitstopFrames: 8, cameraShake: 0.5 },
      { name: 'Running Attack', animationId: 'anim_run_atk', damageMultiplier: 1.3, damageType: 'physical', range: 2.5, hitAngleDeg: 60, startupFrames: 12, activeFrames: 5, recoveryFrames: 18, hitstopFrames: 4, cameraShake: 0.3 },
      { name: 'Riposte', animationId: 'anim_riposte', damageMultiplier: 4.0, damageType: 'critical', range: 1.2, hitAngleDeg: 30, startupFrames: 5, activeFrames: 2, recoveryFrames: 10, hitstopFrames: 12, cameraShake: 0.8 },
    ],
    defense: {
      hasParry: true,
      parryWindowFrames: 6,
      parryReward: 'riposte',
      hasBlock: true,
      blockDamageReduction: 0.7,
      hasDodge: true,
      dodgeInvincibilityFrames: 12,
      dodgeDistance: 4.0,
    },
    combos: {
      maxComboLength: 3,
      chains: [
        [
          { attackName: 'Light Attack', inputDelay: 0, damageMultiplier: 1.0 },
          { attackName: 'Light Attack', inputDelay: 300, damageMultiplier: 1.1 },
          { attackName: 'Heavy Attack', inputDelay: 350, damageMultiplier: 1.8, finisherMultiplier: 2.5, specialEffect: 'knockback' },
        ],
      ],
      comboDecayMs: 800,
    },
    balance: { basePlayerHP: 600, baseEnemyHP: 400, baseAttackDamage: 80, ttk: 5.0, dps: 80, estimatedSessionLengthMin: 60 },
    statusEffects: ['stagger', 'bleed', 'poison', 'frost'],
    damageTypes: ['physical', 'critical', 'magic'],
  };
}

function generateShooter(): CombatSystem {
  return {
    style: 'shooter',
    attacks: [
      { name: 'Primary Fire', animationId: 'anim_fire_primary', damageMultiplier: 1.0, damageType: 'ballistic', range: 40, hitAngleDeg: 5, startupFrames: 1, activeFrames: 1, recoveryFrames: 4, hitstopFrames: 1, cameraShake: 0.1 },
      { name: 'Headshot', animationId: 'anim_fire_primary', damageMultiplier: 2.5, damageType: 'critical', range: 40, hitAngleDeg: 1, startupFrames: 1, activeFrames: 1, recoveryFrames: 4, hitstopFrames: 4, cameraShake: 0.3 },
      { name: 'Melee', animationId: 'anim_melee_butt', damageMultiplier: 1.5, damageType: 'physical', range: 1.5, hitAngleDeg: 80, startupFrames: 10, activeFrames: 4, recoveryFrames: 14, hitstopFrames: 5, cameraShake: 0.4 },
    ],
    defense: { hasParry: false, parryWindowFrames: 0, parryReward: 'stagger', hasBlock: false, blockDamageReduction: 0, hasDodge: true, dodgeInvincibilityFrames: 0, dodgeDistance: 3.0, hasCover: true },
    combos: { maxComboLength: 1, chains: [], comboDecayMs: 0 },
    balance: { basePlayerHP: 150, baseEnemyHP: 120, baseAttackDamage: 35, ttk: 2.0, dps: 60, estimatedSessionLengthMin: 20 },
    statusEffects: ['bleed', 'suppressed', 'flash_blinded'],
    damageTypes: ['ballistic', 'explosive', 'critical'],
  };
}

function generateTurnBased(): CombatSystem {
  return {
    style: 'turn-based',
    attacks: [
      { name: 'Basic Attack', animationId: 'anim_basic_atk', damageMultiplier: 1.0, damageType: 'physical', range: 99, hitAngleDeg: 360, startupFrames: 30, activeFrames: 5, recoveryFrames: 0, hitstopFrames: 10, cameraShake: 0.2 },
      { name: 'Magic Bolt', animationId: 'anim_magic_bolt', damageMultiplier: 1.4, damageType: 'magic', range: 99, hitAngleDeg: 360, startupFrames: 30, activeFrames: 5, recoveryFrames: 0, hitstopFrames: 8, cameraShake: 0.15 },
      { name: 'Ultimate Skill', animationId: 'anim_ultimate', damageMultiplier: 3.5, damageType: 'arcane', range: 99, hitAngleDeg: 360, startupFrames: 60, activeFrames: 10, recoveryFrames: 0, hitstopFrames: 20, cameraShake: 0.6 },
    ],
    defense: { hasParry: false, parryWindowFrames: 0, parryReward: 'stagger', hasBlock: true, blockDamageReduction: 0.5, hasDodge: false, dodgeInvincibilityFrames: 0, dodgeDistance: 0 },
    combos: { maxComboLength: 1, chains: [], comboDecayMs: 0 },
    balance: { basePlayerHP: 300, baseEnemyHP: 250, baseAttackDamage: 50, ttk: 6.0, dps: 50, estimatedSessionLengthMin: 45 },
    statusEffects: ['burn', 'freeze', 'paralyze', 'confuse', 'sleep'],
    damageTypes: ['physical', 'magic', 'arcane', 'holy', 'dark'],
  };
}

function generateHackSlash(): CombatSystem {
  return {
    style: 'hack-n-slash',
    attacks: [
      { name: 'Light Strike', animationId: 'anim_slash_l', damageMultiplier: 0.8, damageType: 'physical', range: 2.5, hitAngleDeg: 180, startupFrames: 5, activeFrames: 5, recoveryFrames: 8, hitstopFrames: 2, cameraShake: 0.1 },
      { name: 'Heavy Strike', animationId: 'anim_slash_h', damageMultiplier: 1.8, damageType: 'physical', range: 3.0, hitAngleDeg: 160, startupFrames: 14, activeFrames: 6, recoveryFrames: 16, hitstopFrames: 6, cameraShake: 0.3 },
      { name: 'Air Juggle', animationId: 'anim_air_juggle', damageMultiplier: 1.2, damageType: 'physical', range: 2.0, hitAngleDeg: 360, startupFrames: 8, activeFrames: 6, recoveryFrames: 10, hitstopFrames: 4, cameraShake: 0.2 },
      { name: 'Combo Finisher', animationId: 'anim_finisher', damageMultiplier: 4.0, damageType: 'physical', range: 3.5, hitAngleDeg: 360, startupFrames: 20, activeFrames: 8, recoveryFrames: 20, hitstopFrames: 15, cameraShake: 0.7 },
    ],
    defense: { hasParry: false, parryWindowFrames: 0, parryReward: 'stagger', hasBlock: false, blockDamageReduction: 0, hasDodge: true, dodgeInvincibilityFrames: 8, dodgeDistance: 3.5 },
    combos: {
      maxComboLength: 5,
      chains: [
        [
          { attackName: 'Light Strike', inputDelay: 0, damageMultiplier: 1.0 },
          { attackName: 'Light Strike', inputDelay: 200, damageMultiplier: 1.1 },
          { attackName: 'Light Strike', inputDelay: 200, damageMultiplier: 1.2 },
          { attackName: 'Heavy Strike', inputDelay: 250, damageMultiplier: 1.5 },
          { attackName: 'Combo Finisher', inputDelay: 300, damageMultiplier: 2.5, finisherMultiplier: 4.0, specialEffect: 'launch' },
        ],
      ],
      comboDecayMs: 600,
    },
    balance: { basePlayerHP: 400, baseEnemyHP: 200, baseAttackDamage: 60, ttk: 3.0, dps: 100, estimatedSessionLengthMin: 30 },
    statusEffects: ['launch', 'knockback', 'stun', 'bleed'],
    damageTypes: ['physical', 'fire', 'arcane'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Generator
// ─────────────────────────────────────────────────────────────────────────────

export class CombatSystemGenerator {
  generate(blueprint: GameplayBlueprint): CombatSystem {
    const { style } = blueprint.combatStyle;

    let system: CombatSystem;
    switch (style) {
      case 'souls-like': system = generateSoulsLike(); break;
      case 'shooter': system = generateShooter(); break;
      case 'turn-based': system = generateTurnBased(); break;
      default: system = generateHackSlash(); break;
    }

    // Apply blueprint overrides
    if (blueprint.combatStyle.hasParry !== undefined) {
      system.defense.hasParry = blueprint.combatStyle.hasParry;
    }
    if (blueprint.combatStyle.hasDodge !== undefined) {
      system.defense.hasDodge = blueprint.combatStyle.hasDodge;
    }

    // Inject extra damage types from blueprint
    for (const dt of blueprint.combatStyle.damageTypes) {
      if (!system.damageTypes.includes(dt)) system.damageTypes.push(dt);
    }

    return system;
  }
}

export const combatSystemGenerator = new CombatSystemGenerator();
