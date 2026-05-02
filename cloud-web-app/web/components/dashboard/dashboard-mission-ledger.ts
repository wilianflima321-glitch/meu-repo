import type { Project } from './aethel-dashboard-model'

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
}

const resolveMissionState = ({
  primaryProject,
  backendOnline,
  aiProviderConfigured,
  pendingApprovals,
}: BuildMissionLedgerSnapshotInput): MissionLedgerState => {
  if (!primaryProject) return 'planned'
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
  const { primaryProject, backendOnline, aiProviderConfigured, pendingApprovals, walletReady, connectivityStatus } = input
  const state = resolveMissionState(input)
  const checks: MissionLedgerCheck[] = [
    { label: 'Goal', ready: Boolean(primaryProject) },
    { label: 'Runtime', ready: backendOnline },
    { label: 'AI', ready: aiProviderConfigured },
    { label: 'Budget', ready: walletReady },
    { label: 'Approval', ready: pendingApprovals === 0 },
  ]
  const evidence: MissionLedgerEvidence[] = [
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
          : !walletReady
            ? 'Track budget'
            : 'Continue execution'
  const summary =
    state === 'planned'
      ? 'Mission Ledger starts after the user defines one concrete outcome.'
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
