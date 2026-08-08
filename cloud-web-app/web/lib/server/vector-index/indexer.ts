/**
 * J.4 indexer — chunk files, hash-dedup, upsert into SQLite vector store.
 */

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'
import { createLocalHashEmbedProvider, type EmbedProvider } from './embed-provider'
import {
  deleteChunksForFile,
  setVectorMeta,
  upsertVectorChunks,
} from './store'
import type { VectorChunkRecord } from './types'

const log = createComponentLogger('vector-index.indexer')

const CHUNK_LINES = 80
const CHUNK_OVERLAP = 12
const CHUNK_MAX_CHARS = 3200
const MAX_INDEXED_FILES = 400

const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.py', '.md', '.mdx',
  '.css', '.scss', '.html', '.yml', '.yaml', '.rs',
])

const IGNORED_SEGMENTS = new Set([
  '.git', '.next', '.turbo', '.vercel', 'node_modules', 'dist', 'build',
  'coverage', '.aethel',
])

function languageFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.ts' || ext === '.tsx') return 'typescript'
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') return 'javascript'
  if (ext === '.py') return 'python'
  if (ext === '.rs') return 'rust'
  if (ext === '.md' || ext === '.mdx') return 'markdown'
  return ext.replace('.', '') || 'text'
}

function shouldIgnore(relPath: string): boolean {
  const parts = relPath.split(/[/\\]/)
  return parts.some((p) => IGNORED_SEGMENTS.has(p))
}

async function walkFiles(root: string, out: string[] = []): Promise<string[]> {
  let entries
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch {
    return out
  }
  for (const ent of entries) {
    const abs = path.join(root, ent.name)
    const rel = path.relative(root, abs)
    if (shouldIgnore(rel)) continue
    if (ent.isDirectory()) {
      if (out.length >= MAX_INDEXED_FILES) break
      await walkFiles(abs, out)
    } else if (ent.isFile()) {
      if (!ALLOWED_EXTENSIONS.has(path.extname(ent.name).toLowerCase())) continue
      out.push(abs)
      if (out.length >= MAX_INDEXED_FILES) break
    }
  }
  return out
}

function chunkFile(filePath: string, content: string): Array<{
  startLine: number
  endLine: number
  content: string
}> {
  const lines = content.split(/\r?\n/)
  const chunks: Array<{ startLine: number; endLine: number; content: string }> = []
  for (let i = 0; i < lines.length; i += CHUNK_LINES - CHUNK_OVERLAP) {
    const slice = lines.slice(i, i + CHUNK_LINES)
    const body = slice.join('\n').slice(0, CHUNK_MAX_CHARS)
    if (!body.trim()) continue
    chunks.push({
      startLine: i + 1,
      endLine: i + slice.length,
      content: body,
    })
    if (i + CHUNK_LINES >= lines.length) break
  }
  return chunks
}

export async function indexFileIntoVectorStore(input: {
  projectId: string
  rootPath: string
  absoluteFilePath: string
  embed?: EmbedProvider
}): Promise<number> {
  const embed = input.embed ?? createLocalHashEmbedProvider()
  const rel = path.relative(input.rootPath, input.absoluteFilePath).replace(/\\/g, '/')
  if (shouldIgnore(rel)) {
    deleteChunksForFile(input.projectId, rel)
    return 0
  }

  let content: string
  try {
    content = await fs.readFile(input.absoluteFilePath, 'utf8')
  } catch {
    deleteChunksForFile(input.projectId, rel)
    return 0
  }

  const pieces = chunkFile(rel, content)
  if (pieces.length === 0) {
    deleteChunksForFile(input.projectId, rel)
    return 0
  }

  const embeddings = await embed.embed(pieces.map((p) => p.content))
  const now = Date.now()
  const records: VectorChunkRecord[] = pieces.map((p, i) => {
    const contentHash = crypto.createHash('sha256').update(p.content).digest('hex')
    return {
      id: crypto.createHash('sha256').update(`${input.projectId}:${rel}:${p.startLine}:${contentHash}`).digest('hex').slice(0, 32),
      projectId: input.projectId,
      filePath: rel,
      startLine: p.startLine,
      endLine: p.endLine,
      language: languageFor(rel),
      content: p.content,
      contentHash,
      embedding: embeddings[i],
      updatedAt: now,
    }
  })

  deleteChunksForFile(input.projectId, rel)
  upsertVectorChunks(input.projectId, records)
  setVectorMeta(input.projectId, 'embedProvider', embed.kind)
  return records.length
}

export async function reindexProjectVectorStore(input: {
  projectId: string
  rootPath: string
  embed?: EmbedProvider
}): Promise<{ files: number; chunks: number }> {
  const embed = input.embed ?? createLocalHashEmbedProvider()
  const files = await walkFiles(input.rootPath)
  let chunks = 0
  for (const abs of files) {
    chunks += await indexFileIntoVectorStore({
      projectId: input.projectId,
      rootPath: input.rootPath,
      absoluteFilePath: abs,
      embed,
    })
  }
  setVectorMeta(input.projectId, 'lastIndexedAt', String(Date.now()))
  setVectorMeta(input.projectId, 'rootPath', input.rootPath)
  setVectorMeta(input.projectId, 'embedProvider', embed.kind)
  log.info('vector_reindex_complete', {
    projectId: input.projectId,
    files: files.length,
    chunks,
    embedProvider: embed.kind,
  })
  return { files: files.length, chunks }
}
