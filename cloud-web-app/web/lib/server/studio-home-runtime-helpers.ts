import type {
  StudioMissionDomain,
  StudioSession,
  StudioTask,
  StudioTaskOwnerRole,
} from './studio-home-store'

export function inferMissionDomain(mission: string): StudioMissionDomain {
  const lower = mission.toLowerCase()
  const gameTokens = ['game', 'jogo', 'level', 'npc', 'gameplay', 'shader', '3d', 'unity', 'unreal']
  const filmTokens = ['film', 'filme', 'video', 'trailer', 'shot', 'scene', 'timeline', 'editing', 'render']
  const appTokens = ['app', 'api', 'backend', 'frontend', 'dashboard', 'web', 'mobile', 'saas', 'crud']
  if (gameTokens.some((token) => lower.includes(token))) return 'games'
  if (filmTokens.some((token) => lower.includes(token))) return 'films'
  if (appTokens.some((token) => lower.includes(token))) return 'apps'
  return 'general'
}

export function buildDomainChecklist(domain: StudioMissionDomain): string[] {
  if (domain === 'games') {
    return [
      'Deterministic gameplay logic and state transitions',
      'Asset import/runtime smoke pass with explicit fallback',
      'Frame-time and memory constraints documented',
    ]
  }
  if (domain === 'films') {
    return [
      'Temporal consistency rules for sequence outputs',
      'Explicit render/export constraints and fallback',
      'Audio/video sync validation before publish',
    ]
  }
  if (domain === 'apps') {
    return [
      'Multi-file dependency impact reviewed before apply',
      'Error/empty/loading and keyboard-focus states explicit',
      'Security and API contract checks for changed surfaces',
    ]
  }
  return [
    'Scope and acceptance criteria explicitly defined',
    'Validation gates before apply with rollback path',
    'Cost/latency envelope kept inside budget cap',
  ]
}

export function normalizeMissionDomain(input: unknown, mission: string): StudioMissionDomain {
  const value = String(input || '').trim().toLowerCase()
  if (value === 'games' || value === 'films' || value === 'apps' || value === 'general') {
    return value
  }
  return inferMissionDomain(mission)
}

export function normalizeChecklist(input: unknown, domain: StudioMissionDomain): string[] {
  if (Array.isArray(input)) {
    const list = input
      .filter((item) => typeof item === 'string')
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 8)
    if (list.length > 0) return list
  }
  return buildDomainChecklist(domain)
}

function getCostPressure(session: StudioSession): 'normal' | 'high' {
  const budget = Math.max(1, session.cost.budgetCap)
  const remainingRatio = session.cost.remainingCredits / budget
  return remainingRatio <= 0.3 ? 'high' : 'normal'
}

export function resolveRoleExecutionProfile(
  session: StudioSession,
  role: StudioTaskOwnerRole,
  seed: number
): {
  model: string
  tokensIn: number
  tokensOut: number
  costFactor: number
} {
  const costPressure = getCostPressure(session)
  const economy = costPressure === 'high'
  if (session.qualityMode === 'standard' || economy) {
    const baseModel =
      role === 'planner'
        ? 'gpt-4o-mini'
        : role === 'coder'
          ? 'claude-3-5-haiku-20241022'
          : 'gemini-1.5-flash'
    return {
      model: baseModel,
      tokensIn: 360 + (seed % 160),
      tokensOut: 120 + ((seed >>> 2) % 100),
      costFactor: 0.26,
    }
  }
  if (session.qualityMode === 'delivery') {
    return {
      model:
        role === 'planner'
          ? 'gpt-4o-mini'
          : role === 'coder'
            ? 'claude-3-5-haiku-20241022'
            : 'gemini-1.5-flash',
      tokensIn: 560 + (seed % 220),
      tokensOut: 210 + ((seed >>> 3) % 140),
      costFactor: 0.38,
    }
  }
  return {
    model:
      role === 'planner'
        ? 'gpt-4o'
        : role === 'coder'
          ? 'claude-3-5-sonnet-20241022'
          : 'gemini-1.5-pro',
    tokensIn: 760 + (seed % 260),
    tokensOut: 280 + ((seed >>> 4) % 180),
    costFactor: 0.52,
  }
}

export function buildPlannerCheckpointResult(session: StudioSession): string {
  const checklist = (session.qualityChecklist || []).slice(0, 3).map((item) => `- ${item}`).join('\n')
  return [
    `Planner checkpoint for ${session.missionDomain || 'general'} completed.`,
    'Acceptance criteria and risk notes prepared for coder/reviewer handoff.',
    checklist || '- No domain checklist available.',
    '(executionMode=orchestration-only)',
  ].join('\n')
}

export function buildCoderCheckpointResult(session: StudioSession): string {
  const checklist = (session.qualityChecklist || []).slice(0, 2).map((item) => `- ${item}`).join('\n')
  return [
    `Coder checkpoint completed for ${session.missionDomain || 'general'}.`,
    'Generated change proposal with impact boundaries and deterministic handoff.',
    checklist || '- Quality checklist unavailable.',
    '[requires-manual-apply]',
  ].join('\n')
}

export function buildReviewerCheckpointResult(session: StudioSession): string {
  const domainTag = session.missionDomain || 'general'
  return [
    `Reviewer checkpoint completed for ${session.missionDomain || 'general'}.`,
    'Cross-agent critique captured (planner -> coder -> reviewer).',
    'Validation readiness asserted for apply gate.',
    `[domain:${domainTag}]`,
    '[review-ok]',
  ].join('\n')
}

export function getDomainChecklistTokens(domain: StudioMissionDomain): string[] {
  if (domain === 'games') return ['gameplay', 'asset', 'frame']
  if (domain === 'films') return ['temporal', 'audio', 'render']
  if (domain === 'apps') return ['dependency', 'security', 'error']
  return ['scope', 'validation', 'cost']
}

export function hasDomainChecklistCoverage(
  checklist: string[] | undefined,
  domain: StudioMissionDomain
): boolean {
  if (!Array.isArray(checklist) || checklist.length === 0) return false
  const merged = checklist.join(' ').toLowerCase()
  const expected = getDomainChecklistTokens(domain)
  return expected.every((token) => merged.includes(token))
}

export type ReviewerValidationCheck = {
  id: string
  ok: boolean
  message: string
}

export function evaluateReviewerValidation(
  session: StudioSession,
  reviewerResult?: string
): {
  missionDomain: StudioMissionDomain
  checks: ReviewerValidationCheck[]
  failedChecks: ReviewerValidationCheck[]
  passed: boolean
} {
  const missionDomain = session.missionDomain || inferMissionDomain(session.mission)
  const checks: ReviewerValidationCheck[] = [
    {
      id: 'review_marker',
      ok: Boolean(reviewerResult && reviewerResult.includes('[review-ok]') && reviewerResult.trim().length > 12),
      message: 'Reviewer checkpoint marker missing.',
    },
    {
      id: 'domain_marker',
      ok: Boolean(reviewerResult && reviewerResult.includes(`[domain:${missionDomain}]`)),
      message: `Reviewer result must include domain marker [domain:${missionDomain}].`,
    },
    {
      id: 'planner_done',
      ok: session.tasks.some((item) => item.ownerRole === 'planner' && item.status === 'done'),
      message: 'Planner checkpoint must be done before validation.',
    },
    {
      id: 'coder_done',
      ok: session.tasks.some((item) => item.ownerRole === 'coder' && item.status === 'done'),
      message: 'Coder checkpoint must be done before validation.',
    },
    {
      id: 'runs_by_role',
      ok: (['planner', 'coder', 'reviewer'] as StudioTaskOwnerRole[]).every((role) =>
        session.agentRuns.some((run) => run.role === role && run.status === 'success')
      ),
      message: 'Successful agent runs are required for planner/coder/reviewer.',
    },
    {
      id: 'quality_checklist',
      ok: Array.isArray(session.qualityChecklist) && session.qualityChecklist.length > 0,
      message: 'Quality checklist must be defined before validation.',
    },
    {
      id: 'quality_checklist_domain_coverage',
      ok: hasDomainChecklistCoverage(session.qualityChecklist, missionDomain),
      message: `Quality checklist coverage is insufficient for domain "${missionDomain}".`,
    },
    {
      id: 'mission_domain',
      ok: Boolean(session.missionDomain),
      message: 'Mission domain must be resolved before validation.',
    },
    {
      id: 'budget_cap',
      ok: session.cost.usedCredits <= session.cost.budgetCap,
      message: 'Session exceeded budget cap.',
    },
  ]
  const failedChecks = checks.filter((item) => !item.ok)
  return {
    missionDomain,
    checks,
    failedChecks,
    passed: failedChecks.length === 0,
  }
}

export function canRunTaskWithDependencies(task: StudioTask, allTasks: StudioTask[]): boolean {
  const runEligible =
    task.status === 'queued' ||
    task.status === 'blocked' ||
    task.status === 'error' ||
    (task.ownerRole === 'planner' && task.status === 'planning')
  if (!runEligible) return false
  if (task.ownerRole === 'coder') {
    return allTasks.some((item) => item.ownerRole === 'planner' && item.status === 'done')
  }
  if (task.ownerRole === 'reviewer') {
    return allTasks.some((item) => item.ownerRole === 'coder' && item.status === 'done')
  }
  return true
}

export function stableSeed(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export function hasEnoughBudget(session: StudioSession, expectedCost: number): boolean {
  return session.cost.remainingCredits >= expectedCost
}
