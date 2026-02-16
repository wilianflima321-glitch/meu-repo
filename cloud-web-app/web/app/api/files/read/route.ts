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

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const url = new URL(request.url)
    const path = (url.searchParams.get('path') || '').trim()
    const projectId = getScopedProjectId(request)
    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    const runtime = getFileSystemRuntime()
    const { absolutePath, root } = resolveScopedWorkspacePath({
      userId: user.userId,
      projectId,
      requestedPath: path,
    })
    const file = await runtime.readFile(absolutePath)

    const telemetryHeaders = trackCompatibilityRouteHit({
      request,
      route: '/api/files/read',
      replacement: '/api/files/fs?action=read',
      status: 'compatibility-wrapper',
    })

    return NextResponse.json(
      {
        path: toVirtualWorkspacePath(file.path, root),
        content: file.content,
        language: file.language || null,
        modified: file.modified,
        projectId,
        runtime: 'filesystem-runtime',
        authority: 'canonical',
        compatibilityRoute: '/api/files/read',
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
