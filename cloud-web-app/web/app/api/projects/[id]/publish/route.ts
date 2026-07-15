import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'

const routeLogger = createComponentLogger('api/projects/[id]/publish/route')

export const dynamic = 'force-dynamic'

type PublishBody = {
  title?: unknown
  description?: unknown
  tags?: unknown
  visibility?: unknown
}

function slugifyBase(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function normalizeVisibility(value: unknown): 'public' | 'unlisted' | 'private' {
  return value === 'unlisted' || value === 'private' ? value : 'public'
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8)
}

async function loadOwnedProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, description: true, userId: true },
  })
  if (!project) return { project: null as null, owned: false }
  return { project, owned: project.userId === userId }
}

// Publish (or republish) a project to the Arcade.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = requireAuth(request)
    const projectId = params.id

    const { project, owned } = await loadOwnedProject(projectId, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (!owned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as PublishBody | null
    const title =
      typeof body?.title === 'string' && body.title.trim().length > 0
        ? body.title.trim().slice(0, 120)
        : project.name
    const description =
      typeof body?.description === 'string' && body.description.trim().length > 0
        ? body.description.trim().slice(0, 2000)
        : project.description ?? null
    const visibility = normalizeVisibility(body?.visibility)
    const tags = normalizeTags(body?.tags)

    // Tie the listing to the real web export pipeline: if a completed web
    // export with a download URL exists, the game is immediately playable;
    // otherwise it is published in an honest "build pending" state.
    const webExport = await prisma.exportJob.findFirst({
      where: { projectId, platform: 'web', status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, downloadUrl: true },
    })
    const playable = Boolean(webExport?.downloadUrl)

    const existing = await prisma.publishedGame.findUnique({
      where: { projectId },
      select: { id: true, slug: true },
    })
    const slug = existing?.slug ?? `${slugifyBase(title) || 'game'}-${projectId.slice(-6)}`

    const game = await prisma.publishedGame.upsert({
      where: { projectId },
      update: {
        title,
        description,
        tags,
        visibility,
        exportJobId: webExport?.id ?? null,
        playUrl: webExport?.downloadUrl ?? null,
        status: playable ? 'playable' : 'pending',
        publishedAt: new Date(),
      },
      create: {
        slug,
        projectId,
        authorId: user.userId,
        title,
        description,
        tags,
        visibility,
        exportJobId: webExport?.id ?? null,
        playUrl: webExport?.downloadUrl ?? null,
        status: playable ? 'playable' : 'pending',
        publishedAt: new Date(),
      },
    })

    routeLogger.info('arcade.publish', { projectId, slug: game.slug, status: game.status })

    return NextResponse.json({
      success: true,
      game: {
        slug: game.slug,
        status: game.status,
        visibility: game.visibility,
        playUrl: game.playUrl,
        playable,
      },
      // Honest guidance when the web build is not ready yet.
      hint: playable
        ? undefined
        : 'Published. Run a Web export to make this game playable in the browser.',
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    routeLogger.error('arcade.publish.failed', error)
    return apiInternalError()
  }
}

// Current published state for this project (owner view).
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = requireAuth(request)
    const projectId = params.id

    const { project, owned } = await loadOwnedProject(projectId, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (!owned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const game = await prisma.publishedGame.findUnique({
      where: { projectId },
      select: {
        slug: true,
        title: true,
        description: true,
        tags: true,
        status: true,
        visibility: true,
        playUrl: true,
        plays: true,
        publishedAt: true,
      },
    })

    return NextResponse.json({ published: Boolean(game), game })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    routeLogger.error('arcade.publish.get.failed', error)
    return apiInternalError()
  }
}

// Unpublish (remove the Arcade listing).
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = requireAuth(request)
    const projectId = params.id

    const { project, owned } = await loadOwnedProject(projectId, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (!owned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.publishedGame.deleteMany({ where: { projectId } })
    routeLogger.info('arcade.unpublish', { projectId })

    return NextResponse.json({ success: true })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    routeLogger.error('arcade.unpublish.failed', error)
    return apiInternalError()
  }
}
