/**
 * F.1 — Live Prisma GameSave store adapter + dual-write helper for the sync API.
 */

import { prisma } from '@/lib/prisma'
import {
  createPrismaGameSaveAuthority,
  type PrismaGameSaveAuthority,
  type PrismaGameSaveStore,
} from '@/lib/liveops/prisma-gamesave-authority'
import { createDefaultGameSaveBlobStore } from '@/lib/liveops/gamesave-r2-cas'
import type { GameSaveUpsertInput, GameSaveUpsertResult, GameSaveRecord } from '@/lib/liveops/game-save-authority'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('prisma-gamesave-live')

export function createLivePrismaGameSaveStore(): PrismaGameSaveStore {
  const delegate = (prisma as unknown as { gameSave?: PrismaGameSaveStore }).gameSave
  if (!delegate) {
    throw new Error('GameSave_delegate_missing_run_prisma_generate')
  }
  return delegate
}

let cachedAuthority: PrismaGameSaveAuthority | null = null

export function getLivePrismaGameSaveAuthority(): PrismaGameSaveAuthority {
  if (!cachedAuthority) {
    cachedAuthority = createPrismaGameSaveAuthority({
      store: createLivePrismaGameSaveStore(),
      blobStore: createDefaultGameSaveBlobStore(),
      preferR2Offload: true,
    })
  }
  return cachedAuthority
}

/** Dual-write helper used by /api/liveops/gamesave when cloud readiness is proven. */
export async function upsertPrismaGameSaveIfReady(
  input: GameSaveUpsertInput,
  cloudReady: boolean,
): Promise<{ attempted: boolean; result: GameSaveUpsertResult | null }> {
  if (!cloudReady) {
    return { attempted: false, result: null }
  }
  try {
    const result = await getLivePrismaGameSaveAuthority().upsertGameSave(input)
    return { attempted: true, result }
  } catch (err) {
    log.warn('gamesave_prisma_upsert_failed', {
      error: err instanceof Error ? err.message : String(err),
      userId: input.userId,
      gameId: input.gameId,
    })
    return {
      attempted: true,
      result: { ok: false, code: 'GAMESAVE_PAYLOAD_INVALID' },
    }
  }
}

export async function getPrismaGameSaveIfReady(
  userId: string,
  gameId: string,
  slotIndex: number,
  cloudReady: boolean,
): Promise<GameSaveRecord | null> {
  if (!cloudReady) return null
  try {
    return await getLivePrismaGameSaveAuthority().getGameSave(userId, gameId, slotIndex)
  } catch {
    return null
  }
}

export async function listPrismaGameSavesIfReady(
  userId: string,
  gameId: string,
  cloudReady: boolean,
): Promise<GameSaveRecord[] | null> {
  if (!cloudReady) return null
  try {
    return await getLivePrismaGameSaveAuthority().listGameSaves(userId, gameId)
  } catch {
    return null
  }
}

export async function deletePrismaGameSaveIfReady(
  userId: string,
  gameId: string,
  slotIndex: number,
  cloudReady: boolean,
): Promise<boolean> {
  if (!cloudReady) return false
  try {
    return await getLivePrismaGameSaveAuthority().deleteGameSave(userId, gameId, slotIndex)
  } catch {
    return false
  }
}
