import { NextRequest, NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth-server'
import {
  deleteGameSave,
  getGameSave,
  listGameSaves,
  upsertGameSave,
  validateSlotIndex,
} from '@/lib/liveops/game-save-authority'
import { isValidGameSaveConflictPolicy } from '@/lib/liveops/game-save-conflict'
import {
  cloudSyncMarketingStamp,
  probeGameSaveCloudReady,
} from '@/lib/liveops/gamesave-cloud-capability'
import {
  deletePrismaGameSaveIfReady,
  getPrismaGameSaveIfReady,
  listPrismaGameSavesIfReady,
  upsertPrismaGameSaveIfReady,
} from '@/lib/liveops/prisma-gamesave-live'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/liveops/gamesave/route')

export const dynamic = 'force-dynamic'

/** Durable GameSave sync API — cloud marketing stamps from Prisma readiness. */
const CAPABILITY = 'LIVEOPS_GAMESAVE_DURABLE'
const CAPABILITY_STATUS = 'IMPLEMENTED'

/**
 * F.1 — durable GameSave sync contract (disk authority) + Prisma dual-write when ready.
 * cloudSyncMarketing flips IMPLEMENTED only when probeGameSaveCloudReady().ready.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = getUserFromRequest(req)
    const userId = auth?.userId
    const cloud = await probeGameSaveCloudReady()
    const marketing = cloudSyncMarketingStamp(cloud)

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          capability: CAPABILITY,
          capabilityStatus: CAPABILITY_STATUS,
          cloudSyncMarketing: marketing,
          cloudHeldReason: cloud.reason ?? 'gamesave_cloud_auth_required',
        },
        { status: 401 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const gameId = String(body?.gameId || '').trim()
    const slotIndex = validateSlotIndex(body?.slotIndex)
    if (!gameId || slotIndex === null) {
      return NextResponse.json(
        {
          error: 'GAMESAVE_SLOT_REQUIRED',
          capability: CAPABILITY,
          capabilityStatus: CAPABILITY_STATUS,
          cloudSyncMarketing: marketing,
        },
        { status: 400 },
      )
    }

    if (body?.payload === undefined) {
      return NextResponse.json(
        {
          error: 'GAMESAVE_PAYLOAD_REQUIRED',
          capability: CAPABILITY,
          capabilityStatus: CAPABILITY_STATUS,
          cloudSyncMarketing: marketing,
        },
        { status: 400 },
      )
    }

    const conflictPolicy = isValidGameSaveConflictPolicy(body?.conflictPolicy)
      ? body.conflictPolicy
      : undefined

    const upsertInput = {
      userId,
      gameId,
      slotIndex,
      name: body?.name,
      payload: body.payload,
      checksum: body?.checksum,
      clientPlatform: body?.clientPlatform ?? null,
      revisedAt: body?.revisedAt,
      expectedRevision:
        typeof body?.expectedRevision === 'number' ? body.expectedRevision : undefined,
      conflictPolicy,
    }

    const result = await upsertGameSave(upsertInput)

    if (!result.ok) {
      const status =
        result.code === 'GAMESAVE_CONFLICT' || result.code === 'GAMESAVE_REVISION_STALE'
          ? 409
          : result.code === 'GAMESAVE_PAYLOAD_TOO_LARGE'
            ? 413
            : 400
      log.info('gamesave_upsert_rejected', { userId, gameId, slotIndex, code: result.code })
      return NextResponse.json(
        {
          success: false,
          mock: false,
          error: result.code,
          capability: CAPABILITY,
          capabilityStatus: CAPABILITY_STATUS,
          cloudSyncMarketing: marketing,
          conflict: result.conflict,
        },
        { status },
      )
    }

    const prismaWrite = await upsertPrismaGameSaveIfReady(upsertInput, cloud.ready)
    const cloudSynced = Boolean(prismaWrite.attempted && prismaWrite.result?.ok)
    // Fail-closed marketing: only IMPLEMENTED when readiness proven AND this write synced.
    const responseMarketing =
      cloud.ready && cloudSynced ? ('IMPLEMENTED' as const) : ('HELD' as const)

    log.info('gamesave_upsert_ok', {
      userId,
      gameId,
      slotIndex,
      revision: result.record.revision,
      created: result.created,
      cloudSynced,
      cloudReady: cloud.ready,
    })

    return NextResponse.json({
      success: true,
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: CAPABILITY_STATUS,
      cloudSyncMarketing: responseMarketing,
      cloudSynced,
      cloudHeldReason: responseMarketing === 'HELD' ? cloud.reason : undefined,
      created: result.created,
      conflictResolved: result.conflictResolved,
      save: result.record,
    })
  } catch (error) {
    log.error('gamesave_upsert_failed', { error })
    return NextResponse.json(
      {
        error: 'GAMESAVE_UPSERT_FAILED',
        capability: CAPABILITY,
        capabilityStatus: CAPABILITY_STATUS,
        cloudSyncMarketing: 'HELD',
      },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req)
  const cloud = await probeGameSaveCloudReady()
  const marketing = cloudSyncMarketingStamp(cloud)

  if (!auth?.userId) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        cloudSyncMarketing: marketing,
        cloudHeldReason: 'gamesave_cloud_auth_required',
      },
      { status: 401 },
    )
  }

  const gameId = req.nextUrl.searchParams.get('gameId')?.trim()
  if (!gameId) {
    return NextResponse.json(
      {
        error: 'GAMESAVE_GAME_ID_REQUIRED',
        capability: CAPABILITY,
        capabilityStatus: CAPABILITY_STATUS,
        cloudSyncMarketing: marketing,
      },
      { status: 400 },
    )
  }

  const slotParam = req.nextUrl.searchParams.get('slotIndex')
  if (slotParam != null) {
    const slotIndex = validateSlotIndex(slotParam)
    if (slotIndex === null) {
      return NextResponse.json(
        {
          error: 'GAMESAVE_SLOT_INVALID',
          capability: CAPABILITY,
          capabilityStatus: CAPABILITY_STATUS,
          cloudSyncMarketing: marketing,
        },
        { status: 400 },
      )
    }
    // Prefer Prisma when cloud ready (cross-device source of truth); fall back to durable disk.
    const cloudSave = await getPrismaGameSaveIfReady(
      auth.userId,
      gameId,
      slotIndex,
      cloud.ready,
    )
    const save = cloudSave ?? (await getGameSave(auth.userId, gameId, slotIndex))
    return NextResponse.json({
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: CAPABILITY_STATUS,
      cloudSyncMarketing: marketing,
      cloudSource: cloudSave ? 'prisma' : 'durable',
      save,
    })
  }

  const cloudSaves = await listPrismaGameSavesIfReady(auth.userId, gameId, cloud.ready)
  const saves = cloudSaves ?? (await listGameSaves(auth.userId, gameId))
  return NextResponse.json({
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: CAPABILITY_STATUS,
    cloudSyncMarketing: marketing,
    cloudSource: cloudSaves ? 'prisma' : 'durable',
    saves,
  })
}

export async function DELETE(req: NextRequest) {
  const auth = getUserFromRequest(req)
  const cloud = await probeGameSaveCloudReady()
  const marketing = cloudSyncMarketingStamp(cloud)

  if (!auth?.userId) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        cloudSyncMarketing: marketing,
        cloudHeldReason: 'gamesave_cloud_auth_required',
      },
      { status: 401 },
    )
  }

  let body: { gameId?: string; slotIndex?: unknown } = {}
  try {
    body = (await req.json()) as { gameId?: string; slotIndex?: unknown }
  } catch {
    body = {}
  }

  const gameId =
    req.nextUrl.searchParams.get('gameId')?.trim() || String(body.gameId || '').trim()
  const slotRaw = req.nextUrl.searchParams.get('slotIndex') ?? body.slotIndex
  const slotIndex = validateSlotIndex(slotRaw)

  if (!gameId || slotIndex === null) {
    return NextResponse.json(
      {
        error: 'GAMESAVE_SLOT_REQUIRED',
        capability: CAPABILITY,
        capabilityStatus: CAPABILITY_STATUS,
        cloudSyncMarketing: marketing,
      },
      { status: 400 },
    )
  }

  const deletedDurable = await deleteGameSave(auth.userId, gameId, slotIndex)
  const deletedCloud = await deletePrismaGameSaveIfReady(
    auth.userId,
    gameId,
    slotIndex,
    cloud.ready,
  )
  return NextResponse.json({
    success: deletedDurable || deletedCloud,
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: CAPABILITY_STATUS,
    cloudSyncMarketing: marketing,
    deleted: deletedDurable || deletedCloud,
    deletedDurable,
    deletedCloud,
  })
}
