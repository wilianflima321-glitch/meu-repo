import crypto from 'node:crypto'

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

function nowIso(): string {
  return new Date().toISOString()
}

function isExpired(snapshot: RollbackSnapshot): boolean {
  return Date.parse(snapshot.expiresAt) <= Date.now()
}

export function pruneExpiredSnapshots(): void {
  for (const [token, snapshot] of snapshotStore.entries()) {
    if (isExpired(snapshot)) {
      snapshotStore.delete(token)
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
  return snapshot
}

export function consumeRollbackSnapshot(token: string, userId: string): RollbackSnapshot | null {
  const snapshot = getRollbackSnapshot(token, userId)
  if (!snapshot) return null
  snapshotStore.delete(token)
  return snapshot
}

export function getRollbackSnapshot(token: string, userId: string): RollbackSnapshot | null {
  pruneExpiredSnapshots()
  const snapshot = snapshotStore.get(token)
  if (!snapshot) return null
  if (snapshot.userId !== userId) return null
  if (isExpired(snapshot)) {
    snapshotStore.delete(token)
    return null
  }
  return snapshot
}
