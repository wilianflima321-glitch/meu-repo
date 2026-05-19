'use client'

import { useCallback } from 'react'
import * as THREE from 'three'
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
import { formatViewportAssetSize } from '@/lib/viewport/viewport-asset-import'

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
}) {
  const formatter = useCallback((value: number) => value.toFixed(2), [])
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
        <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">Transform, snapping, and play test connected to the sovereign viewport.</p>
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

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Pivot & Constraints</p>
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
            {canApplyGizmoEliteControl(eliteState) ? 'Ready for transform evidence.' : 'Held until blockers are resolved.'}
          </p>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">AI + Simulation</p>
          <div className="space-y-2">
            <button type="button" aria-label="Run play test" onClick={onTogglePlayTest} className={panelButton}>
              <Wand2 className="h-4 w-4" />
              {isPlaying ? 'Stop Play Test' : 'Play Test'}
            </button>
            <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3">
              <p className="text-xs font-medium text-[var(--aethel-text-primary)]">Text to action</p>
              <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">“move este objeto 2 para cima”, “rotate 15”, “scale 2”.</p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Character Tools</p>
          <div className="grid grid-cols-2 gap-2">
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
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Workflow Tools</p>
          <div className="grid grid-cols-1 gap-2">
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
            <p>Active workflow: <span className="font-medium text-[var(--aethel-text-primary)]">{activeWorkflowLabel}</span></p>
            <p className="mt-1">Visual Script: <span className="font-medium text-[var(--aethel-text-primary)]">{visualScriptNodeCount}</span> nodes ? <span className="font-medium text-[var(--aethel-text-primary)]">{visualScriptEdgeCount}</span> edges</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Transform</p>
          {selectedObject ? (
            <div className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3 text-xs text-[var(--aethel-text-secondary)]">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">Position</p>
                <p>{selectedObject.position.map(formatter).join(' · ')}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">Rotation</p>
                <p>{selectedObject.rotation.map((value) => formatter(THREE.MathUtils.radToDeg(value))).join('° · ')}°</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">Scale</p>
                <p>{selectedObject.scale.map(formatter).join(' · ')}</p>
              </div>
              {selectedObject.asset ? (
                <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">Asset Intake</p>
                  <p className="font-medium text-[var(--aethel-text-primary)]">{selectedObject.asset.fileName}</p>
                  <p className="mt-1">{selectedObject.asset.format.toUpperCase()} · {formatViewportAssetSize(selectedObject.asset.sizeBytes)}</p>
                  <p className="mt-1">License: <span className="font-medium text-[var(--aethel-warning-light)]">{selectedObject.asset.licenseStatus}</span></p>
                  <p className="mt-1 truncate text-[var(--aethel-text-quaternary)]">{selectedObject.asset.evidenceRef}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--aethel-border-subtle)] px-4 py-6 text-center text-xs text-[var(--aethel-text-quaternary)]">
              Select an object in the viewport or hierarchy to edit with the professional gizmo.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
