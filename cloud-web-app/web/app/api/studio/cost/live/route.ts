import { NextRequest, NextResponse } from 'next/server'
import emergencyController from '@/lib/emergency-mode'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { getBillingRuntimeState } from '@/lib/server/billing-runtime'
import { createComponentLogger } from '@/lib/observability/logger'

export const dynamic = 'force-dynamic'

const log = createComponentLogger('studio-cost-live-route')
const LOW_BALANCE_THRESHOLD = 100

type BudgetMeterStatus = 'healthy' | 'warning' | 'critical'

function buildBudgetMeter(spendUsd: number, budgetUsd: number) {
  const safeBudget = Number.isFinite(budgetUsd) && budgetUsd > 0 ? budgetUsd : 0
  const percent = safeBudget > 0 ? Math.round((spendUsd / safeBudget) * 100) : 0
  const status: BudgetMeterStatus =
    percent >= 90 ? 'critical' : percent >= 70 ? 'warning' : 'healthy'

  return {
    spendUsd,
    budgetUsd: safeBudget,
    percent,
    status,
  }
}

function buildGuidance(input: {
  walletBalance: number
  billingReady: boolean
  budgetStatuses: BudgetMeterStatus[]
  billingBlockers: string[]
}) {
  const guidance: string[] = []

  if (input.walletBalance <= LOW_BALANCE_THRESHOLD) {
    guidance.push('Saldo baixo: revise o plano, faca top-up ou reduza o custo por execucao antes de abrir novas trilhas longas.')
  }

  if (!input.billingReady) {
    guidance.push('Checkout is not ready yet: treat upgrades and publishing as blocked until billing runtime is ready.')
  }

  if (input.budgetStatuses.includes('critical')) {
    guidance.push('Budget critico: use modelos mais baratos, reduza paralelismo e valide antes de disparar execucoes longas.')
  } else if (input.budgetStatuses.includes('warning')) {
    guidance.push('Budget em alerta: priorize review-first, menos agentes e menos web research antes da proxima wave.')
  }

  if (input.billingBlockers.length > 0) {
    guidance.push(`Blockers de billing: ${input.billingBlockers.join(', ')}.`)
  }

  if (guidance.length === 0) {
    guidance.push('Runtime economico saudavel: voce pode seguir com execucao, review e deploy sem bloqueios economicos imediatos.')
  }

  return guidance
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const [balanceAgg, billingRuntime, emergencyState, emergencyMetrics] = await Promise.all([
      prisma.creditLedgerEntry.aggregate({
        where: { userId: user.userId },
        _sum: { amount: true },
      }),
      getBillingRuntimeState(),
      prisma.emergencyState.findUnique({
        where: { id: 'singleton' },
        select: {
          level: true,
          dailyBudget: true,
          hourlyBudget: true,
          monthlyBudget: true,
          maxTokensPerRequest: true,
          allowedModels: true,
        },
      }),
      emergencyController.updateMetrics(),
    ])

    const stateSnapshot = emergencyController.getState()
    const walletBalance = balanceAgg._sum?.amount ?? 0
    const hourly = buildBudgetMeter(
      emergencyMetrics.hourlySpend,
      emergencyState?.hourlyBudget ?? stateSnapshot.settings.hourlyBudget
    )
    const daily = buildBudgetMeter(
      emergencyMetrics.dailySpend,
      emergencyState?.dailyBudget ?? stateSnapshot.settings.dailyBudget
    )
    const monthly = buildBudgetMeter(
      emergencyMetrics.monthlySpend,
      emergencyState?.monthlyBudget ?? stateSnapshot.settings.monthlyBudget
    )
    const budgetStatuses = [hourly.status, daily.status, monthly.status]
    const billingReady = billingRuntime.checkoutReady && billingRuntime.portalReady && billingRuntime.webhookReady
    const allowedModels = emergencyState?.allowedModels
      ? emergencyState.allowedModels.split(',').map((model) => model.trim()).filter(Boolean)
      : []

    const guidance = buildGuidance({
      walletBalance,
      billingReady,
      budgetStatuses,
      billingBlockers: billingRuntime.blockers,
    })

    return NextResponse.json({
      status: !billingReady || budgetStatuses.includes('critical')
        ? 'blocked'
        : budgetStatuses.includes('warning')
          ? 'attention'
          : 'ready',
      projectId: request.nextUrl.searchParams.get('projectId'),
      wallet: {
        balance: walletBalance,
        currency: 'credits',
        lowBalance: walletBalance <= LOW_BALANCE_THRESHOLD,
        lowBalanceThreshold: LOW_BALANCE_THRESHOLD,
      },
      budget: {
        hourly,
        daily,
        monthly,
      },
      billing: {
        status: billingRuntime.status,
        checkoutReady: billingRuntime.checkoutReady,
        portalReady: billingRuntime.portalReady,
        webhookReady: billingRuntime.webhookReady,
        blockers: billingRuntime.blockers,
        providerLabel: billingRuntime.provider.label,
        setupEnv: billingRuntime.provider.setupEnv,
      },
      policy: {
        emergencyLevel: emergencyState?.level ?? stateSnapshot.level,
        fallbackModel: stateSnapshot.settings.fallbackModel,
        autoDowngradeOnWarning: stateSnapshot.settings.autoDowngradeOnWarning,
        autoShutdownOnCritical: stateSnapshot.settings.autoShutdownOnCritical,
        maxTokensPerRequest: emergencyState?.maxTokensPerRequest ?? 4096,
        allowedModels,
      },
      metrics: {
        totalRequestsToday: emergencyMetrics.totalRequestsToday,
        totalTokensToday: emergencyMetrics.totalTokensToday,
        avgCostPerRequestUsd: emergencyMetrics.avgCostPerRequest,
        updatedAt: emergencyMetrics.lastUpdated.toISOString(),
      },
      guidance,
    })
  } catch (error) {
    log.error('Failed to load studio cost live state', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
