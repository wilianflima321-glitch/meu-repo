import { Suspense } from 'react'
import { CreativeWorkbenchShell } from '@/components/studio/CreativeWorkbenchShell'
import { CreativeStudioLoading } from '../CreativeStudioShell'
import {
  resolveActiveTool,
  buildToolEvidence,
  GROUP_CONFIG,
  getGroupTools,
} from '@/lib/studio/studio-registry'

// Lazy-loaded Client Component for the actual Cinematic Stream Review
import CloudStreamStudioClient from './CloudStreamStudioClient'

// --- Cinematic Outliner: Review Sessions -------------------------------------
function CinematicOutliner() {
  return (
    <div className="space-y-1 text-[11px]">
      <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
        Review Sessions
      </p>
      {[
        { label: 'Seq_Intro_v1',   depth: 0, status: 'done'    },
        { label: 'Seq_Intro_v2',   depth: 0, status: 'active'  },
        { label: 'Combat_Test',    depth: 0, status: 'pending' },
        { label: 'Ending_Cinematic',depth: 0, status: 'held'    },
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
          style={{ paddingLeft: \`\${8 + depth * 10}px\` }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

// --- Cinematic Inspector: Stream Properties ----------------------------------
function CinematicInspector() {
  return (
    <div className="space-y-2 text-[11px]">
      <p className="font-semibold text-[var(--aethel-text-primary)]">Seq_Intro_v2</p>
      {[
        ['Resolution', '4K HDR'],
        ['Framerate',  '60 FPS'],
        ['Latency',    '< 45ms'],
        ['Codec',      'AV1'],
        ['Signaling',  'Connected'],
      ].map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 border-b border-[var(--aethel-border-subtle)] pb-1.5 last:border-0">
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--aethel-text-quaternary)]">{k}</span>
          <span className="font-mono text-[var(--aethel-text-primary)]">{v}</span>
        </div>
      ))}
    </div>
  )
}

// --- Primary Action: Launch Stream -------------------------------------------
function CinematicPrimaryAction() {
  return (
    <button
      type="button"
      disabled
      title="Cinematic Cloud Stream is held until signaling, cost, teardown, and session evidence exist."
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-warning)] disabled:cursor-not-allowed"
    >
      Stream Held
    </button>
  )
}

// --- Page --------------------------------------------------------------------
export default function CinematicStudioPage() {
  const tools = getGroupTools('Film')
  const activeTool = resolveActiveTool('Film', 'film-stream')
  const { mode, title } = GROUP_CONFIG.Film

  return (
    <CreativeWorkbenchShell
      title="Cinematic Cloud Stream"
      mode={mode}
      primaryAction={<CinematicPrimaryAction />}
      evidence={buildToolEvidence(activeTool)}
      outliner={<CinematicOutliner />}
      inspector={<CinematicInspector />}
      viewport={
        <Suspense fallback={<CreativeStudioLoading label="Cinematic Stream" />}>
          <CloudStreamStudioClient />
        </Suspense>
      }
    />
  )
}
