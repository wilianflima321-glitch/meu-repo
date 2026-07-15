import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime'
import {
  getScopedProjectId,
  resolveScopedWorkspacePath,
  toVirtualWorkspacePath,
} from '@/lib/server/workspace-scope'
import { trackCompatibilityRouteHit } from '@/lib/server/compatibility-route-telemetry'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const body = await request.json()
    const projectId = getScopedProjectId(request, body)
    const sources = Array.isArray(body?.sources)
      ? body.sources.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
      : []
    const sourcePath = (body?.sourcePath || body?.path || sources[0] || '').trim()
    const targetPath = (body?.targetPath || body?.newPath || body?.destination || '').trim()

    if (!sourcePath || !targetPath) {
      return NextResponse.json({ error: 'sourcePath and targetPath/destination are required' }, { status: 400 })
    }

    const runtime = getFileSystemRuntime()
    let root: string | null = null
    const movedSources = sources.length > 1 ? sources : [sourcePath]
    const moved: Array<{ source: string; destination: string }> = []

    for (const sourceItem of movedSources) {
      const sourceResolved = resolveScopedWorkspacePath({
        userId: user.userId,
        projectId,
        requestedPath: sourceItem,
      })
      const destinationResolved = resolveScopedWorkspacePath({
        userId: user.userId,
        projectId,
        requestedPath:
        movedSources.length > 1 ? `${targetPath.replace(/[\\/]+$/, '')}/${sourceItem.split(/[\\/]/).pop()}` : targetPath
      })
      root = sourceResolved.root
      await runtime.move(sourceResolved.absolutePath, destinationResolved.absolutePath, { overwrite: Boolean(body?.overwrite) })
      moved.push({ source: sourceResolved.absolutePath, destination: destinationResolved.absolutePath })
    }

    const telemetryHeaders = trackCompatibilityRouteHit({
      request,
      route: '/api/files/move',
      replacement: '/api/files/fs?action=move',
      status: 'compatibility-wrapper',
    })

    return NextResponse.json(
      {
        success: true,
        source: root ? toVirtualWorkspacePath(moved[0]?.source || '/', root) : moved[0]?.source,
        destination: root ? toVirtualWorkspacePath(moved[0]?.destination || '/', root) : moved[0]?.destination,
        moved: root
          ? moved.map((item) => ({
              source: toVirtualWorkspacePath(item.source, root),
              destination: toVirtualWorkspacePath(item.destination, root),
            }))
          : moved,
        projectId,
        runtime: 'filesystem-runtime',
        authority: 'canonical',
        compatibilityRoute: '/api/files/move',
        canonicalEndpoint: '/api/files/fs',
      },
      { headers: telemetryHeaders }
    )
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
