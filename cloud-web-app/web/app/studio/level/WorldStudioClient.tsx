'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'

import { CreativeWorkbenchShell } from '@/components/studio/CreativeWorkbenchShell'
import { RenderQueueDashboard } from '@/components/assets/RenderQueueDashboard'
import { AssetBrowserPanel } from '@/components/studio/AssetBrowserPanel'
import { WorldSceneOutliner, type SceneNode } from '@/components/studio/WorldSceneOutliner'
import { WorldObjectInspector } from '@/components/studio/WorldObjectInspector'
import { buildLevelSceneTree, useLevelEditorStore } from '@/lib/studio/level-editor-store'
import {
  getGroupTools,
  resolveActiveTool,
  buildToolEvidence,
  GROUP_CONFIG,
  type StudioTool,
} from '@/lib/studio/studio-registry'
import { CreativeStudioLoading } from '../CreativeStudioShell'

const LevelEditor = dynamic(() => import('@/components/engine/LevelEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Level Studio" />,
})
const SceneEditor = dynamic(() => import('@/components/scene-editor/SceneEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Scene Studio" />,
})
const MaterialEditor = dynamic(() => import('@/components/materials/MaterialEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Material Studio" />,
})
const TerrainSculptingEditor = dynamic(() => import('@/components/terrain/TerrainSculptingEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Terrain Studio" />,
})
const LandscapeEditor = dynamic(() => import('@/components/engine/LandscapeEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Landscape Studio" />,
})
const FoliagePainter = dynamic(() => import('@/components/environment/FoliagePainter'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Foliage Studio" />,
})
const WaterEditor = dynamic(() => import('@/components/environment/WaterEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Water Studio" />,
})
const GenerateWorldForgePanel = dynamic(
  () => import('@/components/world/GenerateWorldForgePanel'),
  { ssr: false, loading: () => <CreativeStudioLoading label="Generate world…" /> },
)

function LevelEditorEmbedded() {
  return <LevelEditor embedded />
}

const TOOL_VIEWPORTS: Record<string, React.ComponentType> = {
  level: LevelEditorEmbedded,
  scene: SceneEditor,
  material: MaterialEditor,
  terrain: TerrainSculptingEditor,
  landscape: LandscapeEditor,
  foliage: FoliagePainter,
  water: WaterEditor,
  'gen-world': GenerateWorldForgePanel,
}

const MATURITY_STYLE: Record<string, { cls: string; dot: string }> = {
  stable:       { cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25', dot: 'bg-emerald-400' },
  beta:         { cls: 'text-cyan-400    bg-cyan-400/10    border-cyan-400/25',    dot: 'bg-cyan-400'    },
  experimental: { cls: 'text-amber-400   bg-amber-400/10   border-amber-400/25',   dot: 'bg-amber-400'   },
  preview:      { cls: 'text-[var(--aethel-accent)] bg-[color-mix(in_srgb,var(--aethel-accent)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-accent)_25%,transparent)]', dot: 'bg-[var(--aethel-accent)]' },
}

function WorldToolPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  const tools = getGroupTools('World')
  return (
    <div className="flex flex-col gap-1 p-1">
      {tools.map((tool) => {
        const active = tool.id === selectedId
        const maturity = (tool.maturity ?? 'stable').toLowerCase()
        const mStyle = MATURITY_STYLE[maturity] ?? MATURITY_STYLE.stable
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
                ? 'border-[color-mix(in_srgb,var(--aethel-neon-cyan)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_6%,transparent)] shadow-[0_0_12px_color-mix(in_srgb,var(--aethel-neon-cyan)_8%,transparent)]'
                : 'border-transparent hover:border-[var(--aethel-border-subtle)] hover:bg-[var(--aethel-surface-secondary)]',
            ].join(' ')}
          >
            {/* Active glow strip */}
            {active && (
              <span
                className="pointer-events-none absolute left-0 inset-y-0 w-0.5 rounded-full bg-[var(--aethel-neon-cyan)] shadow-[0_0_6px_color-mix(in_srgb,var(--aethel-neon-cyan)_60%,transparent)]"
                aria-hidden
              />
            )}

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={[
                'block truncate text-[12px] font-semibold tracking-tight transition-colors',
                active ? 'text-[var(--aethel-neon-cyan)]' : 'text-[var(--aethel-text-primary)] group-hover:text-[var(--aethel-text-primary)]',
              ].join(' ')}>
                {tool.label}
              </span>
              {tool.description && (
                <span className="truncate text-[10px] text-[var(--aethel-text-quaternary)]">
                  {tool.description}
                </span>
              )}
            </span>

            <span className={`flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${mStyle.cls}`}>
              <span className={`h-1 w-1 rounded-full ${mStyle.dot}`} aria-hidden />
              {maturity}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function WorldInspector({ tool }: { tool: StudioTool }) {
  const maturity = (tool.maturity ?? 'stable').toLowerCase()
  const mStyle = MATURITY_STYLE[maturity] ?? MATURITY_STYLE.stable
  return (
    <div className="space-y-3 p-1 text-[11px]">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-[var(--aethel-text-primary)]">{tool.label}</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${mStyle.cls}`}>
          {maturity}
        </span>
      </div>
      <p className="leading-relaxed text-[var(--aethel-text-secondary)]">{tool.description}</p>
      <div className="rounded-xl border border-[var(--aethel-glass-border)] bg-[var(--aethel-surface-secondary)]/60 px-3 py-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">Active Tool</p>
        <p className="mt-0.5 font-mono text-[10px] text-[var(--aethel-neon-cyan)]">{tool.id}</p>
      </div>
    </div>
  )
}

function WorldPrimaryAction() {
  return (
    <button
      type="button"
      disabled
      title="Level cook is held until lighting, spawn, and streaming receipts are submitted."
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-80 disabled:cursor-not-allowed"
    >
      Cook held
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
    <div
      className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center"
      aria-live="polite"
    >
      <span
        className="rounded-full border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-elevated)_90%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-neon-cyan)] shadow-[0_0_16px_color-mix(in_srgb,var(--aethel-neon-cyan)_12%,transparent)]"
        style={{ backdropFilter: 'blur(12px)', animation: 'fadeOut 2s ease-out forwards' }}
      >
        {label}
      </span>
    </div>
  )
}

function WorldStudioViewport({ toolId, activeTool }: { toolId: string; activeTool: StudioTool }) {
  const Viewport = TOOL_VIEWPORTS[toolId] ?? LevelEditorEmbedded
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
      <Suspense fallback={<CreativeStudioLoading label="World Studio" />}>
        <Viewport />
      </Suspense>
    </div>
  )
}

export default function WorldStudioClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toolParam = searchParams?.get('tool') ?? null
  const activeTool = resolveActiveTool('World', toolParam)
  const { mode, title } = GROUP_CONFIG.World

  // Scene selection state shared between Outliner and Inspector
  const [selectedNode, setSelectedNode] = useState<SceneNode | null>(null)

  // R7 (AAA Studio Deepening Sweep) — only the `level` tool has a real,
  // shared backing store today (`useLevelEditorStore`, lifted out of
  // `LevelEditor.tsx`). Other World Studio tools (scene/terrain/foliage/etc.)
  // still keep their scene state fully local, so the outliner honestly stays
  // in its empty state for them rather than showing stale or fabricated data.
  const isLevelTool = activeTool.id === 'level'
  const levelObjects = useLevelEditorStore((state) => state.objects)
  const levelSelectedId = useLevelEditorStore((state) => state.selectedId)
  const setLevelSelectedId = useLevelEditorStore((state) => state.setSelectedId)
  const duplicateLevelObject = useLevelEditorStore((state) => state.duplicateObject)
  const deleteLevelObject = useLevelEditorStore((state) => state.deleteObject)

  const sceneTree = useMemo(
    () => (isLevelTool ? buildLevelSceneTree(levelObjects, 'Main Level') : null),
    [isLevelTool, levelObjects],
  )

  // Keep the shell's selection (drives the inspector + outliner highlight)
  // in sync with the level store, whichever surface changed it first —
  // the outliner, the `aethel:scene-focus` DOM event, or a duplicate/delete.
  useEffect(() => {
    if (!isLevelTool) return
    if (!levelSelectedId) {
      setSelectedNode(null)
      return
    }
    const match = levelObjects.find((object) => object.id === levelSelectedId)
    setSelectedNode(
      match
        ? {
            id: match.id,
            name: match.name,
            type: match.type === 'light' || match.type === 'camera' ? match.type : 'mesh',
            visible: match.visible,
            locked: match.locked,
          }
        : null,
    )
  }, [isLevelTool, levelSelectedId, levelObjects])

  const onSelectTool = (id: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tool', id)
    router.replace(`${url.pathname}${url.search}`, { scroll: false })
  }

  const handleNodeSelect = useCallback((node: SceneNode) => {
    setSelectedNode(node)
    if (isLevelTool) setLevelSelectedId(node.id === 'world-root' ? null : node.id)
  }, [isLevelTool, setLevelSelectedId])

  const handleNodeFocus = useCallback((_node: SceneNode) => {
    // Viewport can subscribe to a context or event to frame the selected object.
    // Emitting a custom DOM event allows the R3F canvas to react without prop drilling.
    window.dispatchEvent(new CustomEvent('aethel:scene-focus', { detail: { nodeId: _node.id } }))
  }, [])

  const handleDuplicateNode = useCallback((node: SceneNode) => {
    if (!isLevelTool || node.id === 'world-root') return
    duplicateLevelObject(node.id)
  }, [isLevelTool, duplicateLevelObject])

  const handleDeleteNode = useCallback((node: SceneNode) => {
    if (!isLevelTool || node.id === 'world-root') return
    deleteLevelObject(node.id)
  }, [isLevelTool, deleteLevelObject])

  return (
    <CreativeWorkbenchShell
      title={title}
      mode={mode}
      primaryAction={<WorldPrimaryAction />}
      evidence={buildToolEvidence(activeTool)}
      outliner={
        <WorldSceneOutliner
          initialTree={sceneTree}
          selectedId={selectedNode?.id ?? null}
          onSelect={handleNodeSelect}
          onFocus={handleNodeFocus}
          onDuplicateNode={isLevelTool ? handleDuplicateNode : undefined}
          onDeleteNode={isLevelTool ? handleDeleteNode : undefined}
        />
      }
      inspector={
        <WorldObjectInspector
          node={selectedNode}
          onTransformChange={(t) => {
            // Dispatch to viewport via custom event so the physics/scene adapter can apply it
            window.dispatchEvent(new CustomEvent('aethel:transform-change', {
              detail: { nodeId: selectedNode?.id, transform: t },
            }))
          }}
        />
      }
      viewport={<WorldStudioViewport toolId={activeTool.id} activeTool={activeTool} />}
      renderQueue={<RenderQueueDashboard />}
      assetBrowser={<AssetBrowserPanel />}
    />
  )
}
