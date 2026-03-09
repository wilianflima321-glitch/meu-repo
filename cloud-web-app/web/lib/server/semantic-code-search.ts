import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { getScopedWorkspaceRoot, toVirtualWorkspacePath } from '@/lib/server/workspace-scope'

type SearchScope = 'project' | 'repository'

export interface SemanticCodeSearchResult {
  id: string
  filePath: string
  score: number
  excerpt: string
  startLine: number
  endLine: number
  language: string
}

export interface SemanticCodeSearchReadiness {
  status: 'ready' | 'partial'
  source: 'local-persistent-cache'
  persistentIndex: true
  crossSessionMemory: true
  incrementalReindex: true
  maxIndexedFiles: number
  maxResults: number
  scope: SearchScope
  blockers: string[]
}

interface ChunkRecord {
  id: string
  filePath: string
  startLine: number
  endLine: number
  language: string
  content: string
  embedding: number[]
}

interface CacheEntry {
  indexedAt: number
  rootPath: string
  scope: SearchScope
  chunks: ChunkRecord[]
  filesIndexed: number
  changedFiles: number
  reusedFiles: number
  fileRecords: Array<{
    filePath: string
    contentHash: string
    chunks: ChunkRecord[]
  }>
}

const CACHE_TTL_MS = 2 * 60 * 1000
const EMBEDDING_DIMENSIONS = 384
const MAX_INDEXED_FILES = 120
const MAX_RESULTS = 8
const CHUNK_LINES = 80
const CHUNK_OVERLAP = 12
const CHUNK_MAX_CHARS = 3200

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.py',
  '.md',
  '.mdx',
  '.css',
  '.scss',
  '.html',
  '.yml',
  '.yaml',
])

const IGNORED_SEGMENTS = new Set([
  '.git',
  '.next',
  '.turbo',
  '.vercel',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.aethel',
])

const cache = new Map<string, CacheEntry>()

function getDiskCacheDir(): string {
  return path.join(process.cwd(), '.aethel', 'cache', 'semantic-code-search')
}

function getDiskCachePath(rootPath: string, scope: SearchScope): string {
  const digest = crypto.createHash('sha1').update(`${scope}:${rootPath}`).digest('hex')
  return path.join(getDiskCacheDir(), `${scope}-${digest}.json`)
}

async function readDiskCache(rootPath: string, scope: SearchScope): Promise<CacheEntry | null> {
  try {
    const cacheFile = getDiskCachePath(rootPath, scope)
    const raw = await fs.readFile(cacheFile, 'utf8')
    const parsed = JSON.parse(raw) as CacheEntry
    if (!parsed || parsed.rootPath !== rootPath || parsed.scope !== scope) return null
    if ((Date.now() - parsed.indexedAt) >= CACHE_TTL_MS) return null
    if (!Array.isArray(parsed.fileRecords)) {
      return {
        ...parsed,
        changedFiles: parsed.filesIndexed,
        reusedFiles: 0,
        fileRecords: [],
      }
    }
    return parsed
  } catch {
    return null
  }
}

async function writeDiskCache(entry: CacheEntry): Promise<void> {
  try {
    const cacheDir = getDiskCacheDir()
    await fs.mkdir(cacheDir, { recursive: true })
    await fs.writeFile(getDiskCachePath(entry.rootPath, entry.scope), JSON.stringify(entry), 'utf8')
  } catch {
    // best effort only
  }
}

export function invalidateSemanticCodeSearchCache(params: {
  rootPath?: string
  scope?: SearchScope
  removeDiskCache?: boolean
} = {}): number {
  const { rootPath, scope, removeDiskCache = false } = params
  const keys = Array.from(cache.keys())
  let invalidated = 0

  for (const key of keys) {
    const matchesScope = !scope || key.startsWith(`${scope}:`)
    const matchesRoot = !rootPath || key === `${scope || key.split(':', 1)[0]}:${rootPath}` || key.endsWith(`:${rootPath}`)
    if (!matchesScope || !matchesRoot) continue
    cache.delete(key)
    invalidated += 1
  }

  if (rootPath && removeDiskCache) {
    const scopes: SearchScope[] = scope ? [scope] : ['project', 'repository']
    for (const cacheScope of scopes) {
      const diskPath = getDiskCachePath(rootPath, cacheScope)
      void fs.unlink(diskPath).catch(() => undefined)
    }
  }

  return invalidated
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_./-]+/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2)
}

function hashToken(token: string): number {
  let hash = 0
  for (let index = 0; index < token.length; index += 1) {
    hash = ((hash << 5) - hash) + token.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function embedText(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0)
  const tokens = tokenize(text)

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const slot = hashToken(token) % EMBEDDING_DIMENSIONS
    vector[slot] += 1 / Math.sqrt(index + 1)
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + (value * value), 0)) || 1
  return vector.map((value) => value / magnitude)
}

function hashContent(text: string): string {
  return crypto.createHash('sha1').update(text).digest('hex')
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index]
    normA += a[index] * a[index]
    normB += b[index] * b[index]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dot / denominator
}

function detectLanguage(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase()
  switch (extension) {
    case '.ts':
    case '.tsx':
      return 'typescript'
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'javascript'
    case '.py':
      return 'python'
    case '.md':
    case '.mdx':
      return 'markdown'
    case '.json':
      return 'json'
    case '.css':
    case '.scss':
      return 'css'
    case '.html':
      return 'html'
    case '.yml':
    case '.yaml':
      return 'yaml'
    default:
      return 'text'
  }
}

function isIgnoredPath(targetPath: string): boolean {
  const segments = targetPath.split(/[\\/]+/)
  return segments.some((segment) => IGNORED_SEGMENTS.has(segment))
}

async function resolveRepositoryRoot(): Promise<string> {
  let current = path.resolve(process.cwd())

  for (let depth = 0; depth < 6; depth += 1) {
    const docsMaster = path.join(current, 'docs', 'master')
    const packageJson = path.join(current, 'package.json')

    try {
      await fs.access(docsMaster)
      await fs.access(packageJson)
      return current
    } catch {
      // keep walking
    }

    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  return path.resolve(process.cwd())
}

async function getSearchRoot(userId?: string, projectId?: string): Promise<{ rootPath: string; scope: SearchScope }> {
  if (userId && projectId) {
    const scopedRoot = getScopedWorkspaceRoot(userId, projectId)
    try {
      const stat = await fs.stat(scopedRoot)
      if (stat.isDirectory()) {
        return { rootPath: scopedRoot, scope: 'project' }
      }
    } catch {
      // fall through
    }
  }

  return { rootPath: await resolveRepositoryRoot(), scope: 'repository' }
}

async function collectCandidateFiles(rootPath: string): Promise<string[]> {
  const files: string[] = []
  const queue = [rootPath]

  while (queue.length > 0 && files.length < MAX_INDEXED_FILES) {
    const current = queue.shift()
    if (!current) break

    let entries: fs.Dirent[] = []
    try {
      entries = await fs.readdir(current, { withFileTypes: true })
    } catch {
      continue
    }

    entries.sort((left, right) => {
      if (left.isDirectory() && !right.isDirectory()) return -1
      if (!left.isDirectory() && right.isDirectory()) return 1
      return left.name.localeCompare(right.name)
    })

    for (const entry of entries) {
      if (entry.name.startsWith('.env')) continue
      const absolutePath = path.join(current, entry.name)
      if (isIgnoredPath(absolutePath)) continue

      if (entry.isDirectory()) {
        queue.push(absolutePath)
        continue
      }

      if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue
      files.push(absolutePath)
      if (files.length >= MAX_INDEXED_FILES) break
    }
  }

  return files
}

function buildChunks(filePath: string, rootPath: string, content: string): ChunkRecord[] {
  const lines = content.split(/\r?\n/)
  const chunks: ChunkRecord[] = []
  const language = detectLanguage(filePath)
  const relativePath =
    rootPath === path.dirname(rootPath)
      ? filePath
      : rootPath.includes(path.join('.aethel', 'workspaces'))
        ? toVirtualWorkspacePath(filePath, rootPath)
        : path.relative(rootPath, filePath).replace(/\\/g, '/')

  for (let startIndex = 0; startIndex < lines.length; startIndex += Math.max(1, CHUNK_LINES - CHUNK_OVERLAP)) {
    const slice = lines.slice(startIndex, startIndex + CHUNK_LINES)
    if (slice.length === 0) break

    let contentSlice = slice.join('\n').trim()
    if (!contentSlice) continue
    if (contentSlice.length > CHUNK_MAX_CHARS) {
      contentSlice = `${contentSlice.slice(0, CHUNK_MAX_CHARS)}\n... [truncated]`
    }

    const startLine = startIndex + 1
    const endLine = startIndex + slice.length
    chunks.push({
      id: `${relativePath}:${startLine}-${endLine}`,
      filePath: relativePath.startsWith('/') ? relativePath : `/${relativePath}`,
      startLine,
      endLine,
      language,
      content: contentSlice,
      embedding: embedText(`${relativePath}\n${contentSlice}`),
    })
  }

  return chunks
}

async function buildIndex(rootPath: string, scope: SearchScope, previousEntry: CacheEntry | null = null): Promise<CacheEntry> {
  const files = await collectCandidateFiles(rootPath)
  const chunks: ChunkRecord[] = []
  const fileRecords: CacheEntry['fileRecords'] = []
  const previousByPath = new Map((previousEntry?.fileRecords || []).map((record) => [record.filePath, record]))
  let changedFiles = 0
  let reusedFiles = 0

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      const contentHash = hashContent(content)
      const previousRecord = previousByPath.get(filePath)
      if (previousRecord && previousRecord.contentHash === contentHash) {
        reusedFiles += 1
        chunks.push(...previousRecord.chunks)
        fileRecords.push(previousRecord)
        continue
      }

      const nextChunks = buildChunks(filePath, rootPath, content)
      changedFiles += 1
      chunks.push(...nextChunks)
      fileRecords.push({
        filePath,
        contentHash,
        chunks: nextChunks,
      })
    } catch {
      // skip unreadable files
    }
  }

  return {
    indexedAt: Date.now(),
    rootPath,
    scope,
    chunks,
    filesIndexed: files.length,
    changedFiles,
    reusedFiles,
    fileRecords,
  }
}

async function getOrBuildIndex(rootPath: string, scope: SearchScope, forceReindex = false): Promise<CacheEntry> {
  const cacheKey = `${scope}:${rootPath}`
  const existing = !forceReindex ? cache.get(cacheKey) : undefined
  if (existing && (Date.now() - existing.indexedAt) < CACHE_TTL_MS) {
    return existing
  }

  const diskEntry = await readDiskCache(rootPath, scope)
  if (diskEntry && !forceReindex) {
    cache.set(cacheKey, diskEntry)
    return diskEntry
  }

  const rebuilt = await buildIndex(rootPath, scope, diskEntry)
  cache.set(cacheKey, rebuilt)
  await writeDiskCache(rebuilt)
  return rebuilt
}

function buildExcerpt(chunk: ChunkRecord): string {
  return [
    `// ${chunk.filePath}:${chunk.startLine}-${chunk.endLine}`,
    chunk.content,
  ].join('\n')
}

export async function getSemanticCodeSearchReadiness(params: {
  userId?: string
  projectId?: string
} = {}): Promise<SemanticCodeSearchReadiness> {
  const { scope } = await getSearchRoot(params.userId, params.projectId)

  return {
    status: 'partial',
    source: 'local-persistent-cache',
    persistentIndex: true,
    crossSessionMemory: true,
    incrementalReindex: true,
    maxIndexedFiles: MAX_INDEXED_FILES,
    maxResults: MAX_RESULTS,
    scope,
    blockers: [
      'PRODUCTION_VECTOR_DB_NOT_CONFIGURED',
    ],
  }
}

export async function searchSemanticCodebase(params: {
  query: string
  userId?: string
  projectId?: string
  maxResults?: number
  minScore?: number
  invalidateCache?: boolean
}): Promise<{
  readiness: SemanticCodeSearchReadiness
  results: SemanticCodeSearchResult[]
  stats: { filesIndexed: number; chunksIndexed: number; indexedAt: string; changedFiles: number; reusedFiles: number }
}> {
  const { query, userId, projectId, maxResults = MAX_RESULTS, minScore = 0.2, invalidateCache = false } = params
  const normalizedQuery = String(query || '').trim()
  const { rootPath, scope } = await getSearchRoot(userId, projectId)
  const readiness = await getSemanticCodeSearchReadiness({ userId, projectId })

  if (!normalizedQuery) {
    return {
      readiness,
      results: [],
      stats: {
        filesIndexed: 0,
        chunksIndexed: 0,
        indexedAt: new Date(0).toISOString(),
        changedFiles: 0,
        reusedFiles: 0,
      },
    }
  }

  if (invalidateCache) {
    invalidateSemanticCodeSearchCache({ rootPath, scope, removeDiskCache: false })
  }

  const index = await getOrBuildIndex(rootPath, scope, invalidateCache)
  const queryEmbedding = embedText(normalizedQuery)

  const results = index.chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((item) => item.score >= minScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(maxResults, MAX_RESULTS))
    .map(({ chunk, score }) => ({
      id: chunk.id,
      filePath: chunk.filePath,
      score: Number(score.toFixed(3)),
      excerpt: buildExcerpt(chunk),
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      language: chunk.language,
    }))

  return {
    readiness,
    results,
    stats: {
      filesIndexed: index.filesIndexed,
      chunksIndexed: index.chunks.length,
      indexedAt: new Date(index.indexedAt).toISOString(),
      changedFiles: index.changedFiles,
      reusedFiles: index.reusedFiles,
    },
  }
}
