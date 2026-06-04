'use client'

import type { ReactNode } from 'react'

import type {
  PreviewDeployReadiness,
  PreviewDeployStatus,
  PreviewReviewTarget,
} from '@/components/preview/previewDeployTrust'
import type { PreviewRuntimeHealthStatus, PreviewRuntimeReadinessResponse } from '@/lib/preview/runtime-manager'

export type PreviewRuntimeToolbarProps = {
  previewRuntimeUrl: string | null
  runtimeHealthStatus: PreviewRuntimeHealthStatus
  runtimeHealthLatencyMs?: number
  runtimeHealthCheckedAt: Date | null
  runtimeHealthHint: string
  runtimeReadiness: PreviewRuntimeReadinessResponse | null
  runtimeStrategyLabel: string
  runtimeStrategyHint: string
  runtimePrimaryAction: 'provision' | 'discover' | 'inline'
  runtimePrimaryActionLabel: string
  runtimeActionBlockedReason: string | null
  runtimeAutomationPlacement: string | null
  runtimeAutomationRequiresConfirmation: boolean
  showRuntimeSettings: boolean
  previewRuntimeInput: string
  onToggleSettings: () => void
  onRuntimeInputChange: (value: string) => void
  onApplyRuntime: () => void
  onUseFallback: () => void
  onRevalidate: () => void
  onOpenRuntime: () => void
  onDiscoverRuntime: () => void
  onProvisionRuntime: () => void
  onSyncRuntime: () => void
  onRunRecommendedAction: () => void
  isDiscoveringRuntime: boolean
  isProvisioningRuntime: boolean
  isSyncingRuntime: boolean
  canSyncRuntime: boolean
  syncRuntimeBlockedReason?: string | null
  runtimeDiscoveryMessage?: string | null
  runtimeDiscoveryTone?: 'info' | 'success' | 'warning'
  deployReadiness: PreviewDeployReadiness | null
  deployStatus: PreviewDeployStatus | null
  deployStatusHref: string | null
  deployUrl: string | null
  deployFeedback: string | null
  reviewTarget: PreviewReviewTarget | null
  projectId?: string | null
  isDeploySubmitting: boolean
  isDeployRefreshing: boolean
  onStartDeploy: () => void
  onRefreshDeploy: () => void
  onCopyShareLink: () => void
  onOpenDeployStatus: () => void
  onOpenDeploySite: () => void
}

export const PREVIEW_RUNTIME_COPY = {
  runtime: 'Runtime',
  externalServer: 'External server',
  inlineFallback: 'Local preview',
  health: 'Health',
  strategy: 'Path',
  nextAction: 'Next action',
  openNewTab: 'Open preview in a new tab',
  manualUrl: 'Manual runtime URL',
  autoDetect: 'Auto-detect',
  provisionManaged: 'Provision managed runtime',
  technicalDetails: 'Details',
} as const

export const PREVIEW_COMMON_COPY = {
  status: {
    checking: 'Checking',
    reachable: 'Reachable',
    idle: 'Idle',
    unavailable: 'Unavailable',
    ready: 'Ready',
    partial: 'Partial',
    blocked: 'Blocked',
  },
  actions: {
    apply: 'Apply',
    sync: 'Sync',
    revalidate: 'Revalidate',
  },
} as const

export const previewToolbarButtonBase =
  'min-h-[34px] rounded-xl border px-3 py-1.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70'

export const previewToolbarButtonSecondary =
  `${previewToolbarButtonBase} border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:ring-[var(--aethel-primary)]`

export const previewToolbarButtonInfo =
  `${previewToolbarButtonBase} border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] font-medium text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] focus-visible:ring-[var(--aethel-info)]`

export const previewToolbarButtonSuccess =
  `${previewToolbarButtonBase} border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] font-medium text-[var(--aethel-success-light)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] focus-visible:ring-[var(--aethel-success)]`

export const previewToolbarButtonDanger =
  `${previewToolbarButtonBase} border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] font-medium text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] focus-visible:ring-[var(--aethel-error)]`

export function CompactMetric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string | null
}) {
  return (
    <div className="min-w-[148px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_65%,transparent)] px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{label}</div>
      <div className="mt-1 text-[12px] font-semibold text-[var(--aethel-text-primary)]">{value}</div>
      {hint ? <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--aethel-text-tertiary)]">{hint}</div> : null}
    </div>
  )
}

export function ToolbarChip({
  children,
  toneClass,
}: {
  children: ReactNode
  toneClass: string
}) {
  return (
    <span className={`inline-flex min-h-[28px] items-center rounded-full border px-2.5 py-1 text-[10px] font-medium ${toneClass}`}>
      {children}
    </span>
  )
}

export function getReviewTargetBadge(kind: PreviewReviewTarget['kind'] | null) {
  switch (kind) {
    case 'review_ready_public':
      return 'Review ready'
    case 'review_ready_runtime':
      return 'Runtime review'
    case 'ephemeral_runtime':
      return 'Ephemeral preview'
    case 'blocked_stale':
      return 'Review stale'
    case 'blocked_degraded':
      return 'Review blocked'
    default:
      return null
  }
}

export function getReviewTargetToneClass(kind: PreviewReviewTarget['kind'] | null) {
  switch (kind) {
    case 'review_ready_public':
      return 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'
    case 'review_ready_runtime':
      return 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
    case 'ephemeral_runtime':
      return 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]'
    case 'blocked_stale':
    case 'blocked_degraded':
      return 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]'
    default:
      return 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)]'
  }
}

export function getDeployStatusLabel(status: PreviewDeployStatus | null) {
  switch (status) {
    case 'preparing':
      return 'Queued'
    case 'uploading':
      return 'Uploading'
    case 'building':
      return 'Building'
    case 'ready':
      return 'Ready'
    case 'error':
      return 'Error'
    case 'canceled':
      return 'Canceled'
    case 'idle':
      return 'Idle'
    default:
      return 'Not started'
  }
}
