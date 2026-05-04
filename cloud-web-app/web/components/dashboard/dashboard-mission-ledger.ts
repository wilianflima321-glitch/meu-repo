import type { Project } from './aethel-dashboard-model'
import type { AgenticProductionState } from '@/lib/production/agentic-production-state'
import { buildProductionReadinessSummary } from '@/lib/production/agentic-production-state'

export type MissionLedgerState =
  | 'planned'
  | 'running'
  | 'needs_approval'
  | 'blocked'
  | 'paused'
  | 'complete'

export type MissionLedgerCheck = {
  label: string
  ready: boolean
}

export type MissionLedgerEvidence = {
  label: string
  value: string
  ready: boolean
}

export type MissionLedgerSnapshot = {
  title: string
  state: MissionLedgerState
  stateLabel: string
  summary: string
  nextAction: string
  checks: MissionLedgerCheck[]
  evidence: MissionLedgerEvidence[]
}

type BuildMissionLedgerSnapshotInput = {
  primaryProject?: Project
  backendOnline: boolean
  aiProviderConfigured: boolean
  pendingApprovals: number
  walletReady: boolean
  connectivityStatus?: string | null
  productionState?: AgenticProductionState | null
  productionPersisted?: boolean
}

const resolveMissionState = ({
  primaryProject,
  backendOnline,
  aiProviderConfigured,
  pendingApprovals,
  productionState,
}: BuildMissionLedgerSnapshotInput): MissionLedgerState => {
  if (!primaryProject) return 'planned'
  const latestProductionEntry = productionState?.ledger[0]
  if (latestProductionEntry?.state === 'needs-approval') return 'needs_approval'
  if (latestProductionEntry?.state === 'blocked') return 'blocked'
  if (latestProductionEntry?.state === 'paused') return 'paused'
  if (latestProductionEntry?.state === 'complete') return 'complete'
  if (primaryProject.status === 'completed') return 'complete'
  if (primaryProject.status === 'paused') return 'paused'
  if (!backendOnline || !aiProviderConfigured) return 'blocked'
  if (pendingApprovals > 0) return 'needs_approval'
  return 'running'
}

const stateLabels: Record<MissionLedgerState, string> = {
  planned: 'Planned',
  running: 'Running',
  needs_approval: 'Needs approval',
  blocked: 'Blocked',
  paused: 'Paused',
  complete: 'Complete',
}

export const buildDashboardMissionLedgerSnapshot = (input: BuildMissionLedgerSnapshotInput): MissionLedgerSnapshot => {
  const {
    primaryProject,
    backendOnline,
    aiProviderConfigured,
    pendingApprovals,
    walletReady,
    connectivityStatus,
    productionState,
    productionPersisted = false,
  } = input
  const state = resolveMissionState(input)
  const productionReadiness = productionState ? buildProductionReadinessSummary(productionState) : null
  const checks: MissionLedgerCheck[] = [
    { label: 'Goal', ready: Boolean(primaryProject) },
    { label: 'Runtime', ready: backendOnline },
    { label: 'AI', ready: aiProviderConfigured },
    {
      label: 'Graphs',
      ready: productionReadiness ? productionReadiness.readyGraphCount >= 3 && productionReadiness.blockedCount === 0 : false,
    },
    { label: 'Budget', ready: walletReady },
    { label: 'Approval', ready: pendingApprovals === 0 },
  ]
  const evidence: MissionLedgerEvidence[] = [
    {
      label: 'Memory',
      value: productionPersisted ? 'Durable' : primaryProject ? 'Seed pending' : 'After mission',
      ready: productionPersisted,
    },
    {
      label: 'Preview',
      value: backendOnline ? 'Available' : 'Blocked',
      ready: backendOnline,
    },
    {
      label: 'Review',
      value: pendingApprovals > 0 ? `${pendingApprovals} pending` : 'Clear',
      ready: pendingApprovals === 0,
    },
    {
      label: 'Production',
      value: productionReadiness
        ? `${productionReadiness.graphCoverage}% graphs / ${productionReadiness.evidenceCount} refs`
        : 'Not seeded',
      ready: Boolean(productionReadiness && productionReadiness.readyGraphCount >= 3 && productionReadiness.blockedCount === 0),
    },
    {
      label: 'Connectivity',
      value: connectivityStatus ? connectivityStatus.replace(/_/g, ' ') : 'Unknown',
      ready: connectivityStatus === 'healthy' || connectivityStatus === 'ok',
    },
  ]
  const nextAction = !primaryProject
    ? 'Define mission'
    : !backendOnline
      ? 'Restore runtime'
      : !aiProviderConfigured
        ? 'Configure AI'
        : pendingApprovals > 0
          ? 'Review approval'
          : productionReadiness && productionReadiness.blockedCount > 0
            ? 'Resolve production blocker'
            : productionReadiness && productionReadiness.readyGraphCount < 3
              ? 'Complete production graphs'
              : !walletReady
                ? 'Track budget'
                : 'Continue execution'
  const summary =
    state === 'planned'
      ? 'Mission Ledger starts after the user defines one concrete outcome.'
      : productionPersisted
        ? 'Mission Ledger persists state, acceptance checks, graph coverage, evidence, rollback, cost, and the next safe action.'
        : 'Mission Ledger keeps state, acceptance checks, evidence, and the next safe action visible before deeper agent work.'

  return {
    title: primaryProject?.name ?? 'No mission yet',
    state,
    stateLabel: stateLabels[state],
    summary,
    nextAction,
    checks,
    evidence,
  }
}
