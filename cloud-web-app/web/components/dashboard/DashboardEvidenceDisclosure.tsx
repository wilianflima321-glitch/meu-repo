'use client'

import { BrainCircuit, ChevronDown, GitBranch, ListChecks, ShieldCheck } from 'lucide-react'

import { DeviceRuntimeGuardCard } from '@/components/device/DeviceRuntimeGuardCard'
import type { DeviceCapabilityProfile } from '@/lib/device/device-capability-profile'
import type { LocalRuntimeBridgeHookState } from '@/hooks/useLocalRuntimeBridge'

import { DashboardMissionLedgerCard } from './DashboardMissionLedgerCard'
import { DashboardProjectBrainCard } from './DashboardProjectBrainCard'
import { DashboardRepositoryCartographyCard } from './DashboardRepositoryCartographyCard'
import type { MissionLedgerSnapshot } from './dashboard-mission-ledger'
import type { ProjectBrainSnapshot, ProjectBrainStatus } from './dashboard-project-brain'
import type { RepositoryCartographySnapshot, RepositoryCartographyStatus } from './dashboard-repository-cartography'

type EvidenceTone = 'ready' | 'attention' | 'blocked'

type DashboardEvidenceDisclosureProps = {
  projectBrainSnapshot: ProjectBrainSnapshot
  missionLedgerSnapshot: MissionLedgerSnapshot
  repositoryCartographySnapshot: RepositoryCartographySnapshot
  runtimeProfile: DeviceCapabilityProfile
  localBridge?: LocalRuntimeBridgeHookState
  onOpenAiChat: () => void
  onOpenIde: () => void
  onOpenProjects: () => void
  onScanContext?: () => void
  scanNote: string | null
  scanState: 'idle' | 'scanning' | 'complete' | 'error'
  onRequestLocalProbe?: () => void
}

const toneClasses: Record<EvidenceTone, string> = {
  ready:
    'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
  attention:
    'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
  blocked:
    'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]',
}

function fromProjectBrainStatus(status: ProjectBrainStatus): EvidenceTone {
  if (status === 'ready') return 'ready'
  if (status === 'blocked') return 'blocked'
  return 'attention'
}

function fromRepositoryStatus(status: RepositoryCartographyStatus): EvidenceTone {
  if (status === 'ready') return 'ready'
  if (status === 'blocked') return 'blocked'
  return 'attention'
}

function runtimeTone(localBridge: LocalRuntimeBridgeHookState | undefined, profile: DeviceCapabilityProfile): EvidenceTone {
  if (localBridge?.connection === 'connected') return 'ready'
  if (profile.policy.mode === 'safe-mode') return 'blocked'
  return 'attention'
}

function runtimeLabel(localBridge: LocalRuntimeBridgeHookState | undefined, profile: DeviceCapabilityProfile): string {
  if (localBridge?.connection === 'connected') return localBridge.executorLabel || 'Local bridge'
  if (localBridge?.connection === 'stale') return 'Probe stale'
  if (profile.policy.mode === 'safe-mode') return 'Safe mode'
  return 'Browser preview'
}

export function DashboardEvidenceDisclosure({
  projectBrainSnapshot,
  missionLedgerSnapshot,
  repositoryCartographySnapshot,
  runtimeProfile,
  localBridge,
  onOpenAiChat,
  onOpenIde,
  onOpenProjects,
  onScanContext,
  scanNote,
  scanState,
  onRequestLocalProbe,
}: DashboardEvidenceDisclosureProps) {
  const evidenceRows = [
    {
      label: 'Project brain',
      value: projectBrainSnapshot.riskLabel,
      tone: fromProjectBrainStatus(projectBrainSnapshot.riskStatus),
      icon: BrainCircuit,
    },
    {
      label: 'Mission ledger',
      value: missionLedgerSnapshot.stateLabel,
      tone:
        missionLedgerSnapshot.state === 'blocked'
          ? 'blocked'
          : missionLedgerSnapshot.state === 'needs_approval' || missionLedgerSnapshot.state === 'planned'
            ? 'attention'
            : 'ready',
      icon: ListChecks,
    },
    {
      label: 'Repository map',
      value: repositoryCartographySnapshot.statusLabel,
      tone: fromRepositoryStatus(repositoryCartographySnapshot.status),
      icon: GitBranch,
    },
    {
      label: 'Runtime',
      value: runtimeLabel(localBridge, runtimeProfile),
      tone: runtimeTone(localBridge, runtimeProfile),
      icon: ShieldCheck,
    },
  ] as const

  return (
    <section
      data-dashboard-evidence-disclosure
      className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(8,10,16,0.94))] shadow-[0_24px_80px_rgba(2,6,23,0.30)]"
      aria-label="Mission evidence and runtime readiness"
    >
      <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
            Mission evidence
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">
            Proof stays one tap away.
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            The dashboard keeps the next move visible; deep memory, ledger, repository and runtime diagnostics open on demand.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {evidenceRows.map((row) => {
            const Icon = row.icon
            return (
              <div
                key={row.label}
                className="rounded-[20px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--aethel-text-secondary)]">{row.label}</span>
                  <Icon className="h-3.5 w-3.5 text-[var(--aethel-text-quaternary)]" aria-hidden="true" />
                </div>
                <span className={`mt-2 inline-flex max-w-full rounded-full border px-2.5 py-1 text-[11px] font-medium ${toneClasses[row.tone]}`}>
                  <span className="truncate">{row.value}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <details className="group border-t border-[var(--aethel-border-subtle)]" data-dashboard-evidence-details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] sm:px-5 [&::-webkit-details-marker]:hidden">
          <span>Open deep evidence and runtime diagnostics</span>
          <ChevronDown className="h-4 w-4 text-[var(--aethel-text-quaternary)] transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-4 px-4 pb-5 sm:px-5">
          <DashboardProjectBrainCard
            snapshot={projectBrainSnapshot}
            onOpenAiChat={onOpenAiChat}
            onOpenIde={onOpenIde}
            onOpenProjects={onOpenProjects}
          />
          <DashboardMissionLedgerCard
            snapshot={missionLedgerSnapshot}
            onOpenAiChat={onOpenAiChat}
            onOpenIde={onOpenIde}
            onOpenProjects={onOpenProjects}
          />
          <DashboardRepositoryCartographyCard
            snapshot={repositoryCartographySnapshot}
            onOpenAiChat={onOpenAiChat}
            onOpenIde={onOpenIde}
            onScanContext={onScanContext}
            scanNote={scanNote}
            scanState={scanState}
          />
          <DeviceRuntimeGuardCard
            profile={runtimeProfile}
            localBridge={localBridge}
            onRequestLocalProbe={onRequestLocalProbe}
          />
        </div>
      </details>
    </section>
  )
}

export default DashboardEvidenceDisclosure
