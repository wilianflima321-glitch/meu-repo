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
    }))

    return NextResponse.json({
      extensions,
      source: 'canonical',
      installedStateLoaded,
    })
  } catch (error) {
    routeLogger.error('marketplace.catalog.failed', error)
    return apiInternalError()
  }
}
