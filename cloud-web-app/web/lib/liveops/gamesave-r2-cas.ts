/**
 * F.1 — Optional R2 CAS for GameSave payloads.
 * Real R2/S3 only — local emulator is NOT marketed as cloud CAS.
 */

import {
  deleteObject,
  IS_R2_BACKEND,
  localGetObjectBuffer,
  localPutObject,
  putObject,
  resolveStorageBackendConfig,
} from '@/lib/storage/s3-client'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('gamesave-r2-cas')

/** Offload to blob store when serialized payload exceeds this (inline Json otherwise). */
export const GAMESAVE_R2_OFFLOAD_BYTES = 64 * 1024

export interface GameSaveBlobStore {
  /** True when real R2/S3 credentials are configured (not local emulator marketing). */
  isRemoteConfigured(): boolean
  put(key: string, body: string, contentType?: string): Promise<{ ok: boolean }>
  get(key: string): Promise<string | null>
  delete(key: string): Promise<boolean>
}

export function buildGameSaveBlobKey(input: {
  userId: string
  gameId: string
  slotIndex: number
  checksum: string
}): string {
  const safe = (s: string) =>
    String(s || '')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80) || 'unknown'
  return `player-saves/${safe(input.userId)}/${safe(input.gameId)}/slot-${input.slotIndex}/${input.checksum}.json`
}

export function isGameSaveR2RemoteConfigured(): boolean {
  const cfg = resolveStorageBackendConfig()
  return !!(cfg.accessKeyId && cfg.secretAccessKey)
}

/** Alias used by honesty probes — remote CAS only (not local emulator). */
export function isGameSaveRemoteCasConfigured(): boolean {
  return isGameSaveR2RemoteConfigured()
}

export function getGameSaveCasBackendLabel(): string {
  if (!isGameSaveR2RemoteConfigured()) return 'none'
  return IS_R2_BACKEND ? 'r2' : resolveStorageBackendConfig().backend
}

/**
 * Default blob store: putObject when remote creds exist; otherwise local emulator
 * for offline tests only (never counts toward cloud marketing).
 */
export function createDefaultGameSaveBlobStore(): GameSaveBlobStore {
  return {
    isRemoteConfigured(): boolean {
      return isGameSaveR2RemoteConfigured()
    },
    async put(key, body, contentType = 'application/json') {
      if (isGameSaveR2RemoteConfigured()) {
        const result = await putObject(key, body, contentType)
        if (!result.ok) {
          log.warn('gamesave_r2_put_failed', { key, backend: IS_R2_BACKEND ? 'r2' : 's3' })
        }
        return { ok: result.ok }
      }
      await localPutObject(key, body)
      return { ok: true }
    },
    async get(key) {
      if (isGameSaveR2RemoteConfigured()) {
        // Server-side get via download-to-buffer pattern (no public URL required).
        const { getS3Client, getS3Commands } = await import('@/lib/storage/s3-client')
        const client = await getS3Client()
        const commands = await getS3Commands()
        if (!client || !commands) return null
        try {
          const cfg = resolveStorageBackendConfig()
          const bucket = cfg.bucket || 'aethel-assets'
          const command = new commands.GetObjectCommand({ Bucket: bucket, Key: key })
          const response = (await client.send(command)) as {
            Body?: AsyncIterable<Uint8Array> | Uint8Array
          }
          const body = response.Body
          if (!body) return null
          const chunks: Uint8Array[] = []
          if (Symbol.asyncIterator in Object(body)) {
            for await (const chunk of body as AsyncIterable<Uint8Array>) {
              chunks.push(chunk)
            }
          } else {
            chunks.push(body as Uint8Array)
          }
          return Buffer.concat(chunks).toString('utf8')
        } catch (err) {
          log.warn('gamesave_r2_get_failed', {
            key,
            error: err instanceof Error ? err.message : String(err),
          })
          return null
        }
      }
      const buf = await localGetObjectBuffer(key)
      return buf ? buf.toString('utf8') : null
    },
    async delete(key) {
      if (isGameSaveR2RemoteConfigured()) {
        return deleteObject(key)
      }
      try {
        const { promises: fs } = await import('node:fs')
        const nodePath = await import('node:path')
        const { LOCAL_EMULATOR_DIR } = await import('@/lib/storage/s3-client')
        await fs.unlink(nodePath.join(process.cwd(), LOCAL_EMULATOR_DIR, key))
        return true
      } catch {
        return false
      }
    },
  }
}

export function shouldOffloadGameSavePayload(serializedLength: number): boolean {
  return serializedLength >= GAMESAVE_R2_OFFLOAD_BYTES
}
