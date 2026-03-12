import fs from 'node:fs/promises'
import path from 'node:path'
import { getSearchRuntime, getGitService } from '@/lib/server'
import { getScopedWorkspaceRoot } from '@/lib/server/workspace-scope'
import { searchSemanticCodebase } from '@/lib/server/semantic-code-search'

const CONTEXTUAL_TAG_PATTERN =
  /@(file:[^\s]+|folder:[^\s]+|docs:[^\s]+|codebase|git:(?:diff|staged|status|log|blame:[^\s]+)|diff|error|errors|diagnostics)/gi

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

async function resolveGitTag(repoRoot: string, tag: string): Promise<string> {
  const git = getGitService(repoRoot)

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

  if (tag === 'git:log') {
    try {
      const { execSync } = require('node:child_process')
      const log = execSync('git log --oneline -10', { encoding: 'utf8', timeout: 5000 }).trim()
      return log || '[no git log available]'
    } catch {
      return '[git log unavailable]'
    }
  }

  if (tag.startsWith('git:blame:')) {
    const filePath = tag.slice('git:blame:'.length)
    try {
      const { execSync } = require('node:child_process')
      const blame = execSync(`git blame --line-porcelain -L 1,20 "${filePath}" 2>/dev/null | head -60`, {
        encoding: 'utf8',
        timeout: 5000,
      }).trim()
      return blame || `[no blame data for ${filePath}]`
    } catch {
      return `[git blame unavailable for ${filePath}]`
    }
  }

  return '[unsupported git tag]'
}

export function extractContextualMentionTags(message: string): string[] {
  return [...new Set((message.match(CONTEXTUAL_TAG_PATTERN) || []).map((tag) => tag.toLowerCase()))]
}

/**
 * Resolve recent build/lint errors and diagnostics from the workspace
 */
async function resolveErrorDiagnostics(repoRoot: string): Promise<string> {
  const diagnostics: string[] = []

  // Try to read TypeScript errors from build output
  const buildOutputPaths = [
    path.join(repoRoot, 'cloud-web-app/web/build_out.txt'),
    path.join(repoRoot, '.next/build-error.log'),
  ]

  for (const buildPath of buildOutputPaths) {
    try {
      const content = await fs.readFile(buildPath, 'utf8')
      if (content.trim()) {
        const errorLines = content
          .split('\n')
          .filter((line) => /error|Error|ERR|TS\d{4}|warning/i.test(line))
          .slice(0, 20)
        if (errorLines.length > 0) {
          diagnostics.push(`Build diagnostics (${path.basename(buildPath)}):`)
          diagnostics.push(errorLines.join('\n'))
        }
      }
    } catch {
      // File doesn't exist, skip
    }
  }

  // Try to read ESLint output
  try {
    const { execSync } = require('node:child_process')
    const eslintOutput = execSync(
      'npx eslint --format compact --max-warnings 0 "app/**/*.{ts,tsx}" 2>&1 | head -30',
      { cwd: path.join(repoRoot, 'cloud-web-app/web'), encoding: 'utf8', timeout: 15000 }
    ).trim()
    if (eslintOutput && eslintOutput.includes('Error') || eslintOutput.includes('Warning')) {
      diagnostics.push('ESLint diagnostics:')
      diagnostics.push(eslintOutput)
    }
  } catch {
    // ESLint not available or no errors
  }

  // Try to read TypeScript compiler errors
  try {
    const { execSync } = require('node:child_process')
    const tscOutput = execSync(
      'npx tsc --noEmit --pretty false 2>&1 | head -30',
      { cwd: path.join(repoRoot, 'cloud-web-app/web'), encoding: 'utf8', timeout: 30000 }
    ).trim()
    if (tscOutput && tscOutput.includes('error TS')) {
      diagnostics.push('TypeScript diagnostics:')
      diagnostics.push(tscOutput)
    }
  } catch {
    // TypeScript check not available
  }

  if (diagnostics.length === 0) {
    return '[no recent errors or diagnostics found]'
  }

  return diagnostics.join('\n\n')
}

export type MentionContextPreviewBlock = {
  tag: string
  kind: 'codebase' | 'docs' | 'file' | 'folder' | 'git' | 'diff' | 'error' | 'diagnostics' | 'resolution-error'
  content: string
  /** Preview chip data for UI rendering */
  chip?: {
    label: string
    icon: 'code' | 'file' | 'folder' | 'git' | 'search' | 'warning' | 'bug' | 'diff'
    color: 'violet' | 'blue' | 'green' | 'amber' | 'red' | 'slate'
    fileCount?: number
    lineRange?: string
  }
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
        const content = await resolveCodebaseContext({
          repoRoot,
          message,
          userId: options.userId,
          projectId: options.projectId,
        })
        blocks.push({
          tag,
          kind: 'codebase',
          content,
          chip: { label: 'Codebase', icon: 'code', color: 'violet' },
        })
        continue
      }

      if (tag.startsWith('@docs:')) {
        const query = tag.slice('@docs:'.length)
        const content = await resolveDocsQuery(repoRoot, query)
        blocks.push({
          tag,
          kind: 'docs',
          content,
          chip: { label: `Docs: ${query}`, icon: 'search', color: 'blue' },
        })
        continue
      }

      if (tag.startsWith('@file:')) {
        const filePath = tag.slice('@file:'.length)
        const content = await readSafeFile(repoRoot, filePath)
        blocks.push({
          tag,
          kind: 'file',
          content,
          chip: { label: filePath.split('/').pop() || filePath, icon: 'file', color: 'green' },
        })
        continue
      }

      if (tag.startsWith('@folder:')) {
        const folderPath = tag.slice('@folder:'.length)
        const content = await listSafeFolder(repoRoot, folderPath)
        blocks.push({
          tag,
          kind: 'folder',
          content,
          chip: { label: folderPath.split('/').pop() || folderPath, icon: 'folder', color: 'amber' },
        })
        continue
      }

      if (tag.startsWith('@git:')) {
        const gitTag = tag.slice(1)
        const content = await resolveGitTag(repoRoot, gitTag)
        blocks.push({
          tag,
          kind: 'git',
          content,
          chip: { label: gitTag, icon: 'git', color: 'amber' },
        })
        continue
      }

      // @Diff - working tree diff (shorthand for @git:diff)
      if (tag === '@diff') {
        const content = await resolveGitTag(repoRoot, 'git:diff')
        blocks.push({
          tag,
          kind: 'diff',
          content,
          chip: { label: 'Working Diff', icon: 'diff', color: 'amber' },
        })
        continue
      }

      // @Error / @Errors / @Diagnostics - collect recent build/lint errors
      if (tag === '@error' || tag === '@errors' || tag === '@diagnostics') {
        const content = await resolveErrorDiagnostics(repoRoot)
        blocks.push({
          tag,
          kind: 'diagnostics',
          content,
          chip: { label: 'Diagnostics', icon: 'bug', color: 'red' },
        })
        continue
      }
    } catch (error) {
      blocks.push({
        tag,
        kind: 'resolution-error',
        content: `[context resolution failed: ${error instanceof Error ? error.message : 'unknown error'}]`,
        chip: { label: tag, icon: 'warning', color: 'red' },
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
