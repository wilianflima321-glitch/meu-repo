import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

import type { ContextCategory, DeepContextMemorySnapshot } from '@/lib/ai/deep-context-manager'
import { DeepContextManager } from '@/lib/ai/deep-context-manager'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  DEEP_CONTEXT_CATEGORIES,
  DEEP_CONTEXT_MEMORY_SETTINGS_KEY,
  readDeepContextMemorySnapshotFromSettings,
  SettingsDeepContextPersistenceAdapter,
  writeDeepContextMemorySnapshotToSettings,
} from '@/lib/production/deep-context-settings-persistence'

const logger = createComponentLogger('api.projects.production-state.deep-context')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForDeepContext(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      userId: true,
      settings: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  })
}

function canWriteDeepContext(project: Awaited<ReturnType<typeof loadProjectForDeepContext>>, userId: string): boolean {
  if (!project) return false
  if (project.userId === userId) return true
  return project.members.some((member) => member.role === 'editor' || member.role === 'admin')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseBoolean(value: string | null): boolean {
  return value === '1' || value === 'true' || value === 'yes'
}

function parsePositiveInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function parseCategories(value: string | null): ContextCategory[] | undefined {
  if (!value) return undefined
  const categories = value
    .split(',')
    .map((category) => category.trim())
    .filter((category): category is ContextCategory => DEEP_CONTEXT_CATEGORIES.includes(category as ContextCategory))
  return categories.length ? categories : undefined
}

function parseStringArray(value: unknown, limit: number): string[] {
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

function parseMemorizePayload(value: unknown) {
  if (!isRecord(value)) return null
  const category =
    typeof value.category === 'string' && DEEP_CONTEXT_CATEGORIES.includes(value.category as ContextCategory)
      ? (value.category as ContextCategory)
      : null
  const content = typeof value.content === 'string' ? value.content.trim() : ''
  if (!category || !content || content.length > 50_000) return null

  return {
    category,
    content,
    tags: parseStringArray(value.tags, 48),
    title: typeof value.title === 'string' && value.title.trim() ? value.title.trim().slice(0, 180) : undefined,
    sourceRefs: parseStringArray(value.sourceRefs, 40),
    evidenceRefs: parseStringArray(value.evidenceRefs, 40),
    importance: typeof value.importance === 'number' && Number.isFinite(value.importance) ? value.importance : undefined,
    id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : undefined,
    embedding: Array.isArray(value.embedding)
      ? value.embedding.filter((item): item is number => typeof item === 'number' && Number.isFinite(item)).slice(0, 4096)
      : undefined,
  }
}

async function createManagerFromSnapshot(projectId: string, snapshot: DeepContextMemorySnapshot | null) {
  let savedSnapshot: DeepContextMemorySnapshot | null = null
  const settings = snapshot ? writeDeepContextMemorySnapshotToSettings({}, snapshot) : {}
  const adapter = new SettingsDeepContextPersistenceAdapter(
    () => settings,
    (nextSnapshot) => {
      savedSnapshot = nextSnapshot
    },
    projectId
  )
  const manager = new DeepContextManager({ projectId, adapter })
  await manager.initialize(projectId)
  return {
    manager,
    getSavedSnapshot: () => savedSnapshot,
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForDeepContext(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const snapshot = readDeepContextMemorySnapshotFromSettings(project.settings, project.id)
    const url = new URL(request.url)
    const query = url.searchParams.get('q') ?? url.searchParams.get('query')

    if (!snapshot || !query?.trim()) {
      return NextResponse.json({
        memory: snapshot,
        recall: null,
        hasMemory: Boolean(snapshot),
        settingsKey: DEEP_CONTEXT_MEMORY_SETTINGS_KEY,
      })
    }

    const { manager } = await createManagerFromSnapshot(project.id, snapshot)
    const recall = await manager.recallRelevantChunks(query, {
      projectId: project.id,
      categories: parseCategories(url.searchParams.get('category') ?? url.searchParams.get('categories')),
      includeHeld: parseBoolean(url.searchParams.get('includeHeld')),
      requireEvidence: parseBoolean(url.searchParams.get('requireEvidence')),
      maxChunks: parsePositiveInt(url.searchParams.get('maxChunks'), 8, 1, 32),
      maxTokens: parsePositiveInt(url.searchParams.get('maxTokens'), 6000, 256, 32000),
    })

    return NextResponse.json({
      memory: snapshot,
      recall,
      hasMemory: true,
      settingsKey: DEEP_CONTEXT_MEMORY_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('deep_context.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForDeepContext(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (!canWriteDeepContext(project, user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = parseMemorizePayload(await request.json().catch(() => ({})))
    if (!payload) {
      return NextResponse.json(
        {
          error:
            'Invalid deep context payload. Provide category, content under 50000 chars, and optional tags/sourceRefs/evidenceRefs.',
        },
        { status: 400 }
      )
    }

    const currentSnapshot = readDeepContextMemorySnapshotFromSettings(project.settings, project.id)
    const { manager, getSavedSnapshot } = await createManagerFromSnapshot(project.id, currentSnapshot)
    const chunk = await manager.memorize(payload.category, payload.content, payload.tags, {
      projectId: project.id,
      id: payload.id,
      title: payload.title,
      sourceRefs: payload.sourceRefs,
      evidenceRefs: payload.evidenceRefs,
      importance: payload.importance,
      embedding: payload.embedding,
    })
    const snapshot = getSavedSnapshot() ?? manager.snapshot(project.id)
    const settings = writeDeepContextMemorySnapshotToSettings(project.settings, snapshot)

    await prisma.project.update({
      where: { id: project.id },
      data: { settings: settings as Prisma.InputJsonValue },
    })

    logger.info('deep_context.memorized', {
      userId: user.userId,
      projectId: project.id,
      chunkId: chunk.id,
      category: chunk.category,
      evidenceRefs: chunk.evidenceRefs.length,
      tokenEstimate: chunk.tokenEstimate,
    })

    return NextResponse.json({
      chunk,
      memory: snapshot,
      hasMemory: true,
      settingsKey: DEEP_CONTEXT_MEMORY_SETTINGS_KEY,
    })
  } catch (error) {
    logger.error('deep_context.post_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
