import type { ElementType } from 'react'
import { Activity, Cpu, Globe, HardDrive } from 'lucide-react'

import type { InfrastructureData } from './infrastructure-types'

function ResourceGauge({
  label,
  value,
  max,
  unit,
  icon: Icon,
  warning = 70,
  critical = 90,
}: {
  label: string
  value: number
  max?: number
  unit: string
  icon: ElementType
  warning?: number
  critical?: number
}) {
  const percentage = max ? (value / max) * 100 : value
  const color = percentage >= critical ? 'text-[var(--aethel-error)]' : percentage >= warning ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-success)]'
  const barColor = percentage >= critical ? 'bg-[var(--aethel-error)]' : percentage >= warning ? 'bg-[var(--aethel-warning)]' : 'bg-[var(--aethel-success)]'

  return (
    <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
          <span className="text-sm text-[var(--aethel-text-tertiary)]">{label}</span>
        </div>
        <span className={`text-lg font-bold ${color}`}>{percentage.toFixed(1)}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--aethel-surface-quaternary)]">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>

      {max ? <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">{value.toFixed(1)} / {max.toFixed(1)} {unit}</p> : null}
    </div>
  )
}

function NetworkCard({ network }: { network: InfrastructureData['resources']['network'] }) {
  return (
    <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Globe className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
        <span className="text-sm text-[var(--aethel-text-tertiary)]">Network I/O</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Input</p>
          <p className="text-sm font-medium text-[var(--aethel-success)]">{(network.in / 1024 / 1024).toFixed(1)} MB/s</p>
        </div>
        <div>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Output</p>
          <p className="text-sm font-medium text-[var(--aethel-primary-light)]">{(network.out / 1024 / 1024).toFixed(1)} MB/s</p>
        </div>
      </div>
    </div>
  )
}

export function InfrastructureResources({ resources }: { resources: InfrastructureData['resources'] }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-medium text-[var(--aethel-text-tertiary)]">Resources</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ResourceGauge label="CPU" value={resources.cpu.usage} unit="%" icon={Cpu} />
        <ResourceGauge label="Memory" value={resources.memory.used} max={resources.memory.total} unit="GB" icon={Activity} />
        <ResourceGauge label="Disk" value={resources.disk.used} max={resources.disk.total} unit="GB" icon={HardDrive} />
        <NetworkCard network={resources.network} />
      </div>
    </div>
  )
}
