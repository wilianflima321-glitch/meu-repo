import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { getFileSystemRuntime, type FileInfo } from '@/lib/server/filesystem-runtime'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import {
  getScopedProjectId,
  resolveScopedWorkspacePath,
  toVirtualWorkspacePath,
} from '@/lib/server/workspace-scope'
import { trackCompatibilityRouteHit } from '@/lib/server/compatibility-route-telemetry'
import { FILES_COMPAT_METADATA } from '@/lib/server/files-compat-policy'

export const dynamic = 'force-dynamic'

function mapToTreeNode(entry: FileInfo, scopedRoot: string) {
  return {
    name: entry.name,
    path: toVirtualWorkspacePath(entry.path, scopedRoot),
    type: entry.type === 'directory' ? 'directory' : 'file',
    size: entry.size,
    modified: entry.modified,
    language: entry.extension || null,
  }
}

async function handleList(
  request: NextRequest,
  bodyPath?: string,
  bodyRecursive?: boolean,
  body?: Record<string, unknown>
) {
  const user = requireAuth(request)
  const rateLimitResponse = await enforceRateLimit({
    scope: request.method === 'POST' ? 'files-list-post' : 'files-list-get',
    key: user.userId,
    max: 120,
    windowMs: 60 * 1000,
    message: 'Too many file list requests. Please retry shortly.',
  })
  if (rateLimitResponse) return rateLimitResponse
  await requireEntitlementsForUser(user.userId)
  const projectId = getScopedProjectId(request, body)

  const url = new URL(request.url)
  const path = (bodyPath || url.searchParams.get('path') || '/').trim() || '/'
  const recursive = typeof bodyRecursive === 'boolean' ? bodyRecursive : url.searchParams.get('recursive') === 'true'

  const runtime = getFileSystemRuntime()
  const { absolutePath: resolvedPath, root: scopedRoot } = resolveScopedWorkspacePath({
    userId: user.userId,
    projectId,
    requestedPath: path,
  })
  const result = await runtime.listDirectory(resolvedPath, {
    recursive,
    includeHidden: false,
  })

  const children = result.entries.map((entry) => mapToTreeNode(entry, scopedRoot))
  const telemetryHeaders = trackCompatibilityRouteHit({
    request,
    route: '/api/files/list',
    replacement: '/api/files/fs?action=list',
    status: 'compatibility-wrapper',
    ...FILES_COMPAT_METADATA,
  })

  return NextResponse.json(
    {
      path: toVirtualWorkspacePath(result.path, scopedRoot),
      total: result.total,
      items: children,
      children,
      files: children,
      projectId,
      runtime: 'filesystem-runtime',
      authority: 'canonical',
      compatibilityRoute: '/api/files/list',
      canonicalEndpoint: '/api/files/fs',
      ...FILES_COMPAT_METADATA,
    },
    { headers: telemetryHeaders }
  )
}

export async function GET(request: NextRequest) {
  try {
    return await handleList(request)
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    return await handleList(request, body?.path as string | undefined, body?.recursive as boolean | undefined, body)
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
