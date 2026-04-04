import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

export type TaskStatus = 'pending' | 'planned' | 'running' | 'blocked' | 'failed' | 'done'

export type TaskStepStatus = 'pending' | 'running' | 'blocked' | 'failed' | 'done'

export interface TaskStep {
  id: string
  title: string
  status: TaskStepStatus
  startedAt?: string
  finishedAt?: string
  notes?: string
}

export interface TaskLogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  metadata?: Record<string, unknown>
}

export interface TaskRecord {
  id: string
  userId: string
  projectId?: string
  goal: string
  status: TaskStatus
  steps: TaskStep[]
  logs: TaskLogEntry[]
  result?: Record<string, unknown>
  error?: string
  createdAt: string
  updatedAt: string
}

type CreateTaskInput = {
  userId: string
  projectId?: string
  goal: string
  steps: TaskStep[]
}

const TASK_ROOT = process.env.AETHEL_TASK_ROOT
  ? path.resolve(process.env.AETHEL_TASK_ROOT)
  : path.resolve(process.cwd(), '.aethel', 'tasks')

function nowIso(): string {
  return new Date().toISOString()
}

function buildTaskId(): string {
  return `task_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`
}

function taskDir(userId: string): string {
  return path.join(TASK_ROOT, userId)
}

function taskPath(userId: string, taskId: string): string {
  return path.join(taskDir(userId), `${taskId}.json`)
}

async function ensureTaskDir(userId: string): Promise<void> {
  await fs.mkdir(taskDir(userId), { recursive: true })
}

export async function createTask(input: CreateTaskInput): Promise<TaskRecord> {
  const id = buildTaskId()
  const timestamp = nowIso()
  const record: TaskRecord = {
    id,
    userId: input.userId,
    projectId: input.projectId,
    goal: input.goal,
    status: 'planned',
    steps: input.steps,
    logs: [
      {
        timestamp,
        level: 'info',
        message: 'Task created.',
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await ensureTaskDir(input.userId)
  await fs.writeFile(taskPath(input.userId, id), JSON.stringify(record, null, 2), 'utf8')
  return record
}

export async function loadTask(userId: string, taskId: string): Promise<TaskRecord | null> {
  const raw = await fs.readFile(taskPath(userId, taskId), 'utf8').catch(() => null)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TaskRecord
  } catch {
    return null
  }
}

export async function saveTask(record: TaskRecord): Promise<void> {
  record.updatedAt = nowIso()
  await ensureTaskDir(record.userId)
  await fs.writeFile(taskPath(record.userId, record.id), JSON.stringify(record, null, 2), 'utf8')
}

export async function appendTaskLog(
  record: TaskRecord,
  entry: Omit<TaskLogEntry, 'timestamp'> & { timestamp?: string }
): Promise<TaskRecord> {
  const next: TaskLogEntry = {
    timestamp: entry.timestamp || nowIso(),
    level: entry.level,
    message: entry.message,
    metadata: entry.metadata,
  }
  record.logs.push(next)
  record.updatedAt = nowIso()
  await saveTask(record)
  return record
}

export async function updateTaskStatus(
  record: TaskRecord,
  status: TaskStatus,
  extra?: { error?: string; result?: Record<string, unknown> }
): Promise<TaskRecord> {
  record.status = status
  if (extra?.error) record.error = extra.error
  if (extra?.result) record.result = extra.result
  record.updatedAt = nowIso()
  await saveTask(record)
  return record
}

export async function updateTaskStep(
  record: TaskRecord,
  stepId: string,
  updates: Partial<TaskStep> & { status?: TaskStepStatus }
): Promise<TaskRecord> {
  const idx = record.steps.findIndex((step) => step.id === stepId)
  if (idx >= 0) {
    record.steps[idx] = { ...record.steps[idx], ...updates }
    record.updatedAt = nowIso()
    await saveTask(record)
  }
  return record
}

export function buildBaselineSteps(): TaskStep[] {
  const makeStep = (title: string): TaskStep => ({
    id: crypto.randomUUID(),
    title,
    status: 'pending',
  })
  return [
    makeStep('Contexto e escopo'),
    makeStep('Gerar patch'),
    makeStep('Validar QA'),
    makeStep('Aplicar mudanças'),
    makeStep('Verificar resultado'),
  ]
}
