'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
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
  type StudioTool,
} from '@/lib/studio/studio-registry'
import { CreativeStudioLoading } from '../CreativeStudioShell'

// --- Dynamic tool imports -----------------------------------------------------
const NiagaraVFX = dynamic(() => import('@/components/engine/NiagaraVFX'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Niagara VFX" />,
})

const FluidSimulationEditor = dynamic(
  () => import('@/components/physics/FluidSimulationEditor'),
  { ssr: false, loading: () => <CreativeStudioLoading label="Fluid Simulation" /> },
)

const SpriteEditor = dynamic(() => import('@/components/editors/SpriteEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Sprite Editor" />,
})

const TOOL_VIEWPORTS: Record<string, React.ComponentType<any>> = {
  vfx: NiagaraVFX,
  fluid: FluidSimulationEditor,
  sprite: SpriteEditor,
}

const MATURITY_STYLE: Record<string, { cls: string; dot: string }> = {
  ga: { cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25', dot: 'bg-emerald-400' },
  beta: { cls: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25', dot: 'bg-cyan-400' },
  alpha: { cls: 'text-amber-400 bg-amber-400/10 border-amber-400/25', dot: 'bg-amber-400' },
}

const VFX_ENGINE_MODULES = ['niagara-particle-system', 'fluid-simulation-system', 'gpu-compute-pipeline'] as const

function VfxEnginePanel() {
  return (
    <StudioEngineModuleMiniPanel
      title="FX systems"
      moduleIds={VFX_ENGINE_MODULES}
      className="rounded-xl border border-[var(--aethel-border-subtle)]"
    />
  )
}

function VfxToolPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  const tools = getGroupTools('FX')
  return (
    <div className="flex flex-col gap-1 p-1">
      {tools.map((tool) => {
        const active = tool.id === selectedId
        const maturity = tool.maturity.toLowerCase()
        const mStyle = MATURITY_STYLE[maturity] ?? MATURITY_STYLE.alpha
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelect(tool.id)}
            title={tool.description}
            aria-pressed={active}
            className={[
              'group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]',
              active
                ? 'border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_6%,transparent)]'
                : 'border-transparent hover:border-[var(--aethel-border-subtle)] hover:bg-[var(--aethel-surface-secondary)]',
            ].join(' ')}
          >
            {active && (
              <span
                className="pointer-events-none absolute left-0 inset-y-0 w-0.5 rounded-full bg-[var(--aethel-warning)]"
                aria-hidden
              />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={[
                  'block truncate text-[12px] font-semibold tracking-tight',
                  active ? 'text-[var(--aethel-warning-light)]' : 'text-[var(--aethel-text-primary)]',
                ].join(' ')}
              >
                {tool.label}
              </span>
              {tool.description ? (
                <span className="truncate text-[10px] text-[var(--aethel-text-quaternary)]">
                  {tool.description}
                </span>
              ) : null}
            </span>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${mStyle.cls}`}
            >
              <span className={`h-1 w-1 rounded-full ${mStyle.dot}`} aria-hidden />
              {maturity}
            </span>
          </button>
        )
      })}

      <div className="mt-3">
        <VfxEnginePanel />
      </div>
    </div>
  )
}

function VfxInspector({ tool }: { tool: StudioTool }) {
  const maturity = tool.maturity.toLowerCase()
  const mStyle = MATURITY_STYLE[maturity] ?? MATURITY_STYLE.alpha
  return (
    <div className="space-y-3 p-1 text-[11px]">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-[var(--aethel-text-primary)]">{tool.label}</p>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${mStyle.cls}`}
        >
          {maturity}
        </span>
      </div>
      <p className="leading-relaxed text-[var(--aethel-text-secondary)]">{tool.description}</p>
      <div className="rounded-xl border border-[var(--aethel-glass-border)] bg-[var(--aethel-surface-secondary)]/60 px-3 py-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
          Active Tool
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-[var(--aethel-warning-light)]">{tool.id}</p>
      </div>
    </div>
  )
}

function VfxPrimaryAction() {
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

function ViewportToolBanner({ label }: { label: string }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(t)
  }, [label])
  if (!visible) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center" aria-live="polite">
      <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-elevated)_90%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-warning-light)]">
        {label}
      </span>
    </div>
  )
}

function VfxStudioViewport({ toolId, activeTool }: { toolId: string; activeTool: StudioTool }) {
  const Viewport = TOOL_VIEWPORTS[toolId] ?? NiagaraVFX
  const prevTool = useRef(toolId)
  const [bannerKey, setBannerKey] = useState(0)
  useEffect(() => {
    if (prevTool.current !== toolId) {
      prevTool.current = toolId
      setBannerKey((k) => k + 1)
    }
  }, [toolId])
  return (
    <div className="relative h-full w-full">
      <ViewportToolBanner key={bannerKey} label={activeTool.label} />
      <Suspense fallback={<CreativeStudioLoading label="VFX Studio" />}>
        <Viewport />
      </Suspense>
    </div>
  )
}

export default function VfxStudioClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toolParam = searchParams?.get('tool') ?? null
  const activeTool = resolveActiveTool('FX', toolParam)
  const { mode, title } = GROUP_CONFIG.FX

  const onSelectTool = (id: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tool', id)
    router.replace(`${url.pathname}${url.search}`, { scroll: false })
  }

  return (
    <CreativeWorkbenchShell
      title={title}
      mode={mode}
      primaryAction={<VfxPrimaryAction />}
      evidence={buildToolEvidence(activeTool)}
      outliner={<VfxToolPicker selectedId={activeTool.id} onSelect={onSelectTool} />}
      inspector={<VfxInspector tool={activeTool} />}
      viewport={<VfxStudioViewport toolId={activeTool.id} activeTool={activeTool} />}
      renderQueue={<RenderQueueDashboard />}
      assetBrowser={<AssetBrowserPanel />}
    />
  )
}
