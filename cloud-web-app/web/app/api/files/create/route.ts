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
    const path = (body?.path || '').trim()
    const type = body?.type === 'directory' || body?.type === 'folder' ? 'directory' : 'file'
    const content = body?.content ?? ''
    const projectId = getScopedProjectId(request, body)

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    const runtime = getFileSystemRuntime()
    const { absolutePath, root } = resolveScopedWorkspacePath({
      userId: user.userId,
      projectId,
      requestedPath: path,
    })

    if (type === 'directory') {
      await runtime.createDirectory(absolutePath, { recursive: true })
    } else {
      await runtime.writeFile(absolutePath, String(content), {
        createDirectories: true,
        atomic: true,
      })
    }

    const info = await runtime.getFileInfo(absolutePath)

    const telemetryHeaders = trackCompatibilityRouteHit({
      request,
      route: '/api/files/create',
      replacement: '/api/files/fs?action=write|mkdir',
      status: 'compatibility-wrapper',
    })

    return NextResponse.json(
      {
        success: true,
        path: toVirtualWorkspacePath(info.path, root),
        type: info.type,
        created: true,
        projectId,
        runtime: 'filesystem-runtime',
        authority: 'canonical',
        compatibilityRoute: '/api/files/create',
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
