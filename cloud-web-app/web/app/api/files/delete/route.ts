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

async function handleDelete(request: NextRequest, userId: string) {
  await requireEntitlementsForUser(userId)

  const body = await request.json()
  const projectId = getScopedProjectId(request, body)
  const paths = Array.isArray(body?.paths)
    ? body.paths.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const path = (body?.path || paths[0] || '').trim()
  const recursive = Boolean(body?.recursive)
  const force = body?.force !== false

  if (!path) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 })
  }

  const runtime = getFileSystemRuntime()
  let root: string | null = null
  const targets = paths.length > 1 ? paths : [path]
  const deleted: string[] = []
  for (const target of targets) {
    const resolved = resolveScopedWorkspacePath({
      userId,
      projectId,
      requestedPath: target,
    })
    root = resolved.root
    await runtime.delete(resolved.absolutePath, { recursive, force })
    deleted.push(resolved.absolutePath)
  }

  return NextResponse.json(
    {
      success: true,
      path: root ? toVirtualWorkspacePath(deleted[0], root) : deleted[0],
      deleted: root ? deleted.map((item) => toVirtualWorkspacePath(item, root!)) : deleted,
      projectId,
      runtime: 'filesystem-runtime',
      authority: 'canonical',
      compatibilityRoute: '/api/files/delete',
      canonicalEndpoint: '/api/files/fs',
      ...FILES_COMPAT_METADATA,
    },
    {
      headers: trackCompatibilityRouteHit({
        request,
        route: '/api/files/delete',
        replacement: '/api/files/fs?action=delete',
        status: 'compatibility-wrapper',
        ...FILES_COMPAT_METADATA,
      }),
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'files-delete-post',
      key: user.userId,
      max: 60,
      windowMs: 60 * 1000,
      message: 'Too many file delete requests. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse
    return await handleDelete(request, user.userId)
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'files-delete-delete',
      key: user.userId,
      max: 60,
      windowMs: 60 * 1000,
      message: 'Too many file delete requests. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse
    return await handleDelete(request, user.userId)
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
