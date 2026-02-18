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
import { FILES_COMPAT_METADATA } from '@/lib/server/files-compat-policy'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const body = await request.json()
    const path = (body?.path || '').trim()
    const content = body?.content
    const createDirectories = body?.createIfNotExists !== false
    const projectId = getScopedProjectId(request, body)

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }
    if (content === undefined) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const runtime = getFileSystemRuntime()
    const { absolutePath, root } = resolveScopedWorkspacePath({
      userId: user.userId,
      projectId,
      requestedPath: path,
    })
    await runtime.writeFile(absolutePath, String(content), {
      createDirectories,
      atomic: true,
    })

    const info = await runtime.getFileInfo(absolutePath)

    const telemetryHeaders = trackCompatibilityRouteHit({
      request,
      route: '/api/files/write',
      replacement: '/api/files/fs?action=write',
      status: 'compatibility-wrapper',
      ...FILES_COMPAT_METADATA,
    })

    return NextResponse.json(
      {
        success: true,
        path: toVirtualWorkspacePath(info.path, root),
        projectId,
        modified: info.modified,
        runtime: 'filesystem-runtime',
        authority: 'canonical',
        compatibilityRoute: '/api/files/write',
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
