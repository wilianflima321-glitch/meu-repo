/**
 * Law II / Onda F — TelemetrySpool + GameSave evidence deepen (fail-closed cloud marketing).
 *
 * Seals spool enqueue→peek→markSynced fingerprint and durable GameSave
 * checksum upsert evidence. Cloud GameSave / immortal actors marketing stay HELD.
 */

import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  SESSION_PLAYTIME_EVENT,
  createMemoryTelemetrySpool,
} from '@/lib/liveops/telemetry-spool'
import { computeGameSaveChecksum } from '@/lib/liveops/game-save-checksum'
import { upsertGameSave } from '@/lib/liveops/game-save-authority'

const log = createComponentLogger('telemetry-gamesave-evidence')

export const GAMESAVE_CLOUD_MARKETING_ALLOWED = false as const
export const CLOUD_IMMORTAL_ACTORS_MARKETING_ALLOWED = false as const
export const TELEMETRY_CLOUD_AGGREGATION_AAA_READY = false as const

export type LiveOpsEvidenceRejectCode =
  | 'spool_failed'
  | 'gamesave_failed'
  | 'checksum_mismatch'
  | 'marketing_claim_held'
  | 'empty_evidence'

export type LiveOpsEvidenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: LiveOpsEvidenceRejectCode; message: string }

export type TelemetryGameSaveEvidence = {
  version: 1
  spoolEventId: string
  spoolMarkedSynced: number
  playtimeDeltaSeconds: number
  gameSaveId: string
  gameSaveChecksum: string
  gameSaveRevision: number
  fingerprint: string
  gamesaveCloudMarketingAllowed: false
  cloudImmortalActorsMarketingAllowed: false
  telemetryCloudAggregationAaaReady: false
}

function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

/**
 * Enqueue playtime → peek unsynced → markSynced; upsert durable GameSave with checksum.
 */
export async function runTelemetryGameSaveEvidenceSoak(input?: {
  playtimeDeltaSeconds?: number
  savesRoot?: string
}): Promise<LiveOpsEvidenceResult<TelemetryGameSaveEvidence>> {
  const delta = input?.playtimeDeltaSeconds ?? 42
  if (!(delta > 0)) {
    return { ok: false, code: 'empty_evidence', message: 'playtime delta must be > 0' }
  }

  const spool = createMemoryTelemetrySpool(`liveops_ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  await spool.clearAll()
  const row = await spool.enqueue({
    event: SESSION_PLAYTIME_EVENT,
    gameId: 'ev_game',
    sessionId: 'ev_session',
    payload: { deltaSeconds: delta },
  })
  const peeked = await spool.peekUnsynced(10)
  if (!peeked.some((r) => r.id === row.id) || row.synced !== false) {
    return { ok: false, code: 'spool_failed', message: 'TelemetrySpool enqueue/peek contract failed' }
  }
  const marked = await spool.markSynced([row.id])
  if (marked !== 1) {
    return { ok: false, code: 'spool_failed', message: 'TelemetrySpool markSynced failed' }
  }
  const after = await spool.peekUnsynced(10)
  if (after.some((r) => r.id === row.id)) {
    return { ok: false, code: 'spool_failed', message: 'Synced row still unsynced' }
  }

  const root =
    input?.savesRoot ??
    (await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-gamesave-ev-')))
  const prevRoot = process.env.AETHEL_LIVEOPS_GAMESAVE_ROOT
  process.env.AETHEL_LIVEOPS_GAMESAVE_ROOT = root

  try {
    const payload = { hp: 100, room: 'evidence', flags: { a: true, b: 2 } }
    const checksum = computeGameSaveChecksum(payload)
    const upsert = await upsertGameSave({
      userId: 'ev_user',
      gameId: 'ev_game',
      slotIndex: 0,
      name: 'LiveOps evidence slot',
      payload,
      checksum,
      clientPlatform: 'vitest',
    })
    if (!upsert.ok) {
      return {
        ok: false,
        code: 'gamesave_failed',
        message: `GameSave upsert failed: ${upsert.code}`,
      }
    }
    if (upsert.record.checksum !== checksum) {
      return { ok: false, code: 'checksum_mismatch', message: 'GameSave stored checksum mismatch' }
    }

    const fp = fingerprint([
      'onda-f-liveops',
      row.id,
      String(marked),
      String(delta),
      upsert.record.id,
      upsert.record.checksum.slice(0, 16),
      String(upsert.record.revision),
      'cloudMarketing:false',
    ])

    const evidence: TelemetryGameSaveEvidence = {
      version: 1,
      spoolEventId: row.id,
      spoolMarkedSynced: marked,
      playtimeDeltaSeconds: delta,
      gameSaveId: upsert.record.id,
      gameSaveChecksum: upsert.record.checksum,
      gameSaveRevision: upsert.record.revision,
      fingerprint: fp,
      gamesaveCloudMarketingAllowed: false,
      cloudImmortalActorsMarketingAllowed: false,
      telemetryCloudAggregationAaaReady: false,
    }

    log.info('telemetry_gamesave_evidence_sealed', {
      fingerprint: fp,
      spoolId: row.id,
      saveId: upsert.record.id,
      cloudMarketing: false,
    })

    return { ok: true, value: evidence }
  } finally {
    if (prevRoot === undefined) delete process.env.AETHEL_LIVEOPS_GAMESAVE_ROOT
    else process.env.AETHEL_LIVEOPS_GAMESAVE_ROOT = prevRoot
    await fs.rm(root, { recursive: true, force: true }).catch(() => undefined)
    await spool.clearAll().catch(() => undefined)
  }
}

export function claimGameSaveCloudMarketing(): LiveOpsEvidenceResult<never> {
  return {
    ok: false,
    code: 'marketing_claim_held',
    message: 'GAMESAVE_CLOUD_MARKETING_ALLOWED=false — durable disk GameSave ≠ cloud marketing',
  }
}

export function claimCloudImmortalActors(): LiveOpsEvidenceResult<never> {
  return {
    ok: false,
    code: 'marketing_claim_held',
    message: 'CLOUD_IMMORTAL_ACTORS_MARKETING_ALLOWED=false — fail-closed until Prisma/R2 proven',
  }
}

export async function probeTelemetryGameSaveEvidenceReadiness(): Promise<{
  id: 'onda-f-telemetry-gamesave'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  gamesaveCloudMarketingAllowed: false
  path: string
  note: string
}> {
  const soak = await runTelemetryGameSaveEvidenceSoak({ playtimeDeltaSeconds: 17 })
  const badDelta = await runTelemetryGameSaveEvidenceSoak({ playtimeDeltaSeconds: 0 })
  const cloud = claimGameSaveCloudMarketing()
  const immortal = claimCloudImmortalActors()

  const ready =
    soak.ok &&
    soak.value.fingerprint.length >= 8 &&
    soak.value.spoolMarkedSynced === 1 &&
    soak.value.gameSaveChecksum.length === 64 &&
    soak.value.gamesaveCloudMarketingAllowed === false &&
    !badDelta.ok &&
    !cloud.ok &&
    !immortal.ok &&
    GAMESAVE_CLOUD_MARKETING_ALLOWED === false &&
    CLOUD_IMMORTAL_ACTORS_MARKETING_ALLOWED === false &&
    TELEMETRY_CLOUD_AGGREGATION_AAA_READY === false

  return {
    id: 'onda-f-telemetry-gamesave',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    gamesaveCloudMarketingAllowed: false,
    path: 'lib/liveops/telemetry-gamesave-evidence.ts',
    note: ready
      ? 'TelemetrySpool + durable GameSave evidence PARTIAL; cloud GameSave / immortal actors marketing HELD.'
      : soak.ok
        ? 'Telemetry/GameSave evidence probe failed.'
        : `Telemetry/GameSave evidence probe failed: ${soak.message}`,
  }
}
