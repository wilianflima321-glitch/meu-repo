/**
 * Honesty Matrix #7 residual — viewport asset-drop → J.7 cook + Fusion (no TSX).
 *
 * Pure TS wire for GLB drops: cook receipt + optional FusionTx mutation.
 * Fail-closed: empty bytes, capsule character, OpenUSD theater, empty cook.
 * Does not invent Meshy/Tripo surpass or OpenUSD C++ stage.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  recordFusionMutation,
  type FusionScopeStore,
  type FusionYDocScope,
} from '@/lib/production/creative-fusion-transaction'
import {
  cookRefinedMeshToUsdPreview,
  type RefinedMeshCookReceipt,
  type RefinedMeshCookRejectCode,
} from '@/lib/production/usd-refined-mesh-cook'
import type { UsdShipKind } from '@/lib/production/usd-integrator'
import { getViewportAssetImportFormat } from '@/lib/viewport/viewport-asset-import'

const log = createComponentLogger('viewport-asset-drop-cook-wire')

export const VIEWPORT_DROP_COOK_WIRED = true as const
/** Product OpenUSD drop→stage — always false. */
export const VIEWPORT_DROP_OPENUSD_STAGE_READY = false as const

export type ViewportDropCookRejectCode =
  | RefinedMeshCookRejectCode
  | 'unsupported_format'
  | 'fusion_required'
  | 'fusion_commit_failed'

export type ViewportDropCookResult =
  | {
      success: true
      format: 'glb'
      cook: RefinedMeshCookReceipt
      fusionTransactionId: string | null
      openUsdStageReady: false
      message: string
    }
  | {
      success: false
      code: ViewportDropCookRejectCode
      cook: null
      fusionTransactionId: null
      openUsdStageReady: false
      message: string
    }

/**
 * Ingest a viewport drop buffer through J.7 refined mesh cook (+ optional Fusion write).
 * Non-GLB formats refuse cook success (held / unsupported) — no empty success theater.
 */
export async function ingestViewportAssetDropToCook(input: {
  fileName: string
  bytes: ArrayBuffer | Uint8Array
  projectId: string
  shipKind?: UsdShipKind
  geometryProxy?: 'capsule' | 'box' | 'sphere' | 'none'
  claimOpenUsdStage?: boolean
  packUsdzPreview?: boolean
  /** When set, cook receipt is written under FusionTx (Trava II). */
  fusionStore?: FusionScopeStore
  fusionScope?: FusionYDocScope
  requireFusion?: boolean
}): Promise<ViewportDropCookResult> {
  const format = getViewportAssetImportFormat(input.fileName)
  const bytes = input.bytes instanceof Uint8Array ? input.bytes : new Uint8Array(input.bytes)

  if (!format) {
    return fail('unsupported_format', `Viewport drop cook refused — unknown format for ${input.fileName}`)
  }

  if (format !== 'glb') {
    return fail(
      'unsupported_format',
      `Viewport drop→cook supports refined GLB only today (${format} held for cook path; OpenUSD stage false).`,
    )
  }

  if (bytes.byteLength === 0) {
    return fail('empty_payload', 'Viewport drop cook refused — empty asset bytes (Law XVI).')
  }

  if (input.requireFusion && !input.fusionStore) {
    return fail('fusion_required', 'Viewport drop cook write requires FusionScopeStore (Trava II).')
  }

  const cooked = cookRefinedMeshToUsdPreview({
    glbBytes: bytes,
    shipKind: input.shipKind,
    geometryProxy: input.geometryProxy,
    claimOpenUsdStage: input.claimOpenUsdStage,
    packUsdzPreview: input.packUsdzPreview,
  })

  if (!cooked.success) {
    return fail(cooked.code, cooked.message)
  }

  let fusionTransactionId: string | null = null
  if (input.fusionStore) {
    const scope = input.fusionScope ?? 'manifest'
    try {
      const tx = await beginCreativeFusionTransaction({
        projectId: input.projectId,
        yDocScope: scope,
        store: input.fusionStore,
      })
      const payload = JSON.stringify({
        kind: 'viewport-drop-cook',
        fileName: input.fileName,
        cookId: cooked.receipt.cookId,
        contentFingerprint: cooked.receipt.contentFingerprint,
        outputFormat: cooked.receipt.outputFormat,
        openUsdStageReady: false,
      })
      recordFusionMutation(tx.id, input.fusionStore, payload)
      await commitCreativeFusionTransaction(tx.id, input.fusionStore)
      fusionTransactionId = tx.id
    } catch (err) {
      const message = err instanceof Error ? err.message : 'fusion_commit_failed'
      log.warn('viewport_drop_cook_fusion_failed', { message, projectId: input.projectId })
      return fail('fusion_commit_failed', `Cook ok but FusionTx failed: ${message}`)
    }
  }

  log.info('viewport_drop_cook_ok', {
    cookId: cooked.receipt.cookId,
    projectId: input.projectId,
    fusionTransactionId,
  })

  return {
    success: true,
    format: 'glb',
    cook: cooked.receipt,
    fusionTransactionId,
    openUsdStageReady: VIEWPORT_DROP_OPENUSD_STAGE_READY,
    message: fusionTransactionId
      ? `Drop→cook+Fusion sealed ${cooked.receipt.cookId}`
      : cooked.message,
  }
}

function fail(code: ViewportDropCookRejectCode, message: string): ViewportDropCookResult {
  log.warn('viewport_drop_cook_blocked', { code, message })
  return {
    success: false,
    code,
    cook: null,
    fusionTransactionId: null,
    openUsdStageReady: VIEWPORT_DROP_OPENUSD_STAGE_READY,
    message,
  }
}
