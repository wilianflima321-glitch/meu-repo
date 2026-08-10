/**
 * Honesty Matrix #8 — CW6 creative apply receipt tied to FusionTx + fileValidation.
 * Mini-IA cannot claim creative write success when L.5/AST/Lazy gate denied.
 */

import { createHash } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import type { FileValidationStatusEntry } from '@/lib/production/agent-apply-validation-gate'
import { COMPOSER_SURPASS_CLAIM } from '@/lib/production/agent-apply-validation-gate'
import type { FusionYDocScope } from '@/lib/production/creative-fusion-transaction'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'

const log = createComponentLogger('creative-apply-fusion-receipt')

const HARD_DENY = new Set([
  'denied_ast',
  'denied_lazy',
  'denied_l5',
  'denied_lint',
  'denied_rust_gate_unavailable',
  'denied_rust_fail',
  'denied_disjoint',
  'denied_commit_ci',
  'denied_design_token',
])

export type CreativeApplyFusionReceipt = {
  receiptId: string
  projectId: string
  fusionTransactionId: string | null
  fusionScope: FusionYDocScope | null
  writeApplied: boolean
  fileValidation: FileValidationStatusEntry[]
  deniedPaths: string[]
  composerSurpassClaim: false
  sealedAt: string
}

export type CreativeApplyFusionSealResult =
  | { ok: true; receipt: CreativeApplyFusionReceipt; ledger: TaskEvidenceLedger }
  | {
      ok: false
      code: 'FILE_VALIDATION_DENIED' | 'EMPTY_WRITE_CLAIM' | 'MISSING_FUSION_TX'
      receipt: CreativeApplyFusionReceipt | null
      ledger: TaskEvidenceLedger
      message: string
    }

function deniedEntries(fileValidation: FileValidationStatusEntry[]): FileValidationStatusEntry[] {
  return fileValidation.filter((e) => HARD_DENY.has(e.status))
}

/**
 * Seal a creative apply receipt. Fail-closed when write is claimed but CW6 gate denied.
 */
export function sealCreativeApplyFusionReceipt(input: {
  projectId: string
  fusionTransactionId?: string | null
  fusionScope?: FusionYDocScope | null
  /** Caller asserts Fusion mutation was applied to scopes. */
  writeApplied: boolean
  fileValidation: FileValidationStatusEntry[]
  /** Write domains that mutate shared doc require an open/committed Fusion tx id. */
  requiresFusionTx?: boolean
  ledger?: TaskEvidenceLedger
}): CreativeApplyFusionSealResult {
  const sealedAt = new Date().toISOString()
  const denied = deniedEntries(input.fileValidation)
  const deniedPaths = denied.map((d) => d.path)

  let ledger =
    input.ledger ??
    createTaskEvidenceLedger({
      taskId: `creative-apply-${createHash('sha256').update(`${input.projectId}:${sealedAt}`).digest('hex').slice(0, 8)}`,
      projectId: input.projectId,
      mission: 'Creative apply Fusion + CW6 fileValidation receipt',
      ownerAgent: 'CreativeApplyFusionReceipt',
    })

  const material = [
    input.projectId,
    input.fusionTransactionId ?? '',
    input.writeApplied ? '1' : '0',
    deniedPaths.join(','),
    sealedAt,
  ].join('|')
  const receiptId = `creative-apply-${createHash('sha256').update(material).digest('hex').slice(0, 16)}`

  const baseReceipt: CreativeApplyFusionReceipt = {
    receiptId,
    projectId: input.projectId,
    fusionTransactionId: input.fusionTransactionId ?? null,
    fusionScope: input.fusionScope ?? null,
    writeApplied: false,
    fileValidation: input.fileValidation,
    deniedPaths,
    composerSurpassClaim: COMPOSER_SURPASS_CLAIM,
    sealedAt,
  }

  if (input.requiresFusionTx !== false && input.writeApplied && !input.fusionTransactionId) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'Creative apply missing FusionTx',
      summary: 'Trava II: write claim without fusionTransactionId refused',
      refs: [`receipt:${receiptId}`],
      actor: 'CreativeApplyFusionReceipt',
    })
    log.warn('creative_apply_missing_fusion_tx', { projectId: input.projectId })
    return {
      ok: false,
      code: 'MISSING_FUSION_TX',
      receipt: baseReceipt,
      ledger,
      message: 'Creative write requires FusionTransactionId (Trava II).',
    }
  }

  if (input.writeApplied && denied.length > 0) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'Creative apply blocked by CW6 fileValidation',
      summary: `denied=${denied.map((d) => `${d.path}:${d.status}`).join(';')}`,
      refs: [`receipt:${receiptId}`, ...denied.map((d) => `deny:${d.path}:${d.status}`)],
      actor: 'CreativeApplyFusionReceipt',
    })
    log.warn('creative_apply_file_validation_denied', {
      projectId: input.projectId,
      denied: deniedPaths,
    })
    return {
      ok: false,
      code: 'FILE_VALIDATION_DENIED',
      receipt: baseReceipt,
      ledger,
      message: 'Cannot present creative write success when fileValidation denied (CW6).',
    }
  }

  if (input.writeApplied && input.fileValidation.length === 0) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'Creative apply empty validation',
      summary: 'Law XVI: refuse write claim with empty fileValidation receipt',
      refs: [`receipt:${receiptId}`],
      actor: 'CreativeApplyFusionReceipt',
    })
    return {
      ok: false,
      code: 'EMPTY_WRITE_CLAIM',
      receipt: baseReceipt,
      ledger,
      message: 'Creative write claim requires non-empty fileValidation receipts.',
    }
  }

  const receipt: CreativeApplyFusionReceipt = {
    ...baseReceipt,
    writeApplied: input.writeApplied,
  }

  ledger = appendTaskEvidence(ledger, {
    kind: input.writeApplied ? 'artifact' : 'validation',
    title: input.writeApplied ? 'Creative apply Fusion receipt' : 'Creative apply dry-run receipt',
    summary: `writeApplied=${receipt.writeApplied} fusion=${receipt.fusionTransactionId ?? 'none'} files=${input.fileValidation.length}`,
    refs: [
      `receipt:${receipt.receiptId}`,
      ...(receipt.fusionTransactionId ? [`fusion:${receipt.fusionTransactionId}`] : []),
      'cw6:fileValidation',
      'composerSurpassClaim:false',
    ],
    actor: 'CreativeApplyFusionReceipt',
  })

  log.info('creative_apply_fusion_receipt_sealed', {
    receiptId: receipt.receiptId,
    writeApplied: receipt.writeApplied,
  })

  return { ok: true, receipt, ledger }
}
