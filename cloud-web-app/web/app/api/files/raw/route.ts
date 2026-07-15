import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime'
import { capabilityResponse } from '@/lib/server/capability-response'
import {
  getScopedProjectId,
  resolveScopedWorkspacePath,
} from '@/lib/server/workspace-scope'

export const dynamic = 'force-dynamic'
const PREVIEW_MAX_INLINE_MEDIA_BYTES = 25 * 1024 * 1024

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const url = new URL(request.url)
    const requestedPath = (url.searchParams.get('path') || '').trim()
    if (!requestedPath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    const projectId = getScopedProjectId(request)
    const runtime = getFileSystemRuntime()
    const intent = (url.searchParams.get('intent') || '').trim().toLowerCase()
    const { absolutePath } = resolveScopedWorkspacePath({
      userId: user.userId,
      projectId,
      requestedPath,
    })

    const [binary, info] = await Promise.all([
      runtime.readFileBinary(absolutePath),
      runtime.getFileInfo(absolutePath),
    ])

    if (intent === 'preview' && info.size > PREVIEW_MAX_INLINE_MEDIA_BYTES) {
      return capabilityResponse({
        error: 'FILE_TOO_LARGE_FOR_PREVIEW',
        message: 'File exceeds validated inline preview payload limit.',
        status: 413,
        capability: 'IDE_PREVIEW_MEDIA_INLINE',
        capabilityStatus: 'PARTIAL',
        metadata: {
          requestedPath,
          sizeBytes: info.size,
          maxInlineBytes: PREVIEW_MAX_INLINE_MEDIA_BYTES,
        },
      })
    }

    return new NextResponse(binary as any, {
      status: 200,
      headers: {
        'Content-Type': info.mimeType || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Content-Disposition': `inline; filename="${encodeURIComponent(info.name)}"`,
        'X-Aethel-Project-Id': projectId,
        'X-Aethel-Authority': 'canonical',
      },
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
