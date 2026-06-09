'use client'

import { Suspense, type ComponentType } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { CreativeWorkbenchShell } from '@/components/studio/CreativeWorkbenchShell'
import { CreativeStudioLoading } from './CreativeStudioShell'
import {
  getGroupTools,
  resolveActiveTool,
  buildToolEvidence,
  GROUP_CONFIG,
  type StudioGroup,
  type StudioTool,
} from '@/lib/studio/studio-registry'

// --- Map: studio group URL id -> registry group --------------------------------
type StudioGroupId = 'world' | 'character' | 'fx'

const GROUP_MAP: Record<StudioGroupId, StudioGroup> = {
  world:     'World',
  character: 'Character',
  fx:        'FX',
}

// Dynamic tool imports are keyed by registry id. Every heavy editor stays lazy
// and SSR-disabled; props are normalized at the workbench boundary.
type StudioToolComponent = ComponentType<Record<string, string>>

function studioTool(loader: () => Promise<unknown>, label: string): StudioToolComponent {
  return dynamic<Record<string, string>>(
    () => loader().then((mod) => (mod as { default: StudioToolComponent }).default),
    { ssr: false, loading: () => <CreativeStudioLoading label={label} /> },
  )
}

const TOOL_COMPONENTS: Record<string, StudioToolComponent> = {
  level: studioTool(() => import('@/components/engine/LevelEditor'), 'Level Studio'),
  scene: studioTool(() => import('@/components/scene-editor/SceneEditor'), 'Scene Studio'),
  material: studioTool(() => import('@/components/materials/MaterialEditor'), 'Material Studio'),
  terrain: studioTool(() => import('@/components/terrain/TerrainSculptingEditor'), 'Terrain Studio'),
  landscape: studioTool(() => import('@/components/engine/LandscapeEditor'), 'Landscape Studio'),
  foliage: studioTool(() => import('@/components/environment/FoliagePainter'), 'Foliage Studio'),
  water: studioTool(() => import('@/components/environment/WaterEditor'), 'Water Studio'),
  animation: studioTool(() => import('@/components/engine/AnimationBlueprint'), 'Animation Studio'),
  rig: studioTool(() => import('@/components/character/ControlRigEditor'), 'Rig Studio'),
  facial: studioTool(() => import('@/components/character/FacialAnimationEditor'), 'Facial Studio'),
  hair: studioTool(() => import('@/components/character/HairFurEditor'), 'Hair Studio'),
  cloth: studioTool(() => import('@/components/physics/ClothSimulationEditor'), 'Cloth Studio'),
  vfx: studioTool(() => import('@/components/engine/NiagaraVFX'), 'VFX Studio'),
  fluid: studioTool(() => import('@/components/physics/FluidSimulationEditor'), 'Fluid Studio'),
  sprite: studioTool(() => import('@/components/editors/SpriteEditor'), 'Sprite Studio'),
}

function renderTool(tool: StudioTool) {
  const Component = TOOL_COMPONENTS[tool.id]
  if (!Component) return <CreativeStudioLoading label={`${tool.label} Studio`} />
  const props: Record<string, string> = {}
  if (tool.id === 'foliage' || tool.id === 'water') props.sceneId = 'studio-scene'
  if (['rig', 'facial', 'hair'].includes(tool.id))   props.characterId = 'studio-character'
  if (tool.id === 'cloth')                           props.meshId = 'studio-cloth'
  if (tool.id === 'fluid')                           props.volumeId = 'studio-fluid'
  return (
    <Suspense fallback={<CreativeStudioLoading label={`${tool.label} Studio`} />}>
      <Component {...props} />
    </Suspense>
  )
}

// --- Outliner: tool picker ----------------------------------------------------

function StudioToolPicker({
  tools,
  selected,
  activeHref,
}: {
  tools: StudioTool[]
  selected: StudioTool
  activeHref: string
}) {
  return (
    <div className="flex flex-col gap-1">
      {tools.map((tool) => {
        const isActive = tool.id === selected.id
        return (
          <Link
            key={tool.id}
            href={`${activeHref}?tool=${tool.id}`}
            title={tool.description}
            className={[
              'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-all',
              isActive
                ? 'border-[color-mix(in_srgb,var(--aethel-primary)_36%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)]'
                : 'border-transparent hover:border-[var(--aethel-border-subtle)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]',
            ].join(' ')}
          >
            <span className={['block text-[12px] font-semibold', isActive ? 'text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-primary)]'].join(' ')}>
              {tool.label}
            </span>
            <span className="shrink-0 rounded-full border border-[var(--aethel-border-subtle)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-quaternary)]">
              {tool.maturity}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

// --- Inspector slot: honest tool properties -----------------------------------
// Shows real tool metadata, not fictional values.

function StudioInspector({ tool }: { tool: StudioTool }) {
  const rows: [string, string][] = [
    ['Tool',     tool.label],
    ['Group',    tool.group],
    ['Maturity', tool.maturity],
    ['SSR',      'disabled (browser-only)'],
    ['LOD',      tool.maturity === 'GA' ? 'managed' : 'not enforced'],
    ['Physics',  ['cloth', 'fluid'].includes(tool.id) ? 'Rapier3D (web)' : 'N/A'],
  ]

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Tool properties</p>
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 border-b border-[var(--aethel-border-subtle)] pb-1.5 last:border-0 last:pb-0">
          <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--aethel-text-quaternary)]">{k}</span>
          <span className="font-mono text-[11px] text-[var(--aethel-text-primary)]">{v}</span>
        </div>
      ))}
    </div>
  )
}

// --- Timeline slot: track overview (honest placeholder) -----------------------

function StudioTimeline({ tool }: { tool: StudioTool }) {
  const hasTimeline = ['animation', 'rig', 'facial', 'cloth'].includes(tool.id)
  if (!hasTimeline) {
    return (
      <p className="text-[11px] text-[var(--aethel-text-quaternary)]">
        No timeline for {tool.label}.
      </p>
    )
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Track overview</p>
        <span className="text-[10px] text-[var(--aethel-text-quaternary)]">0:00 / 0:00</span>
      </div>
      {['Root', 'Spine', 'IK_L', 'IK_R'].map((track, i) => (
        <div key={track} className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-[10px] font-mono text-[var(--aethel-text-tertiary)]">{track}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-sm bg-[var(--aethel-surface-secondary)]">
            <div
              className="h-full rounded-sm bg-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]"
              style={{ width: `${35 + i * 15}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Review queue: honest provenance and receipts -----------------------------

function StudioReviewQueue({ tool }: { tool: StudioTool }) {
  const receipts = [
    { label: 'Provenance',    status: 'held',         detail: 'No asset imported this session.' },
    { label: 'Render trace',  status: 'held',         detail: 'No render receipt for this session.' },
    { label: 'Perf trace',    status: 'needs-review', detail: 'Perf trace pending human review.' },
    { label: 'Human review',  status: 'held',         detail: 'No sign-off recorded.' },
  ] as const

  const dotColor = { available: 'bg-[var(--aethel-success-light)]', held: 'bg-[var(--aethel-warning-light)]', 'needs-review': 'bg-[var(--aethel-info-light)]', blocked: 'bg-[var(--aethel-error-light)]' } as const

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
        {tool.label} receipts
      </p>
      {receipts.map(({ label, status, detail }) => (
        <div key={label} className="flex items-center justify-between gap-2" title={detail}>
          <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor[status]}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[var(--aethel-text-primary)]">{label}</p>
          </div>
          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-quaternary)]">{status}</span>
        </div>
      ))}
    </div>
  )
}

// --- Primary action -----------------------------------------------------------

function PrimaryAction({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Held until provenance, render trace, performance trace, and human review receipts exist."
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-warning)] focus-visible:ring-offset-1 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  )
}

// --- Component ----------------------------------------------------------------

export default function StudioGroupedEditorClient({ group }: { group: StudioGroupId }) {
  const searchParams = useSearchParams()
  const registryGroup = GROUP_MAP[group]
  const tools         = getGroupTools(registryGroup)
  const config        = GROUP_CONFIG[registryGroup]
  const activeTool    = resolveActiveTool(registryGroup, searchParams?.get('tool') ?? null)

  return (
    <CreativeWorkbenchShell
      title={config.title}
      mode={config.mode}
      primaryAction={<PrimaryAction label="Review held" />}
      evidence={buildToolEvidence(activeTool)}
      outliner={
        <StudioToolPicker
          tools={tools}
          selected={activeTool}
          activeHref={config.activeHref}
        />
      }
      viewport={renderTool(activeTool)}
      inspector={<StudioInspector tool={activeTool} />}
      timeline={<StudioTimeline tool={activeTool} />}
      renderQueue={<StudioReviewQueue tool={activeTool} />}
    />
  )
}
