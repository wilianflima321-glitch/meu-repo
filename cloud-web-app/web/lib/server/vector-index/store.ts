/**
 * J.4 durable SQLite store (node:sqlite).
 * Embeddings in vector_chunks (Float32 blobs). When native sqlite-vec is certified,
 * also maintain vector_chunks_ann (vec0 cosine) for ANN KNN.
 */

import fs from 'node:fs'
import path from 'node:path'
// @ts-ignore -- Node 22 built-in node:sqlite module
import { DatabaseSync } from 'node:sqlite'
import { VECTOR_EMBED_DIM } from './embed-provider'
import { loadSqliteVecOntoDb, probeSqliteVecExtension } from './sqlite-vec-probe'
import type { VectorChunkRecord } from './types'

const ANN_TABLE = 'vector_chunks_ann'

const globalStore = globalThis as typeof globalThis & {
  __aethelVectorDb?: Map<string, DatabaseSync>
  __aethelVectorAnnReady?: Map<string, boolean>
}

function dbCache(): Map<string, DatabaseSync> {
  if (!globalStore.__aethelVectorDb) globalStore.__aethelVectorDb = new Map()
  return globalStore.__aethelVectorDb
}

function annReadyCache(): Map<string, boolean> {
  if (!globalStore.__aethelVectorAnnReady) globalStore.__aethelVectorAnnReady = new Map()
  return globalStore.__aethelVectorAnnReady
}

export function getVectorIndexDbPath(projectId: string): string {
  const safe = projectId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
  return path.join(process.cwd(), '.aethel', 'vector-index', `${safe}.sqlite`)
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

function floatsToUint8(embedding: number[]): Uint8Array {
  const f = new Float32Array(embedding.length)
  for (let i = 0; i < embedding.length; i++) f[i] = embedding[i]
  return new Uint8Array(f.buffer, f.byteOffset, f.byteLength)
}

function ensureBaseSchema(db: DatabaseSync): void {
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
}

function ensureAnnSchema(db: DatabaseSync, projectId: string): boolean {
  const ready = annReadyCache()
  if (ready.get(projectId)) return true

  const probe = probeSqliteVecExtension()
  if (!probe.sqliteVecExtension) {
    ready.set(projectId, false)
    return false
  }
  if (!loadSqliteVecOntoDb(db)) {
    ready.set(projectId, false)
    return false
  }

  try {
    db.exec(
      `CREATE VIRTUAL TABLE IF NOT EXISTS ${ANN_TABLE} USING vec0(
        chunk_id text primary key,
        embedding float[${VECTOR_EMBED_DIM}] distance_metric=cosine
      )`,
    )
    ready.set(projectId, true)
    return true
  } catch {
    ready.set(projectId, false)
    return false
  }
}

/** Whether this project's open DB has a live vec0 ANN table. */
export function isVectorAnnReady(projectId: string): boolean {
  if (!probeSqliteVecExtension().sqliteVecExtension) return false
  openVectorIndexDb(projectId)
  return annReadyCache().get(projectId) === true
}

export function openVectorIndexDb(projectId: string): DatabaseSync {
  const cache = dbCache()
  const existing = cache.get(projectId)
  if (existing) {
    ensureAnnSchema(existing, projectId)
    return existing
  }

  const dbPath = getVectorIndexDbPath(projectId)
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  const allowExtension = probeSqliteVecExtension().sqliteVecExtension
  const db = allowExtension
    ? new DatabaseSync(dbPath, { allowExtension: true })
    : new DatabaseSync(dbPath)

  ensureBaseSchema(db)
  cache.set(projectId, db)
  ensureAnnSchema(db, projectId)
  return db
}

function upsertAnnRows(db: DatabaseSync, projectId: string, chunks: VectorChunkRecord[]): void {
  if (!ensureAnnSchema(db, projectId) || chunks.length === 0) return
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO ${ANN_TABLE}(chunk_id, embedding) VALUES (?, ?)`,
  )
  for (const c of chunks) {
    if (c.embedding.length !== VECTOR_EMBED_DIM) continue
    stmt.run(c.id, floatsToUint8(c.embedding))
  }
}

function deleteAnnRows(db: DatabaseSync, projectId: string, chunkIds: string[]): void {
  if (!ensureAnnSchema(db, projectId) || chunkIds.length === 0) return
  const stmt = db.prepare(`DELETE FROM ${ANN_TABLE} WHERE chunk_id = ?`)
  for (const id of chunkIds) stmt.run(id)
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
    upsertAnnRows(db, projectId, chunks)
    commit.run()
  } catch (error) {
    rollback.run()
    throw error
  }
}

export function deleteChunksForFile(projectId: string, filePath: string): void {
  const db = openVectorIndexDb(projectId)
  const ids = (
    db
      .prepare('SELECT id FROM vector_chunks WHERE project_id = ? AND file_path = ?')
      .all(projectId, filePath) as Array<{ id: string }>
  ).map((r) => String(r.id))

  const tx = db.prepare('BEGIN')
  const commit = db.prepare('COMMIT')
  const rollback = db.prepare('ROLLBACK')
  tx.run()
  try {
    deleteAnnRows(db, projectId, ids)
    db.prepare('DELETE FROM vector_chunks WHERE project_id = ? AND file_path = ?').run(
      projectId,
      filePath,
    )
    commit.run()
  } catch (error) {
    rollback.run()
    throw error
  }
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

/**
 * Native vec0 cosine KNN. Returns chunk ids + cosine distance (lower = closer).
 * Caller maps to hits; empty array means fall back to JS cosine.
 */
export function annSearchChunkIds(
  projectId: string,
  queryEmbedding: number[],
  topK: number,
): Array<{ chunkId: string; distance: number }> {
  if (queryEmbedding.length !== VECTOR_EMBED_DIM) return []
  const db = openVectorIndexDb(projectId)
  if (!ensureAnnSchema(db, projectId)) return []

  try {
    const rows = db
      .prepare(
        `SELECT chunk_id AS chunkId, distance AS distance
         FROM ${ANN_TABLE}
         WHERE embedding MATCH ? AND k = ?`,
      )
      .all(floatsToUint8(queryEmbedding), topK) as Array<{ chunkId: string; distance: number }>

    return rows.map((r) => ({
      chunkId: String(r.chunkId),
      distance: Number(r.distance),
    }))
  } catch {
    return []
  }
}

export function getChunksByIds(projectId: string, ids: string[]): VectorChunkRecord[] {
  if (ids.length === 0) return []
  const db = openVectorIndexDb(projectId)
  const out: VectorChunkRecord[] = []
  const stmt = db.prepare(
    `SELECT id, project_id, file_path, start_line, end_line, language, content, content_hash, embedding, updated_at
     FROM vector_chunks WHERE project_id = ? AND id = ?`,
  )
  for (const id of ids) {
    const row = stmt.get(projectId, id) as Record<string, unknown> | undefined
    if (!row) continue
    out.push({
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
    })
  }
  return out
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

/** Test helper — drop cached DB handles */
export function __resetVectorStoreCacheForTests(): void {
  globalStore.__aethelVectorDb?.clear()
  globalStore.__aethelVectorAnnReady?.clear()
}
