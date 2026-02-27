import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/db'
import {
  buildCoderCheckpointResult,
  buildDomainChecklist,
  buildPlannerCheckpointResult,
  buildReviewerCheckpointResult,
  canRunTaskWithDependencies,
  evaluateReviewerValidation,
  hasEnoughBudget,
  inferMissionDomain,
  normalizeChecklist,
  normalizeMissionDomain,
  resolveRoleExecutionProfile,
  stableSeed,
} from './studio-home-runtime-helpers'

import {
  appendMessage,
  clampBudget,
  extractStudioFromContext,
  findOwnedWorkflow,
  normalizeSession,
  nowIso,
  persistSession,
} from './studio-home-store-normalizers'
import type { WorkflowRecord } from './studio-home-store-normalizers'


export type StudioQualityMode = 'standard' | 'delivery' | 'studio'
export type StudioMissionDomain = 'games' | 'films' | 'apps' | 'general'
export type StudioSessionStatus = 'active' | 'stopped' | 'completed'
export type StudioTaskOwnerRole = 'planner' | 'coder' | 'reviewer'
export type StudioTaskStatus =
  | 'queued'
  | 'planning'
  | 'building'
  | 'validating'
  | 'blocked'
  | 'done'
  | 'error'

export type StudioValidationVerdict = 'pending' | 'passed' | 'failed'

export type StudioTask = {
  id: string
  title: string
  ownerRole: StudioTaskOwnerRole
  status: StudioTaskStatus
  estimateCredits: number
  estimateSeconds: number
  result?: string
  validationVerdict: StudioValidationVerdict
  validationReport?: {
    totalChecks: number
    failedIds: string[]
    failedMessages: string[]
  }
  startedAt?: string
  finishedAt?: string
  applyToken?: string
}

export type StudioAgentRunStatus = 'running' | 'success' | 'error'
export type StudioAgentRun = {
  id: string
  taskId: string
  role: StudioTaskOwnerRole
  model: string
  status: StudioAgentRunStatus
  tokensIn: number
  tokensOut: number
  latencyMs: number
  cost: number
  startedAt: string
  finishedAt?: string
  message: string
}

export type StudioSessionMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  agentRole?: StudioTaskOwnerRole
  content: string
  timestamp: string
  status?: StudioTaskStatus
}

export type StudioCostSummary = {
  estimatedCredits: number
  usedCredits: number
  budgetCap: number
  remainingCredits: number
}

export type FullAccessScope = 'project' | 'workspace' | 'web_tools'
export type FullAccessGrant = {
  id: string
  scope: FullAccessScope
  createdAt: string
  expiresAt: string
  revokedAt?: string
  auditRef: string
}

export type StudioSession = {
  id: string
  userId: string
  projectId: string
  mission: string
  missionDomain?: StudioMissionDomain
  qualityMode: StudioQualityMode
  qualityChecklist?: string[]
  status: StudioSessionStatus
  tasks: StudioTask[]
  agentRuns: StudioAgentRun[]
  messages: StudioSessionMessage[]
  cost: StudioCostSummary
  fullAccessGrants: FullAccessGrant[]
  orchestration?: {
    mode: 'serial' | 'role_sequenced_wave'
    conversationPolicy: 'peer_review'
    applyPolicy: 'serial_after_validation'
    lastWaveAt?: string
  }
  createdAt: string
  lastActivityAt: string
  endedAt?: string
}

const MAX_STORED_TASKS = 60
const MAX_STORED_AGENT_RUNS = 300

export async function createStudioSession(params: {
  userId: string
  projectId: string
  mission: string
  qualityMode: StudioQualityMode
  budgetCap: number
  missionDomain?: StudioMissionDomain
}): Promise<StudioSession> {
  const created = await prisma.copilotWorkflow.create({
    data: {
      userId: params.userId,
      projectId: params.projectId === 'default' ? null : params.projectId,
      title: `Studio: ${params.mission.slice(0, 80) || 'Mission'}`,
      context: {},
      contextVersion: 1,
      lastUsedAt: new Date(),
    },
    select: { id: true, userId: true, projectId: true, context: true, createdAt: true, updatedAt: true },
  })

  let session = normalizeSession(null, {
    id: created.id,
    userId: created.userId,
    projectId: params.projectId,
    createdAt: created.createdAt.toISOString(),
  })
  const missionDomain = normalizeMissionDomain(params.missionDomain, params.mission)
  const checklist = buildDomainChecklist(missionDomain)

  session = {
    ...session,
    mission: params.mission,
    missionDomain,
    qualityMode: params.qualityMode,
    qualityChecklist: checklist,
    status: 'active',
    projectId: params.projectId,
    orchestration: {
      mode: 'serial',
      conversationPolicy: 'peer_review',
      applyPolicy: 'serial_after_validation',
    },
    cost: {
      estimatedCredits: 0,
      usedCredits: 0,
      budgetCap: clampBudget(params.budgetCap),
      remainingCredits: clampBudget(params.budgetCap),
    },
  }
  session = appendMessage(session, {
    role: 'system',
    content: `Studio session started (${missionDomain}). Ready to generate a super plan.`,
    status: 'queued',
  })

  return persistSession(created as WorkflowRecord, session)
}

export async function getStudioSession(userId: string, sessionId: string): Promise<StudioSession | null> {
  const workflow = await findOwnedWorkflow(userId, sessionId)
  if (!workflow) return null

  return normalizeSession(extractStudioFromContext(workflow.context), {
    id: workflow.id,
    userId: workflow.userId,
    projectId: workflow.projectId || 'default',
    createdAt: workflow.createdAt.toISOString(),
  })
}

export async function stopStudioSession(userId: string, sessionId: string): Promise<StudioSession | null> {
  const workflow = await findOwnedWorkflow(userId, sessionId)
  if (!workflow) return null

  const current = normalizeSession(extractStudioFromContext(workflow.context), {
    id: workflow.id,
    userId: workflow.userId,
    projectId: workflow.projectId || 'default',
    createdAt: workflow.createdAt.toISOString(),
  })

  const next = appendMessage(
    {
      ...current,
      status: 'stopped',
      endedAt: nowIso(),
      lastActivityAt: nowIso(),
    },
    {
      role: 'system',
      content: 'Studio session stopped by user.',
      status: 'blocked',
    }
  )

  return persistSession(workflow, next)
}

export async function planStudioTasks(userId: string, sessionId: string): Promise<StudioSession | null> {
  const workflow = await findOwnedWorkflow(userId, sessionId)
  if (!workflow) return null

  const current = normalizeSession(extractStudioFromContext(workflow.context), {
    id: workflow.id,
    userId: workflow.userId,
    projectId: workflow.projectId || 'default',
    createdAt: workflow.createdAt.toISOString(),
  })
  if (current.status !== 'active') return current

  const missionDomain = current.missionDomain || inferMissionDomain(current.mission)
  const qualityChecklist = normalizeChecklist(current.qualityChecklist, missionDomain)
  const qualityFactor = current.qualityMode === 'studio' ? 1.3 : current.qualityMode === 'delivery' ? 1.1 : 1
  const domainFactor = missionDomain === 'general' ? 1 : 1.15
  const estimateFactor = qualityFactor * domainFactor
  const plannerCredits = Math.max(3, Math.round(4 * estimateFactor))
  const coderCredits = Math.max(5, Math.round(7 * estimateFactor))
  const reviewerCredits = Math.max(4, Math.round(5 * estimateFactor))

  const tasks: StudioTask[] = [
    {
      id: randomUUID(),
      title: `Mission decomposition (${missionDomain}) and acceptance criteria`,
      ownerRole: 'planner',
      status: 'queued',
      estimateCredits: plannerCredits,
      estimateSeconds: Math.max(20, Math.round(24 * estimateFactor)),
      validationVerdict: 'pending',
    },
    {
      id: randomUUID(),
      title: `Core implementation patch set (${missionDomain})`,
      ownerRole: 'coder',
      status: 'queued',
      estimateCredits: coderCredits,
      estimateSeconds: Math.max(45, Math.round(55 * estimateFactor)),
      validationVerdict: 'pending',
    },
    {
      id: randomUUID(),
      title: `Deterministic review and release readiness (${missionDomain})`,
      ownerRole: 'reviewer',
      status: 'queued',
      estimateCredits: reviewerCredits,
      estimateSeconds: Math.max(30, Math.round(35 * estimateFactor)),
      validationVerdict: 'pending',
    },
  ]

  let next: StudioSession = {
    ...current,
    missionDomain,
    qualityChecklist,
    tasks,
    agentRuns: [],
    orchestration: {
      ...(current.orchestration || {
        mode: 'serial',
        conversationPolicy: 'peer_review',
        applyPolicy: 'serial_after_validation',
      }),
      mode: 'role_sequenced_wave',
    },
    lastActivityAt: nowIso(),
  }
  next = appendMessage(next, {
    role: 'assistant',
    agentRole: 'planner',
    content: `Super plan created with ${tasks.length} tasks for ${missionDomain}. Budget cap: ${next.cost.budgetCap} credits.\nChecklist:\n${qualityChecklist
      .map((item) => `- ${item}`)
      .join('\n')}`,
    status: 'planning',
  })

  return persistSession(workflow, next)
}

export async function runStudioTask(userId: string, sessionId: string, taskId: string): Promise<StudioSession | null> {
  const workflow = await findOwnedWorkflow(userId, sessionId)
  if (!workflow) return null

  const current = normalizeSession(extractStudioFromContext(workflow.context), {
    id: workflow.id,
    userId: workflow.userId,
    projectId: workflow.projectId || 'default',
    createdAt: workflow.createdAt.toISOString(),
  })
  if (current.status !== 'active') return current

  const index = current.tasks.findIndex((task) => task.id === taskId)
  if (index === -1) return current

  const target = current.tasks[index]
  const runEligible =
    target.status === 'queued' ||
    target.status === 'blocked' ||
    target.status === 'error' ||
    (target.ownerRole === 'planner' && target.status === 'planning')
  if (!runEligible) return current

  const plannerDone = current.tasks.some((item) => item.ownerRole === 'planner' && item.status === 'done')
  const coderDone = current.tasks.some((item) => item.ownerRole === 'coder' && item.status === 'done')

  if (target.ownerRole === 'coder' && !plannerDone) {
    const tasks = [...current.tasks]
    tasks[index] = {
      ...target,
      status: 'blocked',
      result: 'Blocked: run planner checkpoint first.',
      validationVerdict: 'pending',
      finishedAt: nowIso(),
    }
    let next = appendMessage({ ...current, tasks, lastActivityAt: nowIso() }, {
      role: 'system',
      agentRole: 'coder',
      content: 'Coder checkpoint blocked until planner task is done.',
      status: 'blocked',
    })
    return persistSession(workflow, next)
  }

  if (target.ownerRole === 'reviewer' && !coderDone) {
    const tasks = [...current.tasks]
    tasks[index] = {
      ...target,
      status: 'blocked',
      result: 'Blocked: run coder checkpoint first.',
      validationVerdict: 'pending',
      finishedAt: nowIso(),
    }
    let next = appendMessage({ ...current, tasks, lastActivityAt: nowIso() }, {
      role: 'system',
      agentRole: 'reviewer',
      content: 'Reviewer checkpoint blocked until coder task is done.',
      status: 'blocked',
    })
    return persistSession(workflow, next)
  }

  const startedAt = nowIso()
  const runId = randomUUID()
  const seed = stableSeed(`${target.id}:${target.title}:${target.ownerRole}`)
  const executionProfile = resolveRoleExecutionProfile(current, target.ownerRole, seed)
  const roleModel = executionProfile.model

  const baseStatus =
    target.ownerRole === 'planner' ? 'planning' : target.ownerRole === 'coder' ? 'building' : 'validating'
  const finishedAt = nowIso()

  const tokensIn = executionProfile.tokensIn
  const tokensOut = executionProfile.tokensOut
  const runCost = Math.max(0.1, Math.round((target.estimateCredits * executionProfile.costFactor) * 100) / 100)

  if (!hasEnoughBudget(current, runCost)) {
    const tasks = [...current.tasks]
    tasks[index] = {
      ...target,
      status: 'blocked',
      result: `Blocked: budget cap reached. Needed ${runCost} credits.`,
      validationVerdict: 'pending',
      finishedAt: nowIso(),
    }
    let next = appendMessage({ ...current, tasks, lastActivityAt: nowIso() }, {
      role: 'system',
      content: `Task "${target.title}" blocked: budget exhausted (${current.cost.remainingCredits} credits remaining).`,
      status: 'blocked',
    })
    return persistSession(workflow, next)
  }

  const result =
    target.ownerRole === 'planner'
      ? buildPlannerCheckpointResult(current)
      : target.ownerRole === 'coder'
        ? buildCoderCheckpointResult(current)
        : buildReviewerCheckpointResult(current)

  const updatedTask: StudioTask = {
    ...target,
    status: 'done',
    startedAt,
    finishedAt,
    validationVerdict: 'pending',
    result,
  }

  const tasks = [...current.tasks]
  tasks[index] = updatedTask
  const agentRun: StudioAgentRun = {
    id: runId,
    taskId: target.id,
    role: target.ownerRole,
    model: roleModel,
    status: 'success',
    tokensIn,
    tokensOut,
    latencyMs: Math.max(200, target.estimateSeconds * 120),
    cost: runCost,
    startedAt,
    finishedAt,
    message: updatedTask.result || 'Task run complete.',
  }

  let next: StudioSession = {
    ...current,
    tasks,
    agentRuns: [...current.agentRuns, agentRun].slice(-MAX_STORED_AGENT_RUNS),
    orchestration: {
      ...(current.orchestration || {
        mode: 'serial',
        conversationPolicy: 'peer_review',
        applyPolicy: 'serial_after_validation',
      }),
      lastWaveAt: finishedAt,
    },
    lastActivityAt: nowIso(),
  }

  next = appendMessage(next, {
    role: 'assistant',
    agentRole: target.ownerRole,
    content: updatedTask.result || 'Task run complete.',
    status: baseStatus as StudioTaskStatus,
  })

  if (target.ownerRole === 'coder') {
    const plannerHints = (current.qualityChecklist || []).slice(0, 2).map((item) => `- ${item}`).join('\n')
    next = appendMessage(next, {
      role: 'system',
      agentRole: 'planner',
      content: `Planner critique for coder handoff:\n${plannerHints || '- Keep deterministic scope and rollback readiness.'}`,
      status: 'validating',
    })
  }

  if (target.ownerRole === 'reviewer') {
    next = appendMessage(next, {
      role: 'assistant',
      agentRole: 'reviewer',
      content:
        'Reviewer summary: planner scope preserved, coder proposal bounded, apply remains serial and gated by explicit validation.',
      status: 'done',
    })
  }

  return persistSession(workflow, next)
}

export async function runStudioWave(
  userId: string,
  sessionId: string,
  options?: { maxSteps?: number; strategy?: 'balanced' | 'cost_guarded' | 'quality_first' }
): Promise<{
  session: StudioSession | null
  executedTaskIds: string[]
  blockedTaskIds: string[]
  strategy: 'balanced' | 'cost_guarded' | 'quality_first'
  maxStepsApplied: number
  strategyReason: string
}> {
  const strategy = options?.strategy === 'cost_guarded' || options?.strategy === 'quality_first'
    ? options.strategy
    : 'balanced'
  const session = await getStudioSession(userId, sessionId)
  if (!session) {
    return {
      session: null,
      executedTaskIds: [],
      blockedTaskIds: [],
      strategy,
      maxStepsApplied: 0,
      strategyReason: 'session-not-found',
    }
  }
  if (session.status !== 'active') {
    return {
      session,
      executedTaskIds: [],
      blockedTaskIds: [],
      strategy,
      maxStepsApplied: 0,
      strategyReason: 'session-not-active',
    }
  }
  let activeSession: StudioSession = session

  const requestedMaxSteps = Math.max(1, Math.min(3, Math.floor(options?.maxSteps ?? 3)))
  const budgetRatio = activeSession.cost.budgetCap > 0
    ? activeSession.cost.remainingCredits / activeSession.cost.budgetCap
    : 1
  const maxSteps = (() => {
    if (strategy === 'quality_first') return 1
    if (strategy === 'cost_guarded') {
      return Math.max(1, Math.min(requestedMaxSteps, budgetRatio <= 0.2 ? 1 : 2))
    }
    return requestedMaxSteps
  })()
  const strategyReason =
    strategy === 'quality_first'
      ? 'quality-first-single-step'
      : strategy === 'cost_guarded'
        ? budgetRatio <= 0.2
          ? 'budget-pressure-hard-cap'
          : 'budget-pressure-soft-cap'
        : 'balanced-requested-steps'
  const roleOrder: StudioTaskOwnerRole[] = ['planner', 'coder', 'reviewer']
  const executedTaskIds: string[] = []
  const blockedTaskIds: string[] = []

  for (const role of roleOrder) {
    if (executedTaskIds.length + blockedTaskIds.length >= maxSteps) break
    const candidate = activeSession.tasks.find(
      (task) => task.ownerRole === role && canRunTaskWithDependencies(task, activeSession.tasks)
    )
    if (!candidate) continue

    const next = await runStudioTask(userId, sessionId, candidate.id)
    if (!next) break
    const updatedTask = next.tasks.find((item) => item.id === candidate.id)
    if (updatedTask?.status === 'done') {
      executedTaskIds.push(candidate.id)
    } else if (updatedTask?.status === 'blocked' || updatedTask?.status === 'error') {
      blockedTaskIds.push(candidate.id)
    }
    activeSession = next
    if (activeSession.status !== 'active') break
  }

  return {
    session: activeSession,
    executedTaskIds,
    blockedTaskIds,
    strategy,
    maxStepsApplied: maxSteps,
    strategyReason,
  }
}

export async function validateStudioTask(userId: string, sessionId: string, taskId: string): Promise<StudioSession | null> {
  const workflow = await findOwnedWorkflow(userId, sessionId)
  if (!workflow) return null
  const current = normalizeSession(extractStudioFromContext(workflow.context), {
    id: workflow.id,
    userId: workflow.userId,
    projectId: workflow.projectId || 'default',
    createdAt: workflow.createdAt.toISOString(),
  })
  if (current.status !== 'active') return current

  const index = current.tasks.findIndex((task) => task.id === taskId)
  if (index === -1) return current
  const target = current.tasks[index]
  if (target.ownerRole !== 'reviewer') return current
  if (target.status !== 'done') return current
  if (target.validationVerdict !== 'pending') return current

  const validation = evaluateReviewerValidation(current, target.result)
  const { checks, failedChecks, passed } = validation
  const verdict: StudioValidationVerdict = passed ? 'passed' : 'failed'
  const status: StudioTaskStatus = passed ? 'done' : 'error'
  const task: StudioTask = {
    ...target,
    status,
    validationVerdict: verdict,
    validationReport: {
      totalChecks: checks.length,
      failedIds: failedChecks.map((item) => item.id),
      failedMessages: failedChecks.map((item) => item.message),
    },
    result: `${target.result || ''}\n[validation:${passed ? 'passed' : 'failed'}]`,
    finishedAt: nowIso(),
  }

  const tasks = [...current.tasks]
  tasks[index] = task

  let next: StudioSession = { ...current, tasks, lastActivityAt: nowIso() }
  next = appendMessage(next, {
    role: 'assistant',
    agentRole: 'reviewer',
    content: passed
      ? `Validation passed for task "${target.title}". Checks: ${checks.length}/${checks.length}.`
      : `Validation failed for task "${target.title}". Failed checks: ${failedChecks.map((item) => item.id).join(', ')}.`,
    status: 'validating',
  })
  if (!passed) {
    next = appendMessage(next, {
      role: 'system',
      agentRole: 'reviewer',
      content: `Validation report:\n${failedChecks.map((item) => `- ${item.message}`).join('\n')}`,
      status: 'error',
    })
  }

  return persistSession(workflow, next)
}

export async function applyStudioTask(userId: string, sessionId: string, taskId: string): Promise<StudioSession | null> {
  const workflow = await findOwnedWorkflow(userId, sessionId)
  if (!workflow) return null
  const current = normalizeSession(extractStudioFromContext(workflow.context), {
    id: workflow.id,
    userId: workflow.userId,
    projectId: workflow.projectId || 'default',
    createdAt: workflow.createdAt.toISOString(),
  })
  if (current.status !== 'active') return current
  const index = current.tasks.findIndex((task) => task.id === taskId)
  if (index === -1) return current

  const target = current.tasks[index]
  if (target.applyToken) return current
  if (target.validationVerdict !== 'passed' || target.ownerRole !== 'reviewer') return current

  const applyToken = `apply_${randomUUID()}`
  const task: StudioTask = {
    ...target,
    applyToken,
    status: 'done',
    finishedAt: nowIso(),
  }

  const tasks = [...current.tasks]
  tasks[index] = task

  let next: StudioSession = { ...current, tasks, lastActivityAt: nowIso() }
  next = appendMessage(next, {
    role: 'assistant',
    agentRole: 'reviewer',
    content: `Apply completed for task "${target.title}" with rollback token ${applyToken}.`,
    status: 'done',
  })

  return persistSession(workflow, next)
}

export async function rollbackStudioTask(
  userId: string,
  sessionId: string,
  taskId: string,
  applyToken?: string
): Promise<StudioSession | null> {
  const workflow = await findOwnedWorkflow(userId, sessionId)
  if (!workflow) return null
  const current = normalizeSession(extractStudioFromContext(workflow.context), {
    id: workflow.id,
    userId: workflow.userId,
    projectId: workflow.projectId || 'default',
    createdAt: workflow.createdAt.toISOString(),
  })
  if (current.status !== 'active') return current
  const index = current.tasks.findIndex((task) => task.id === taskId)
  if (index === -1) return current

  const target = current.tasks[index]
  const canRollback = Boolean(target.applyToken && (!applyToken || applyToken === target.applyToken))
  if (!canRollback) return current

  const task: StudioTask = {
    ...target,
    status: 'blocked',
    applyToken: undefined,
    validationVerdict: 'pending',
    validationReport: undefined,
    finishedAt: nowIso(),
  }
  const tasks = [...current.tasks]
  tasks[index] = task

  let next: StudioSession = { ...current, tasks, lastActivityAt: nowIso() }
  next = appendMessage(next, {
    role: 'assistant',
    agentRole: 'reviewer',
    content: `Rollback completed for task "${target.title}".`,
    status: 'blocked',
  })

  return persistSession(workflow, next)
}

export async function createFullAccessGrant(
  userId: string,
  sessionId: string,
  scope: FullAccessScope,
  ttlMinutes: number
): Promise<StudioSession | null> {
  const workflow = await findOwnedWorkflow(userId, sessionId)
  if (!workflow) return null
  const current = normalizeSession(extractStudioFromContext(workflow.context), {
    id: workflow.id,
    userId: workflow.userId,
    projectId: workflow.projectId || 'default',
    createdAt: workflow.createdAt.toISOString(),
  })
  if (current.status !== 'active') return current
  const now = new Date()
  const expiresAt = new Date(now.getTime() + Math.max(1, ttlMinutes) * 60_000)
  const grant: FullAccessGrant = {
    id: randomUUID(),
    scope,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    auditRef: `studio_access_${Date.now().toString(36)}`,
  }

  let next: StudioSession = {
    ...current,
    fullAccessGrants: [...current.fullAccessGrants.filter((item) => !item.revokedAt), grant],
    lastActivityAt: nowIso(),
  }
  next = appendMessage(next, {
    role: 'system',
    content: `Full Access grant enabled (${scope}) until ${grant.expiresAt}.`,
    status: 'building',
  })

  return persistSession(workflow, next)
}

export async function revokeFullAccessGrant(
  userId: string,
  sessionId: string,
  grantId: string
): Promise<StudioSession | null> {
  const workflow = await findOwnedWorkflow(userId, sessionId)
  if (!workflow) return null
  const current = normalizeSession(extractStudioFromContext(workflow.context), {
    id: workflow.id,
    userId: workflow.userId,
    projectId: workflow.projectId || 'default',
    createdAt: workflow.createdAt.toISOString(),
  })

  const fullAccessGrants = current.fullAccessGrants.map((item) =>
    item.id === grantId ? { ...item, revokedAt: nowIso() } : item
  )

  let next: StudioSession = {
    ...current,
    fullAccessGrants,
    lastActivityAt: nowIso(),
  }
  next = appendMessage(next, {
    role: 'system',
    content: `Full Access grant revoked (${grantId}).`,
    status: 'blocked',
  })

  return persistSession(workflow, next)
}
