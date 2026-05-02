'use client'

import { Cpu, Gauge, HardDrive, ShieldCheck, Zap } from 'lucide-react'

import type { DeviceCapabilityProfile, DeviceRuntimeMode } from '@/lib/device/device-capability-profile'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

type DeviceRuntimeGuardCardProps = {
  profile: DeviceCapabilityProfile
  onOpenStudioLocal?: () => void
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

export function DeviceRuntimeGuardCard({ profile, onOpenStudioLocal }: DeviceRuntimeGuardCardProps) {
  const { policy, signals } = profile
  const npuLabel =
    policy.npuSignal === 'webnn-available'
      ? 'WebNN present'
      : policy.npuSignal === 'native-required'
        ? 'Native app can probe'
        : 'Not detectable'

  const facts = [
    {
      label: 'AI accelerator',
      value: npuLabel,
      icon: <Zap className="h-3.5 w-3.5" />,
    },
    {
      label: 'GPU compute',
      value: signals.webgpuAvailable ? 'WebGPU available' : 'Fallback',
      icon: <Gauge className="h-3.5 w-3.5" />,
    },
    {
      label: 'CPU/RAM',
      value: `${signals.hardwareConcurrency ?? 'Unknown'} cores · ${formatMemory(signals.deviceMemoryGb)}`,
      icon: <Cpu className="h-3.5 w-3.5" />,
    },
    {
      label: 'Memory store',
      value: formatStorage(signals.storageQuotaGb, signals.storageUsageGb),
      icon: <HardDrive className="h-3.5 w-3.5" />,
    },
  ]

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(180deg,rgba(15,23,42,0.76),rgba(8,10,16,0.96))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.28)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Device guard</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">Keep agents fast without freezing the device.</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {policy.safetySummary}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${modeTone[policy.mode]}`}>
          {modeLabels[policy.mode]}
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
            Studio Local should run native NPU/GPU probes and isolate heavy jobs. Web stays responsive and never assumes NPU access blindly.
          </p>
          {onOpenStudioLocal ? (
            <button
              type="button"
              onClick={onOpenStudioLocal}
              className={`mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-4 py-2 text-sm font-semibold text-[var(--aethel-info-light)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
            >
              Open local path
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default DeviceRuntimeGuardCard
