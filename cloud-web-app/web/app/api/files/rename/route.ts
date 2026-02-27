import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import {
  getScopedProjectId,
  resolveScopedWorkspacePath,
  toVirtualWorkspacePath,
} from '@/lib/server/workspace-scope'
import { trackCompatibilityRouteHit } from '@/lib/server/compatibility-route-telemetry'
import { FILES_COMPAT_METADATA } from '@/lib/server/files-compat-policy'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'files-rename',
      key: user.userId,
      max: 50,
      windowMs: 60 * 1000,
      message: 'Too many file rename requests. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse
    await requireEntitlementsForUser(user.userId)

    const body = await request.json()
    const projectId = getScopedProjectId(request, body)
    const sourcePath = (body?.oldPath || body?.path || '').trim()
    const targetPath = (body?.newPath || '').trim()

    if (!sourcePath || !targetPath) {
      return NextResponse.json({ error: 'oldPath/path and newPath are required' }, { status: 400 })
    }

    const runtime = getFileSystemRuntime()
    const sourceResolved = resolveScopedWorkspacePath({
      userId: user.userId,
      projectId,
      requestedPath: sourcePath,
    })
    const destinationResolved = resolveScopedWorkspacePath({
      userId: user.userId,
      projectId,
      requestedPath: targetPath,
    })
    await runtime.move(sourceResolved.absolutePath, destinationResolved.absolutePath, { overwrite: false })

    const telemetryHeaders = trackCompatibilityRouteHit({
      request,
      route: '/api/files/rename',
      replacement: '/api/files/fs?action=move',
      status: 'compatibility-wrapper',
      ...FILES_COMPAT_METADATA,
    })

    return NextResponse.json(
      {
        success: true,
        source: toVirtualWorkspacePath(sourceResolved.absolutePath, sourceResolved.root),
        destination: toVirtualWorkspacePath(destinationResolved.absolutePath, destinationResolved.root),
        projectId,
        runtime: 'filesystem-runtime',
        authority: 'canonical',
        compatibilityRoute: '/api/files/rename',
        canonicalEndpoint: '/api/files/fs',
        ...FILES_COMPAT_METADATA,
      },
      { headers: telemetryHeaders }
    )
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
