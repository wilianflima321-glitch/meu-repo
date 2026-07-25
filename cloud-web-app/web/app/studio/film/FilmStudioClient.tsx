'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'

import { CreativeWorkbenchShell } from '@/components/studio/CreativeWorkbenchShell'
import StudioEngineModuleMiniPanel from '@/components/studio/StudioEngineModuleMiniPanel'
import { RenderQueueDashboard } from '@/components/assets/RenderQueueDashboard'
import { AssetBrowserPanel } from '@/components/studio/AssetBrowserPanel'
import {
  getGroupTools,
  resolveActiveTool,
  buildToolEvidence,
  GROUP_CONFIG,
} from '@/lib/studio/studio-registry'
import { CreativeStudioLoading } from '../CreativeStudioShell'

// --- Dynamic tool imports -----------------------------------------------------
const DirectorMode = dynamic(() => import('@/components/nexus/DirectorMode'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Director Mode" />,
})

const VideoTimelineEditor = dynamic(() => import('@/components/video/VideoTimelineEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Film Timeline" />,
})

const SoundCueEditor = dynamic(() => import('@/components/audio/SoundCueEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Audio Studio" />,
})

const CloudStreamStudioClient = dynamic(() => import('../cinematic/CloudStreamStudioClient'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Cloud Review" />,
})

// --- Film-specific engine module status panel ---------------------------------
const FILM_ENGINE_MODULES = ['cutscene-system', 'dialogue-cutscene-system', 'capture-system'] as const

function FilmEnginePanel() {
  return (
    <StudioEngineModuleMiniPanel
      title="Film systems"
      moduleIds={FILM_ENGINE_MODULES}
      className="rounded-xl border border-[var(--aethel-border-subtle)]"
    />
  )
}

// --- Tool picker (outliner slot) ----------------------------------------------
function FilmToolPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  const tools = getGroupTools('Film')
  return (
    <div className="flex flex-col gap-1">
      {tools.map((tool) => {
        const active = tool.id === selectedId
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelect(tool.id)}
            title={tool.description}
            className={[
              'flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]',
              active
                ? 'border-[color-mix(in_srgb,var(--aethel-primary)_36%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)]'
                : 'border-transparent hover:border-[var(--aethel-border-subtle)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]',
            ].join(' ')}
          >
            <span className={['block text-[12px] font-semibold', active ? 'text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-primary)]'].join(' ')}>
              {tool.label}
            </span>
            <span className="shrink-0 rounded-full border border-[var(--aethel-border-subtle)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-quaternary)]">
              {tool.maturity}
            </span>
          </button>
        )
      })}

      {/* Engine module status - honest, not a claim */}
      <div className="mt-3">
        <FilmEnginePanel />
      </div>
    </div>
  )
}

// --- Audio inspector (inspector slot when audio tool is active) ---------------
function AudioMixInspector() {
  return (
    <div className="space-y-2 p-1 text-[11px] text-[var(--aethel-text-secondary)]">
      <p className="font-semibold text-[var(--aethel-text-primary)]">Mix settings</p>
      {[['Master', '-0.3 dB'], ['SFX bus', '-6.0 dB'], ['Music bus', '-12.0 dB'], ['Dialogue', '-2.5 dB']].map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-2 border-b border-[var(--aethel-border-subtle)] pb-1 last:border-b-0">
          <span className="text-[var(--aethel-text-tertiary)]">{k}</span>
          <span className="font-mono text-[var(--aethel-text-primary)]">{v}</span>
        </div>
      ))}
      <p className="pt-1 text-[10px] text-[var(--aethel-text-quaternary)]">Preview mix. Final pass remains gated.</p>
    </div>
  )
}

// --- Film primary action ------------------------------------------------------
function FilmPrimaryAction() {
  return (
    <button
      type="button"
      disabled
      title="Export is held until render, provenance, cost, and human review receipts exist."
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-warning)] disabled:cursor-not-allowed"
    >
      Export held
    </button>
  )
}

// --- Component ----------------------------------------------------------------
export default function FilmStudioClient() {
  const router = useRouter()
  const searchParams  = useSearchParams()
  const toolParam     = searchParams?.get('tool') ?? null
  const activeTool    = resolveActiveTool('Film', toolParam)
  const { mode, title, activeHref } = GROUP_CONFIG.Film

  const onSelectTool = (id: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tool', id)
    router.replace(`${url.pathname}${url.search}`, { scroll: false })
  }
  // -- Viewport: director or cloud review ----------------------------------
  const viewport = activeTool.id === 'cinematic' ? (
    <Suspense fallback={<CreativeStudioLoading label="Cloud Review" />}>
      <CloudStreamStudioClient embedded />
    </Suspense>
  ) : (
    <Suspense fallback={<CreativeStudioLoading label="Director Mode" />}>
      <DirectorMode />
    </Suspense>
  )

  // -- Timeline slot (video timeline editor - always available in film) -----
  const timeline = (
    <Suspense fallback={<CreativeStudioLoading label="Film Timeline" />}>
      <VideoTimelineEditor />
    </Suspense>
  )

  // -- Inspector slot: audio mix when audio tool, generic otherwise ---------
  const inspector = activeTool.id === 'audio' ? (
    <Suspense fallback={<CreativeStudioLoading label="Audio Studio" />}>
      <SoundCueEditor />
    </Suspense>
  ) : (
    <AudioMixInspector />
  )

  return (
    <CreativeWorkbenchShell
      title={title}
      mode={mode}
      primaryAction={<FilmPrimaryAction />}
      evidence={buildToolEvidence(activeTool)}
      outliner={
        <FilmToolPicker
          selectedId={activeTool.id}
          onSelect={onSelectTool}
        />
      }
      viewport={viewport}
      timeline={timeline}
      inspector={inspector}
      renderQueue={<RenderQueueDashboard />}
      assetBrowser={<AssetBrowserPanel />}
    />
  )
}
