import fs from 'node:fs/promises'
import path from 'node:path'

type DemoUsageStore = {
  users: Record<
    string,
    {
      total: number
      routes: Record<string, number>
      updatedAt: string
    }
  >
}

export type DemoUsageDecision = {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  resetAt: string
}

const DEFAULT_DAILY_LIMIT = 5
const STORAGE_ROOT = path.join(process.cwd(), '.aethel', 'ai-demo-usage')

function toUtcDay(now = new Date()): string {
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function resetAtForDay(day: string): string {
  return `${day}T23:59:59.999Z`
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DAILY_LIMIT
  return Math.max(1, Math.min(200, Math.floor(value)))
}

export function getAiDemoDailyLimit(): number {
  const raw = process.env.AETHEL_AI_DEMO_DAILY_LIMIT
  if (!raw) return DEFAULT_DAILY_LIMIT
  const parsed = Number.parseInt(raw, 10)
  return clampLimit(parsed)
}

function storeFile(day: string): string {
  return path.join(STORAGE_ROOT, `${day}.json`)
}

async function readStore(day: string): Promise<DemoUsageStore> {
  const file = storeFile(day)
  const raw = await fs.readFile(file, 'utf8').catch(() => null)
  if (!raw) {
    return { users: {} }
  }
  try {
    const parsed = JSON.parse(raw) as DemoUsageStore
    if (!parsed || typeof parsed !== 'object' || typeof parsed.users !== 'object' || !parsed.users) {
      return { users: {} }
    }
    return parsed
  } catch {
    return { users: {} }
  }
}

async function writeStore(day: string, store: DemoUsageStore): Promise<void> {
  await fs.mkdir(STORAGE_ROOT, { recursive: true })
  const file = storeFile(day)
  const tmpFile = `${file}.${Date.now().toString(36)}.tmp`
  await fs.writeFile(tmpFile, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
  await fs.rename(tmpFile, file)
}

export async function consumeAiDemoUsage(params: {
  userId: string
  route: string
  now?: Date
}): Promise<DemoUsageDecision> {
  const now = params.now || new Date()
  const day = toUtcDay(now)
  const limit = getAiDemoDailyLimit()
  const resetAt = resetAtForDay(day)
  const userId = params.userId.trim()
  const route = params.route.trim() || 'unknown'

  const store = await readStore(day)
  const current =
    store.users[userId] ||
    ({
      total: 0,
      routes: {},
      updatedAt: now.toISOString(),
    } as const)

  if (current.total >= limit) {
    return {
      allowed: false,
      used: current.total,
      limit,
      remaining: 0,
      resetAt,
    }
  }

  const nextTotal = current.total + 1
  const nextRoutes = { ...current.routes, [route]: (current.routes[route] || 0) + 1 }
  store.users[userId] = {
    total: nextTotal,
    routes: nextRoutes,
    updatedAt: now.toISOString(),
  }

  await writeStore(day, store).catch(() => {})

  return {
    allowed: true,
    used: nextTotal,
    limit,
    remaining: Math.max(0, limit - nextTotal),
    resetAt,
  }
}
