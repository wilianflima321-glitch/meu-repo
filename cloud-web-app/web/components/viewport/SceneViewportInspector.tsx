'use client'

import { useCallback, useState } from 'react'
import {
  Flame,
  GitBranch,
  Layers,
  Magnet,
  Move3D,
  RotateCw,
  Scale3D,
  Search,
  Shield,
  Sparkles,
  Target,
  Wand2,
  X,
} from 'lucide-react'
import type {
  ViewportPBRTextureMaps,
  ViewportSceneObject,
  ViewportTransformMode,
  ViewportTransformSpace,
} from '@/components/viewport/AethelViewport3D'
import { ViewportPBRTextureSlots } from '@/components/viewport/ViewportPBRTextureSlots'
import {
  buildGizmoEliteControlState,
  buildGizmoInspectorSummary,
  canApplyGizmoEliteControl,
  type GizmoAxisPlaneConstraint,
  type GizmoPivotMode,
} from '@/lib/viewport/gizmo-elite-controls'
import { ViewportAssetQualityCard } from '@/components/viewport/ViewportAssetQualityCard'
import { GenerationInspector } from '@/components/viewport/GenerationInspector'
import { ScrubbableInput, Vector3Input } from '@/components/ui/ScrubbableInput'

function radToDeg(value: number) {
  return (value * 180) / Math.PI
}

function degToRad(value: number) {
  return (value * Math.PI) / 180
}

export type ViewportTransformPatch = Partial<
  Pick<ViewportSceneObject, 'position' | 'rotation' | 'scale'>
>

const transformLabelClass = 'mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]'

const iconButton = 'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] p-2 text-[var(--aethel-text-secondary)] transition-all duration-150 active:scale-95 hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'
const activeButton = 'inline-flex items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] p-2 text-[var(--aethel-primary-light)] transition-all duration-150 active:scale-95 hover:brightness-110 shadow-sm'
const panelButton = 'inline-flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition-all duration-150 active:scale-[0.98] hover:border-[var(--aethel-border-secondary)]'
const compactTextButton = 'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-secondary)] transition-all duration-150 active:scale-95 hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'

/**
 * Animated collapsible section — replaces native <details> which has
 * no collapse animation. Uses max-height CSS transition on a wrapper div.
 */
function InspectorSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] transition-colors"
      >
        {title}
        <svg
          className={['h-3 w-3 shrink-0 transition-transform duration-200', open ? 'rotate-90' : ''].join(' ')}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 4 10 8 6 12" />
        </svg>
      </button>
      <div
        className="transition-all duration-200 ease-in-out"
        style={{ maxHeight: open ? 2000 : 0, opacity: open ? 1 : 0, overflow: 'hidden', padding: open ? '0 12px 12px' : '0 12px' }}
      >
        {children}
      </div>
    </div>
  )
}

export function SceneViewportInspector({
  selectedObject,
  selectedIds,
  transformMode,
  transformSpace,
  gizmoConstraint,
  gizmoPivotMode,
  snapEnabled,
  isPlaying,
  onTransformModeChange,
  onTransformSpaceChange,
  onGizmoConstraintChange,
  onGizmoPivotModeChange,
  onSnapEnabledChange,
  onTogglePlayTest,
  onObjectTransformChange,
  onObjectTextureMapsChange,
}: {
  selectedObject: ViewportSceneObject | null
  selectedIds: string[]
  transformMode: ViewportTransformMode
  transformSpace: ViewportTransformSpace
  gizmoConstraint: GizmoAxisPlaneConstraint
  gizmoPivotMode: GizmoPivotMode
  snapEnabled: boolean
  isPlaying: boolean
  onTransformModeChange: (mode: ViewportTransformMode) => void
  onTransformSpaceChange: (space: ViewportTransformSpace) => void
  onGizmoConstraintChange: (constraint: GizmoAxisPlaneConstraint) => void
  onGizmoPivotModeChange: (pivotMode: GizmoPivotMode) => void
  onSnapEnabledChange: (enabled: boolean) => void
  onTogglePlayTest: () => void
  onObjectTransformChange?: (objectId: string, patch: ViewportTransformPatch) => void
  /** Phase 4 (AAA Studio Deepening Sweep) — PBR texture drag-and-drop slots. */
  onObjectTextureMapsChange?: (objectId: string, textureMaps: ViewportPBRTextureMaps | undefined) => void
}) {
  const formatter = useCallback((value: number) => value.toFixed(2), [])
  const editable = Boolean(onObjectTransformChange && selectedObject && !selectedObject.locked)
  const eliteState = buildGizmoEliteControlState({
    mode: transformMode,
    space: transformSpace,
    pivotMode: gizmoPivotMode,
    constraint: gizmoConstraint,
    selectedObjectIds: selectedIds,
    activeObjectId: selectedObject?.id ?? null,
    lockedObjectIds: selectedObject?.locked ? [selectedObject.id] : [],
    source: 'user',
  })
  const eliteSummary = buildGizmoInspectorSummary(eliteState)
  const summaryToneClass = {
    ready: 'border-[color-mix(in_srgb,var(--aethel-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]',
    warning: 'border-[color-mix(in_srgb,var(--aethel-warning)_38%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
    blocked: 'border-[color-mix(in_srgb,var(--aethel-error)_38%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]',
  } satisfies Record<typeof eliteSummary.tone, string>

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<'all' | 'transform' | 'material' | 'gizmo' | 'physics'>('all')

  const q = searchQuery.trim().toLowerCase()
  const showGizmo =
    (filterCategory === 'all' || filterCategory === 'gizmo') &&
    (!q || 'gizmo precision move rotate scale snap pivot constraint world local translate'.includes(q))
  const showTransform =
    (filterCategory === 'all' || filterCategory === 'transform') &&
    (!q || 'transform position rotation scale coordinates x y z'.includes(q))
  const showMaterial =
    (filterCategory === 'all' || filterCategory === 'material') &&
    (!q || 'pbr material texture albedo normal roughness height metalness ao quality asset'.includes(q))
  const showPhysics =
    (filterCategory === 'all' || filterCategory === 'physics') &&
    (!q || 'physics rigid body mass collision friction restitution gravity simulate'.includes(q))

  return (
    <div className="flex h-full flex-col bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)]">
      {/* Header with object name and property search */}
      <div className="border-b border-[var(--aethel-border-primary)] px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Inspector</p>
          <div className="flex items-center gap-1.5">
            {selectedObject?.type && (
              <span className="rounded border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--aethel-text-quaternary)] capitalize">
                {selectedObject.type}
              </span>
            )}
            {selectedObject?.locked && (
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-2 py-0.5 text-[9px] font-medium text-[var(--aethel-warning-light)]">
                Locked
              </span>
            )}
          </div>
        </div>
        <h3 className="truncate text-sm font-semibold text-[var(--aethel-text-primary)]">
          {selectedObject?.name ?? 'No object selected'}
        </h3>

        {/* Quick Search */}
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[var(--aethel-text-quaternary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search properties (e.g. scale, pbr)..."
            className="h-7 w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] pl-8 pr-7 text-xs text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] outline-none transition focus:border-[var(--aethel-primary)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter category pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {(
            [
              ['all', 'All'],
              ['transform', 'Transform'],
              ['material', 'PBR'],
              ['gizmo', 'Gizmo'],
              ['physics', 'Physics'],
            ] as const
          ).map(([cat, label]) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition ${
                filterCategory === cat
                  ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
        {showGizmo && (
          <>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Gizmo</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'translate' as const, icon: Move3D, label: 'Move', shortcut: 'W' },
                  { id: 'rotate' as const, icon: RotateCw, label: 'Rotate', shortcut: 'E' },
                  { id: 'scale' as const, icon: Scale3D, label: 'Scale', shortcut: 'R' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`Activate ${item.label} mode (${item.shortcut})`}
                      title={`${item.label} tool (${item.shortcut})`}
                      onClick={() => onTransformModeChange(item.id)}
                      className={[
                        transformMode === item.id ? activeButton : iconButton,
                        'flex items-center justify-center gap-1.5',
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-mono text-[10px] text-[var(--aethel-text-tertiary)]">{item.shortcut}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Precision</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-label={`Use space ${transformSpace === 'world' ? 'local' : 'world'}`}
                  onClick={() => onTransformSpaceChange(transformSpace === 'world' ? 'local' : 'world')}
                  className={panelButton}
                >
                  <Target className="h-4 w-4" />
                  {transformSpace === 'world' ? 'World' : 'Local'}
                </button>
                <button
                  type="button"
                  aria-label={`${snapEnabled ? 'Disable' : 'Enable'} snapping`}
                  onClick={() => onSnapEnabledChange(!snapEnabled)}
                  className={panelButton}
                >
                  <Magnet className="h-4 w-4" />
                  {snapEnabled ? 'Snap 0.5m' : 'Free'}
                </button>
              </div>
            </div>

            <InspectorSection title="Advanced Gizmo" defaultOpen={false}>
              <div className={`rounded-2xl border p-3 text-xs ${summaryToneClass[eliteSummary.tone]}`} role={eliteSummary.tone === 'blocked' ? 'alert' : 'status'}>
                <p className="font-semibold">{eliteSummary.title}</p>
                <p className="mt-1 text-[var(--aethel-text-secondary)]">{eliteSummary.detail}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {eliteSummary.chips.map((chip) => (
                    <span key={chip} className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--aethel-text-tertiary)]">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {(['free', 'x', 'y', 'z', 'xy', 'xz', 'yz', 'screen'] as const).map((constraint) => (
                  <button
                    key={constraint}
                    type="button"
                    aria-label={`Use ${constraint} constraint`}
                    onClick={() => onGizmoConstraintChange(constraint)}
                    className={gizmoConstraint === constraint ? activeButton : compactTextButton}
                  >
                    {constraint.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([
                  ['median', 'Median'],
                  ['active-object', 'Active'],
                  ['individual-origins', 'Individual'],
                  ['world-origin', 'World 0'],
                ] as const).map(([pivotMode, label]) => (
                  <button
                    key={pivotMode}
                    type="button"
                    aria-label={`Use ${label} pivot`}
                    onClick={() => onGizmoPivotModeChange(pivotMode)}
                    className={gizmoPivotMode === pivotMode ? activeButton : compactTextButton}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[var(--aethel-text-quaternary)]">
                {canApplyGizmoEliteControl(eliteState) ? 'Ready to transform.' : 'Held until blockers are resolved.'}
              </p>
            </InspectorSection>
          </>
        )}

        {showTransform && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Transform</p>
            {selectedObject ? (
              <div className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3 text-xs text-[var(--aethel-text-secondary)]">
                {editable && onObjectTransformChange ? (
                  <>
                    <div>
                      <p className={transformLabelClass}>Position</p>
                      <Vector3Input
                        value={selectedObject.position}
                        defaultValue={[0, 0, 0]}
                        step={0.01}
                        precision={3}
                        ariaLabelPrefix="Position"
                        onChange={(next) => onObjectTransformChange(selectedObject.id, { position: next })}
                      />
                    </div>
                    <div>
                      <p className={transformLabelClass}>Rotation (deg)</p>
                      <Vector3Input
                        value={selectedObject.rotation.map(radToDeg) as [number, number, number]}
                        defaultValue={[0, 0, 0]}
                        step={1}
                        precision={1}
                        suffix="°"
                        ariaLabelPrefix="Rotation"
                        onChange={(next) =>
                          onObjectTransformChange(selectedObject.id, {
                            rotation: next.map(degToRad) as [number, number, number],
                          })
                        }
                      />
                    </div>
                    <div>
                      <p className={transformLabelClass}>Scale</p>
                      <Vector3Input
                        value={selectedObject.scale}
                        defaultValue={[1, 1, 1]}
                        step={0.01}
                        precision={3}
                        ariaLabelPrefix="Scale"
                        onChange={(next) => onObjectTransformChange(selectedObject.id, { scale: next })}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--aethel-text-quaternary)]">
                      Drag a label to scrub · double-click to type a value or math (e.g. 10 * 2.5).
                    </p>
                  </>
                ) : (
                  <>
                    <div>
                      <p className={transformLabelClass}>Position</p>
                      <p>{selectedObject.position.map(formatter).join(' / ')}</p>
                    </div>
                    <div>
                      <p className={transformLabelClass}>Rotation</p>
                      <p>{selectedObject.rotation.map((value) => `${formatter(radToDeg(value))} deg`).join(' / ')}</p>
                    </div>
                    <div>
                      <p className={transformLabelClass}>Scale</p>
                      <p>{selectedObject.scale.map(formatter).join(' / ')}</p>
                    </div>
                    {selectedObject.locked ? (
                      <p className="text-[10px] text-[var(--aethel-warning-light)]">Object locked — unlock to edit transform.</p>
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--aethel-border-subtle)] px-4 py-6 text-center text-xs text-[var(--aethel-text-quaternary)]">
                Select an object to edit transform, materials, and tools.
              </div>
            )}
          </div>
        )}

        {showMaterial && selectedObject && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">PBR Material & Quality</p>
            <div className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3 text-xs text-[var(--aethel-text-secondary)]">
              {editable && onObjectTextureMapsChange ? (
                <div>
                  <p className={transformLabelClass}>Texture Maps</p>
                  <ViewportPBRTextureSlots
                    textureMaps={selectedObject.textureMaps}
                    onChange={(next) => onObjectTextureMapsChange(selectedObject.id, next)}
                  />
                  <p className="mt-1.5 text-[10px] text-[var(--aethel-text-quaternary)]">
                    Drop an image on Albedo to auto-generate Normal/Roughness/Height, or drop on a single channel to override it.
                  </p>
                </div>
              ) : null}
              {selectedObject.asset ? (
                <ViewportAssetQualityCard asset={selectedObject.asset} />
              ) : null}
              {selectedObject.appliedAssetPath ? (
                <p className="text-[10px] text-[var(--aethel-text-quaternary)]" title={selectedObject.appliedAssetPath}>
                  Material from: <span className="text-[var(--aethel-text-tertiary)]">{selectedObject.appliedAssetPath}</span>
                </p>
              ) : null}
              {selectedObject.generationMetadata || selectedObject.type === 'generated-mesh' ? (
                <GenerationInspector metadata={selectedObject.generationMetadata} />
              ) : null}
            </div>
          </div>
        )}

        {showPhysics && selectedObject && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Physics</p>
            <InspectorSection title="Rigid Body" defaultOpen={false}>
              <div className="space-y-3 text-xs text-[var(--aethel-text-secondary)]">
                {/* Simulation mode */}
                <div>
                  <p className={transformLabelClass}>Simulation Mode</p>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {(['Dynamic', 'Kinematic', 'Static'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-label={`Set physics mode ${mode}`}
                        className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--aethel-text-secondary)] transition-all duration-150 hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] active:scale-95"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mass */}
                <div>
                  <p className={transformLabelClass}>Mass (kg)</p>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-2">
                    <Flame className="h-3.5 w-3.5 shrink-0 text-[var(--aethel-warning)]" />
                    <input
                      type="number"
                      defaultValue={1.0}
                      step={0.1}
                      min={0.001}
                      aria-label="Rigid body mass in kg"
                      className="w-full bg-transparent font-mono text-xs text-[var(--aethel-text-primary)] outline-none"
                    />
                    <span className="shrink-0 font-mono text-[10px] text-[var(--aethel-text-quaternary)]">kg</span>
                  </div>
                </div>

                {/* Friction · Restitution */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className={transformLabelClass}>Friction</p>
                    <div className="mt-1">
                      <ScrubbableInput
                        value={0.5}
                        onChange={() => {}}
                        min={0}
                        max={1}
                        step={0.05}
                        precision={2}
                        ariaLabel="Friction coefficient"
                      />
                    </div>
                  </div>
                  <div>
                    <p className={transformLabelClass}>Restitution</p>
                    <div className="mt-1">
                      <ScrubbableInput
                        value={0.3}
                        onChange={() => {}}
                        min={0}
                        max={1}
                        step={0.05}
                        precision={2}
                        ariaLabel="Restitution (bounciness)"
                      />
                    </div>
                  </div>
                </div>

                {/* Gravity scale */}
                <div>
                  <p className={transformLabelClass}>Gravity Scale</p>
                  <div className="mt-1">
                    <ScrubbableInput
                      value={1.0}
                      onChange={() => {}}
                      min={0}
                      max={10}
                      step={0.1}
                      precision={1}
                      suffix="×"
                      ariaLabel="Gravity scale multiplier"
                    />
                  </div>
                </div>

                {/* Desktop notice */}
                <p className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_22%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_7%,transparent)] px-3 py-2 text-[10px] leading-relaxed text-[var(--aethel-neon-cyan)]">
                  Full Rapier simulation runs on Tauri Desktop (Law I — physics worker + SAB). Web viewport shows authored values.
                </p>
              </div>
            </InspectorSection>
          </div>
        )}
      </div>
    </div>
  )
}
