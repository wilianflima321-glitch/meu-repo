/**
 * DEPRECATED parallel FusionTx — Law XVI Trava II lives in production only.
 *
 * Thin re-export; old Y.Doc class API fails closed so Mini-IA cannot apply
 * mutations without `beginCreativeFusionTransaction` / abort restore.
 *
 * Canonical: `@/lib/production/creative-fusion-transaction`
 */

export {
  abortCreativeFusionTransaction,
  assertFusionTransactionOpen,
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  createMemoryFusionScopeStore,
  recordFusionMutation,
  type CreativeFusionTransactionRecord,
  type FusionScopeStore,
  type FusionTransactionStatus,
  type FusionYDocScope,
} from '@/lib/production/creative-fusion-transaction'

export const CREATIVE_FUSION_TRANSACTION_CANONICAL =
  'lib/production/creative-fusion-transaction' as const

const DEPRECATION =
  '[Law XVI] lib/ai/CreativeFusionTransaction class is deprecated. Use beginCreativeFusionTransaction from @/lib/production/creative-fusion-transaction.'

/**
 * @deprecated Fail-closed. Does not mutate Yjs — forces production FusionTx.
 */
export class CreativeFusionTransaction {
  static async executeAtomically<T>(..._args: unknown[]): Promise<T> {
    throw new Error(DEPRECATION)
  }
}
