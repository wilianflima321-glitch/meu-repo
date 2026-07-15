/**
 * F.1 — CloudProvider → Prisma GameSave authority (Law II).
 * Use only when probeGameSaveCloudReady().ready — never flip cloudSyncEnabled otherwise.
 */

import type { CloudProvider, SaveData, SaveMetadata } from '@/lib/save/save-manager-runtime/types'
import type { PrismaGameSaveAuthority } from '@/lib/liveops/prisma-gamesave-authority'

export interface PrismaGameSaveCloudProviderOptions {
  authority: PrismaGameSaveAuthority
  userId: string
  gameId: string
  conflictPolicy?: 'last_write_wins' | 'server_wins' | 'client_wins' | 'reject_conflict'
  clientPlatform?: string
}

function toSaveMetadata(
  record: {
    id: string
    slotIndex: number
    name: string
    checksum: string
    revisedAt: string
    createdAt: string
    revision: number
    payload: unknown
  },
  gameVersion: string,
): SaveMetadata {
  const revisedMs = Date.parse(record.revisedAt) || Date.now()
  const createdMs = Date.parse(record.createdAt) || revisedMs
  return {
    id: record.id,
    slotIndex: record.slotIndex,
    name: record.name,
    type: 'manual',
    version: record.revision,
    createdAt: createdMs,
    modifiedAt: revisedMs,
    playTime: 0,
    location: '',
    checksum: record.checksum,
    compressed: false,
    size: JSON.stringify(record.payload ?? null).length,
    gameVersion,
  }
}

/**
 * Create a CloudProvider backed by Prisma GameSave (optional R2 CAS inside authority).
 * Callers must set SaveManager.cloudSyncEnabled only when cloud readiness.ready === true.
 */
export function createPrismaGameSaveCloudProvider(
  options: PrismaGameSaveCloudProviderOptions,
): CloudProvider {
  const { authority, userId, gameId } = options
  const conflictPolicy = options.conflictPolicy ?? 'last_write_wins'
  const clientPlatform = options.clientPlatform ?? 'web'

  return {
    name: 'aethel-prisma-gamesave',

    async upload(data: SaveData): Promise<string> {
      const result = await authority.upsertGameSave({
        userId,
        gameId,
        slotIndex: data.metadata.slotIndex,
        name: data.metadata.name,
        payload: data.state,
        checksum: data.metadata.checksum,
        revisedAt: new Date(data.metadata.modifiedAt).toISOString(),
        conflictPolicy,
        clientPlatform,
      })
      if (!result.ok) {
        throw new Error(result.code)
      }
      return result.record.id
    },

    async download(id: string): Promise<SaveData> {
      const listed = await authority.listGameSaves(userId, gameId)
      const record = listed.find((r) => r.id === id)
      if (!record) throw new Error('GAMESAVE_NOT_FOUND')
      return {
        metadata: toSaveMetadata(record, '1.0.0'),
        state: record.payload as SaveData['state'],
      }
    },

    async list(): Promise<SaveMetadata[]> {
      const listed = await authority.listGameSaves(userId, gameId)
      return listed.map((r) => toSaveMetadata(r, '1.0.0'))
    },

    async delete(id: string): Promise<void> {
      const listed = await authority.listGameSaves(userId, gameId)
      const record = listed.find((r) => r.id === id)
      if (!record) return
      await authority.deleteGameSave(userId, gameId, record.slotIndex)
    },

    async sync(): Promise<void> {
      await authority.listGameSaves(userId, gameId)
    },
  }
}
