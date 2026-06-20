import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'

const routeLogger = createComponentLogger('api/arcade/[slug]/route')

export const dynamic = 'force-dynamic'

// Public Arcade detail. Private games are treated as not found.
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const slug = params.slug

    const game = await prisma.publishedGame.findUnique({
      where: { slug },
      select: {
        slug: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        tags: true,
        status: true,
        visibility: true,
        playUrl: true,
        plays: true,
        publishedAt: true,
        author: { select: { name: true } },
      },
    })

    if (!game || game.visibility === 'private') {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    return NextResponse.json({
      game: {
        slug: game.slug,
        title: game.title,
        description: game.description,
        thumbnailUrl: game.thumbnailUrl,
        tags: game.tags,
        status: game.status,
        playUrl: game.playUrl,
        playable: game.status === 'playable' && Boolean(game.playUrl),
        plays: game.plays,
        authorName: game.author?.name ?? 'Aethel creator',
        publishedAt: game.publishedAt ? game.publishedAt.toISOString() : null,
      },
    })
  } catch (error) {
    routeLogger.error('arcade.detail.failed', error)
    return apiInternalError()
  }
}

// Record a play (best-effort counter). Only counts for playable games.
export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const slug = params.slug
    const result = await prisma.publishedGame.updateMany({
      where: { slug, status: 'playable', visibility: { in: ['public', 'unlisted'] } },
      data: { plays: { increment: 1 } },
    })
    return NextResponse.json({ counted: result.count > 0 })
  } catch (error) {
    routeLogger.error('arcade.play.failed', error)
    return apiInternalError()
  }
}
