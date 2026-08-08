import { prisma } from '@/lib/db'
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'
import { queryRepoGraphRAG } from '@/lib/server/repo-graph-rag/repo-graph-rag'
import { getScopedWorkspaceRoot } from '@/lib/server/workspace-scope'

export interface AssembledAgentContext {
  /** Ready-to-inject prompt section. Empty string when nothing was retrieved. */
  text: string
  mustReadFirst: string[]
  retrievedFiles: string[]
  semanticReady: boolean
}

const EMPTY: AssembledAgentContext = {
  text: '',
  mustReadFirst: [],
  retrievedFiles: [],
  semanticReady: false,
}

/**
 * Assembles task-relevant repository context for an agent turn by combining two
 * signals the platform already produces:
 *  1. Repository Cartography `mustReadFirst`.
 *  2. L.12 RepoGraphRAG AST-aware neighborhood slicing.
 */
export async function assembleAgentContext(params: {
  userId: string
  projectId: string
  query: string
  maxResults?: number
}): Promise<AssembledAgentContext> {
  const { userId, projectId, query } = params
  if (!userId || !projectId) return EMPTY

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, OR: [{ userId }, { members: { some: { userId } } }] },
      select: { settings: true },
    })
    
    if (!project) return EMPTY
    
    const manifest = readRepositoryCartographyManifestFromSettings(project.settings)
    const list = manifest?.contextPlan?.mustReadFirst
    const mustReadFirst = Array.isArray(list) 
      ? list.filter((item): item is string => typeof item === 'string').slice(0, 12)
      : []

    const rootPath = await getScopedWorkspaceRoot(userId, projectId)
    let results: Awaited<ReturnType<typeof queryRepoGraphRAG>> | null = null

    if (query.trim() && manifest) {
      try {
        results = await queryRepoGraphRAG(query.trim(), projectId, rootPath, manifest, {
          topK: params.maxResults ?? 6,
          maxDegrees: 1,
          maxFilesPerHit: 3,
          maxTotalFiles: 8
        })
      } catch (err) {
        console.error('[assembleAgentContext] RAG search failed:', err)
      }
    }

    if (mustReadFirst.length === 0 && (!results || results.neighborhoodFiles.length === 0)) return EMPTY

    const sections: string[] = []
    if (mustReadFirst.length > 0) {
      sections.push(
        `## Repository map — load these before editing\n${mustReadFirst.map((path) => `- ${path}`).join('\n')}`
      )
    }

    if (results && results.neighborhoodFiles.length > 0) {
      const blocks = results.neighborhoodFiles.map(
        (f) => `### File: ${f.filePath}\n\`\`\`\n${f.content}\n\`\`\``
      )
      sections.push(`## AST Neighborhood Context (L.12 RepoGraphRAG)\n${blocks.join('\n\n')}`)
    }

    const retrievedFiles = results ? results.neighborhoodFiles.map(f => f.filePath) : []

    return {
      text: sections.join('\n\n'),
      mustReadFirst,
      retrievedFiles,
      semanticReady: !!results && results.semanticHits.length > 0,
    }
  } catch (error) {
    console.error('[assembleAgentContext] Failed:', error)
    return EMPTY
  }
}
