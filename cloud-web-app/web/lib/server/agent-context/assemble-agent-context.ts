import { prisma } from '@/lib/db'
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'
import { searchSemanticCodebase } from '@/lib/server/semantic-code-search'

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
 * signals the platform already produces but never wired into the agent loop:
 *  1. Repository Cartography `mustReadFirst` (the high-signal files for a repo).
 *  2. Semantic code search results scoped to the query.
 *
 * Entirely best-effort: any failure degrades to an empty section so it can never
 * break an agent run. This is the "it just knows the repo" layer.
 */
export async function assembleAgentContext(params: {
  userId: string
  projectId: string
  query: string
  maxResults?: number
}): Promise<AssembledAgentContext> {
  const { userId, projectId, query } = params
  if (!userId || !projectId) return EMPTY

  const mustReadFirst = await loadMustReadFirst(userId, projectId)
  const { results, semanticReady } = await retrieveSemanticMatches({
    userId,
    projectId,
    query,
    maxResults: params.maxResults ?? 6,
  })

  if (mustReadFirst.length === 0 && results.length === 0) return EMPTY

  const sections: string[] = []
  if (mustReadFirst.length > 0) {
    sections.push(
      `## Repository map — load these before editing\n${mustReadFirst.map((path) => `- ${path}`).join('\n')}`
    )
  }
  if (results.length > 0) {
    const blocks = results.map(
      (result) =>
        `### ${result.filePath}:${result.startLine}-${result.endLine} (relevance ${result.score.toFixed(2)})\n${result.excerpt}`
    )
    sections.push(`## Relevant code for this task (semantic retrieval)\n${blocks.join('\n\n')}`)
  }

  return {
    text: sections.join('\n\n'),
    mustReadFirst,
    retrievedFiles: results.map((result) => result.filePath),
    semanticReady,
  }
}

async function loadMustReadFirst(userId: string, projectId: string): Promise<string[]> {
  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, OR: [{ userId }, { members: { some: { userId } } }] },
      select: { settings: true },
    })
    if (!project) return []
    const manifest = readRepositoryCartographyManifestFromSettings(project.settings)
    const list = manifest?.contextPlan?.mustReadFirst
    if (!Array.isArray(list)) return []
    return list.filter((item): item is string => typeof item === 'string').slice(0, 12)
  } catch {
    return []
  }
}

async function retrieveSemanticMatches(params: {
  userId: string
  projectId: string
  query: string
  maxResults: number
}): Promise<{ results: Awaited<ReturnType<typeof searchSemanticCodebase>>['results']; semanticReady: boolean }> {
  const query = String(params.query || '').trim()
  if (!query) return { results: [], semanticReady: false }
  try {
    const search = await searchSemanticCodebase({
      query,
      userId: params.userId,
      projectId: params.projectId,
      maxResults: params.maxResults,
    })
    return {
      results: search.results,
      semanticReady: search.readiness.status === 'ready' || search.results.length > 0,
    }
  } catch {
    return { results: [], semanticReady: false }
  }
}
