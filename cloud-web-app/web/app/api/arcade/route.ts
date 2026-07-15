import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'

const routeLogger = createComponentLogger('api/arcade/route')

export const dynamic = 'force-dynamic'

export type ArcadeListItem = {
  slug: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  tags: string[]
  status: string
  plays: number
  authorName: string
  publishedAt: string | null
}

// Public Arcade listing. Only public games are returned; the listing degrades
// to an empty set (never an error banner) if the table is not yet migrated.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('q') ?? '').trim().toLowerCase()
    const take = Math.min(Math.max(Number(searchParams.get('limit') ?? '48'), 1), 96)

    let rows: Array<{
      slug: string
      title: string
      description: string | null
      thumbnailUrl: string | null
      tags: string[]
      status: string
      plays: number
      publishedAt: Date | null
      author: { name: string | null } | null
    }> = []

    try {
      rows = await prisma.publishedGame.findMany({
        where: {
          visibility: 'public',
          status: { in: ['playable', 'pending', 'building'] },
        },
        orderBy: [{ publishedAt: 'desc' }],
        take,
        select: {
          slug: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          tags: true,
          status: true,
          plays: true,
          publishedAt: true,
          author: { select: { name: true } },
        },
      })
    } catch (dbError) {
      // Table may not be migrated yet — serve an honest empty arcade.
      routeLogger.warn('arcade.list.unavailable', dbError)
      return NextResponse.json({ games: [], available: false })
    }

    let games: ArcadeListItem[] = rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      description: row.description,
      thumbnailUrl: row.thumbnailUrl,
      tags: row.tags,
      status: row.status,
      plays: row.plays,
      authorName: row.author?.name ?? 'Aethel creator',
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    }))

    if (search) {
      games = games.filter((game) =>
        [game.title, game.description ?? '', game.authorName, ...game.tags]
          .join(' ')
          .toLowerCase()
          .includes(search),
      )
    }

    return NextResponse.json({ games, available: true })
  } catch (error) {
    routeLogger.error('arcade.list.failed', error)
    return apiInternalError()
  }
}
