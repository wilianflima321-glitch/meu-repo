import fs from 'node:fs/promises'
import path from 'node:path'
import { getScopedWorkspaceRoot } from '@/lib/server/workspace-scope'

const RULES_FILE = '.aethelrules'
const CACHE_TTL_MS = 30_000
const DEFAULT_MAX_CHARS = 2_400

type RulesCacheEntry = {
  key: string
  expiresAt: number
  context: string
}

let cache: RulesCacheEntry | null = null

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

function clamp(text: string, maxChars = DEFAULT_MAX_CHARS): string {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, maxChars)}\n... [rules truncated]`
}

async function resolveRepoRoot(): Promise<string> {
  let current = path.resolve(process.cwd())

  for (let depth = 0; depth < 6; depth += 1) {
    if (await pathExists(path.join(current, RULES_FILE))) {
      return current
    }

    const docsMaster = path.join(current, 'docs', 'master')
    const packageJson = path.join(current, 'package.json')
    if (await pathExists(docsMaster) && await pathExists(packageJson)) {
      return current
    }

    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  return path.resolve(process.cwd())
}

async function resolveCandidateRoots(userId?: string, projectId?: string): Promise<Array<{ root: string; source: string }>> {
  const candidates: Array<{ root: string; source: string }> = []

  if (userId && projectId) {
    const scopedRoot = getScopedWorkspaceRoot(userId, projectId)
    if (await pathExists(path.join(scopedRoot, RULES_FILE))) {
      candidates.push({ root: scopedRoot, source: 'workspace' })
    }
  }

  const repoRoot = await resolveRepoRoot()
  candidates.push({ root: repoRoot, source: 'repo' })

  return candidates
}

async function readRulesFile(targetRoot: string, source: string, maxChars: number): Promise<string> {
  const rulesPath = path.join(targetRoot, RULES_FILE)
  if (!(await pathExists(rulesPath))) return ''

  const raw = await fs.readFile(rulesPath, 'utf8')
  const relative = path.relative(process.cwd(), rulesPath).replace(/\\/g, '/')
  const label = source === 'workspace' ? 'workspace-scoped' : 'repo-root'

  return [
    `Project rules (${label}, source=${relative || RULES_FILE}):`,
    clamp(raw, maxChars),
    '',
    'Treat these rules as repository constraints unless they conflict with the user request, system safety, or explicit runtime limitations.',
  ].join('\n')
}

export async function loadProjectRulesContext(params: {
  userId?: string
  projectId?: string
  maxChars?: number
} = {}): Promise<string> {
  const { userId, projectId, maxChars = DEFAULT_MAX_CHARS } = params
  const cacheKey = `${userId || 'anonymous'}:${projectId || 'default'}:${maxChars}`

  if (cache && cache.key === cacheKey && cache.expiresAt > Date.now()) {
    return cache.context
  }

  const candidates = await resolveCandidateRoots(userId, projectId)
  for (const candidate of candidates) {
    const context = await readRulesFile(candidate.root, candidate.source, maxChars)
    if (context) {
      cache = {
        key: cacheKey,
        context,
        expiresAt: Date.now() + CACHE_TTL_MS,
      }
      return context
    }
  }

  cache = {
    key: cacheKey,
    context: '',
    expiresAt: Date.now() + CACHE_TTL_MS,
  }
  return ''
}

export function applyProjectRulesToMessages<T extends { role: string; content: string }>(
  messages: T[],
  rulesContext: string
): T[] {
  if (!rulesContext.trim()) return messages
  if (messages.length === 0) return [{ role: 'system', content: rulesContext } as T]

  const [first, ...rest] = messages
  if (first.role === 'system') {
    return [{ ...first, content: `${first.content}\n\n${rulesContext}` }, ...rest]
  }

  return [{ role: 'system', content: rulesContext } as T, ...messages]
}
