'use client'

import { useCallback } from 'react'
import {
  Box,
  Film,
  Flame,
  GitBranch,
  Move3D,
  RotateCw,
  Scale3D,
  Shield,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react'
import type {
  ViewportSceneObject,
  ViewportTransformMode,
  ViewportTransformSpace,
} from '@/components/viewport/AethelViewport3D'
import {
  buildGizmoEliteControlState,
  buildGizmoInspectorSummary,
  canApplyGizmoEliteControl,
  type GizmoAxisPlaneConstraint,
  type GizmoPivotMode,
} from '@/lib/viewport/gizmo-elite-controls'
import { ViewportAssetQualityCard } from '@/components/viewport/ViewportAssetQualityCard'
import { GenerationInspector } from '@/components/viewport/GenerationInspector'
import { Vector3Input } from '@/components/ui/ScrubbableInput'

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

const iconButton = 'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] p-2 text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'
const activeButton = 'inline-flex items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] p-2 text-[var(--aethel-primary-light)] transition hover:brightness-110'
const panelButton = 'inline-flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)]'
const compactTextButton = 'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'

export function SceneViewportInspector({
  selectedObject,
  selectedIds,
  transformMode,
  transformSpace,
  gizmoConstraint,
  gizmoPivotMode,
  snapEnabled,
  isPlaying,
  facialBlendShapeCount,
  hairPresetLabel,
  visualScriptNodeCount,
  visualScriptEdgeCount,
  activeWorkflowLabel,
  onOpenFacialEditor,
  onOpenHairEditor,
  onOpenVisualScript,
  onOpenVfxGraph,
  onOpenAbilityEditor,
  onTransformModeChange,
  onTransformSpaceChange,
  onGizmoConstraintChange,
  onGizmoPivotModeChange,
  onSnapEnabledChange,
  onTogglePlayTest,
  onObjectTransformChange,
}: {
  selectedObject: ViewportSceneObject | null
  selectedIds: string[]
  transformMode: ViewportTransformMode
  transformSpace: ViewportTransformSpace
  gizmoConstraint: GizmoAxisPlaneConstraint
  gizmoPivotMode: GizmoPivotMode
  snapEnabled: boolean
  isPlaying: boolean
  facialBlendShapeCount: number
  hairPresetLabel: string
  visualScriptNodeCount: number
  visualScriptEdgeCount: number
  activeWorkflowLabel: string
  onOpenFacialEditor: () => void
  onOpenHairEditor: () => void
  onOpenVisualScript: () => void
  onOpenVfxGraph: () => void
  onOpenAbilityEditor: () => void
  onTransformModeChange: (mode: ViewportTransformMode) => void
  onTransformSpaceChange: (space: ViewportTransformSpace) => void
  onGizmoConstraintChange: (constraint: GizmoAxisPlaneConstraint) => void
  onGizmoPivotModeChange: (pivotMode: GizmoPivotMode) => void
  onSnapEnabledChange: (enabled: boolean) => void
  onTogglePlayTest: () => void
  onObjectTransformChange?: (objectId: string, patch: ViewportTransformPatch) => void
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

  return (
    <div className="flex h-full flex-col bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)]">
      <div className="border-b border-[var(--aethel-border-primary)] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Inspector</p>
        <h3 className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{selectedObject?.name ?? 'No object selected'}</h3>
        <p className="sr-only">Selection details and safe edits.</p>
      </div>
      <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Gizmo</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'translate' as const, icon: Move3D, label: 'Move' },
              { id: 'rotate' as const, icon: RotateCw, label: 'Rotate' },
              { id: 'scale' as const, icon: Scale3D, label: 'Scale' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Activate ${item.label} mode`}
                  onClick={() => onTransformModeChange(item.id)}
                  className={transformMode === item.id ? activeButton : iconButton}
                >
                  <Icon className="h-4 w-4" />
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
              <Film className="h-4 w-4" />
              {snapEnabled ? 'Snap 0.5' : 'Free'}
            </button>
          </div>
        </div>

        <details className="group rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] p-3">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
            Advanced gizmo
          </summary>
          <div className={`mt-3 rounded-2xl border p-3 text-xs ${summaryToneClass[eliteSummary.tone]}`} role={eliteSummary.tone === 'blocked' ? 'alert' : 'status'}>
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
        </details>

        <details className="group rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] p-3">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
            Playtest & prompt
          </summary>
          <div className="mt-3 space-y-2">
            <button type="button" aria-label={isPlaying ? 'Stop play test' : 'Run play test'} onClick={onTogglePlayTest} className={panelButton}>
              <Wand2 className="h-4 w-4" />
              {isPlaying ? 'Stop Play Test' : 'Play Test'}
            </button>
            <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3">
              <p className="text-xs font-medium text-[var(--aethel-text-primary)]">Text to action</p>
              <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">Try: move up 2, rotate 15, scale 2. Review before release.</p>
            </div>
          </div>
        </details>

        <details className="group rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] p-3">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Character tools</summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" aria-label="Open contextual facial editor" onClick={onOpenFacialEditor} className={panelButton}>
              <Sparkles className="h-4 w-4" />
              Facial
            </button>
            <button type="button" aria-label="Open contextual hair editor" onClick={onOpenHairEditor} className={panelButton}>
              <Box className="h-4 w-4" />
              Hair
            </button>
          </div>
          <div className="mt-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3 text-xs text-[var(--aethel-text-secondary)]">
            <p>Active blend shapes: <span className="font-medium text-[var(--aethel-text-primary)]">{facialBlendShapeCount}</span></p>
            <p className="mt-1">Hair preset: <span className="font-medium text-[var(--aethel-text-primary)]">{hairPresetLabel}</span></p>
          </div>
        </details>

        <details className="group rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] p-3">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Logic tools</summary>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <button type="button" aria-label="Open contextual visual script editor" onClick={onOpenVisualScript} className={panelButton}>
              <GitBranch className="h-4 w-4" />
              Visual Script
            </button>
            <button type="button" aria-label="Open contextual VFX graph editor" onClick={onOpenVfxGraph} className={panelButton}>
              <Flame className="h-4 w-4" />
              VFX Graph
            </button>
            <button type="button" aria-label="Open contextual ability editor" onClick={onOpenAbilityEditor} className={panelButton}>
              <Shield className="h-4 w-4" />
              Ability Editor
            </button>
          </div>
          <div className="mt-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3 text-xs text-[var(--aethel-text-secondary)]">
            <p>Active tool: <span className="font-medium text-[var(--aethel-text-primary)]">{activeWorkflowLabel}</span></p>
            <p className="mt-1">Visual Script: <span className="font-medium text-[var(--aethel-text-primary)]">{visualScriptNodeCount}</span> nodes / <span className="font-medium text-[var(--aethel-text-primary)]">{visualScriptEdgeCount}</span> edges</p>
          </div>
        </details>

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
              {selectedObject.asset ? (
                <ViewportAssetQualityCard asset={selectedObject.asset} />
              ) : null}
              {selectedObject.generationMetadata || selectedObject.type === 'generated-mesh' ? (
                <GenerationInspector metadata={selectedObject.generationMetadata} />
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--aethel-border-subtle)] px-4 py-6 text-center text-xs text-[var(--aethel-text-quaternary)]">
              Select an object to edit transform, materials, and tools.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
