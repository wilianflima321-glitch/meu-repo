import { Suspense } from 'react'
import dynamic from 'next/dynamic'

import { CreativeWorkbenchShell } from '@/components/studio/CreativeWorkbenchShell'
import {
  resolveActiveTool,
  buildToolEvidence,
  GROUP_CONFIG,
  getGroupTools,
} from '@/lib/studio/studio-registry'
import { CreativeStudioLoading } from '../CreativeStudioShell'

const NiagaraVFX = dynamic(() => import('@/components/engine/NiagaraVFX'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="VFX Studio" />,
})

// --- FX Outliner: emitter tree ------------------------------------------------
function FXOutliner() {
  return (
    <div className="space-y-1 text-[11px]">
      <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
        Emitter stack
      </p>
      {[
        { label: 'FX_System',       depth: 0, status: 'active'  },
        { label: 'Emitter_Base',    depth: 1, status: 'active'  },
        { label: 'Burst_Module',    depth: 2, status: 'done'    },
        { label: 'Velocity_Module', depth: 2, status: 'active'  },
        { label: 'Emitter_Trail',   depth: 1, status: 'pending' },
        { label: 'Color_Over_Life', depth: 2, status: 'pending' },
      ].map(({ label, depth, status }) => (
        <div
          key={label}
          className={[
            'rounded-md px-2 py-1 font-mono text-[10px] transition-colors',
            status === 'active'  ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]' : '',
            status === 'done'    ? 'text-[var(--aethel-text-tertiary)] line-through' : '',
            status === 'pending' ? 'text-[var(--aethel-text-secondary)]' : '',
          ].join(' ')}
          style={{ paddingLeft: `${8 + depth * 10}px` }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

// --- FX Inspector: emitter properties ----------------------------------------
function FXInspector() {
  return (
    <div className="space-y-2 text-[11px]">
      <p className="font-semibold text-[var(--aethel-text-primary)]">Emitter_Base</p>
      {[
        ['Spawn rate',  '60 / sec'],
        ['Lifetime',    '1.2 s'],
        ['Velocity',    '150 cm/s'],
        ['Spread',      '45°'],
        ['GPU sim',     'On'],
      ].map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 border-b border-[var(--aethel-border-subtle)] pb-1.5 last:border-0">
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--aethel-text-quaternary)]">{k}</span>
          <span className="font-mono text-[var(--aethel-text-primary)]">{v}</span>
        </div>
      ))}
    </div>
  )
}

// --- Primary action -----------------------------------------------------------
function VFXPrimaryAction() {
  return (
    <button
      type="button"
      disabled
      title="VFX bake is held until performance and readability receipts are submitted."
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-warning)] disabled:cursor-not-allowed"
    >
      Bake held
    </button>
  )
}

// --- Page --------------------------------------------------------------------
export default function FxStudioPage() {
  const tools = getGroupTools('FX')
  const activeTool = resolveActiveTool('FX', tools[0]?.id ?? null)
  const { mode, title } = GROUP_CONFIG.FX

  return (
    <CreativeWorkbenchShell
      title={title}
      mode={mode}
      primaryAction={<VFXPrimaryAction />}
      evidence={buildToolEvidence(activeTool)}
      outliner={<FXOutliner />}
      inspector={<FXInspector />}
      viewport={
        <Suspense fallback={<CreativeStudioLoading label="VFX Studio" />}>
          <NiagaraVFX />
        </Suspense>
      }
    />
  )
}
