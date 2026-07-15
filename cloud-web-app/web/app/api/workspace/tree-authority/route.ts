/**
 * Focus 1B API — real workspace tree (disk authority)
 * GET /api/workspace/tree-authority?path=/
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { getScopedProjectId } from '@/lib/server/workspace-scope'
import {
  assertAllowedPathsOnDisk,
  buildRealWorkspaceTree,
  listRealWorkspaceChildren,
} from '@/lib/production/workspace-tree-authority'
import { createComponentLogger } from '@/lib/observability/logger'

export const dynamic = 'force-dynamic'

const log = createComponentLogger('api/workspace/tree-authority')

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const projectId = getScopedProjectId(request)
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') || 'list'
    const virtualPath = url.searchParams.get('path') || '/'

    if (mode === 'tree') {
      const tree = await buildRealWorkspaceTree({
        userId: user.userId,
        projectId,
        maxDepth: Number(url.searchParams.get('depth') || 3),
      })
      return NextResponse.json({
        authority: 'disk',
        mock: false,
        projectId,
        tree,
      })
    }

    const listed = await listRealWorkspaceChildren({
      userId: user.userId,
      projectId,
      virtualPath,
    })
    return NextResponse.json({
      authority: 'disk',
      mock: false,
      projectId,
      path: listed.virtualPath,
      children: listed.children,
      runtime: 'workspace-tree-authority',
    })
  } catch (error) {
    log.error('tree_authority_get_failed', error instanceof Error ? error : undefined)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const body = (await request.json().catch(() => ({}))) as {
      projectId?: string
      allowedPaths?: string[]
      requireExists?: boolean
    }
    const projectId = getScopedProjectId(request, body)
    const allowedPaths = Array.isArray(body.allowedPaths) ? body.allowedPaths : []
    const check = await assertAllowedPathsOnDisk({
      userId: user.userId,
      projectId,
      allowedPaths,
      requireExists: body.requireExists,
    })
    return NextResponse.json({
      authority: 'disk',
      mock: false,
      projectId,
      ...check,
    })
  } catch (error) {
    log.error('tree_authority_post_failed', error instanceof Error ? error : undefined)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
