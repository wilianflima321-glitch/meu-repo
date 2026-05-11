import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

export type StudioSessionStatus = 'active' | 'stopped'

export type StudioSessionMode = 'mission' | 'app' | 'game' | 'film' | 'audio' | 'research' | 'release'

export type StudioSessionRuntimeTarget = 'local-native' | 'local-worker' | 'local-main-safe' | 'cloud-sandbox' | 'held'

export interface StudioSessionLogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  metadata?: Record<string, unknown>
}

export interface StudioSessionRecord {
  id: string
  userId: string
  projectId?: string
  title: string
  mission: string
  mode: StudioSessionMode
  status: StudioSessionStatus
  runtimeTarget: StudioSessionRuntimeTarget
  activeTaskIds: string[]
  evidenceRefs: string[]
  logs: StudioSessionLogEntry[]
  createdAt: string
  updatedAt: string
  stoppedAt?: string
  stopReason?: string
}

export interface CreateStudioSessionInput {
  userId: string
  projectId?: string
  title?: string
  mission: string
  mode?: string
  runtimeTarget?: string
}

const SESSION_ROOT = process.env.AETHEL_STUDIO_SESSION_ROOT
  ? path.resolve(process.env.AETHEL_STUDIO_SESSION_ROOT)
  : path.resolve(process.cwd(), '.aethel', 'studio-sessions')

const VALID_MODES: StudioSessionMode[] = ['mission', 'app', 'game', 'film', 'audio', 'research', 'release']
const VALID_RUNTIME_TARGETS: StudioSessionRuntimeTarget[] = [
  'local-native',
  'local-worker',
  'local-main-safe',
  'cloud-sandbox',
  'held',
]

function nowIso(): string {
  return new Date().toISOString()
}

function makeSessionId(): string {
  return `studio_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`
}

function sessionDir(userId: string): string {
  return path.join(SESSION_ROOT, userId)
}

function sessionPath(userId: string, sessionId: string): string {
  return path.join(sessionDir(userId), `${sessionId}.json`)
}

function normalizeMode(value?: string): StudioSessionMode {
  if (value && VALID_MODES.includes(value as StudioSessionMode)) return value as StudioSessionMode
  return 'mission'
}

function normalizeRuntimeTarget(value?: string): StudioSessionRuntimeTarget {
  if (value && VALID_RUNTIME_TARGETS.includes(value as StudioSessionRuntimeTarget)) {
    return value as StudioSessionRuntimeTarget
  }
  return 'cloud-sandbox'
}

function compactTitle(mission: string, title?: string): string {
  const candidate = title?.trim() || mission.trim()
  return candidate.length > 80 ? `${candidate.slice(0, 77)}...` : candidate
}

async function ensureSessionDir(userId: string): Promise<void> {
  await fs.mkdir(sessionDir(userId), { recursive: true })
}

export async function createStudioSession(input: CreateStudioSessionInput): Promise<StudioSessionRecord> {
  const mission = input.mission.trim()
  if (!mission) {
    throw Object.assign(new Error('Mission is required to start a Studio session.'), { code: 'INVALID_STUDIO_MISSION' })
  }

  const timestamp = nowIso()
  const mode = normalizeMode(input.mode)
  const runtimeTarget = normalizeRuntimeTarget(input.runtimeTarget)
  const record: StudioSessionRecord = {
    id: makeSessionId(),
    userId: input.userId,
    projectId: input.projectId,
    title: compactTitle(mission, input.title),
    mission,
    mode,
    status: 'active',
    runtimeTarget,
    activeTaskIds: [],
    evidenceRefs: [],
    logs: [
      {
        timestamp,
        level: 'info',
        message: 'Studio session started.',
        metadata: { mode, runtimeTarget },
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await ensureSessionDir(input.userId)
  await fs.writeFile(sessionPath(input.userId, record.id), JSON.stringify(record, null, 2), 'utf8')
  return record
}

export async function loadStudioSession(userId: string, sessionId: string): Promise<StudioSessionRecord | null> {
  const raw = await fs.readFile(sessionPath(userId, sessionId), 'utf8').catch(() => null)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StudioSessionRecord
  } catch {
    return null
  }
}

export async function saveStudioSession(record: StudioSessionRecord): Promise<void> {
  record.updatedAt = nowIso()
  await ensureSessionDir(record.userId)
  await fs.writeFile(sessionPath(record.userId, record.id), JSON.stringify(record, null, 2), 'utf8')
}

export async function appendStudioSessionLog(
  record: StudioSessionRecord,
  entry: Omit<StudioSessionLogEntry, 'timestamp'> & { timestamp?: string }
): Promise<StudioSessionRecord> {
  record.logs.push({
    timestamp: entry.timestamp || nowIso(),
    level: entry.level,
    message: entry.message,
    metadata: entry.metadata,
  })
  await saveStudioSession(record)
  return record
}

export async function attachStudioSessionTask(
  record: StudioSessionRecord,
  taskId: string,
  evidenceRef?: string
): Promise<StudioSessionRecord> {
  if (!record.activeTaskIds.includes(taskId)) record.activeTaskIds.push(taskId)
  if (evidenceRef && !record.evidenceRefs.includes(evidenceRef)) record.evidenceRefs.push(evidenceRef)
  await appendStudioSessionLog(record, {
    level: 'info',
    message: 'Task attached to Studio session.',
    metadata: { taskId, evidenceRef },
  })
  return record
}

export async function stopStudioSession(
  record: StudioSessionRecord,
  options?: { reason?: string }
): Promise<StudioSessionRecord> {
  if (record.status === 'stopped') return record
  const timestamp = nowIso()
  record.status = 'stopped'
  record.stoppedAt = timestamp
  record.stopReason = options?.reason?.trim() || 'User stopped the Studio session.'
  record.logs.push({
    timestamp,
    level: 'warning',
    message: 'Studio session stopped.',
    metadata: {
      reason: record.stopReason,
      activeTaskIds: record.activeTaskIds,
    },
  })
  await saveStudioSession(record)
  return record
}
