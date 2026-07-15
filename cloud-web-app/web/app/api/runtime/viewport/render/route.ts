import { NextRequest, NextResponse } from 'next/server'

import { createComponentLogger } from '@/lib/observability/logger';
import { traceHeaders, withTraceSpan, type TraceContext } from '@/lib/observability/tracing'
import {
  buildViewportRenderBackendCapabilities,
  coerceViewportRenderBackendRequest,
  readViewportRenderArtifact,
  renderViewportBackendArtifacts,
  ViewportRenderArtifactReadError,
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

function authorizeRendererRequest(request: NextRequest): NextResponse | null {
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

  return null
}

export async function POST(request: NextRequest) {
  const parent = request.headers.get('traceparent')

  return withTraceSpan(
    'api.runtime.viewport.render.post',
    async (span) => {
      const authError = authorizeRendererRequest(request)
      if (authError) return attachTraceHeaders(authError, span.context)

      const parsed = coerceViewportRenderBackendRequest(await request.json().catch(() => null))
      if (!parsed) {
        return tracedJson({ error: 'INVALID_VIEWPORT_RENDER_BACKEND_REQUEST' }, span.context, { status: 400 })
      }

      const result = await renderViewportBackendArtifacts(parsed)

      logger.info('viewport_render_backend.completed', {
        projectId: parsed.payload.projectId,
        contractId: parsed.payload.metadata.renderContract.id,
        quality: parsed.payload.metadata.renderContract.quality,
        producedKinds: result.renderer.producedKinds,
        blockedKinds: result.renderer.blockedKinds,
        traceId: span.context.traceId,
      })

      return tracedJson(
        {
          ...result,
          releaseReady: false,
          releaseNote: 'Internal render evidence was generated. Final release still requires human approval.',
        },
        span.context,
      )
    },
    { parent, attributes: { route: '/api/runtime/viewport/render', method: 'POST', lane: 'viewport-render' } },
  )
}

export async function GET(request: NextRequest) {
  const parent = request.headers.get('traceparent')

  return withTraceSpan(
    'api.runtime.viewport.render.get',
    async (span) => {
      const authError = authorizeRendererRequest(request)
      if (authError) return attachTraceHeaders(authError, span.context)

      const artifactUrl = request.nextUrl.searchParams.get('artifactUrl')
      if (!artifactUrl) {
        return tracedJson(buildViewportRenderBackendCapabilities(), span.context)
      }

      try {
        const artifact = await readViewportRenderArtifact(artifactUrl)
        logger.info('viewport_render_backend.artifact_served', {
          projectId: artifact.projectId,
          contractId: artifact.contractId,
          fileName: artifact.fileName,
          traceId: span.context.traceId,
        })

        const responseBody = new ArrayBuffer(artifact.body.byteLength)
        new Uint8Array(responseBody).set(artifact.body)

        return new NextResponse(responseBody, {
          headers: {
            'content-type': artifact.contentType,
            'cache-control': 'no-store',
            'x-aethel-artifact-kind': artifact.fileName,
            ...traceHeaders(span.context),
          },
        })
      } catch (error) {
        if (error instanceof ViewportRenderArtifactReadError) {
          return tracedJson({ error: error.code, message: error.message }, span.context, { status: error.status })
        }
        logger.error('viewport_render_backend.artifact_failed', { err: error, traceId: span.context.traceId })
        return tracedJson({ error: 'ARTIFACT_READ_FAILED' }, span.context, { status: 500 })
      }
    },
    { parent, attributes: { route: '/api/runtime/viewport/render', method: 'GET', lane: 'viewport-render' } },
  )
}

function tracedJson(body: unknown, context: TraceContext, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init?.headers).entries()),
      ...traceHeaders(context),
    },
  })
}

function attachTraceHeaders(response: NextResponse, context: TraceContext) {
  for (const [key, value] of Object.entries(traceHeaders(context))) {
    response.headers.set(key, value)
  }
  return response
}
