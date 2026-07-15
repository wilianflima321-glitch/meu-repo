/**
 * J.4 durable SQLite store (node:sqlite).
 * Embeddings stored as Float32 blobs; search uses cosine in process
 * (sqlite-vec extension HELD — schema ready for vec0 migration).
 */

import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { VectorChunkRecord } from './types'

const globalStore = globalThis as typeof globalThis & {
  __aethelVectorDb?: Map<string, DatabaseSync>
}

function dbCache(): Map<string, DatabaseSync> {
  if (!globalStore.__aethelVectorDb) globalStore.__aethelVectorDb = new Map()
  return globalStore.__aethelVectorDb
}

export function getVectorIndexDbPath(projectId: string): string {
  const safe = projectId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
  return path.join(process.cwd(), '.aethel', 'vector-index', `${safe}.sqlite`)
}

export function openVectorIndexDb(projectId: string): DatabaseSync {
  const cache = dbCache()
  const existing = cache.get(projectId)
  if (existing) return existing

  const dbPath = getVectorIndexDbPath(projectId)
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vector_chunks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      language TEXT NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      embedding BLOB NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vector_chunks_file ON vector_chunks(file_path);
    CREATE INDEX IF NOT EXISTS idx_vector_chunks_project ON vector_chunks(project_id);
    CREATE TABLE IF NOT EXISTS vector_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  cache.set(projectId, db)
  return db
}

function floatsToBlob(embedding: number[]): Buffer {
  const buf = Buffer.alloc(embedding.length * 4)
  for (let i = 0; i < embedding.length; i++) buf.writeFloatLE(embedding[i], i * 4)
  return buf
}

function blobToFloats(blob: Buffer | Uint8Array): number[] {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob)
  const out: number[] = []
  for (let i = 0; i + 4 <= buf.length; i += 4) out.push(buf.readFloatLE(i))
  return out
}

export function upsertVectorChunks(projectId: string, chunks: VectorChunkRecord[]): void {
  const db = openVectorIndexDb(projectId)
  const stmt = db.prepare(`
    INSERT INTO vector_chunks (
      id, project_id, file_path, start_line, end_line, language,
      content, content_hash, embedding, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      content = excluded.content,
      content_hash = excluded.content_hash,
      embedding = excluded.embedding,
      start_line = excluded.start_line,
      end_line = excluded.end_line,
      language = excluded.language,
      updated_at = excluded.updated_at
  `)
  const tx = db.prepare('BEGIN')
  const commit = db.prepare('COMMIT')
  const rollback = db.prepare('ROLLBACK')
  tx.run()
  try {
    for (const c of chunks) {
      stmt.run(
        c.id,
        c.projectId,
        c.filePath,
        c.startLine,
        c.endLine,
        c.language,
        c.content,
        c.contentHash,
        floatsToBlob(c.embedding),
        c.updatedAt,
      )
    }
    commit.run()
  } catch (error) {
    rollback.run()
    throw error
  }
}

export function deleteChunksForFile(projectId: string, filePath: string): void {
  const db = openVectorIndexDb(projectId)
  db.prepare('DELETE FROM vector_chunks WHERE project_id = ? AND file_path = ?').run(projectId, filePath)
}

export function listAllChunks(projectId: string): VectorChunkRecord[] {
  const db = openVectorIndexDb(projectId)
  const rows = db
    .prepare(
      `SELECT id, project_id, file_path, start_line, end_line, language, content, content_hash, embedding, updated_at
       FROM vector_chunks WHERE project_id = ?`,
    )
    .all(projectId) as Array<Record<string, unknown>>

  return rows.map((row) => ({
    id: String(row.id),
    projectId: String(row.project_id),
    filePath: String(row.file_path),
    startLine: Number(row.start_line),
    endLine: Number(row.end_line),
    language: String(row.language),
    content: String(row.content),
    contentHash: String(row.content_hash),
    embedding: blobToFloats(row.embedding as Buffer),
    updatedAt: Number(row.updated_at),
  }))
}

export function setVectorMeta(projectId: string, key: string, value: string): void {
  const db = openVectorIndexDb(projectId)
  db.prepare(
    `INSERT INTO vector_meta(key, value) VALUES(?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value)
}

export function getVectorMeta(projectId: string, key: string): string | null {
  const db = openVectorIndexDb(projectId)
  const row = db.prepare('SELECT value FROM vector_meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function countVectorChunks(projectId: string): { chunkCount: number; fileCount: number } {
  const db = openVectorIndexDb(projectId)
  const chunk = db
    .prepare('SELECT COUNT(*) AS c FROM vector_chunks WHERE project_id = ?')
    .get(projectId) as { c: number }
  const files = db
    .prepare('SELECT COUNT(DISTINCT file_path) AS c FROM vector_chunks WHERE project_id = ?')
    .get(projectId) as { c: number }
  return { chunkCount: Number(chunk.c), fileCount: Number(files.c) }
}
