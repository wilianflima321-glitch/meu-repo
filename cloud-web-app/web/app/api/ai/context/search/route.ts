import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { queryRepoGraphRAG } from '@/lib/server/repo-graph-rag/repo-graph-rag'
import { getScopedWorkspaceRoot } from '@/lib/server/workspace-scope'
import { prisma } from '@/lib/db'
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'
import {
  AI_CONTEXT_RATE_LIMIT,
  enforceAiCoreRateLimit,
} from '@/lib/server/ai-core-rate-limit'
import { parseByokFromRequest, enforceByokProxyRateLimit, auditByokUsage } from '@/lib/ai/byok-request'
import {
  buildVectorIndexReadiness,
  getVectorIndexStats,
  isVectorWatcherActive,
  searchVectorIndex,
} from '@/lib/server/vector-index'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const rateLimited = enforceAiCoreRateLimit({
      req: request,
      capability: 'ai.context.search',
      route: '/api/ai/context/search',
      config: AI_CONTEXT_RATE_LIMIT,
    })
    if (rateLimited) return rateLimited

    await requireEntitlementsForUser(user.userId)

    const projectId = request.nextUrl.searchParams.get('projectId') || undefined
    const readiness = buildVectorIndexReadiness({ projectId: projectId || undefined })
    const stats = projectId ? getVectorIndexStats(projectId, isVectorWatcherActive(projectId)) : null

    return NextResponse.json({
      readiness,
      stats,
      capability: 'AI_CODEBASE_CONTEXT_SEARCH',
      capabilityStatus: readiness.capabilityStatus,
      authority: 'canonical',
      // Honest: local-hash ≠ true semantic; BYOK semantic gated; native vec status from probe
      j4: {
        sqliteVecStatus: readiness.sqliteVecStatus,
        sqliteVecReason: readiness.sqliteVecReason,
        searchQuality: readiness.searchQuality,
        platformPaysEmbeddings: false,
        trueSemanticRecall: readiness.trueSemanticRecall,
        annBackend: stats?.annBackend ?? 'js-cosine',
      },
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
    const rateLimited = enforceAiCoreRateLimit({
      req: request,
      capability: 'ai.context.search',
      route: '/api/ai/context/search',
      config: AI_CONTEXT_RATE_LIMIT,
    })
    if (rateLimited) return rateLimited

    const entitlements = await requireEntitlementsForUser(user.userId)
    const byokParsed = parseByokFromRequest(request)
    if (byokParsed.active) {
      const byokLimited = enforceByokProxyRateLimit(request, '/api/ai/context/search')
      if (byokLimited) return byokLimited
    }

    const body = await request.json()
    const query = typeof body?.query === 'string' ? body.query : ''
    const projectId = typeof body?.projectId === 'string' ? body.projectId : undefined
    const maxResults = Number(body?.maxResults || 5)
    const preferByokSemantic = body?.embedMode === 'byok-cloud' || byokParsed.active

    if (!query.trim() || !projectId) {
      return NextResponse.json(
        { error: 'query and projectId are required' },
        { status: 400 },
      )
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ userId: user.userId }, { members: { some: { userId: user.userId } } }],
      },
      select: { settings: true },
    })

    const manifest = project
      ? readRepositoryCartographyManifestFromSettings(project.settings)
      : null
    if (!manifest) {
      const readiness = buildVectorIndexReadiness({ projectId })
      return NextResponse.json({ results: [], readiness, stats: getVectorIndexStats(projectId) })
    }

    const rootPath = getScopedWorkspaceRoot(user.userId, projectId)
    const limit = Number.isFinite(maxResults) ? Math.max(1, Math.min(maxResults, 8)) : 5

    // Direct J.4 vector search (honest quality labels) + L.12 neighborhood expand
    const vectorResult = await searchVectorIndex({
      projectId,
      query,
      topK: limit,
      rootPath,
      userId: user.userId,
      planId: entitlements.plan?.id,
      embedMode: preferByokSemantic && byokParsed.active ? 'byok-cloud' : 'local-hash',
      byokApiKey: byokParsed.active ? byokParsed.apiKey : undefined,
    })

    if (vectorResult.modeUsed === 'byok-cloud') {
      auditByokUsage({
        userId: user.userId,
        route: '/api/ai/context/search',
        modelId: 'text-embedding-3-small',
        estimatedTokens: Math.ceil(query.length / 4),
        provider: byokParsed.active ? byokParsed.provider : 'openai',
      })
    }

    const response = await queryRepoGraphRAG(query, projectId, rootPath, manifest, {
      topK: limit,
      maxDegrees: 1,
      maxFilesPerHit: 3,
      maxTotalFiles: limit,
    })

    const readiness = buildVectorIndexReadiness({
      projectId,
      searchQuality: vectorResult.searchQuality,
      embedProvider: vectorResult.embedProvider,
      byokCloudEmbedActive: vectorResult.modeUsed === 'byok-cloud',
      watcherActive: isVectorWatcherActive(projectId),
    })

    // Prefer AST neighborhood when available; fall back to raw vector hits
    const results =
      response.neighborhoodFiles.length > 0
        ? response.neighborhoodFiles.map((f, i) => ({
            id: `ast-slice-${i}`,
            filePath: f.filePath,
            score: response.semanticHits[i]?.score ?? vectorResult.hits[i]?.score ?? 0,
            excerpt: f.content,
            startLine: 1,
            endLine: f.content.split('\n').length,
            language: f.filePath.split('.').pop() || 'ts',
          }))
        : vectorResult.hits.map((h) => ({
            id: h.id,
            filePath: h.filePath,
            score: h.score,
            excerpt: h.excerpt,
            startLine: h.startLine,
            endLine: h.endLine,
            language: h.language,
          }))

    return NextResponse.json({
      results,
      readiness,
      stats: getVectorIndexStats(projectId, isVectorWatcherActive(projectId)),
      vectorSearch: {
        searchQuality: vectorResult.searchQuality,
        embedProvider: vectorResult.embedProvider,
        modeUsed: vectorResult.modeUsed,
        deniedReason: vectorResult.deniedReason ?? null,
        hitCount: vectorResult.hits.length,
      },
      capability: 'AI_CODEBASE_CONTEXT_SEARCH',
      capabilityStatus: readiness.capabilityStatus,
      authority: 'canonical',
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
