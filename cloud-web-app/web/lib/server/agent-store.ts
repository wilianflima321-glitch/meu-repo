import fs from 'node:fs/promises'
import path from 'node:path'

export type AgentSnapshot = {
  sessionId: string
  userId: string
  createdAt: string
  updatedAt: string
  task?: string
  config?: Record<string, unknown>
  status?: Record<string, unknown>
  steps?: Array<Record<string, unknown>>
}

function getAgentRoot(): string {
  return path.join(process.cwd(), '.aethel', 'agents')
}

function getUserDir(userId: string): string {
  return path.join(getAgentRoot(), userId)
}

function getSessionPath(userId: string, sessionId: string): string {
  return path.join(getUserDir(userId), `${sessionId}.json`)
}

export async function loadAgentSnapshot(params: {
  userId: string
  sessionId: string
}): Promise<AgentSnapshot | null> {
  const { userId, sessionId } = params
  try {
    const raw = await fs.readFile(getSessionPath(userId, sessionId), 'utf8')
    const parsed = JSON.parse(raw) as AgentSnapshot
    if (!parsed || parsed.userId !== userId || parsed.sessionId !== sessionId) return null
    return parsed
  } catch {
    return null
  }
}

export async function saveAgentSnapshot(snapshot: AgentSnapshot): Promise<void> {
  const dir = getUserDir(snapshot.userId)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(getSessionPath(snapshot.userId, snapshot.sessionId), JSON.stringify(snapshot, null, 2), 'utf8')
}

export async function listAgentSnapshots(userId: string): Promise<AgentSnapshot[]> {
  try {
    const dir = getUserDir(userId)
    const entries = await fs.readdir(dir)
    const snapshots: AgentSnapshot[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue
      const raw = await fs.readFile(path.join(dir, entry), 'utf8')
      const parsed = JSON.parse(raw) as AgentSnapshot
      if (parsed?.userId === userId) {
        snapshots.push(parsed)
      }
    }
    return snapshots
  } catch {
    return []
  }
}

