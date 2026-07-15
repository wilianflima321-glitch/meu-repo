import { getBillingRuntimeState, type BillingRuntimeState } from '@/lib/server/billing-runtime'
import {
  getProductionRuntimeReadiness,
  type ProductionRuntimeReadiness,
} from '@/lib/server/production-runtime-readiness'
import {
  getPreviewRuntimeReadiness,
  type PreviewRuntimeReadiness,
} from '@/lib/server/preview-runtime-readiness'

export type OperatorReadinessState = {
  status: 'ready' | 'partial'
  blockers: string[]
  instructions: string[]
  recommendedCommands: string[]
  checks: {
    productionRuntime: ProductionRuntimeReadiness
    billingRuntime: BillingRuntimeState
    previewRuntime: PreviewRuntimeReadiness
  }
}

export async function getOperatorReadinessState(): Promise<OperatorReadinessState> {
  const [productionRuntime, billingRuntime, previewRuntime] = await Promise.all([
    getProductionRuntimeReadiness(),
    getBillingRuntimeState(),
    getPreviewRuntimeReadiness(),
  ])

  const blockers = [
    ...productionRuntime.blockers.map((blocker) => `productionRuntime:${blocker}`),
    ...billingRuntime.blockers.map((blocker) => `billingRuntime:${blocker}`),
    ...previewRuntime.blockers.map((blocker) => `previewRuntime:${blocker}`),
  ]

  return {
    status: blockers.length === 0 ? 'ready' : 'partial',
    blockers,
    instructions: Array.from(
      new Set([
        ...productionRuntime.instructions,
        ...billingRuntime.instructions,
        ...previewRuntime.instructions,
      ])
    ),
    recommendedCommands: Array.from(
      new Set([
        ...productionRuntime.recommendedCommands,
        ...billingRuntime.recommendedCommands,
        ...previewRuntime.recommendedCommands,
      ])
    ),
    checks: {
      productionRuntime,
      billingRuntime,
      previewRuntime,
    },
  }
}
