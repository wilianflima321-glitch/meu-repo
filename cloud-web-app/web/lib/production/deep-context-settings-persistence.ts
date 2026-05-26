import type {
  ContextCategory,
  ContextChunk,
  DeepContextMemorySnapshot,
  DeepContextPersistenceAdapter,
} from '@/lib/ai/deep-context-manager'

export const DEEP_CONTEXT_MEMORY_SETTINGS_KEY = 'aethelDeepContextMemory'

export const DEEP_CONTEXT_CATEGORIES: ContextCategory[] = [
  'story',
  'code',
  'rules',
  'character',
  'world',
  'scene',
  'shot',
  'gameplay',
  'asset',
  'research',
  'evidence',
  'decision',
  'system',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, limit)
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asIsoDate(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback
}

function normalizeEmbedding(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const embedding = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item)).slice(0, 4096)
  return embedding.length > 0 ? embedding : undefined
}

function normalizeCategory(value: unknown): ContextCategory | null {
  return typeof value === 'string' && DEEP_CONTEXT_CATEGORIES.includes(value as ContextCategory)
    ? (value as ContextCategory)
    : null
}

function estimateTokens(content: string): number {
  return Math.max(1, Math.ceil(content.length / 4))
}

function normalizeChunk(value: unknown, projectId: string): ContextChunk | null {
  if (!isRecord(value)) return null
  const category = normalizeCategory(value.category)
  const content = asString(value.content).trim()
  const id = asString(value.id).trim()
  if (!category || !content || !id) return null

  const now = new Date().toISOString()
  const tokenEstimate = Math.max(1, Math.floor(asFiniteNumber(value.tokenEstimate, estimateTokens(content))))
  const importance = Math.max(0, Math.min(1, asFiniteNumber(value.importance, 0.5)))

  const embedding = normalizeEmbedding(value.embedding)
  return {
    id,
    projectId,
    category,
    content,
    tags: asStringArray(value.tags, 48).map((tag) => tag.toLowerCase()),
    title: typeof value.title === 'string' && value.title.trim() ? value.title.trim() : undefined,
    sourceRefs: asStringArray(value.sourceRefs, 40),
    evidenceRefs: asStringArray(value.evidenceRefs, 40),
    importance,
    tokenEstimate,
    createdAt: asIsoDate(value.createdAt, now),
    updatedAt: asIsoDate(value.updatedAt, now),
    ...(embedding ? { embedding } : {}),
  }
}

export function readDeepContextMemorySnapshotFromSettings(
  settings: unknown,
  expectedProjectId?: string
): DeepContextMemorySnapshot | null {
  if (!isRecord(settings)) return null
  const rawSnapshot = settings[DEEP_CONTEXT_MEMORY_SETTINGS_KEY]
  if (!isRecord(rawSnapshot) || rawSnapshot.version !== 1) return null

  const projectId = asString(rawSnapshot.projectId).trim()
  if (!projectId || (expectedProjectId && projectId !== expectedProjectId)) return null

  const chunks = Array.isArray(rawSnapshot.chunks)
    ? rawSnapshot.chunks
        .map((chunk) => normalizeChunk(chunk, projectId))
        .filter((chunk): chunk is ContextChunk => Boolean(chunk))
        .slice(0, 2000)
    : []

  return {
    version: 1,
    projectId,
    updatedAt: asIsoDate(rawSnapshot.updatedAt, new Date().toISOString()),
    chunks,
  }
}

export function writeDeepContextMemorySnapshotToSettings(
  settings: unknown,
  snapshot: DeepContextMemorySnapshot
): Record<string, unknown> {
  const base = isRecord(settings) ? { ...settings } : {}
  return {
    ...base,
    [DEEP_CONTEXT_MEMORY_SETTINGS_KEY]: {
      ...snapshot,
      chunks: snapshot.chunks.slice(0, 2000),
    },
  }
}

export class SettingsDeepContextPersistenceAdapter implements DeepContextPersistenceAdapter {
  constructor(
    private readonly loadSettings: () => Promise<unknown> | unknown,
    private readonly saveSnapshot: (snapshot: DeepContextMemorySnapshot) => Promise<void> | void,
    private readonly expectedProjectId?: string
  ) {}

  async load(projectId: string): Promise<DeepContextMemorySnapshot | null> {
    if (this.expectedProjectId && projectId !== this.expectedProjectId) return null
    return readDeepContextMemorySnapshotFromSettings(await this.loadSettings(), projectId)
  }

  async save(projectId: string, snapshot: DeepContextMemorySnapshot): Promise<void> {
    if (this.expectedProjectId && projectId !== this.expectedProjectId) {
      throw new Error(`DeepContext project mismatch: expected ${this.expectedProjectId}, got ${projectId}`)
    }
    await this.saveSnapshot(snapshot)
  }
}
