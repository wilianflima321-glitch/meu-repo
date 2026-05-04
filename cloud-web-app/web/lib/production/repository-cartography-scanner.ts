import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { RepositoryArtifactInput } from './repository-cartography'

export type RepositoryCartographyScanSkippedReason = 'ignored-dir' | 'max-files' | 'max-depth' | 'stat-failed' | 'symlink'

export type RepositoryCartographyScanSkipped = {
  path: string
  reason: RepositoryCartographyScanSkippedReason
}

export type RepositoryCartographyScanResult = {
  root: string
  artifacts: RepositoryArtifactInput[]
  skipped: RepositoryCartographyScanSkipped[]
  truncated: boolean
}

export type RepositoryCartographyScanOptions = {
  maxFiles?: number
  maxDepth?: number
  maxHashBytes?: number
  ignoredDirectories?: string[]
}

const DEFAULT_MAX_FILES = 5000
const DEFAULT_MAX_DEPTH = 14
const DEFAULT_MAX_HASH_BYTES = 8 * 1024 * 1024

const defaultIgnoredDirectories = new Set([
  '.cache',
  '.git',
  '.next',
  '.turbo',
  '.vercel',
  'coverage',
  'dist',
  'build',
  'node_modules',
  'out',
])

const mimeByExtension = new Map<string, string>([
  ['avif', 'image/avif'],
  ['css', 'text/css'],
  ['csv', 'text/csv'],
  ['fbx', 'model/fbx'],
  ['gif', 'image/gif'],
  ['glb', 'model/gltf-binary'],
  ['gltf', 'model/gltf+json'],
  ['html', 'text/html'],
  ['jpeg', 'image/jpeg'],
  ['jpg', 'image/jpeg'],
  ['json', 'application/json'],
  ['md', 'text/markdown'],
  ['mdx', 'text/markdown'],
  ['mp3', 'audio/mpeg'],
  ['mp4', 'video/mp4'],
  ['png', 'image/png'],
  ['ts', 'text/typescript'],
  ['tsx', 'text/typescript-jsx'],
  ['txt', 'text/plain'],
  ['wav', 'audio/wav'],
  ['webm', 'video/webm'],
  ['webp', 'image/webp'],
  ['yaml', 'application/yaml'],
  ['yml', 'application/yaml'],
])

type QueueItem = {
  absolutePath: string
  relativePath: string
  depth: number
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '')
}

function extensionOf(filePath: string): string {
  const base = path.basename(filePath).toLowerCase()
  if (base === '.aethelrules') return 'aethelrules'
  const extension = path.extname(base).replace(/^\./, '')
  return extension
}

function inferMimeType(filePath: string): string | undefined {
  return mimeByExtension.get(extensionOf(filePath))
}

async function hashFile(absolutePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(absolutePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(`sha256:${hash.digest('hex')}`))
  })
}

function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}

function buildIgnoredDirectories(extraIgnored: string[] | undefined): Set<string> {
  return new Set([...defaultIgnoredDirectories, ...(extraIgnored ?? []).map((item) => item.trim()).filter(Boolean)])
}

function normalizeLimit(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.floor(value as number)))
}

export async function scanWorkspaceForRepositoryArtifacts(
  rootInput: string,
  options: RepositoryCartographyScanOptions = {}
): Promise<RepositoryCartographyScanResult> {
  const root = path.resolve(rootInput)
  const maxFiles = normalizeLimit(options.maxFiles, DEFAULT_MAX_FILES, 1, 50_000)
  const maxDepth = normalizeLimit(options.maxDepth, DEFAULT_MAX_DEPTH, 1, 40)
  const maxHashBytes = normalizeLimit(options.maxHashBytes, DEFAULT_MAX_HASH_BYTES, 0, 256 * 1024 * 1024)
  const ignoredDirectories = buildIgnoredDirectories(options.ignoredDirectories)
  const artifacts: RepositoryArtifactInput[] = []
  const skipped: RepositoryCartographyScanSkipped[] = []
  const queue: QueueItem[] = [{ absolutePath: root, relativePath: '', depth: 0 }]
  let truncated = false

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break

    if (current.depth > maxDepth) {
      skipped.push({ path: current.relativePath || '/', reason: 'max-depth' })
      continue
    }

    let entries: fs.Dirent[]
    try {
      entries = await fs.promises.readdir(current.absolutePath, { withFileTypes: true })
    } catch {
      skipped.push({ path: current.relativePath || '/', reason: 'stat-failed' })
      continue
    }

    entries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      const absolutePath = path.resolve(current.absolutePath, entry.name)
      if (!isInsideRoot(root, absolutePath)) {
        skipped.push({ path: normalizeRelativePath(path.relative(root, absolutePath)), reason: 'stat-failed' })
        continue
      }

      const relativePath = normalizeRelativePath(path.relative(root, absolutePath))

      if (entry.isSymbolicLink()) {
        skipped.push({ path: relativePath, reason: 'symlink' })
        continue
      }

      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) {
          skipped.push({ path: relativePath, reason: 'ignored-dir' })
          continue
        }
        queue.push({ absolutePath, relativePath, depth: current.depth + 1 })
        continue
      }

      if (!entry.isFile()) continue

      if (artifacts.length >= maxFiles) {
        truncated = true
        skipped.push({ path: relativePath, reason: 'max-files' })
        continue
      }

      try {
        const stat = await fs.promises.stat(absolutePath)
        const shouldHash = stat.size <= maxHashBytes
        artifacts.push({
          path: relativePath,
          sizeBytes: stat.size,
          sourceKind: 'local-workspace',
          mimeType: inferMimeType(relativePath),
          hash: shouldHash ? await hashFile(absolutePath) : undefined,
          lastModified: stat.mtime.toISOString(),
        })
      } catch {
        skipped.push({ path: relativePath, reason: 'stat-failed' })
      }
    }
  }

  return {
    root,
    artifacts,
    skipped,
    truncated,
  }
}
