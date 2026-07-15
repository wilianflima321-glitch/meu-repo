import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth-server'
import { apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  CANONICAL_EXTENSIONS,
  isBuiltinExtension,
  type Extension,
} from '@/lib/marketplace/catalog'
import { enforceRouteRateLimit, MARKETPLACE_READ_RATE_LIMIT } from '@/lib/server/route-rate-limit'

const routeLogger = createComponentLogger('api/marketplace/catalog/route')

export const dynamic = 'force-dynamic'

/**
 * Canonical "Catálogo Vivo" endpoint.
 *
 * Returns the single canonical catalog (built-ins + curated packages) with the
 * caller's real install state merged in from Prisma `InstalledExtension`.
 * Logged-out users get the catalog with built-ins flagged installed and
 * everything else not installed (best-effort, never an error banner).
 *
 * Honesty: if the DB is unavailable we still serve the canonical catalog and
 * report `installedStateLoaded: false` so the UI can avoid implying a verified
 * per-user state.
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimited = await enforceRouteRateLimit({
      req,
      capability: 'MARKETPLACE_CATALOG',
      route: '/api/marketplace/catalog',
      config: MARKETPLACE_READ_RATE_LIMIT,
    })
    if (rateLimited) return rateLimited

    const auth = getUserFromRequest(req)

    let installedSet = new Set<string>()
    let installedStateLoaded = false

    if (auth) {
      try {
        const rows = await prisma.installedExtension.findMany({
          where: { userId: auth.userId },
          select: { extensionId: true },
        })
        installedSet = new Set(rows.map((row) => row.extensionId))
        installedStateLoaded = true
      } catch (dbError) {
        // DB hiccup must not break the catalog — degrade honestly.
        routeLogger.warn('marketplace.catalog.installed_unavailable', dbError)
      }
    }

    const extensions: Extension[] = CANONICAL_EXTENSIONS.map((extension) => ({
      ...extension,
      installed: isBuiltinExtension(extension.id) || installedSet.has(extension.id),
      priceCents: 0,
      requiresPurchase: false,
    }))

    // Wave H — merge DB creator listings so paid items surface Buy (not free install).
    try {
      const listings = await prisma.marketplaceItem.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          category: true,
          authorId: true,
        },
      })
      for (const listing of listings) {
        if (extensions.some((e) => e.id === listing.id)) continue
        extensions.push({
          id: listing.id,
          name: listing.id,
          displayName: listing.title,
          description: listing.description,
          version: '1.0.0',
          publisher: listing.authorId,
          evidenceLabel: 'Creator listing',
          categories: [listing.category || 'productivity'],
          tags: ['creator', listing.category],
          installed: installedSet.has(listing.id),
          verified: false,
          riskLevel: 'medium',
          reviewStatus: 'community-review',
          priceCents: listing.price,
          requiresPurchase: listing.price > 0,
        })
      }
    } catch (listingError) {
      routeLogger.warn('marketplace.catalog.listings_unavailable', listingError)
    }

    return NextResponse.json({
      extensions,
      source: 'canonical+listings',
      installedStateLoaded,
    })
  } catch (error) {
    routeLogger.error('marketplace.catalog.failed', error)
    return apiInternalError()
  }
}
