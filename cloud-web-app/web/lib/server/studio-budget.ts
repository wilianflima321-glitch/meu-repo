export type StudioBudgetAlertLevel = 'normal' | 'warning_50' | 'warning_80' | 'hard_stop_100'

export type StudioBudgetAlert = {
  level: StudioBudgetAlertLevel
  percentUsed: number
  thresholdReached: 0 | 50 | 80 | 100
  nextThreshold: 50 | 80 | 100 | null
  message: string
}

export function computeStudioBudgetAlert(cost: {
  budgetCap?: number | null
  usedCredits?: number | null
}): StudioBudgetAlert {
  const budgetCap = Number(cost?.budgetCap ?? 0)
  const usedCredits = Number(cost?.usedCredits ?? 0)
  const safeCap = budgetCap > 0 ? budgetCap : 1
  const percentUsed = Math.max(0, Math.min(999, Math.round((usedCredits / safeCap) * 100)))

  if (percentUsed >= 100) {
    return {
      level: 'hard_stop_100',
      percentUsed,
      thresholdReached: 100,
      nextThreshold: null,
      message: 'Budget exhausted. Variable usage is blocked until credits are restored.',
    }
  }
  if (percentUsed >= 80) {
    return {
      level: 'warning_80',
      percentUsed,
      thresholdReached: 80,
      nextThreshold: 100,
      message: 'Budget above 80%. Prioritize validate/apply or stop session to avoid forced blocking.',
    }
  }
  if (percentUsed >= 50) {
    return {
      level: 'warning_50',
      percentUsed,
      thresholdReached: 50,
      nextThreshold: 80,
      message: 'Budget above 50%. Monitor cost and keep mission scope bounded.',
    }
  }
  return {
    level: 'normal',
    percentUsed,
    thresholdReached: 0,
    nextThreshold: 50,
    message: 'Budget in normal range.',
  }
}
