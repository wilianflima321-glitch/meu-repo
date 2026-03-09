import fs from 'node:fs/promises'
import path from 'node:path'
import { getSearchRuntime, getGitService } from '@/lib/server'
import { getScopedWorkspaceRoot } from '@/lib/server/workspace-scope'
import { searchSemanticCodebase } from '@/lib/server/semantic-code-search'

const CONTEXTUAL_TAG_PATTERN =
  /@(file:[^\s]+|folder:[^\s]+|docs:[^\s]+|codebase|git:(?:diff|staged|status))/gi

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function resolveRepoRoot(): Promise<string> {
  let current = path.resolve(process.cwd())

  for (let i = 0; i < 6; i += 1) {
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

async function resolveContextRoot(userId?: string, projectId?: string): Promise<string> {
  if (userId && projectId) {
    const scopedRoot = getScopedWorkspaceRoot(userId, projectId)
    if (await pathExists(scopedRoot)) {
      return scopedRoot
    }
  }

  return resolveRepoRoot()
}

function clamp(text: string, max = 1800): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}\n... [truncated]`
}

async function readSafeFile(repoRoot: string, relativePath: string): Promise<string> {
  const normalized = relativePath.replace(/^file:/i, '').replace(/^\/+/, '')
  const absolute = path.resolve(repoRoot, normalized)
  const rel = path.relative(repoRoot, absolute)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return `[file blocked: ${relativePath}]`
  }

  const stat = await fs.stat(absolute)
  if (!stat.isFile()) return `[not a file: ${relativePath}]`

  const content = await fs.readFile(absolute, 'utf8')
  return clamp(content, 2200)
}

async function listSafeFolder(repoRoot: string, relativePath: string): Promise<string> {
  const normalized = relativePath.replace(/^\/+/, '')
  const absolute = path.resolve(repoRoot, normalized)
  const rel = path.relative(repoRoot, absolute)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return `[folder blocked: ${relativePath}]`
  }

  const stat = await fs.stat(absolute)
  if (!stat.isDirectory()) return `[not a folder: ${relativePath}]`

  const entries = await fs.readdir(absolute, { withFileTypes: true })
  const visible = entries
    .filter((entry) => !entry.name.startsWith('.'))
    .slice(0, 20)
    .map((entry) => `${entry.isDirectory() ? '[dir]' : '[file]'} ${entry.name}`)

  return visible.length > 0 ? visible.join('\n') : '[folder is empty]'
}

async function resolveCodebaseOverview(repoRoot: string): Promise<string> {
  const entries = await fs.readdir(repoRoot, { withFileTypes: true })
  const topLevel = entries
    .filter((entry) => !entry.name.startsWith('.'))
    .slice(0, 16)
    .map((entry) => `${entry.isDirectory() ? '[dir]' : '[file]'} ${entry.name}`)

  const keyFiles = ['README.md', 'docs/master/00_INDEX.md', 'cloud-web-app/web/app/page.tsx', 'cloud-web-app/web/app/dashboard/page.tsx']
  const existingKeyFiles: string[] = []
  for (const file of keyFiles) {
    if (await pathExists(path.join(repoRoot, file))) {
      existingKeyFiles.push(file)
    }
  }

  return [
    'Top-level structure:',
    ...topLevel,
    '',
    'Key entry files:',
    ...(existingKeyFiles.length > 0 ? existingKeyFiles.map((file) => `- ${file}`) : ['- none detected']),
  ].join('\n')
}

async function resolveCodebaseContext(params: {
  repoRoot: string
  message: string
  userId?: string
  projectId?: string
}): Promise<string> {
  const semanticQuery = params.message.replace(CONTEXTUAL_TAG_PATTERN, ' ').replace(/\s+/g, ' ').trim()

  const overview = await resolveCodebaseOverview(params.repoRoot)
  const retrieval = await searchSemanticCodebase({
    query: semanticQuery || 'project architecture entry points main components current implementation',
    userId: params.userId,
    projectId: params.projectId,
    maxResults: 4,
    minScore: 0.18,
  })

  if (retrieval.results.length === 0) {
    return [
      overview,
      '',
      'Semantic retrieval:',
      '[no semantic matches found in current scope]',
    ].join('\n')
  }

  const semanticMatches = retrieval.results.map((result, index) => {
    return [
      `${index + 1}. ${result.filePath}:${result.startLine}-${result.endLine} score=${result.score}`,
      clamp(result.excerpt, 700),
    ].join('\n')
  })

  return [
    overview,
    '',
    `Semantic retrieval (${retrieval.readiness.source}, scope=${retrieval.readiness.scope}, indexedFiles=${retrieval.stats.filesIndexed}, chunks=${retrieval.stats.chunksIndexed}):`,
    ...semanticMatches,
  ].join('\n\n')
}

async function resolveDocsQuery(repoRoot: string, query: string): Promise<string> {
  const runtime = getSearchRuntime()
  const result = await runtime.search({
    query,
    workspaceRoot: repoRoot,
    includePattern: 'docs/master/**',
    maxResults: 5,
    contextLines: 0,
  })

  if (result.matches.length === 0) {
    return `[no docs matches for "${query}"]`
  }

  return result.matches
    .slice(0, 5)
    .map((match) => `${match.file}:${match.line} -> ${match.preview.trim()}`)
    .join('\n')
}

async function resolveGitTag(tag: string): Promise<string> {
  const git = getGitService()

  if (tag === 'git:status') {
    const status = await git.getStatus()
    return [
      `branch=${status.branch}`,
      `staged=${status.staged.length}`,
      `unstaged=${status.unstaged.length}`,
      `untracked=${status.untracked.length}`,
      `conflicted=${status.conflicted.length}`,
    ].join('\n')
  }

  if (tag === 'git:diff' || tag === 'git:staged') {
    const diffs = await git.getDiff({ staged: tag === 'git:staged' })
    if (diffs.length === 0) return `[no ${tag === 'git:staged' ? 'staged' : 'working-tree'} diff]`
    return diffs
      .slice(0, 5)
      .map((diff) => `${diff.newPath}: +${diff.additions} -${diff.deletions}`)
      .join('\n')
  }

  return '[unsupported git tag]'
}

export function extractContextualMentionTags(message: string): string[] {
  return [...new Set((message.match(CONTEXTUAL_TAG_PATTERN) || []).map((tag) => tag.toLowerCase()))]
}

export type MentionContextPreviewBlock = {
  tag: string
  kind: 'codebase' | 'docs' | 'file' | 'folder' | 'git' | 'error'
  content: string
}

export async function buildMentionContextPreview(
  message: string,
  options: { userId?: string; projectId?: string } = {}
): Promise<{ tags: string[]; blocks: MentionContextPreviewBlock[]; context: string }> {
  const tags = extractContextualMentionTags(message).slice(0, 6)
  if (tags.length === 0) {
    return { tags: [], blocks: [], context: '' }
  }

  const repoRoot = await resolveContextRoot(options.userId, options.projectId)
  const blocks: MentionContextPreviewBlock[] = []

  for (const tag of tags) {
    try {
      if (tag === '@codebase') {
        blocks.push({
          tag,
          kind: 'codebase',
          content: await resolveCodebaseContext({
            repoRoot,
            message,
            userId: options.userId,
            projectId: options.projectId,
          }),
        })
        continue
      }

      if (tag.startsWith('@docs:')) {
        blocks.push({
          tag,
          kind: 'docs',
          content: await resolveDocsQuery(repoRoot, tag.slice('@docs:'.length)),
        })
        continue
      }

      if (tag.startsWith('@file:')) {
        blocks.push({
          tag,
          kind: 'file',
          content: await readSafeFile(repoRoot, tag.slice('@file:'.length)),
        })
        continue
      }

      if (tag.startsWith('@folder:')) {
        blocks.push({
          tag,
          kind: 'folder',
          content: await listSafeFolder(repoRoot, tag.slice('@folder:'.length)),
        })
        continue
      }

      if (tag.startsWith('@git:')) {
        blocks.push({
          tag,
          kind: 'git',
          content: await resolveGitTag(tag.slice(1)),
        })
      }
    } catch (error) {
      blocks.push({
        tag,
        kind: 'error',
        content: `[context resolution failed: ${error instanceof Error ? error.message : 'unknown error'}]`,
      })
    }
  }

  return {
    tags,
    blocks,
    context:
      blocks.length > 0
        ? `Contexto explicito de mentions:\n\n${blocks
            .map((block) => `## ${block.tag}\n${block.content}`)
            .join('\n\n')}`
        : '',
  }
}

export async function buildMentionContextBlock(
  message: string,
  options: { userId?: string; projectId?: string } = {}
): Promise<{ tags: string[]; context: string }> {
  const preview = await buildMentionContextPreview(message, options)
  return {
    tags: preview.tags,
    context: preview.context,
  }
}
