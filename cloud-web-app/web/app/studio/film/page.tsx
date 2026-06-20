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

// Lazy-load the director tool (Film group primary tool)
// Lazy-load the director tool (Film group primary tool)
const DirectorMode = () => (
  <div className="flex h-full flex-col items-center justify-center bg-[var(--aethel-surface-primary)] p-8 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)]">
      <svg className="h-8 w-8 text-[var(--aethel-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h3 className="mb-2 text-lg font-semibold text-[var(--aethel-text-primary)]">Director Mode Held</h3>
    <p className="max-w-md text-sm text-[var(--aethel-text-secondary)]">
      The advanced timeline and camera control features are temporarily held until the new Native Desktop bindings (wgpu) are finalized.
    </p>
  </div>
)

// --- Film Outliner: shot list -------------------------------------------------
function FilmOutliner() {
  return (
    <div className="space-y-1 text-[11px]">
      <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
        Shot list
      </p>
      {[
        { label: 'Act_01',      depth: 0, status: 'done'    },
        { label: 'Shot_01_A',   depth: 1, status: 'done'    },
        { label: 'Shot_01_B',   depth: 1, status: 'active'  },
        { label: 'Act_02',      depth: 0, status: 'active'  },
        { label: 'Shot_02_A',   depth: 1, status: 'active'  },
        { label: 'Shot_02_B',   depth: 1, status: 'pending' },
        { label: 'Act_03',      depth: 0, status: 'held'    },
      ].map(({ label, depth, status }) => (
        <div
          key={label}
          className={[
            'rounded-md px-2 py-1 font-mono text-[10px] transition-colors',
            status === 'active'  ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]' : '',
            status === 'done'    ? 'text-[var(--aethel-text-tertiary)] line-through' : '',
            status === 'pending' ? 'text-[var(--aethel-text-secondary)]' : '',
            status === 'held'    ? 'text-[var(--aethel-warning-light)]' : '',
          ].join(' ')}
          style={{ paddingLeft: `${8 + depth * 10}px` }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

// --- Film Inspector: shot properties ------------------------------------------
function FilmInspector() {
  return (
    <div className="space-y-2 text-[11px]">
      <p className="font-semibold text-[var(--aethel-text-primary)]">Shot_01_B</p>
      {[
        ['Duration',   '3.4 s'],
        ['Camera',     'CAM_02_Close'],
        ['Lens',       '85mm'],
        ['Actors',     'Hero, Villain'],
        ['Continuity', 'Needs review'],
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
function FilmPrimaryAction() {
  return (
    <button
      type="button"
      disabled
      title="Film export is held until continuity, shot, and render receipts are submitted."
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-warning)] disabled:cursor-not-allowed"
    >
      Export held
    </button>
  )
}

// --- Page --------------------------------------------------------------------
export default function FilmStudioPage() {
  const tools = getGroupTools('Film')
  const activeTool = resolveActiveTool('Film', tools[0]?.id ?? null)
  const { mode, title } = GROUP_CONFIG.Film

  return (
    <CreativeWorkbenchShell
      title={title}
      mode={mode}
      primaryAction={<FilmPrimaryAction />}
      evidence={buildToolEvidence(activeTool)}
      outliner={<FilmOutliner />}
      inspector={<FilmInspector />}
      viewport={
        <Suspense fallback={<CreativeStudioLoading label="Film Studio" />}>
          <DirectorMode />
        </Suspense>
      }
    />
  )
}
