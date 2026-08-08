/**
 * Law XVI Trava II — server → client FusionTx undo handoff.
 *
 * Apex / API routes often commit CreativeFusionTransaction against an isolate
 * store whose Y.Doc is NOT the browser's bound store. Without a portable
 * handoff, Ctrl+Z on the client cannot revert server-committed mutations.
 *
 * This module serializes before/after payloads + hashes so the client can
 * apply the after state and capture a revert point on its bound FusionScopeStore.
 */

import {
  type CreativeFusionTransactionRecord,
  type FusionScopeStore,
  type FusionYDocScope,
} from '@/lib/production/creative-fusion-transaction'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('fusion-tx-client-handoff')

export const FUSION_TX_CLIENT_HANDOFF_SCHEMA = 'aethel.fusion-tx-handoff.v1' as const

export type FusionTxClientHandoff = {
  schema: typeof FUSION_TX_CLIENT_HANDOFF_SCHEMA
  projectId: string
  yDocScope: FusionYDocScope
  transactionId: string
  beforePayload: string
  afterPayload: string
  snapshotHashBefore: string
  snapshotHashAfter: string
  committedAt: string
}

export type ApplyFusionTxHandoffResult =
  | { ok: true; transactionId: string; scope: FusionYDocScope }
  | {
      ok: false
      reason:
        | 'invalid_schema'
        | 'missing_payload'
        | 'store_missing_revert'
        | 'apply_error'
      message: string
    }

/**
 * Build a portable handoff from a committed FusionTx record.
 * Requires afterPayload (present after successful commit).
 */
export function buildFusionTxClientHandoff(
  record: CreativeFusionTransactionRecord,
): FusionTxClientHandoff {
  if (record.status !== 'committed') {
    throw new Error(
      `buildFusionTxClientHandoff requires committed tx (got ${record.status})`,
    )
  }
  if (!record.afterPayload || !record.snapshotHashAfter) {
    throw new Error('buildFusionTxClientHandoff requires afterPayload + snapshotHashAfter')
  }
  return {
    schema: FUSION_TX_CLIENT_HANDOFF_SCHEMA,
    projectId: record.projectId,
    yDocScope: record.yDocScope,
    transactionId: record.id,
    beforePayload: record.beforePayload,
    afterPayload: record.afterPayload,
    snapshotHashBefore: record.snapshotHashBefore,
    snapshotHashAfter: record.snapshotHashAfter,
    committedAt: record.updatedAt,
  }
}

export function serializeFusionTxClientHandoff(handoff: FusionTxClientHandoff): string {
  return JSON.stringify(handoff)
}

export function parseFusionTxClientHandoff(raw: unknown): FusionTxClientHandoff {
  const obj =
    typeof raw === 'string'
      ? (JSON.parse(raw) as FusionTxClientHandoff)
      : (raw as FusionTxClientHandoff)
  if (!obj || obj.schema !== FUSION_TX_CLIENT_HANDOFF_SCHEMA) {
    throw new Error('Unsupported or missing fusion-tx-handoff schema')
  }
  if (!obj.projectId || !obj.yDocScope || !obj.transactionId) {
    throw new Error('fusion-tx-handoff missing projectId/scope/transactionId')
  }
  if (typeof obj.beforePayload !== 'string' || typeof obj.afterPayload !== 'string') {
    throw new Error('fusion-tx-handoff missing before/after payloads')
  }
  return obj
}

/**
 * Apply a server-committed FusionTx onto the client's bound store and arm
 * post-commit Ctrl+Z via captureRevertPoint (Trava II).
 */
export function applyFusionTxClientHandoff(
  handoff: FusionTxClientHandoff,
  store: FusionScopeStore,
): ApplyFusionTxHandoffResult {
  try {
    if (handoff.schema !== FUSION_TX_CLIENT_HANDOFF_SCHEMA) {
      return {
        ok: false,
        reason: 'invalid_schema',
        message: `Expected ${FUSION_TX_CLIENT_HANDOFF_SCHEMA}`,
      }
    }
    if (!handoff.afterPayload || !handoff.beforePayload) {
      return {
        ok: false,
        reason: 'missing_payload',
        message: 'Handoff missing beforePayload or afterPayload',
      }
    }
    if (!store.captureRevertPoint || !store.revertLastCommit) {
      return {
        ok: false,
        reason: 'store_missing_revert',
        message:
          'Client FusionScopeStore must implement captureRevertPoint + revertLastCommit for Trava II undo',
      }
    }

    store.applySnapshot(handoff.projectId, handoff.yDocScope, handoff.afterPayload, 'mutation')
    store.captureRevertPoint({
      projectId: handoff.projectId,
      scope: handoff.yDocScope,
      beforePayload: handoff.beforePayload,
      transactionId: handoff.transactionId,
    })

    log.info('fusion_tx_handoff_applied', {
      projectId: handoff.projectId,
      scope: handoff.yDocScope,
      transactionId: handoff.transactionId,
      snapshotHashAfter: handoff.snapshotHashAfter,
    })

    return {
      ok: true,
      transactionId: handoff.transactionId,
      scope: handoff.yDocScope,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('fusion_tx_handoff_apply_failed', { message })
    return { ok: false, reason: 'apply_error', message }
  }
}
