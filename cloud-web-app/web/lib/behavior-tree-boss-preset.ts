import type { BehaviorTree, BehaviorTreeBuilder } from './behavior-tree';

type BehaviorTreeBuilderCtor = new () => BehaviorTreeBuilder;

/**
 * Extracted boss preset builder to keep `behavior-tree.ts` focused on core runtime nodes.
 */
export function createBossBehaviorTree(Builder: BehaviorTreeBuilderCtor): BehaviorTree {
  return new Builder()
    .selector('Root')
      // Phase 3: Enraged (low health)
      .sequence('EnragedPhase')
        .condition('Phase3', (ctx) => {
          const entity = ctx.entity as { health?: number };
          return (entity.health ?? 100) < 30;
        })
        .repeater('AggressiveAttacks', 3)
          .sequence('AggressiveCombo')
            .findNearestEnemy('FindTarget', 30)
            .moveToTarget('Rush', 'target', 10)
            .attack('HeavyAttack', 30, 3)
            .wait('ShortPause', 0.3)
          .end()
        .end()
        .wait('CatchBreath', 2)
      .end()
      // Phase 2: Defensive (medium health)
      .sequence('DefensivePhase')
        .condition('Phase2', (ctx) => {
          const entity = ctx.entity as { health?: number };
          return (entity.health ?? 100) < 60;
        })
        .selector('DefensiveBehavior')
          .sequence('CounterAttack')
            .distanceCondition('PlayerClose', 'target', '<', 3)
            .action('Block', () => 'success')
            .wait('BlockDuration', 0.5)
            .attack('CounterAttack', 20, 3)
          .end()
          .sequence('KeepDistance')
            .distanceCondition('TooClose', 'target', '<', 5)
            .flee('BackOff', 'target', 4, 8)
          .end()
        .end()
      .end()
      // Phase 1: Normal (high health)
      .sequence('NormalPhase')
        .findNearestEnemy('FindTarget', 25)
        .selector('NormalAttacks')
          .sequence('MeleeCombo')
            .distanceCondition('InMeleeRange', 'target', '<=', 3)
            .attack('Slash1', 15, 3)
            .wait('ComboDelay', 0.3)
            .attack('Slash2', 15, 3)
            .wait('RecoveryDelay', 1)
          .end()
          .moveToTarget('Approach', 'target', 6)
        .end()
      .end()
    .end()
    .build();
}

export function createCowardBehaviorTree(
  Builder: BehaviorTreeBuilderCtor,
  options: { fleeHealthThreshold?: number; fleeSpeed?: number } = {},
): BehaviorTree {
  const { fleeHealthThreshold = 30, fleeSpeed = 7 } = options;

  return new Builder()
    .selector('Root')
      // Flee when low health
      .sequence('FleeSequence')
        .condition('LowHealth', (ctx) => {
          const entity = ctx.entity as { health?: number };
          return (entity.health ?? 100) < fleeHealthThreshold;
        })
        .findNearestEnemy('FindThreat', 20)
        .flee('Flee', 'target', fleeSpeed, 25)
      .end()
      // Otherwise, attack
      .sequence('AttackSequence')
        .findNearestEnemy('FindTarget', 15)
        .moveToTarget('Chase', 'target', 5)
        .attack('Attack', 10, 2)
      .end()
    .end()
    .build();
}
