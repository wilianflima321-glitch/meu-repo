import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const SNAPSHOT_ROOT = path.resolve(process.cwd(), '.aethel', 'change-rollback')
const DEFAULT_ROLLBACK_TTL_SECONDS = 24 * 60 * 60
const MAX_PURGE_FILES = 200

export interface RollbackSnapshotRecord {
  token: string
  userId: string
  projectId: string
  filePath: string
  absolutePath: string
  beforeContent: string
  beforeHash: string
  afterHash: string
  createdAt: string
  expiresAt: string
  usedAt?: string
}

function sanitizeToken(token: string): string | null {
  const trimmed = String(token || '').trim()
  if (!trimmed) return null
  if (!/^[a-zA-Z0-9._-]{16,128}$/.test(trimmed)) return null
  return trimmed
}

function getSnapshotPath(token: string): string {
  return path.join(SNAPSHOT_ROOT, `${token}.json`)
}

function getRollbackTtlSeconds(): number {
  const configured = Number.parseInt(process.env.AETHEL_CHANGE_ROLLBACK_TTL_SECONDS || '', 10)
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_ROLLBACK_TTL_SECONDS
  return Math.max(60, Math.min(configured, 7 * 24 * 60 * 60))
}

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

async function ensureSnapshotRoot(): Promise<void> {
  await fs.mkdir(SNAPSHOT_ROOT, { recursive: true })
}

export async function purgeExpiredRollbackSnapshots(limit = MAX_PURGE_FILES): Promise<void> {
  await ensureSnapshotRoot()
  const files = await fs.readdir(SNAPSHOT_ROOT).catch(() => [])
  if (files.length === 0) return

  const now = Date.now()
  let removed = 0
  for (const name of files) {
    if (removed >= limit) break
    if (!name.endsWith('.json')) continue
    const filePath = path.join(SNAPSHOT_ROOT, name)
    const raw = await fs.readFile(filePath, 'utf8').catch(() => null)
    if (!raw) continue
    let parsed: RollbackSnapshotRecord | null = null
    try {
      parsed = JSON.parse(raw) as RollbackSnapshotRecord
    } catch {
      parsed = null
    }

    if (!parsed?.expiresAt) continue
    if (Number.isNaN(new Date(parsed.expiresAt).getTime())) continue
    if (new Date(parsed.expiresAt).getTime() >= now) continue

    await fs.unlink(filePath).catch(() => {})
    removed += 1
  }
}

export async function createRollbackSnapshot(input: {
  userId: string
  projectId: string
  filePath: string
  absolutePath: string
  beforeContent: string
  afterContent: string
}): Promise<RollbackSnapshotRecord> {
  await purgeExpiredRollbackSnapshots()
  await ensureSnapshotRoot()

  const token = `rbk_${Date.now().toString(36)}_${crypto.randomBytes(12).toString('hex')}`
  const now = Date.now()
  const expiresAt = new Date(now + getRollbackTtlSeconds() * 1000).toISOString()
  const record: RollbackSnapshotRecord = {
    token,
    userId: input.userId,
    projectId: input.projectId,
    filePath: input.filePath,
    absolutePath: input.absolutePath,
    beforeContent: input.beforeContent,
    beforeHash: hashContent(input.beforeContent),
    afterHash: hashContent(input.afterContent),
    createdAt: new Date(now).toISOString(),
    expiresAt,
  }

  await fs.writeFile(getSnapshotPath(token), JSON.stringify(record), 'utf8')
  return record
}

export async function loadRollbackSnapshot(token: string): Promise<RollbackSnapshotRecord | null> {
  const sanitized = sanitizeToken(token)
  if (!sanitized) return null
  const filePath = getSnapshotPath(sanitized)
  const raw = await fs.readFile(filePath, 'utf8').catch(() => null)
  if (!raw) return null
  try {
    return JSON.parse(raw) as RollbackSnapshotRecord
  } catch {
    return null
  }
}

export async function markRollbackSnapshotUsed(
  token: string,
  updates?: Partial<Pick<RollbackSnapshotRecord, 'usedAt'>>
): Promise<void> {
  const record = await loadRollbackSnapshot(token)
  if (!record) return
  const next: RollbackSnapshotRecord = {
    ...record,
    usedAt: updates?.usedAt || new Date().toISOString(),
  }
  await fs.writeFile(getSnapshotPath(record.token), JSON.stringify(next), 'utf8')
}
