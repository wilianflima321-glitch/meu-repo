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
  <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)]">
    Director Mode (Nexus Deprecated)
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
