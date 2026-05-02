'use client'

import { Cpu, Gauge, HardDrive, ShieldCheck, Zap } from 'lucide-react'

import type { DeviceCapabilityProfile, DeviceRuntimeMode } from '@/lib/device/device-capability-profile'
import type { LocalRuntimeBridgeState } from '@/lib/device/local-runtime-bridge'
import { buildRuntimeLaneBudgets, decideRuntimeLaneStart } from '@/lib/device/runtime-lane-scheduler'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import { useRuntimeInteractionPressure } from '@/components/providers/runtime/useRuntimeInteractionPressure'

type DeviceRuntimeGuardCardProps = {
  profile: DeviceCapabilityProfile
  localBridge?: LocalRuntimeBridgeState
  onRequestLocalProbe?: () => void
}

const modeLabels: Record<DeviceRuntimeMode, string> = {
  'local-accelerated': 'Local accelerated',
  'hybrid-balanced': 'Hybrid balanced',
  'cloud-isolated': 'Cloud isolated',
  'safe-mode': 'Safe mode',
}

const modeTone: Record<DeviceRuntimeMode, string> = {
  'local-accelerated':
    'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
  'hybrid-balanced':
    'border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]',
  'cloud-isolated':
    'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] text-[var(--aethel-text-secondary)]',
  'safe-mode':
    'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
}

function formatMemory(memoryGb?: number) {
  return memoryGb ? `${memoryGb} GB` : 'Unknown'
}

function formatStorage(quotaGb?: number, usageGb?: number) {
  if (!quotaGb) return 'Unknown'
  const free = Math.max(0, quotaGb - (usageGb ?? 0))
  return `${free.toFixed(1)} GB free`
}

function formatFreeStorage(storageGb?: number) {
  return storageGb ? `${storageGb.toFixed(1)} GB free` : 'Unknown'
}

function formatBridgeAge(ageMs: number | null | undefined) {
  if (typeof ageMs !== 'number' || !Number.isFinite(ageMs)) return 'Awaiting probe'
  const minutes = Math.max(0, Math.round(ageMs / 60000))
  return minutes <= 1 ? 'Just now' : `${minutes} min ago`
}

export function DeviceRuntimeGuardCard({
  profile,
  localBridge,
  onRequestLocalProbe,
}: DeviceRuntimeGuardCardProps) {
  const { policy, signals } = profile
  const userActive = useRuntimeInteractionPressure()
  const laneBudgets = buildRuntimeLaneBudgets(policy).slice(0, 4)
  const laneDecisions = laneBudgets.map((lane) =>
    decideRuntimeLaneStart(policy, lane.lane, {
      userActive,
      activeByLane: {},
      queuedByLane: {},
    })
  )
  const npuLabel =
    policy.npuSignal === 'webnn-available'
      ? 'WebNN present'
      : policy.npuSignal === 'native-runtime-available'
        ? localBridge?.acceleratorLabel ?? 'Native runtime connected'
      : policy.npuSignal === 'native-required'
        ? 'Native app can probe'
        : 'Not detectable'
  const bridgeTone =
    localBridge?.connection === 'connected'
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
      : localBridge?.connection === 'stale'
        ? 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
        : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] text-[var(--aethel-text-secondary)]'
  const bridgeLabel =
    localBridge?.connection === 'connected'
      ? 'Local bridge connected'
      : localBridge?.connection === 'stale'
        ? 'Local bridge stale'
        : 'Browser-only'
  const effectiveCoreCount =
    localBridge?.connection === 'connected'
      ? localBridge.report?.cpuCores ?? signals.hardwareConcurrency
      : signals.hardwareConcurrency
  const effectiveMemoryGb =
    localBridge?.connection === 'connected'
      ? localBridge.report?.memoryGb ?? signals.deviceMemoryGb
      : signals.deviceMemoryGb
  const gpuComputeLabel =
    localBridge?.connection === 'connected'
      ? localBridge.report?.gpuComputeAvailable
        ? 'Native GPU compute'
        : signals.webgpuAvailable
          ? 'WebGPU available'
          : 'Fallback'
      : signals.webgpuAvailable
        ? 'WebGPU available'
        : 'Fallback'
  const storageLabel =
    localBridge?.connection === 'connected'
      ? formatFreeStorage(localBridge.report?.freeStorageGb)
      : formatStorage(signals.storageQuotaGb, signals.storageUsageGb)

  const facts = [
    {
      label: 'AI accelerator',
      value: npuLabel,
      icon: <Zap className="h-3.5 w-3.5" />,
    },
    {
      label: 'GPU compute',
      value: gpuComputeLabel,
      icon: <Gauge className="h-3.5 w-3.5" />,
    },
    {
      label: 'CPU/RAM',
      value: `${effectiveCoreCount ?? 'Unknown'} cores / ${formatMemory(effectiveMemoryGb)}`,
      icon: <Cpu className="h-3.5 w-3.5" />,
    },
    {
      label: 'Memory store',
      value: storageLabel,
      icon: <HardDrive className="h-3.5 w-3.5" />,
    },
  ]

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(180deg,rgba(15,23,42,0.76),rgba(8,10,16,0.96))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.28)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Device guard</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">
            Keep agents fast without freezing the device.
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {policy.safetySummary}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${modeTone[policy.mode]}`}>
          {modeLabels[policy.mode]}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
            userActive
              ? 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
              : 'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
          }`}
        >
          {userActive ? 'Protection active' : 'Background window open'}
        </span>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">
          {userActive
            ? 'Studio is prioritizing visible interaction and holding pauseable background work.'
            : 'Background lanes can scale back up when the device is idle.'}
        </span>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${bridgeTone}`}>
          {bridgeLabel}
        </span>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">
          {localBridge?.connection === 'connected'
            ? `${localBridge.executorLabel} - last sync ${formatBridgeAge(localBridge.ageMs)}`
            : localBridge?.connection === 'stale'
              ? `Last native probe ${formatBridgeAge(localBridge.ageMs)}`
              : 'Studio Local can attach a native probe when the desktop runtime is present.'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="rounded-[20px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-3 py-3"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
              {fact.icon}
              {fact.label}
            </div>
            <div className="mt-2 text-sm font-medium text-[var(--aethel-text-primary)]">{fact.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--aethel-text-primary)]">
            <ShieldCheck className="h-4 w-4 text-[var(--aethel-success-light)]" />
            Runtime policy
          </div>
          <div className="mt-3 grid gap-2 text-xs text-[var(--aethel-text-secondary)] sm:grid-cols-2">
            <span>Agents: {policy.maxParallelAgents}</span>
            <span>Viewport: {policy.viewportQuality}</span>
            <span>Local models: {policy.localModelPolicy.replace(/-/g, ' ')}</span>
            <span>Memory: {policy.memoryPolicy.replace(/-/g, ' ')}</span>
          </div>
        </div>

        <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-4">
          <p className="text-xs leading-5 text-[var(--aethel-text-secondary)]">
            {localBridge?.summary ??
              'Studio Local should run native NPU/GPU probes and isolate heavy jobs. Web stays responsive and never assumes NPU access blindly.'}
          </p>
          {onRequestLocalProbe ? (
            <button
              type="button"
              onClick={onRequestLocalProbe}
              className={`mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-4 py-2 text-sm font-semibold text-[var(--aethel-info-light)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
            >
              {localBridge?.connection === 'connected' ? 'Refresh local probe' : 'Request local probe'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Lane scheduler</p>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">
            Backpressure keeps heavy work away from the UI thread.
          </p>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          {laneBudgets.map((lane, index) => (
            <div
              key={lane.lane}
              className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] px-3 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[var(--aethel-text-primary)]">{lane.label}</div>
                <div
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    laneDecisions[index]?.canStart
                      ? 'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
                      : 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
                  }`}
                >
                  {laneDecisions[index]?.canStart ? 'ready' : 'held'}
                </div>
              </div>
              <div className="mt-2 text-[11px] leading-5 text-[var(--aethel-text-secondary)]">
                {lane.maxConcurrent} concurrent / {lane.placement.replace(/-/g, ' ')}
              </div>
              <div className="mt-2 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
                {laneDecisions[index]?.reason}
              </div>
              {lane.pauseWhenUserActive || lane.requiresConfirmation ? (
                <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-warning-light)]">
                  {lane.requiresConfirmation ? 'confirm' : 'pauses on input'}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DeviceRuntimeGuardCard
