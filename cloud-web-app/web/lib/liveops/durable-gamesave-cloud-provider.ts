/**
 * F.1 — CloudProvider adapter → durable GameSave sync API.
 *
 * Wires SaveManager to POST/GET/DELETE /api/liveops/gamesave when explicitly enabled.
 * Does NOT flip cloudSyncEnabled by default — Prisma/R2 remote cloud marketing stays HELD.
 */

import type { CloudProvider, SaveData, SaveMetadata } from '@/lib/save/save-manager-runtime/types'

export interface DurableGameSaveCloudProviderOptions {
  /** Base origin, e.g. '' for same-origin or 'https://app.example.com' */
  baseUrl?: string
  fetchImpl?: typeof fetch
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>
  gameId: string
  conflictPolicy?: 'last_write_wins' | 'server_wins' | 'client_wins' | 'reject_conflict'
  clientPlatform?: string
}

type ApiSaveRow = {
  id: string
  slotIndex: number
  name: string
  payload: unknown
  checksum: string
  revisedAt: string
  createdAt: string
  updatedAt: string
  revision: number
  clientPlatform?: string | null
}

function toSaveMetadata(row: ApiSaveRow, gameVersion: string): SaveMetadata {
  const revisedMs = Date.parse(row.revisedAt) || Date.now()
  const createdMs = Date.parse(row.createdAt) || revisedMs
  return {
    id: row.id,
    slotIndex: row.slotIndex,
    name: row.name,
    type: 'manual',
    version: row.revision,
    createdAt: createdMs,
    modifiedAt: revisedMs,
    playTime: 0,
    location: '',
    checksum: row.checksum,
    compressed: false,
    size: JSON.stringify(row.payload).length,
    gameVersion,
  }
}

/**
 * Create a CloudProvider that talks to the durable GameSave API.
 * Callers must set SaveManager cloudSyncEnabled only when they accept
 * this disk-backed sync path (still not Prisma/R2 cloud marketing).
 */
export function createDurableGameSaveCloudProvider(
  options: DurableGameSaveCloudProviderOptions,
): CloudProvider {
  const baseUrl = (options.baseUrl ?? '').replace(/\/$/, '')
  const fetchImpl = options.fetchImpl ?? fetch
  const gameId = options.gameId
  const conflictPolicy = options.conflictPolicy ?? 'last_write_wins'
  const clientPlatform = options.clientPlatform ?? 'web'

  async function headers(): Promise<HeadersInit> {
    const auth = (await options.getAuthHeaders?.()) ?? {}
    return {
      'Content-Type': 'application/json',
      ...auth,
    }
  }

  return {
    name: 'aethel-durable-gamesave',

    async upload(data: SaveData): Promise<string> {
      const res = await fetchImpl(`${baseUrl}/api/liveops/gamesave`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({
          gameId,
          slotIndex: data.metadata.slotIndex,
          name: data.metadata.name,
          payload: data.state,
          checksum: data.metadata.checksum,
          revisedAt: new Date(data.metadata.modifiedAt).toISOString(),
          conflictPolicy,
          clientPlatform,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        save?: ApiSaveRow
        error?: string
      }
      if (!res.ok || !json.save?.id) {
        throw new Error(json.error || `GAMESAVE_UPLOAD_FAILED_${res.status}`)
      }
      return json.save.id
    },

    async download(id: string): Promise<SaveData> {
      const listed = await this.list()
      const meta = listed.find((m) => m.id === id)
      if (!meta) throw new Error('GAMESAVE_NOT_FOUND')
      const res = await fetchImpl(
        `${baseUrl}/api/liveops/gamesave?gameId=${encodeURIComponent(gameId)}&slotIndex=${meta.slotIndex}`,
        { headers: await headers() },
      )
      const json = (await res.json().catch(() => ({}))) as { save?: ApiSaveRow }
      if (!res.ok || !json.save) throw new Error('GAMESAVE_DOWNLOAD_FAILED')
      return {
        metadata: toSaveMetadata(json.save, meta.gameVersion),
        state: json.save.payload as SaveData['state'],
      }
    },

    async list(): Promise<SaveMetadata[]> {
      const res = await fetchImpl(
        `${baseUrl}/api/liveops/gamesave?gameId=${encodeURIComponent(gameId)}`,
        { headers: await headers() },
      )
      const json = (await res.json().catch(() => ({}))) as { saves?: ApiSaveRow[] }
      if (!res.ok) throw new Error('GAMESAVE_LIST_FAILED')
      return (json.saves ?? []).map((row) => toSaveMetadata(row, '1.0.0'))
    },

    async delete(id: string): Promise<void> {
      const listed = await this.list()
      const meta = listed.find((m) => m.id === id)
      if (!meta) return
      const res = await fetchImpl(
        `${baseUrl}/api/liveops/gamesave?gameId=${encodeURIComponent(gameId)}&slotIndex=${meta.slotIndex}`,
        { method: 'DELETE', headers: await headers() },
      )
      if (!res.ok) throw new Error('GAMESAVE_DELETE_FAILED')
    },

    async sync(): Promise<void> {
      // Pull is driven by SaveManager.syncWithCloud via list+download.
      await this.list()
    },
  }
}
