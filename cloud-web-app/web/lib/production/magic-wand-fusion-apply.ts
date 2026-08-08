/**
 * L.7 — MagicWand / AgenticUIStudio → CreativeFusionTransaction (Trava II).
 *
 * Manifest / viewport / graph-touching UI mutations must not write ungoverned.
 * Fail-closed when FusionTx store cannot be resolved.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { serializeFusionTxClientHandoff } from '@/lib/production/fusion-tx-client-handoff'
import { resolveFusionScopeStore } from '@/lib/production/fusion-scope-registry'
import type { FusionScopeStore } from '@/lib/production/creative-fusion-transaction'
import {
  beginUiMutationTransaction,
  mutateUiTransaction,
  commitUiMutationTransaction,
  abortUiMutationTransaction,
  createMemoryUiMutationStore,
  type UiMutationSnapshot,
  type UiMutationStore,
} from '@/lib/production/ui-mutation-transaction'

const log = createComponentLogger('magic-wand-fusion-apply')

export const MAGIC_WAND_FUSION_APPLIED_EVENT = 'aethel.magic-wand.fusion-applied' as const
export const MAGIC_WAND_FUSION_DENIED_EVENT = 'aethel.magic-wand.fusion-denied' as const

export type MagicWandElementInfo = {
  tag: string
  id?: string
  className?: string
  textContent?: string
}

export type MagicWandFusionApplyOk = {
  ok: true
  success: true
  uiMutationTxId: string
  fusionTxId: string
  fusionHandoffJson: string
  snapshotHashBefore: string
  snapshotHashAfter: string
  surfaces: Array<'tsx' | 'css' | 'preview-dom'>
}

export type MagicWandFusionApplyFail = {
  ok: false
  success: false
  reason:
    | 'fusion_unavailable'
    | 'empty_mutation'
    | 'commit_failed'
    | 'missing_project'
  message: string
}

export type MagicWandFusionApplyResult = MagicWandFusionApplyOk | MagicWandFusionApplyFail

/** Mutating intents from MagicWand / Props Inspector — Explain is non-mutating. */
export function isMutatingMagicWandCommand(command: string): boolean {
  const c = command.trim()
  if (!c) return false
  if (/^Explain\b/i.test(c)) return false
  return (
    /^(Improve|Add motion|Restyle|Apply)\b/i.test(c) ||
    /\b(apply|mutate|change|restyle|animate|improve)\b/i.test(c)
  )
}

/**
 * Apply MagicWand / AgenticUIStudio UI mutation under L.11 UIMutationTransaction
 * → CreativeFusionTransaction. Fail-closed if Fusion store unavailable.
 */
export async function applyMagicWandMutationViaFusionTx(input: {
  projectId: string
  command: string
  elementInfo?: MagicWandElementInfo | null
  mutation?: Partial<UiMutationSnapshot>
  fusionStore?: FusionScopeStore
  uiStore?: UiMutationStore
}): Promise<MagicWandFusionApplyResult> {
  if (!input.projectId?.trim()) {
    return {
      ok: false,
      success: false,
      reason: 'missing_project',
      message: 'MagicWand FusionTx apply requires projectId (fail-closed).',
    }
  }

  const fusionStore = resolveFusionScopeStore(input.projectId, input.fusionStore)
  if (!fusionStore) {
    log.warn('magic_wand_fusion_unavailable', { projectId: input.projectId })
    return {
      ok: false,
      success: false,
      reason: 'fusion_unavailable',
      message:
        'CreativeFusionTransaction store unavailable — MagicWand mutation denied (Trava II fail-closed). Bind ensureProjectFusionYjsStore before apply.',
    }
  }

  const mutation: Partial<UiMutationSnapshot> = input.mutation ?? {
    previewDom: JSON.stringify({
      source: 'magic-wand',
      command: input.command,
      element: input.elementInfo ?? null,
      at: new Date().toISOString(),
    }),
  }

  const hasContent = Boolean(
    (mutation.tsx && mutation.tsx.length > 0) ||
      (mutation.css && mutation.css.length > 0) ||
      (mutation.previewDom && mutation.previewDom.length > 0),
  )
  if (!hasContent) {
    return {
      ok: false,
      success: false,
      reason: 'empty_mutation',
      message: 'MagicWand mutation empty — refusing success with empty artifact (Law XVI).',
    }
  }

  const uiStore = input.uiStore ?? createMemoryUiMutationStore()
  if (!input.uiStore) {
    uiStore.applySnapshot(input.projectId, {
      tsx: '',
      css: '',
      previewDom: '',
    })
  }

  let uiTxId: string | undefined
  try {
    const uiTx = await beginUiMutationTransaction({
      projectId: input.projectId,
      store: uiStore,
      fusionStore,
      surfaces: ['tsx', 'css', 'preview-dom'],
    })
    uiTxId = uiTx.id

    await mutateUiTransaction({
      txId: uiTx.id,
      store: uiStore,
      next: mutation,
    })

    const committed = await commitUiMutationTransaction({
      txId: uiTx.id,
      store: uiStore,
      fusionStore,
    })
    if (!committed || committed.status !== 'committed' || !committed.snapshotHashAfter) {
      throw new Error('UIMutationTransaction commit did not produce after snapshot')
    }

    // Build handoff from the underlying FusionTx record via re-read of fusion store
    // commit already closed the fusion tx; reconstruct handoff from ui mutation hashes + payloads.
    const afterPayload = JSON.stringify(committed.after ?? uiStore.getSnapshot(input.projectId))
    const beforePayload = JSON.stringify(committed.before)
    const handoff = {
      schema: 'aethel.fusion-tx-handoff.v1' as const,
      projectId: input.projectId,
      yDocScope: 'manifest' as const,
      transactionId: committed.fusionTxId,
      beforePayload,
      afterPayload,
      snapshotHashBefore: committed.snapshotHashBefore,
      snapshotHashAfter: committed.snapshotHashAfter,
      committedAt: new Date().toISOString(),
    }

    // Validate handoff shape via parser path (throws if invalid)
    const fusionHandoffJson = serializeFusionTxClientHandoff(handoff)

    const result: MagicWandFusionApplyOk = {
      ok: true,
      success: true,
      uiMutationTxId: committed.id,
      fusionTxId: committed.fusionTxId,
      fusionHandoffJson,
      snapshotHashBefore: committed.snapshotHashBefore,
      snapshotHashAfter: committed.snapshotHashAfter,
      surfaces: committed.surfaces,
    }

    log.info('magic_wand_fusion_applied', {
      projectId: input.projectId,
      fusionTxId: result.fusionTxId,
      uiMutationTxId: result.uiMutationTxId,
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(MAGIC_WAND_FUSION_APPLIED_EVENT, { detail: result }),
      )
    }

    return result
  } catch (err) {
    if (uiTxId) {
      await abortUiMutationTransaction({
        txId: uiTxId,
        store: uiStore,
        fusionStore,
      }).catch(() => undefined)
    }
    const message = err instanceof Error ? err.message : String(err)
    log.warn('magic_wand_fusion_commit_failed', { projectId: input.projectId, message })
    const fail: MagicWandFusionApplyFail = {
      ok: false,
      success: false,
      reason: 'commit_failed',
      message: `MagicWand FusionTx commit failed — mutation aborted: ${message}`,
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(MAGIC_WAND_FUSION_DENIED_EVENT, { detail: fail }),
      )
    }
    return fail
  }
}
