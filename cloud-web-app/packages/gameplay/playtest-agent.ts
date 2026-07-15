/**
 * playtest-agent.ts
 *
 * AI playtester that navigates generated worlds, tests mechanics,
 * evaluates balance parameters, and logs exceptions.
 *
 * Operates as a headless simulation — does NOT require a live renderer.
 * Uses the GameplayBlueprint and CombatSystem as the simulation model.
 */

import type { GameplayBlueprint } from './gameplay-blueprint';
import type { CombatSystem } from './combat-system-generator';
import type { FullProgressionBlueprint } from './progression-blueprint';
import { createComponentLogger } from '../../web/lib/observability/logger';
import { telemetry } from '../../web/lib/observability/telemetry';

const log = createComponentLogger('playtest.agent');

// ─────────────────────────────────────────────────────────────────────────────
// Simulation State
// ─────────────────────────────────────────────────────────────────────────────

export interface SimPlayerState {
  level: number;
  hp: number;
  maxHp: number;
  resource: number;
  maxResource: number;
  xp: number;
  gold: number;
  statusEffects: string[];
  combosExecuted: number;
  deathCount: number;
  killCount: number;
  sessionTimeMs: number;
}

export interface SimEnemyState {
  id: string;
  archetype: string;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  statusEffects: string[];
}

export interface PlaytestEncounter {
  encounterId: string;
  enemyArchetypes: string[];
  durationMs: number;
  playerDeaths: number;
  damageDealt: number;
  damageTaken: number;
  abilitiesUsed: string[];
  won: boolean;
  notes: string[];
}

export interface PlaytestReport {
  blueprintId: string;
  runId: string;
  totalTimeMs: number;
  encounters: PlaytestEncounter[];
  balanceIssues: string[];
  crashEvents: string[];
  reachableAreas: string[];
  unreachableAreas: string[];
  averageTTK: number;
  averagePlayerTTD: number; // Time to Die
  economyHealth: 'depleted' | 'balanced' | 'surplus';
  finalPlayerState: SimPlayerState;
  recommendation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation math helpers
// ─────────────────────────────────────────────────────────────────────────────

function simDamage(attacker: 'player' | 'enemy', combat: CombatSystem, level: number): number {
  const base = combat.balance.baseAttackDamage;
  const levelMod = 1 + (level - 1) * 0.05;
  const variance = 0.8 + Math.random() * 0.4;
  return attacker === 'player'
    ? base * levelMod * variance
    : base * 0.7 * variance; // enemies deal slightly less
}

function computeTTK(enemyHp: number, playerDPS: number): number {
  return playerDPS > 0 ? enemyHp / playerDPS : 999;
}

// ─────────────────────────────────────────────────────────────────────────────
// Playtest Agent
// ─────────────────────────────────────────────────────────────────────────────

export class PlaytestAgent {
  private maxEncounters: number;
  private maxDeathsPerEncounter: number;

  constructor(config: { maxEncounters?: number; maxDeathsPerEncounter?: number } = {}) {
    this.maxEncounters = config.maxEncounters ?? 10;
    this.maxDeathsPerEncounter = config.maxDeathsPerEncounter ?? 3;
  }

  async runPlaytest(
    blueprint: GameplayBlueprint,
    combat: CombatSystem,
    progression: FullProgressionBlueprint
  ): Promise<PlaytestReport> {
    const span = telemetry.startSpan('playtest.run', { blueprintId: blueprint.id });
    const runId = `pt_${Date.now()}`;
    const startTime = Date.now();

    log.info('Starting playtest run', { runId, blueprintId: blueprint.id });

    const player: SimPlayerState = {
      level: 1,
      hp: combat.balance.basePlayerHP,
      maxHp: combat.balance.basePlayerHP,
      resource: blueprint.abilityConstraints.resourceMax,
      maxResource: blueprint.abilityConstraints.resourceMax,
      xp: 0,
      gold: 0,
      statusEffects: [],
      combosExecuted: 0,
      deathCount: 0,
      killCount: 0,
      sessionTimeMs: 0,
    };

    const encounters: PlaytestEncounter[] = [];
    const balanceIssues: string[] = [];
    const crashEvents: string[] = [];
    const reachableAreas: string[] = ['starting_zone'];

    // Simulate N encounters
    for (let e = 0; e < this.maxEncounters; e++) {
      const archetypeIdx = e % blueprint.enemyArchetypes.length;
      const archetype = blueprint.enemyArchetypes[archetypeIdx] ?? 'Grunt';

      const encounter = await this.simulateEncounter(
        player, archetype, combat, blueprint, e
      );
      encounters.push(encounter);

      // Advance progression
      const xpGain = Math.round(combat.balance.baseEnemyHP * 0.5);
      player.xp += xpGain;
      const targetLevel = progression.levelCurve.findIndex(l => l.cumulativeXP > player.xp);
      if (targetLevel > 0 && targetLevel > player.level) {
        player.level = targetLevel;
        const levelData = progression.levelCurve[targetLevel - 1]!;
        player.maxHp += levelData.statBonus.hp;
        player.hp = player.maxHp; // Full heal on level up
      }

      // Add economy rewards
      player.gold += Math.round(Math.random() * 50 + 20);

      // Track area reachability based on player level
      if (player.level >= 5 && !reachableAreas.includes('mid_zone')) {
        reachableAreas.push('mid_zone');
      }
      if (player.level >= 15 && !reachableAreas.includes('late_zone')) {
        reachableAreas.push('late_zone');
      }

      // Balance issue detection
      if (encounter.playerDeaths >= this.maxDeathsPerEncounter) {
        balanceIssues.push(`Encounter ${e + 1} (${archetype}): Player died ${encounter.playerDeaths} times — too difficult at level ${player.level}.`);
      }
      if (encounter.durationMs < 500 && encounter.won) {
        balanceIssues.push(`Encounter ${e + 1} (${archetype}): Trivially short — may need more HP or damage scaling.`);
      }
    }

    // Evaluate final economy state
    const expectedGold = this.maxEncounters * 35;
    const economyHealth: PlaytestReport['economyHealth'] =
      player.gold < expectedGold * 0.5 ? 'depleted' :
      player.gold > expectedGold * 2 ? 'surplus' : 'balanced';

    if (economyHealth !== 'balanced') {
      balanceIssues.push(`Economy is ${economyHealth}: ${player.gold} gold vs expected ~${expectedGold}.`);
    }

    // Unreachable areas
    const unreachableAreas = ['boss_arena', 'secret_vault'].filter(a => !reachableAreas.includes(a));

    const avgTTK = encounters.reduce((s, e) => s + e.durationMs, 0) / (encounters.length * 1000) || 0;
    const avgTTD = player.deathCount > 0 ? (Date.now() - startTime) / player.deathCount : 999;

    const report: PlaytestReport = {
      blueprintId: blueprint.id,
      runId,
      totalTimeMs: Date.now() - startTime,
      encounters,
      balanceIssues,
      crashEvents,
      reachableAreas,
      unreachableAreas,
      averageTTK: Math.round(avgTTK * 100) / 100,
      averagePlayerTTD: Math.round(avgTTD),
      economyHealth,
      finalPlayerState: player,
      recommendation: this.buildRecommendation(balanceIssues, economyHealth, reachableAreas, unreachableAreas),
    };

    telemetry.counter('playtest.completed').add(1, {
      blueprintId: blueprint.id,
      balanceIssues: String(balanceIssues.length),
    });

    span.end('ok');
    log.info('Playtest complete', { runId, balanceIssues: balanceIssues.length });

    return report;
  }

  private async simulateEncounter(
    player: SimPlayerState,
    archetype: string,
    combat: CombatSystem,
    blueprint: GameplayBlueprint,
    encounterIndex: number
  ): Promise<PlaytestEncounter> {
    const enemy: SimEnemyState = {
      id: `enemy_${encounterIndex}`,
      archetype,
      hp: combat.balance.baseEnemyHP * (1 + encounterIndex * 0.1),
      maxHp: combat.balance.baseEnemyHP * (1 + encounterIndex * 0.1),
      isAlive: true,
      statusEffects: [],
    };

    const notes: string[] = [];
    let playerDeaths = 0;
    let damageDealt = 0;
    let damageTaken = 0;
    const abilitiesUsed: string[] = [];
    const encounterStart = Date.now();
    let won = false;
    let iterations = 0;
    const maxIterations = 200;

    while (enemy.isAlive && player.hp > 0 && iterations < maxIterations) {
      iterations++;

      // Player attacks
      const playerDmg = simDamage('player', combat, player.level);
      enemy.hp -= playerDmg;
      damageDealt += playerDmg;

      // Use an ability occasionally
      if (iterations % 3 === 0 && player.resource >= 20) {
        const ability = blueprint.suggestedAbilities[Math.floor(Math.random() * blueprint.suggestedAbilities.length)];
        if (ability) {
          abilitiesUsed.push(ability);
          enemy.hp -= playerDmg * 1.5;
          damageDealt += playerDmg * 1.5;
          player.resource -= 20;
        }
      }

      // Resource regen
      player.resource = Math.min(player.maxResource,
        player.resource + blueprint.abilityConstraints.resourceRegenRatePerSec / 60);

      if (enemy.hp <= 0) {
        enemy.isAlive = false;
        won = true;
        player.killCount++;
        break;
      }

      // Enemy attacks
      const enemyDmg = simDamage('enemy', combat, player.level);
      player.hp -= enemyDmg;
      damageTaken += enemyDmg;

      if (player.hp <= 0) {
        playerDeaths++;
        player.deathCount++;

        if (playerDeaths >= this.maxDeathsPerEncounter) {
          notes.push(`Player exceeded max deaths (${this.maxDeathsPerEncounter}) — encounter failed.`);
          break;
        }

        // Respawn with reduced HP
        player.hp = player.maxHp * 0.5;
        const deathPenaltyXP = Math.round(player.xp * 0.05);
        player.xp = Math.max(0, player.xp - deathPenaltyXP);
      }
    }

    if (iterations >= maxIterations) {
      notes.push('Encounter timed out — possible infinite loop in combat simulation.');
    }

    return {
      encounterId: `enc_${encounterIndex}`,
      enemyArchetypes: [archetype],
      durationMs: Date.now() - encounterStart,
      playerDeaths,
      damageDealt: Math.round(damageDealt),
      damageTaken: Math.round(damageTaken),
      abilitiesUsed: [...new Set(abilitiesUsed)],
      won,
      notes,
    };
  }

  private buildRecommendation(
    issues: string[],
    economy: PlaytestReport['economyHealth'],
    reachable: string[],
    unreachable: string[]
  ): string {
    const parts: string[] = [];

    if (issues.length === 0) {
      parts.push('Playtest passed — no critical balance issues detected.');
    } else {
      parts.push(`${issues.length} balance issues detected.`);
    }

    if (economy === 'depleted') parts.push('Economy needs more currency rewards.');
    if (economy === 'surplus') parts.push('Economy is too generous — reduce gold drops.');
    if (unreachable.length > 0) parts.push(`Unreachable areas: ${unreachable.join(', ')} — may need level gating adjustments.`);
    if (reachable.length < 2) parts.push('Too few areas reachable — expand mid/late game content gates.');

    return parts.join(' ');
  }
}

export const playtestAgent = new PlaytestAgent();
