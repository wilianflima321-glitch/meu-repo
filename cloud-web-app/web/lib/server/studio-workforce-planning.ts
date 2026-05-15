import { planAgentWorkforceForMission } from '@/lib/production/agent-workforce-topology'

function includesAny(input: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(input))
}

export function buildStudioTaskWorkforcePlan(input: {
  goal: string
  agentCount?: number
  planConcurrencyLimit?: number
  maxCostUsd?: number | null
}) {
  const text = input.goal.toLowerCase()
  return planAgentWorkforceForMission({
    mission: input.goal,
    itemCount: input.agentCount ?? 1,
    planConcurrencyLimit: input.planConcurrencyLimit,
    maxCostUsd: input.maxCostUsd ?? null,
    requiresBrowser: includesAny(text, [/browser/, /chrome/, /login/, /checkout/, /navigate/, /site/, /website/]),
    requiresWrites: includesAny(text, [/write/, /edit/, /implement/, /fix/, /build/, /create/, /refactor/, /delete/, /apply/]),
    requiresRelease: includesAny(text, [/deploy/, /release/, /publish/, /production/, /rollback/, /ship/]),
    requiresExternalAccounts: includesAny(text, [/account/, /billing/, /stripe/, /github/, /hugging face/, /vercel/, /brokerage/, /bank/]),
    requiresHeavyRuntime: includesAny(text, [/render/, /shader/, /asset/, /indexing/, /viewport/, /game/, /film/, /video/, /build/, /playtest/]),
  })
}
