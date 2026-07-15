/**
 * gameplay-reflection-loop.ts
 *
 * Background validation agent that verifies generated mechanics do not
 * cause infinite status loops, broken economy rules, or unreachable win conditions.
 *
 * Runs as a background worker; integrates with the existing reflection-loop.ts pattern.
 */

import type { GameplayBlueprint } from './gameplay-blueprint';
import type { CombatSystem } from './combat-system-generator';
import type { CompiledAbility } from './ability-graph-compiler';
import { createComponentLogger } from '../../web/lib/observability/logger';
import { telemetry } from '../../web/lib/observability/telemetry';

const log = createComponentLogger('gameplay.reflection');

// ─────────────────────────────────────────────────────────────────────────────
// Issue types
// ─────────────────────────────────────────────────────────────────────────────

export type IssueCategory =
  | 'infinite_loop'
  | 'broken_economy'
  | 'unreachable_win'
  | 'balance_violation'
  | 'resource_drain'
  | 'deadlock_ability'
  | 'missing_lose_condition';

export interface CoherenceIssue {
  category: IssueCategory;
  severity: 'warning' | 'critical';
  description: string;
  affectedSystem: string;
  suggestedFix: string;
}

export interface CoherenceReport {
  passed: boolean;
  issueCount: number;
  criticalCount: number;
  issues: CoherenceIssue[];
  checkedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual rule checkers
// ─────────────────────────────────────────────────────────────────────────────

function checkStatusLoops(abilities: CompiledAbility[]): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];

  // Detect abilities that apply status + have trigger on that status (infinite loop potential)
  const statusAppliers = abilities.filter(a => a.generatorSource.includes("apply_status"));
  const statusTriggers = abilities.filter(a => a.generatorSource.includes("trigger_on_hit") ||
    a.generatorSource.includes("on_status"));

  if (statusAppliers.length > 0 && statusTriggers.length > 0) {
    for (const applier of statusAppliers) {
      for (const trigger of statusTriggers) {
        if (trigger.id !== applier.id) {
          issues.push({
            category: 'infinite_loop',
            severity: 'warning',
            description: `Ability "${applier.name}" applies status while "${trigger.name}" triggers on hit/status. Potential chain loop if they target the same entity.`,
            affectedSystem: `Abilities: ${applier.name} + ${trigger.name}`,
            suggestedFix: 'Add a cooldown or "status not already active" condition to break the loop.',
          });
        }
      }
    }
  }

  return issues;
}

function checkEconomy(blueprint: GameplayBlueprint): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];

  // Economy model vs death penalty
  if (blueprint.economy.model === 'permadeath' && blueprint.progression.respecEnabled) {
    issues.push({
      category: 'broken_economy',
      severity: 'warning',
      description: 'Permadeath economy with respec enabled is contradictory — respec is irrelevant if characters die permanently.',
      affectedSystem: 'Economy + Progression',
      suggestedFix: 'Disable respec for permadeath games or switch economy to roguelike model.',
    });
  }

  // Check resource regeneration vs max cost abilities
  const maxResourceCost = blueprint.abilityConstraints.resourceMax;
  const regenPerSec = blueprint.abilityConstraints.resourceRegenRatePerSec;
  if (regenPerSec === 0 && maxResourceCost > 0) {
    issues.push({
      category: 'resource_drain',
      severity: 'critical',
      description: `Resource regen is 0 but abilities cost up to ${maxResourceCost}. Player will permanently run out of resources.`,
      affectedSystem: 'Ability Constraints',
      suggestedFix: 'Set resourceRegenRatePerSec > 0 or add pickups/items that restore resource.',
    });
  }

  return issues;
}

function checkWinCondition(blueprint: GameplayBlueprint): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];

  if (!blueprint.winCondition || blueprint.winCondition.length < 5) {
    issues.push({
      category: 'unreachable_win',
      severity: 'warning',
      description: 'Win condition is undefined or too vague. Players may not know how to win.',
      affectedSystem: 'Blueprint.winCondition',
      suggestedFix: 'Provide a specific win condition, e.g. "Defeat the Archfiend and escape the realm".',
    });
  }

  if (!blueprint.loseCondition || blueprint.loseCondition.length < 5) {
    issues.push({
      category: 'missing_lose_condition',
      severity: 'warning',
      description: 'Lose condition is undefined. Stakes are unclear.',
      affectedSystem: 'Blueprint.loseCondition',
      suggestedFix: 'Define what causes a game over — character death, time limit, etc.',
    });
  }

  // Roguelike without permadeath is inconsistent
  if (blueprint.coreLoop === 'roguelike' && blueprint.economy.deathPenalty !== 'full_permadeath') {
    issues.push({
      category: 'broken_economy',
      severity: 'warning',
      description: 'Core loop is roguelike but death penalty is not full permadeath. This weakens the roguelike loop.',
      affectedSystem: 'CoreLoop + Economy',
      suggestedFix: 'Set deathPenalty to "full_permadeath" for a true roguelike feel.',
    });
  }

  return issues;
}

function checkCombatBalance(combat: CombatSystem): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];

  // Check TTK
  if (combat.balance.ttk < 0.5) {
    issues.push({
      category: 'balance_violation',
      severity: 'critical',
      description: `Time to Kill (TTK) of ${combat.balance.ttk}s is extremely low. One-shot gameplay is frustrating unless intentional.`,
      affectedSystem: 'CombatSystem.balance',
      suggestedFix: 'Increase base HP or reduce attack damage to achieve TTK > 2s.',
    });
  }

  if (combat.balance.ttk > 120) {
    issues.push({
      category: 'balance_violation',
      severity: 'warning',
      description: `TTK of ${combat.balance.ttk}s is very high. Combat may feel sluggish.`,
      affectedSystem: 'CombatSystem.balance',
      suggestedFix: 'Reduce base HP or increase attack damage.',
    });
  }

  // Souls-like without parry
  if (combat.style === 'souls-like' && !combat.defense.hasParry) {
    issues.push({
      category: 'balance_violation',
      severity: 'warning',
      description: 'Souls-like style without parry reduces the precision skill ceiling.',
      affectedSystem: 'CombatSystem.defense',
      suggestedFix: 'Enable hasParry for souls-like combat style.',
    });
  }

  // Abilities with no cooldown
  if (combat.balance.dps > 300) {
    issues.push({
      category: 'balance_violation',
      severity: 'critical',
      description: `DPS of ${combat.balance.dps} is extremely high. Will trivialize all combat encounters.`,
      affectedSystem: 'CombatSystem.balance',
      suggestedFix: 'Add cooldowns or reduce damage values.',
    });
  }

  return issues;
}

function checkAbilityBalance(abilities: CompiledAbility[]): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];

  for (const ability of abilities) {
    // Balance warnings from compiler
    for (const warning of ability.meta.balanceWarnings) {
      issues.push({
        category: 'balance_violation',
        severity: 'warning',
        description: `Ability "${ability.name}": ${warning}`,
        affectedSystem: `Ability: ${ability.name}`,
        suggestedFix: 'Review damage and cooldown values in the Ability Graph.',
      });
    }

    if (ability.meta.hasCycle) {
      issues.push({
        category: 'deadlock_ability',
        severity: 'critical',
        description: `Ability "${ability.name}" has a cycle in its execution graph — it will deadlock.`,
        affectedSystem: `Ability: ${ability.name}`,
        suggestedFix: 'Remove the cycle in the Ability Graph editor.',
      });
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Reflection Loop
// ─────────────────────────────────────────────────────────────────────────────

export class GameplayReflectionLoop {
  private lastCheckAt = 0;
  private intervalMs: number;

  constructor(intervalMs = 30_000) {
    this.intervalMs = intervalMs;
  }

  /**
   * Run a full coherence check on the gameplay state.
   * Safe to call at any frequency — internally rate-limited.
   */
  async validate(
    blueprint: GameplayBlueprint,
    combat?: CombatSystem,
    abilities?: CompiledAbility[]
  ): Promise<CoherenceReport> {
    const now = Date.now();
    if (now - this.lastCheckAt < this.intervalMs) {
      log.debug('Coherence check skipped — too soon since last check');
    }
    this.lastCheckAt = now;

    const span = telemetry.startSpan('gameplay.coherence.validate');
    const issues: CoherenceIssue[] = [];

    // Run all rule checkers
    issues.push(...checkWinCondition(blueprint));
    issues.push(...checkEconomy(blueprint));

    if (combat) {
      issues.push(...checkCombatBalance(combat));
    }

    if (abilities && abilities.length > 0) {
      issues.push(...checkStatusLoops(abilities));
      issues.push(...checkAbilityBalance(abilities));
    }

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const report: CoherenceReport = {
      passed: criticalCount === 0,
      issueCount: issues.length,
      criticalCount,
      issues,
      checkedAt: new Date().toISOString(),
    };

    telemetry.counter('gameplay.coherence.check').add(1, {
      passed: String(report.passed),
      issueCount: String(issues.length),
    });

    if (!report.passed) {
      log.warn('Gameplay coherence check FAILED', { criticalCount, issueCount: issues.length });
    } else {
      log.info('Gameplay coherence check passed', { issueCount: issues.length });
    }

    span.end(report.passed ? 'ok' : 'error');
    return report;
  }

  /**
   * Start background periodic validation.
   * Returns a cleanup function.
   */
  startBackground(
    getBlueprintFn: () => Promise<GameplayBlueprint | null>,
    onReport?: (report: CoherenceReport) => void
  ): () => void {
    const intervalId = setInterval(async () => {
      const blueprint = await getBlueprintFn();
      if (!blueprint) return;
      const report = await this.validate(blueprint);
      onReport?.(report);
    }, this.intervalMs);

    return () => clearInterval(intervalId);
  }
}

export const gameplayReflectionLoop = new GameplayReflectionLoop(30_000);
