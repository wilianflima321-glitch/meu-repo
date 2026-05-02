import type { Project } from './aethel-dashboard-model'

export type ProjectBrainStatus = 'ready' | 'attention' | 'blocked'

export type ProjectBrainSignal = {
  label: string
  value: string
  status: ProjectBrainStatus
}

export type ProjectBrainSnapshot = {
  title: string
  domain: string
  riskLabel: string
  riskStatus: ProjectBrainStatus
  summary: string
  nextAction: string
  signals: ProjectBrainSignal[]
  continuity: ProjectBrainSignal[]
}

type BuildProjectBrainSnapshotInput = {
  primaryProject?: Project
  backendOnline: boolean
  aiProviderConfigured: boolean
  pendingApprovals: number
  walletReady: boolean
  connectivityStatus?: string | null
}

const formatDomain = (project?: Project): string => {
  switch (project?.type) {
    case 'web':
      return 'Web/App mission'
    case 'code':
      return 'Code workspace'
    case 'unreal':
      return 'Game/film room'
    case undefined:
      return 'Mission intake'
    default:
      return 'Mixed workspace'
  }
}

const resolveRuntimeStatus = (backendOnline: boolean, connectivityStatus?: string | null): ProjectBrainSignal => {
  if (!backendOnline) {
    return { label: 'Runtime', value: 'Blocked', status: 'blocked' }
  }

  if (connectivityStatus === 'degraded') {
    return { label: 'Runtime', value: 'Degraded', status: 'attention' }
  }

  if (connectivityStatus === 'healthy') {
    return { label: 'Runtime', value: 'Healthy', status: 'ready' }
  }

  return { label: 'Runtime', value: 'Online', status: 'ready' }
}

export const buildDashboardProjectBrainSnapshot = ({
  primaryProject,
  backendOnline,
  aiProviderConfigured,
  pendingApprovals,
  walletReady,
  connectivityStatus,
}: BuildProjectBrainSnapshotInput): ProjectBrainSnapshot => {
  const signals: ProjectBrainSignal[] = [
    {
      label: 'Mission',
      value: primaryProject ? primaryProject.name : 'Needs goal',
      status: primaryProject ? 'ready' : 'attention',
    },
    resolveRuntimeStatus(backendOnline, connectivityStatus),
    {
      label: 'AI',
      value: aiProviderConfigured ? 'Configured' : 'Setup needed',
      status: aiProviderConfigured ? 'ready' : 'attention',
    },
    {
      label: 'Review',
      value: pendingApprovals > 0 ? `${pendingApprovals} approvals` : 'Clear',
      status: pendingApprovals > 0 ? 'attention' : 'ready',
    },
    {
      label: 'Budget',
      value: walletReady ? 'Tracked' : 'Connect wallet',
      status: walletReady ? 'ready' : 'attention',
    },
  ]

  const hasBlockedSignal = signals.some((signal) => signal.status === 'blocked')
  const hasAttentionSignal = signals.some((signal) => signal.status === 'attention')
  const riskStatus: ProjectBrainStatus = hasBlockedSignal ? 'blocked' : hasAttentionSignal ? 'attention' : 'ready'
  const riskLabel = riskStatus === 'blocked' ? 'Blocked' : riskStatus === 'attention' ? 'Needs review' : 'Ready'
  const continuity: ProjectBrainSignal[] = [
    {
      label: 'Checkpoint',
      value: primaryProject ? 'Ready' : 'After mission',
      status: primaryProject ? 'ready' : 'attention',
    },
    {
      label: 'Evidence',
      value: pendingApprovals > 0 ? 'Review queue' : primaryProject ? 'Collecting' : 'Attach later',
      status: pendingApprovals > 0 ? 'attention' : primaryProject ? 'ready' : 'attention',
    },
    {
      label: 'Permission',
      value: 'Gated',
      status: 'ready',
    },
  ]

  const nextAction = !primaryProject
    ? 'Define the first mission'
    : !backendOnline
      ? 'Restore runtime'
      : !aiProviderConfigured
        ? 'Configure AI provider'
        : pendingApprovals > 0
          ? 'Review pending proposal'
          : !walletReady
            ? 'Connect billing context'
            : 'Expand Studio'

  const summary = primaryProject
    ? 'Project Brain keeps the current mission, runtime, approvals, budget, and trust state in one compact readout before the deep cockpit opens.'
    : 'Project Brain will become the durable mission memory once the user chooses what Aethel should build, research, operate, or review.'

  return {
    title: primaryProject ? primaryProject.name : 'No active mission',
    domain: formatDomain(primaryProject),
    riskLabel,
    riskStatus,
    summary,
    nextAction,
    signals,
    continuity,
  }
}
