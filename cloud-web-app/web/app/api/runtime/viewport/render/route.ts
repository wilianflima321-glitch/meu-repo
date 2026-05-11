import { NextRequest, NextResponse } from 'next/server'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  coerceViewportRenderBackendRequest,
  renderViewportBackendArtifacts,
} from '@/lib/viewport/viewport-render-backend'

const logger = createComponentLogger('api.runtime.viewport.render')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getRendererToken(): string | null {
  const token = process.env.AETHEL_RENDER_BACKEND_TOKEN ?? process.env.AETHEL_INTERNAL_API_TOKEN
  return token && token.trim().length > 0 ? token.trim() : null
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

export async function POST(request: NextRequest) {
  const expectedToken = getRendererToken()
  if (!expectedToken) {
    logger.warn('viewport_render_backend.token_missing')
    return NextResponse.json(
      {
        error: 'RENDER_BACKEND_TOKEN_NOT_CONFIGURED',
        message: 'Set AETHEL_RENDER_BACKEND_TOKEN before exposing the internal viewport renderer.',
      },
      { status: 503 },
    )
  }

  if (getBearerToken(request) !== expectedToken) {
    return NextResponse.json({ error: 'UNAUTHORIZED_RENDER_BACKEND' }, { status: 401 })
  }

  const parsed = coerceViewportRenderBackendRequest(await request.json().catch(() => null))
  if (!parsed) {
    return NextResponse.json({ error: 'INVALID_VIEWPORT_RENDER_BACKEND_REQUEST' }, { status: 400 })
  }

  const result = await renderViewportBackendArtifacts(parsed)

  logger.info('viewport_render_backend.completed', {
    projectId: parsed.payload.projectId,
    contractId: parsed.payload.metadata.renderContract.id,
    quality: parsed.payload.metadata.renderContract.quality,
    producedKinds: result.renderer.producedKinds,
    blockedKinds: result.renderer.blockedKinds,
  })

  return NextResponse.json({
    ...result,
    releaseReady: false,
    releaseNote: 'Internal render evidence was generated. Final release still requires human approval.',
  })
}
