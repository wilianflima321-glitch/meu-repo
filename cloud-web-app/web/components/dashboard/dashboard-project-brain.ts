import type { Project } from './aethel-dashboard-model'
import type { LocalRuntimeConnectionState } from '@/lib/device/local-runtime-bridge'
import type { AgenticProductionState, ProductionReadinessSummary } from '@/lib/production/agentic-production-state'
import { buildProductionReadinessSummary } from '@/lib/production/agentic-production-state'

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
  localRuntime?: {
    connection: LocalRuntimeConnectionState
    executorLabel?: string | null
  }
  productionState?: AgenticProductionState | null
  productionPersisted?: boolean
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

const compactSignalValue = (value: string, maxLength = 34): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value

const resolveRuntimeStatus = (
  backendOnline: boolean,
  connectivityStatus?: string | null,
  localRuntime?: BuildProjectBrainSnapshotInput['localRuntime']
): ProjectBrainSignal => {
  if (!backendOnline) {
    return { label: 'Runtime', value: 'Blocked', status: 'blocked' }
  }

  if (localRuntime?.connection === 'connected') {
    return {
      label: 'Runtime',
      value: `Healthy / ${localRuntime.executorLabel || 'Local native'}`,
      status: 'ready',
    }
  }

  if (localRuntime?.connection === 'stale') {
    return { label: 'Runtime', value: 'Probe stale', status: 'attention' }
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
  localRuntime,
  productionState,
  productionPersisted = false,
}: BuildProjectBrainSnapshotInput): ProjectBrainSnapshot => {
  const productionReadiness: ProductionReadinessSummary | null = productionState
    ? buildProductionReadinessSummary(productionState)
    : null
  const productionGraphSignal: ProjectBrainSignal[] = productionReadiness
    ? [
        {
          label: 'Graphs',
          value: `${productionReadiness.readyGraphCount}/${productionReadiness.totalGraphCount}`,
          status:
            productionReadiness.blockedCount > 0
              ? 'blocked'
              : productionReadiness.readyGraphCount >= 3
                ? 'ready'
                : 'attention',
        },
      ]
    : []
  const signals: ProjectBrainSignal[] = [
    {
      label: 'Mission',
      value: compactSignalValue(productionState?.brain.objective || (primaryProject ? primaryProject.name : 'Needs goal')),
      status: primaryProject ? 'ready' : 'attention',
    },
    ...productionGraphSignal,
    resolveRuntimeStatus(backendOnline, connectivityStatus, localRuntime),
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
      value: productionPersisted ? 'Durable' : productionState ? 'Seed on save' : primaryProject ? 'Ready' : 'After mission',
      status: productionPersisted ? 'ready' : productionState ? 'attention' : primaryProject ? 'ready' : 'attention',
    },
    {
      label: 'Evidence',
      value:
        pendingApprovals > 0
          ? 'Review queue'
          : productionReadiness
            ? `${productionReadiness.evidenceCount} refs`
            : primaryProject
              ? 'Collecting'
              : 'Attach later',
      status:
        pendingApprovals > 0
          ? 'attention'
          : productionReadiness && productionReadiness.evidenceCount > 0
            ? 'ready'
            : primaryProject
              ? 'attention'
              : 'attention',
    },
    {
      label: 'Permission',
      value: productionState?.runtimePolicy.requiresHumanApproval === false ? 'Approved lane' : 'Gated',
      status: 'ready',
    },
    {
      label: 'Device',
      value:
        localRuntime?.connection === 'connected'
          ? localRuntime.executorLabel || 'Local native'
          : localRuntime?.connection === 'stale'
            ? 'Probe stale'
            : 'Browser shell',
      status: localRuntime?.connection === 'stale' ? 'attention' : 'ready',
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
    ? localRuntime?.connection === 'connected'
      ? 'Project Brain keeps mission, runtime, local-native handoff, approvals, budget, and trust state in one compact readout before the deep cockpit opens.'
      : productionPersisted
        ? 'Project Brain is durable project memory for mission, graphs, evidence, runtime, approvals, budget, and the next safe action.'
        : 'Project Brain keeps the current mission, runtime, approvals, budget, and trust state in one compact readout before the deep cockpit opens.'
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
