import type { BudgetViolation, PerformanceBudget, ProfilerFrame } from './profiler-contracts';

export function collectBudgetViolations(
  frame: ProfilerFrame,
  budgets: PerformanceBudget[],
): BudgetViolation[] {
  const violations: BudgetViolation[] = [];

  for (const budget of budgets) {
    const value = budget.metric === 'frameTime'
      ? frame.duration
      : frame.metrics[budget.metric];

    if (value > budget.critical) {
      violations.push({ budget, actualValue: value, frameNumber: frame.frameNumber, severity: 'critical' });
    } else if (value > budget.limit) {
      violations.push({ budget, actualValue: value, frameNumber: frame.frameNumber, severity: 'warning' });
    }
  }

  return violations;
}
