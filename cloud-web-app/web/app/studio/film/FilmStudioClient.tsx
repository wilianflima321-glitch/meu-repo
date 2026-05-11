'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const DirectorMode = dynamic(() => import('@/components/nexus/DirectorMode'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Director Mode" />,
})

const VideoTimelineEditor = dynamic(() => import('@/components/video/VideoTimelineEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Film Timeline" />,
})

function modeButtonClass(active: boolean): string {
  return active
    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_44%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
    : 'border-transparent text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-secondary)]'
}

export default function FilmStudioClient() {
  const [mode, setMode] = useState<'director' | 'timeline'>('director')

  return (
    <CreativeStudioShell
      title="Film Studio"
      subtitle="Director review, continuity, timeline, and render planning in one focused mode."
      activeHref="/studio/film"
    >
      <div className="flex h-full overflow-hidden bg-[var(--aethel-surface-primary)]">
        <aside className="hidden w-56 shrink-0 border-r border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] p-3 md:block">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            Film modes
          </p>
          <button
            type="button"
            onClick={() => setMode('director')}
            className={`${modeButtonClass(mode === 'director')} mb-2 w-full rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors`}
          >
            Director Mode
            <span className="mt-1 block text-[10px] font-normal text-[var(--aethel-text-tertiary)]">
              Story, shots, continuity
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('timeline')}
            className={`${modeButtonClass(mode === 'timeline')} w-full rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors`}
          >
            Timeline
            <span className="mt-1 block text-[10px] font-normal text-[var(--aethel-text-tertiary)]">
              Edit, layers, timing
            </span>
          </button>
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden">
          {mode === 'director' ? <DirectorMode /> : <VideoTimelineEditor />}
        </div>
      </div>
    </CreativeStudioShell>
  )
}
