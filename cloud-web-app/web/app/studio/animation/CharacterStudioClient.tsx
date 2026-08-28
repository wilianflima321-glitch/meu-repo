'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'

import { CreativeWorkbenchShell } from '@/components/studio/CreativeWorkbenchShell'
import {
  getGroupTools,
  resolveActiveTool,
  buildToolEvidence,
  GROUP_CONFIG,
  type StudioTool,
} from '@/lib/studio/studio-registry'
import { CreativeStudioLoading } from '../CreativeStudioShell'

const AnimationBlueprint = dynamic(() => import('@/components/engine/AnimationBlueprint'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Animation Studio" />,
})
const ControlRigEditor = dynamic(() => import('@/components/character/ControlRigEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Loading Rig Editor…" />,
})
const FacialAnimationEditor = dynamic(
  () => import('@/components/character/FacialAnimationEditor'),
  { ssr: false, loading: () => <CreativeStudioLoading label="Loading Facial Editor…" /> },
)
const HairFurEditor = dynamic(() => import('@/components/character/HairFurEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Loading Hair Editor…" />,
})
const ClothSimulationEditor = dynamic(
  () => import('@/components/physics/ClothSimulationEditor'),
  { ssr: false, loading: () => <CreativeStudioLoading label="Loading Cloth Editor…" /> },
)
const DataAssetItemCreator = dynamic(
  () => import('@/components/character/DataAssetItemCreator'),
  { ssr: false, loading: () => <CreativeStudioLoading label="Loading Items…" /> },
)
const GameReadyCharacterGenerator = dynamic(
  () => import('@/components/character/GameReadyCharacterGenerator'),
  { ssr: false, loading: () => <CreativeStudioLoading label="Generate character…" /> },
)

const TOOL_VIEWPORTS: Record<string, React.ComponentType<any>> = {
  animation: AnimationBlueprint,
  rig: ControlRigEditor,
  facial: FacialAnimationEditor,
  hair: HairFurEditor,
  cloth: ClothSimulationEditor,
  items: DataAssetItemCreator,
  'game-ready-gen': GameReadyCharacterGenerator,
}

const MATURITY_STYLE: Record<string, { cls: string; dot: string }> = {
  ga: { cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25', dot: 'bg-emerald-400' },
  beta: { cls: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25', dot: 'bg-cyan-400' },
  alpha: { cls: 'text-amber-400 bg-amber-400/10 border-amber-400/25', dot: 'bg-amber-400' },
}

function CharacterToolPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  const tools = getGroupTools('Character')
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
                ? 'border-[color-mix(in_srgb,var(--aethel-neon-cyan)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_6%,transparent)]'
                : 'border-transparent hover:border-[var(--aethel-border-subtle)] hover:bg-[var(--aethel-surface-secondary)]',
            ].join(' ')}
          >
            {active && (
              <span
                className="pointer-events-none absolute left-0 inset-y-0 w-0.5 rounded-full bg-[var(--aethel-neon-cyan)]"
                aria-hidden
              />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={[
                  'block truncate text-[12px] font-semibold tracking-tight',
                  active ? 'text-[var(--aethel-neon-cyan)]' : 'text-[var(--aethel-text-primary)]',
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
    </div>
  )
}

function CharacterInspector({ tool }: { tool: StudioTool }) {
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
        <p className="mt-0.5 font-mono text-[10px] text-[var(--aethel-neon-cyan)]">{tool.id}</p>
      </div>
    </div>
  )
}

function CharacterPrimaryAction() {
  return (
    <button
      type="button"
      disabled
      title="Character export held until review receipts submitted."
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-80 disabled:cursor-not-allowed"
    >
      Export held
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
      <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-elevated)_90%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-neon-cyan)]">
        {label}
      </span>
    </div>
  )
}

function CharacterStudioViewport({ toolId, activeTool }: { toolId: string; activeTool: StudioTool }) {
  const Viewport = TOOL_VIEWPORTS[toolId] ?? AnimationBlueprint
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
      <Suspense fallback={<CreativeStudioLoading label="Character Studio" />}>
        <Viewport />
      </Suspense>
    </div>
  )
}

export default function CharacterStudioClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toolParam = searchParams?.get('tool') ?? null
  const activeTool = resolveActiveTool('Character', toolParam)
  const { mode, title } = GROUP_CONFIG.Character

  const onSelectTool = (id: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tool', id)
    router.replace(`${url.pathname}${url.search}`, { scroll: false })
  }

  return (
    <CreativeWorkbenchShell
      title={title}
      mode={mode}
      primaryAction={<CharacterPrimaryAction />}
      evidence={buildToolEvidence(activeTool)}
      outliner={
        <CharacterToolPicker selectedId={activeTool.id} onSelect={onSelectTool} />
      }
      inspector={<CharacterInspector tool={activeTool} />}
      viewport={<CharacterStudioViewport toolId={activeTool.id} activeTool={activeTool} />}
    />
  )
}
