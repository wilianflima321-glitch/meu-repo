import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { apiInternalError } from '@/lib/api-errors'
import {
  mergePublishedGameListingHonesty,
  readPublishListingEvidenceBatch,
  resolveHubDemoListingLabel,
} from '@/lib/hub/publish-listing-authority'
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
  noWebDemo: boolean
  listingLabel: 'web_demo' | 'desktop_exclusive' | 'build_pending'
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
      playUrl: string | null
      demoPlayUrl: string | null
      noWebDemo: boolean
      demoBundleBytes: number | null
      compressionMandatePassed: boolean
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
          playUrl: true,
          demoPlayUrl: true,
          noWebDemo: true,
          demoBundleBytes: true,
          compressionMandatePassed: true,
          author: { select: { name: true } },
        },
      })
    } catch (dbError) {
      // Table / R18 columns may not be migrated yet — serve an honest empty arcade.
      routeLogger.warn('arcade.list.unavailable', dbError)
      return NextResponse.json({ games: [], available: false })
    }

    const listingByGame = await readPublishListingEvidenceBatch(rows.map((row) => row.slug))
    let games: ArcadeListItem[] = rows.map((row) => {
      const honesty = mergePublishedGameListingHonesty(row, listingByGame.get(row.slug) ?? null)
      const listingLabel = resolveHubDemoListingLabel({
        noWebDemo: honesty.noWebDemo,
        demoPlayUrl: honesty.demoPlayUrl,
        playable: row.status === 'playable' && Boolean(honesty.demoPlayUrl),
      })
      return {
        slug: row.slug,
        title: row.title,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        tags: row.tags,
        status: row.status,
        plays: row.plays,
        authorName: row.author?.name ?? 'Aethel creator',
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        noWebDemo: honesty.noWebDemo,
        listingLabel,
      }
    })

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
