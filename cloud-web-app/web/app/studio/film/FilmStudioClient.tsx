'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import StudioEngineModuleMiniPanel from '@/components/studio/StudioEngineModuleMiniPanel'
import CreativeStudioShell, { CreativeStudioLoading } from '../CreativeStudioShell'

const DirectorMode = dynamic(() => import('@/components/nexus/DirectorMode'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Director Mode" />,
})

const VideoTimelineEditor = dynamic(() => import('@/components/video/VideoTimelineEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Film Timeline" />,
})

const FILM_ENGINE_MODULES = ['cutscene-system', 'dialogue-cutscene-system', 'capture-system'] as const
const FILM_MODES = [
  { id: 'director', label: 'Director Mode', description: 'Story, shots, continuity' },
  { id: 'timeline', label: 'Timeline', description: 'Edit, layers, timing' },
] as const

type FilmMode = (typeof FILM_MODES)[number]['id']

function modeButtonClass(active: boolean): string {
  return active
    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_44%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
    : 'border-transparent text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-secondary)]'
}

export default function FilmStudioClient() {
  const [mode, setMode] = useState<FilmMode>('director')

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
          {FILM_MODES.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`${modeButtonClass(mode === item.id)} mb-2 w-full rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors`}
            >
              {item.label}
              <span className="mt-1 block text-[10px] font-normal text-[var(--aethel-text-tertiary)]">
                {item.description}
              </span>
            </button>
          ))}
          <StudioEngineModuleMiniPanel title="Film systems" moduleIds={FILM_ENGINE_MODULES} className="mt-3 rounded-2xl border border-[var(--aethel-border-subtle)]" />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-2 md:hidden">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-1">
              {FILM_MODES.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`${modeButtonClass(mode === item.id)} rounded-xl border px-3 py-2 text-xs font-semibold transition-colors`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {mode === 'director' ? <DirectorMode /> : <VideoTimelineEditor />}
          </div>
        </div>
      </div>
    </CreativeStudioShell>
  )
}
