import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export type StudioQualityMode = 'standard' | 'delivery' | 'studio'
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
  qualityMode: StudioQualityMode
  status: StudioSessionStatus
  tasks: StudioTask[]
  agentRuns: StudioAgentRun[]
  messages: StudioSessionMessage[]
  cost: StudioCostSummary
  fullAccessGrants: FullAccessGrant[]
  createdAt: string
  lastActivityAt: string
  endedAt?: string
}

const CONTEXT_KEY = 'studioHome'

type WorkflowRecord = {
  id: string
  userId: string
  projectId: string | null
  context: unknown
  createdAt: Date
  updatedAt: Date
}

function nowIso(): string {
  return new Date().toISOString()
}

function toStringSafe(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return fallback
}

function toNumberSafe(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return n
}

function clampBudget(value: number): number {
  return Math.min(100_000, Math.max(5, Math.round(value)))
}

function stableSeed(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function hasEnoughBudget(session: StudioSession, expectedCost: number): boolean {
  return session.cost.remainingCredits >= expectedCost
}

function isStudioContextContainer(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === 'object' && !Array.isArray(input)
}

function normalizeTask(input: unknown): StudioTask | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Partial<StudioTask>
  if (!raw.id || !raw.title || !raw.ownerRole || !raw.status) return null
  if (!['planner', 'coder', 'reviewer'].includes(raw.ownerRole)) return null
  if (!['queued', 'planning', 'building', 'validating', 'blocked', 'done', 'error'].includes(raw.status)) return null

  const validationVerdict = ['pending', 'passed', 'failed'].includes(String(raw.validationVerdict))
    ? (raw.validationVerdict as StudioValidationVerdict)
    : 'pending'

  return {
    id: String(raw.id),
    title: String(raw.title),
    ownerRole: raw.ownerRole as StudioTaskOwnerRole,
    status: raw.status as StudioTaskStatus,
    estimateCredits: Math.max(0, Math.round(toNumberSafe(raw.estimateCredits, 0))),
    estimateSeconds: Math.max(5, Math.round(toNumberSafe(raw.estimateSeconds, 30))),
    result: typeof raw.result === 'string' ? raw.result : undefined,
    validationVerdict,
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : undefined,
    finishedAt: typeof raw.finishedAt === 'string' ? raw.finishedAt : undefined,
    applyToken: typeof raw.applyToken === 'string' ? raw.applyToken : undefined,
  }
}

function normalizeAgentRun(input: unknown): StudioAgentRun | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Partial<StudioAgentRun>
  if (!raw.id || !raw.taskId || !raw.role || !raw.model || !raw.status || !raw.startedAt || !raw.message) return null
  if (!['planner', 'coder', 'reviewer'].includes(raw.role)) return null
  if (!['running', 'success', 'error'].includes(raw.status)) return null

  return {
    id: String(raw.id),
    taskId: String(raw.taskId),
    role: raw.role as StudioTaskOwnerRole,
    model: String(raw.model),
    status: raw.status as StudioAgentRunStatus,
    tokensIn: Math.max(0, Math.round(toNumberSafe(raw.tokensIn, 0))),
    tokensOut: Math.max(0, Math.round(toNumberSafe(raw.tokensOut, 0))),
    latencyMs: Math.max(1, Math.round(toNumberSafe(raw.latencyMs, 1))),
    cost: Math.max(0, toNumberSafe(raw.cost, 0)),
    startedAt: String(raw.startedAt),
    finishedAt: typeof raw.finishedAt === 'string' ? raw.finishedAt : undefined,
    message: String(raw.message),
  }
}

function normalizeMessage(input: unknown): StudioSessionMessage | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Partial<StudioSessionMessage>
  if (!raw.id || !raw.role || !raw.content || !raw.timestamp) return null
  if (!['user', 'assistant', 'system'].includes(raw.role)) return null

  const message: StudioSessionMessage = {
    id: String(raw.id),
    role: raw.role as 'user' | 'assistant' | 'system',
    content: String(raw.content),
    timestamp: String(raw.timestamp),
  }
  if (raw.agentRole && ['planner', 'coder', 'reviewer'].includes(raw.agentRole)) {
    message.agentRole = raw.agentRole as StudioTaskOwnerRole
  }
  if (raw.status && ['queued', 'planning', 'building', 'validating', 'blocked', 'done', 'error'].includes(raw.status)) {
    message.status = raw.status as StudioTaskStatus
  }
  return message
}

function normalizeFullAccessGrant(input: unknown): FullAccessGrant | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Partial<FullAccessGrant>
  if (!raw.id || !raw.scope || !raw.createdAt || !raw.expiresAt || !raw.auditRef) return null
  if (!['project', 'workspace', 'web_tools'].includes(raw.scope)) return null
  return {
    id: String(raw.id),
    scope: raw.scope as FullAccessScope,
    createdAt: String(raw.createdAt),
    expiresAt: String(raw.expiresAt),
    revokedAt: typeof raw.revokedAt === 'string' ? raw.revokedAt : undefined,
    auditRef: String(raw.auditRef),
  }
}

function computeCost(session: Omit<StudioSession, 'cost'> & { cost?: Partial<StudioCostSummary> }): StudioCostSummary {
  const estimatedCredits = session.tasks.reduce((sum, item) => sum + item.estimateCredits, 0)
  const usedByRuns = session.agentRuns.reduce((sum, item) => sum + item.cost, 0)
  const existingUsed = toNumberSafe(session.cost?.usedCredits, 0)
  const usedCredits = Math.max(existingUsed, Math.round((usedByRuns + Number.EPSILON) * 1000) / 1000)
  const budgetCap = clampBudget(toNumberSafe(session.cost?.budgetCap, estimatedCredits || 30))
  const remainingCredits = Math.max(0, Math.round((budgetCap - usedCredits) * 1000) / 1000)

  return {
    estimatedCredits,
    usedCredits,
    budgetCap,
    remainingCredits,
  }
}

function normalizeSession(raw: unknown, fallback: { id: string; userId: string; projectId: string; createdAt: string }): StudioSession {
  if (!raw || typeof raw !== 'object') {
    const base: StudioSession = {
      id: fallback.id,
      userId: fallback.userId,
      projectId: fallback.projectId,
      mission: 'No mission defined.',
      qualityMode: 'studio',
      status: 'active',
      tasks: [],
      agentRuns: [],
      messages: [],
      cost: { estimatedCredits: 0, usedCredits: 0, budgetCap: 30, remainingCredits: 30 },
      fullAccessGrants: [],
      createdAt: fallback.createdAt,
      lastActivityAt: fallback.createdAt,
    }
    base.cost = computeCost(base)
    return base
  }

  const input = raw as Partial<StudioSession>
  const tasks = Array.isArray(input.tasks) ? input.tasks.map(normalizeTask).filter((item): item is StudioTask => item !== null) : []
  const agentRuns = Array.isArray(input.agentRuns)
    ? input.agentRuns.map(normalizeAgentRun).filter((item): item is StudioAgentRun => item !== null)
    : []
  const messages = Array.isArray(input.messages)
    ? input.messages.map(normalizeMessage).filter((item): item is StudioSessionMessage => item !== null)
    : []
  const fullAccessGrants = Array.isArray(input.fullAccessGrants)
    ? input.fullAccessGrants.map(normalizeFullAccessGrant).filter((item): item is FullAccessGrant => item !== null)
    : []

  const base: StudioSession = {
    id: toStringSafe(input.id, fallback.id),
    userId: toStringSafe(input.userId, fallback.userId),
    projectId: toStringSafe(input.projectId, fallback.projectId),
    mission: toStringSafe(input.mission, 'No mission defined.'),
    qualityMode: ['standard', 'delivery', 'studio'].includes(String(input.qualityMode))
      ? (input.qualityMode as StudioQualityMode)
      : 'studio',
    status: ['active', 'stopped', 'completed'].includes(String(input.status))
      ? (input.status as StudioSessionStatus)
      : 'active',
    tasks,
    agentRuns,
    messages,
    cost: {
      estimatedCredits: Math.max(0, toNumberSafe(input.cost?.estimatedCredits, 0)),
      usedCredits: Math.max(0, toNumberSafe(input.cost?.usedCredits, 0)),
      budgetCap: clampBudget(toNumberSafe(input.cost?.budgetCap, 30)),
      remainingCredits: Math.max(0, toNumberSafe(input.cost?.remainingCredits, 30)),
    },
    fullAccessGrants,
    createdAt: toStringSafe(input.createdAt, fallback.createdAt),
    lastActivityAt: toStringSafe(input.lastActivityAt, fallback.createdAt),
    endedAt: typeof input.endedAt === 'string' ? input.endedAt : undefined,
  }
  base.cost = computeCost(base)
  return base
}

function mergeStudioIntoContext(context: unknown, session: StudioSession): Prisma.InputJsonValue {
  const root = isStudioContextContainer(context) ? { ...context } : {}
  root[CONTEXT_KEY] = session
  return root as unknown as Prisma.InputJsonValue
}

function extractStudioFromContext(context: unknown): unknown {
  if (!isStudioContextContainer(context)) return null
  return context[CONTEXT_KEY] ?? null
}

async function findOwnedWorkflow(userId: string, sessionId: string): Promise<WorkflowRecord | null> {
  const workflow = await prisma.copilotWorkflow.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, userId: true, projectId: true, context: true, createdAt: true, updatedAt: true },
  })
  return workflow as WorkflowRecord | null
}

async function persistSession(workflow: WorkflowRecord, session: StudioSession): Promise<StudioSession> {
  const context = mergeStudioIntoContext(workflow.context, session)
  const updated = await prisma.copilotWorkflow.update({
    where: { id: workflow.id },
    data: {
      context,
      contextVersion: { increment: 1 },
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    },
    select: { id: true, userId: true, projectId: true, context: true, createdAt: true, updatedAt: true },
  })
  return normalizeSession(extractStudioFromContext(updated.context), {
    id: updated.id,
    userId: updated.userId,
    projectId: updated.projectId || 'default',
    createdAt: updated.createdAt.toISOString(),
  })
}

function appendMessage(
  session: StudioSession,
  input: Omit<StudioSessionMessage, 'id' | 'timestamp'>
): StudioSession {
  const next: StudioSession = {
    ...session,
    messages: [
      ...session.messages,
      {
        id: randomUUID(),
        timestamp: nowIso(),
        role: input.role,
        content: input.content,
        ...(input.agentRole ? { agentRole: input.agentRole } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    ],
    lastActivityAt: nowIso(),
  }
  next.cost = computeCost(next)
  return next
}

export async function createStudioSession(params: {
  userId: string
  projectId: string
  mission: string
  qualityMode: StudioQualityMode
  budgetCap: number
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

  session = {
    ...session,
    mission: params.mission,
    qualityMode: params.qualityMode,
    status: 'active',
    projectId: params.projectId,
    cost: {
      estimatedCredits: 0,
      usedCredits: 0,
      budgetCap: clampBudget(params.budgetCap),
      remainingCredits: clampBudget(params.budgetCap),
    },
  }
  session = appendMessage(session, {
    role: 'system',
    content: 'Studio session started. Ready to generate a super plan.',
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

  const tasks: StudioTask[] = [
    {
      id: randomUUID(),
      title: 'Mission decomposition and acceptance criteria',
      ownerRole: 'planner',
      status: 'queued',
      estimateCredits: 4,
      estimateSeconds: 25,
      validationVerdict: 'pending',
    },
    {
      id: randomUUID(),
      title: 'Core implementation patch set',
      ownerRole: 'coder',
      status: 'queued',
      estimateCredits: 8,
      estimateSeconds: 60,
      validationVerdict: 'pending',
    },
    {
      id: randomUUID(),
      title: 'Deterministic review and release readiness',
      ownerRole: 'reviewer',
      status: 'queued',
      estimateCredits: 5,
      estimateSeconds: 35,
      validationVerdict: 'pending',
    },
  ]

  let next: StudioSession = {
    ...current,
    tasks,
    agentRuns: [],
    lastActivityAt: nowIso(),
  }
  next = appendMessage(next, {
    role: 'assistant',
    agentRole: 'planner',
    content: `Super plan created with ${tasks.length} tasks. Budget cap: ${next.cost.budgetCap} credits.`,
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
  const roleModel =
    target.ownerRole === 'planner'
      ? 'gpt-4o-mini'
      : target.ownerRole === 'coder'
        ? 'claude-3-5-haiku-20241022'
        : 'gemini-1.5-flash'

  const baseStatus =
    target.ownerRole === 'planner' ? 'planning' : target.ownerRole === 'coder' ? 'building' : 'validating'
  const finishedAt = nowIso()

  const tokensIn = 640 + (seed % 220)
  const tokensOut = 240 + ((seed >>> 3) % 130)
  const runCost = Math.max(0.1, Math.round((target.estimateCredits * 0.4) * 100) / 100)

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
      ? 'Plan checkpoint completed with acceptance criteria and risk notes. (executionMode=orchestration-only)'
      : target.ownerRole === 'coder'
        ? 'Code proposal drafted for manual IDE apply review. [requires-manual-apply]'
        : 'Review checkpoint completed for proposal. [review-ok]'

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

  let next: StudioSession = {
    ...current,
    tasks,
    agentRuns: [
      ...current.agentRuns,
      {
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
      },
    ],
    lastActivityAt: nowIso(),
  }

  next = appendMessage(next, {
    role: 'assistant',
    agentRole: target.ownerRole,
    content: updatedTask.result || 'Task run complete.',
    status: baseStatus as StudioTaskStatus,
  })

  return persistSession(workflow, next)
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

  const index = current.tasks.findIndex((task) => task.id === taskId)
  if (index === -1) return current
  const target = current.tasks[index]

  const hasResult =
    target.ownerRole === 'reviewer' &&
    Boolean(target.result && target.result.includes('[review-ok]') && target.result.trim().length > 12)
  const verdict: StudioValidationVerdict = hasResult ? 'passed' : 'failed'
  const status: StudioTaskStatus = hasResult ? 'done' : 'error'
  const task: StudioTask = {
    ...target,
    status,
    validationVerdict: verdict,
    finishedAt: nowIso(),
  }

  const tasks = [...current.tasks]
  tasks[index] = task

  let next: StudioSession = { ...current, tasks, lastActivityAt: nowIso() }
  next = appendMessage(next, {
    role: 'assistant',
    agentRole: 'reviewer',
    content: hasResult
      ? `Validation passed for task "${target.title}".`
      : `Validation failed for task "${target.title}". Missing deterministic result payload.`,
    status: 'validating',
  })

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
  const index = current.tasks.findIndex((task) => task.id === taskId)
  if (index === -1) return current

  const target = current.tasks[index]
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
