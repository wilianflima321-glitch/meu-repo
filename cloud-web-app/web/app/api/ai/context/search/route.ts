import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import {
  getSemanticCodeSearchReadiness,
  searchSemanticCodebase,
} from '@/lib/server/semantic-code-search'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const projectId = new URL(request.url).searchParams.get('projectId') || undefined
    const readiness = await getSemanticCodeSearchReadiness({
      userId: user.userId,
      projectId,
    })

    return NextResponse.json({
      readiness,
      capability: 'AI_CODEBASE_CONTEXT_SEARCH',
      capabilityStatus: 'PARTIAL',
      authority: 'canonical',
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const body = await request.json()
    const query = typeof body?.query === 'string' ? body.query : ''
    const projectId = typeof body?.projectId === 'string' ? body.projectId : undefined
    const maxResults = Number(body?.maxResults || 5)
    const invalidateCache = Boolean(body?.invalidateCache)

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      )
    }

    const response = await searchSemanticCodebase({
      query,
      userId: user.userId,
      projectId,
      maxResults: Number.isFinite(maxResults) ? Math.max(1, Math.min(maxResults, 8)) : 5,
      invalidateCache,
    })

    return NextResponse.json({
      ...response,
      capability: 'AI_CODEBASE_CONTEXT_SEARCH',
      capabilityStatus: 'PARTIAL',
      authority: 'canonical',
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
