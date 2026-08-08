import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { stampPublishListingEvidence } from '@/lib/hub/publish-listing-authority'
import { createComponentLogger } from '@/lib/observability/logger'

const routeLogger = createComponentLogger('api/projects/[id]/publish/route')

export const dynamic = 'force-dynamic'

type PublishBody = {
  title?: unknown
  description?: unknown
  tags?: unknown
  visibility?: unknown
  /** Creator opt-in: no browser demo → Hub Desktop Exclusive (no fake Instant Play). */
  noWebDemo?: unknown
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
    const noWebDemo = body?.noWebDemo === true

    // Tie Instant Play to demo-web-slice HTML evidence only (XIV.3).
    // Zip download URLs are not iframe targets — never mark playable from zip alone.
    const webExport = await prisma.exportJob.findFirst({
      where: { projectId, platform: 'web', status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, downloadUrl: true, fileSize: true, options: true },
    })

    const exportOptions =
      webExport?.options && typeof webExport.options === 'object' && !Array.isArray(webExport.options)
        ? (webExport.options as Record<string, unknown>)
        : {}

    const existing = await prisma.publishedGame.findUnique({
      where: { projectId },
      select: { id: true, slug: true },
    })
    const slug = existing?.slug ?? `${slugifyBase(title) || 'game'}-${projectId.slice(-6)}`

    const listingEvidence = await stampPublishListingEvidence({
      gameId: slug,
      webExportDownloadUrl: noWebDemo ? null : webExport?.downloadUrl ?? null,
      instantPlayHtmlUrl:
        typeof exportOptions.instantPlayHtmlUrl === 'string'
          ? exportOptions.instantPlayHtmlUrl
          : typeof exportOptions.demoPlayUrl === 'string'
            ? exportOptions.demoPlayUrl
            : null,
      demoWebSliceReady: exportOptions.demoWebSliceReady === true,
      webExportFileSizeBytes: webExport?.fileSize ?? null,
      explicitCompressionMandatePassed: exportOptions.compressionMandatePassed === true,
      cookPackByteLength:
        typeof exportOptions.cookPackByteLength === 'number'
          ? exportOptions.cookPackByteLength
          : typeof exportOptions.demoBundleBytes === 'number'
            ? exportOptions.demoBundleBytes
            : null,
      bakeReceiptRef:
        typeof exportOptions.bakeReceiptRef === 'string' ? exportOptions.bakeReceiptRef : null,
      lightmapBytes:
        typeof exportOptions.lightmapBytes === 'number' && exportOptions.lightmapBytes > 0
          ? Math.floor(exportOptions.lightmapBytes)
          : null,
      noWebDemo,
      evidenceRef: webExport?.id ? `exportJob:${webExport.id}` : null,
    })

    // Instant Play iframe URL only — never promote zip downloadUrl into playUrl.
    // Law XV bake + hosted slice required for demoPlayUrl; Compression Mandate still gates discovery.
    const playable = Boolean(listingEvidence.demoPlayUrl) && !listingEvidence.noWebDemo

    const game = await prisma.publishedGame.upsert({
      where: { projectId },
      update: {
        title,
        description,
        tags,
        visibility,
        exportJobId: webExport?.id ?? null,
        playUrl: playable ? listingEvidence.demoPlayUrl : null,
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
        playUrl: playable ? listingEvidence.demoPlayUrl : null,
        status: playable ? 'playable' : 'pending',
        publishedAt: new Date(),
      },
    })

    routeLogger.info('arcade.publish', {
      projectId,
      slug: game.slug,
      status: game.status,
      compressionMandatePassed: listingEvidence.compressionMandatePassed,
      noWebDemo: listingEvidence.noWebDemo,
      demoPlayUrl: listingEvidence.demoPlayUrl,
    })

    return NextResponse.json({
      success: true,
      game: {
        slug: game.slug,
        status: game.status,
        visibility: game.visibility,
        playUrl: game.playUrl,
        playable,
        demoPlayUrl: listingEvidence.demoPlayUrl,
        noWebDemo: listingEvidence.noWebDemo,
        compressionMandatePassed: listingEvidence.compressionMandatePassed,
        demoBundleBytes: listingEvidence.demoBundleBytes,
      },
      listingEvidence: {
        compressionMandatePassed: listingEvidence.compressionMandatePassed,
        demoPlayUrl: listingEvidence.demoPlayUrl,
        demoBundleBytes: listingEvidence.demoBundleBytes,
        noWebDemo: listingEvidence.noWebDemo,
        reason: listingEvidence.reason,
      },
      // Honest guidance when Instant Play / Compression evidence is not ready.
      hint: listingEvidence.noWebDemo
        ? 'Published as Desktop Exclusive — no Instant Play demo until a web export exists.'
        : playable
          ? listingEvidence.compressionMandatePassed
            ? undefined
            : 'Published with Instant Play URL. Discovery ranking stays closed until measured Compression Mandate evidence (≤150MB) is stamped on the web export.'
          : listingEvidence.reason.includes('law_xv_bake')
            ? 'Published. Instant Play is [HELD] — Law XV bake receipt + lightmap bytes required before web-static Instant Play (no invented bake artifacts).'
            : listingEvidence.reason.includes('demo_web_slice')
              ? 'Published. Instant Play HTML demo-web-slice is [HELD] — cook zip alone is not an Arcade iframe target (no placeholder.html theater).'
              : 'Published. Run a Web export with Instant Play HTML slice to make this game playable in the browser.',
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
