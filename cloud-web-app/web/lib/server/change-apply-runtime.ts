import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

type RollbackSnapshot = {
  token: string
  userId: string
  projectId: string
  filePath: string
  content: string
  expectedCurrentHash?: string
  createdAt: string
  expiresAt: string
}

const SNAPSHOT_TTL_MS = 30 * 60 * 1000
const snapshotStore = new Map<string, RollbackSnapshot>()
const SNAPSHOT_ROOT = path.join(os.tmpdir(), 'aethel-runtime', 'rollback-snapshots')

function nowIso(): string {
  return new Date().toISOString()
}

function isExpired(snapshot: RollbackSnapshot): boolean {
  return Date.parse(snapshot.expiresAt) <= Date.now()
}

function ensureSnapshotRoot(): void {
  try {
    fs.mkdirSync(SNAPSHOT_ROOT, { recursive: true })
  } catch {
    // best-effort; in-memory store remains authoritative fallback
  }
}

function snapshotFilePath(token: string): string {
  return path.join(SNAPSHOT_ROOT, `${token}.json`)
}

function persistSnapshot(snapshot: RollbackSnapshot): void {
  try {
    ensureSnapshotRoot()
    fs.writeFileSync(snapshotFilePath(snapshot.token), JSON.stringify(snapshot), 'utf8')
  } catch {
    // best-effort persistence only
  }
}

function deleteSnapshot(token: string): void {
  try {
    fs.rmSync(snapshotFilePath(token), { force: true })
  } catch {
    // no-op
  }
}

function loadSnapshot(token: string): RollbackSnapshot | null {
  try {
    const raw = fs.readFileSync(snapshotFilePath(token), 'utf8')
    const parsed = JSON.parse(raw) as RollbackSnapshot
    if (!parsed || parsed.token !== token) return null
    return parsed
  } catch {
    return null
  }
}

export function pruneExpiredSnapshots(): void {
  for (const [token, snapshot] of snapshotStore.entries()) {
    if (isExpired(snapshot)) {
      snapshotStore.delete(token)
      deleteSnapshot(token)
    }
  }
}

export function createRollbackSnapshot(input: {
  userId: string
  projectId: string
  filePath: string
  content: string
  expectedCurrentHash?: string
}): RollbackSnapshot {
  pruneExpiredSnapshots()
  const token = crypto.randomUUID()
  const createdAt = nowIso()
  const expiresAt = new Date(Date.now() + SNAPSHOT_TTL_MS).toISOString()
  const snapshot: RollbackSnapshot = {
    token,
    userId: input.userId,
    projectId: input.projectId,
    filePath: input.filePath,
    content: input.content,
    expectedCurrentHash: input.expectedCurrentHash,
    createdAt,
    expiresAt,
  }
  snapshotStore.set(token, snapshot)
  persistSnapshot(snapshot)
  return snapshot
}

export function consumeRollbackSnapshot(token: string, userId: string): RollbackSnapshot | null {
  const snapshot = getRollbackSnapshot(token, userId)
  if (!snapshot) return null
  snapshotStore.delete(token)
  deleteSnapshot(token)
  return snapshot
}

export function getRollbackSnapshot(token: string, userId: string): RollbackSnapshot | null {
  pruneExpiredSnapshots()
  const snapshot = snapshotStore.get(token) || loadSnapshot(token)
  if (!snapshot) return null
  if (!snapshotStore.has(token)) {
    snapshotStore.set(token, snapshot)
  }
  if (snapshot.userId !== userId) return null
  if (isExpired(snapshot)) {
    snapshotStore.delete(token)
    deleteSnapshot(token)
    return null
  }
  return snapshot
}
