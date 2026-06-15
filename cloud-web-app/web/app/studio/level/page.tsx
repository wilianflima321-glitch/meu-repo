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

const LevelEditor = dynamic(() => import('@/components/engine/LevelEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Level Studio" />,
})

// --- World Outliner: scene hierarchy ------------------------------------------
function WorldOutliner() {
  return (
    <div className="space-y-1 text-[11px]">
      <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
        Scene hierarchy
      </p>
      {[
        { label: 'World_Root',     depth: 0, status: 'active'  },
        { label: 'Zone_A',         depth: 1, status: 'active'  },
        { label: 'Terrain_Base',   depth: 2, status: 'done'    },
        { label: 'StreamRegion_01',depth: 2, status: 'active'  },
        { label: 'Lighting_Setup', depth: 2, status: 'pending' },
        { label: 'Zone_B',         depth: 1, status: 'pending' },
        { label: 'SpawnPoints',    depth: 2, status: 'pending' },
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

// --- World Inspector: transform properties ------------------------------------
function WorldInspector() {
  return (
    <div className="space-y-2 text-[11px]">
      <p className="font-semibold text-[var(--aethel-text-primary)]">StreamRegion_01</p>
      {[
        ['Type',       'Streaming region'],
        ['Extents X',  '2048 m'],
        ['Extents Y',  '2048 m'],
        ['LOD bias',   '0'],
        ['Culling',    'Distance (512 m)'],
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
function LevelPrimaryAction() {
  return (
    <button
      type="button"
      disabled
      title="Level cook is held until lighting, spawn, and streaming receipts are submitted."
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-warning)] disabled:cursor-not-allowed"
    >
      Cook held
    </button>
  )
}

// --- Page --------------------------------------------------------------------
export default function WorldStudioPage() {
  const tools = getGroupTools('World')
  const activeTool = resolveActiveTool('World', tools[0]?.id ?? null)
  const { mode, title } = GROUP_CONFIG.World

  return (
    <CreativeWorkbenchShell
      title={title}
      mode={mode}
      primaryAction={<LevelPrimaryAction />}
      evidence={buildToolEvidence(activeTool)}
      outliner={<WorldOutliner />}
      inspector={<WorldInspector />}
      viewport={
        <Suspense fallback={<CreativeStudioLoading label="Level Studio" />}>
          <LevelEditor />
        </Suspense>
      }
    />
  )
}
