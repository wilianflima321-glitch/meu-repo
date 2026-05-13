'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DragEvent } from 'react'
import * as THREE from 'three'
import {
  Box,
  Camera,
  Eye,
  EyeOff,
  Film,
  Flame,
  GitBranch,
  Move3D,
  RotateCw,
  Scale3D,
  Sparkles,
  Shield,
  Target,
  Wand2,
} from 'lucide-react'
import {
  ViewportAICommandPanel,
  ViewportAssetDropOverlay,
  ViewportGizmoMemoryChip,
  ViewportTopToolbar,
} from '@/components/viewport/ViewportChrome'
import { ViewportScene } from '@/components/viewport/ViewportSceneCanvas'
import {
  type ViewportCameraPreset,
} from '@/components/viewport/ViewportCameraPresetApplier'
import { buildGizmoTransformOperation, type GizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'
import {
  buildGizmoTransformPersistenceChip,
  type GizmoTransformPersistenceStatus,
} from '@/lib/viewport/gizmo-transform-persistence'
import {
  buildGizmoEliteControlState,
  buildGizmoInspectorSummary,
  canApplyGizmoEliteControl,
  type GizmoAxisPlaneConstraint,
  type GizmoPivotMode,
} from '@/lib/viewport/gizmo-elite-controls'
import {
  formatViewportAssetSize,
  type ViewportAssetImportMetadata,
} from '@/lib/viewport/viewport-asset-import'
import { isEditableViewportKeyboardTarget } from '@/lib/viewport/viewport-keyboard-targets'

export type ViewportTransformMode = 'translate' | 'rotate' | 'scale'
export type ViewportTransformSpace = 'world' | 'local'
export type ViewportCreativeMode = 'game' | 'film'

export type ViewportSceneObject = {
  id: string
  name: string
  type: 'mesh' | 'light' | 'camera'
  geometry?: 'box' | 'sphere' | 'capsule' | 'cylinder' | 'plane'
  color: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  locked?: boolean
  visible?: boolean
  asset?: ViewportAssetImportMetadata
}

export type AethelViewport3DProps = {
  objects: ViewportSceneObject[]
  selectedIds: string[]
  transformMode: ViewportTransformMode
  transformSpace: ViewportTransformSpace
  snapEnabled: boolean
  creativeMode: ViewportCreativeMode
  renderMode?: 'draft' | 'cinematic'
  isPlaying: boolean
  currentTime: number
  duration: number
  vfxGlowIntensity?: number
  abilityAccentColor?: string | null
  abilityLabel?: string | null
  facialExpressionIntensity?: number
  hairHighlightColor?: string | null
  hairVolumeIntensity?: number
  onTogglePlayTest: () => void
  onObjectsChange: (objects: ViewportSceneObject[]) => void
  onSelectionChange: (ids: string[]) => void
  onTransformModeChange: (mode: ViewportTransformMode) => void
  onTransformSpaceChange: (space: ViewportTransformSpace) => void
  onSnapEnabledChange: (enabled: boolean) => void
  onAIAction?: (action: string) => void
  onGizmoTransformOperation?: (operation: GizmoTransformOperation) => void
  gizmoConstraint?: GizmoAxisPlaneConstraint
  gizmoPivotMode?: GizmoPivotMode
  onGizmoConstraintChange?: (constraint: GizmoAxisPlaneConstraint) => void
  onGizmoPivotModeChange?: (pivotMode: GizmoPivotMode) => void
  gizmoMemoryStatus?: GizmoTransformPersistenceStatus
  gizmoMemoryLabel?: string | null
  gizmoMemoryError?: string | null
  gizmoMemoryCanPersist?: boolean
  assetImportStatus?: string
  onImportAssets?: (files: File[]) => void
}

const iconButton = 'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] p-2 text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'
const activeButton = 'inline-flex items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] p-2 text-[var(--aethel-primary-light)] transition hover:brightness-110'
const panelButton = 'inline-flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)]'
const compactTextButton = 'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'

const defaultObjects: ViewportSceneObject[] = [
  {
    id: 'airlock-shell',
    name: 'Airlock Shell',
    type: 'mesh',
    geometry: 'box',
    color: 'rgb(125, 211, 252)',
    position: [0, 0.55, 0],
    rotation: [0, 0.35, 0],
    scale: [1.8, 1.1, 1.2],
    visible: true,
  },
  {
    id: 'camera-rig',
    name: 'Camera Rig',
    type: 'camera',
    color: 'rgb(167, 139, 250)',
    position: [2.2, 1.5, 2.4],
    rotation: [-0.35, 0.72, 0],
    scale: [1, 1, 1],
    visible: true,
  },
  {
    id: 'key-light',
    name: 'Key Light',
    type: 'light',
    color: 'rgb(251, 191, 36)',
    position: [1.6, 2.2, 1.8],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
  },
]

function clampScale(scale: [number, number, number]): [number, number, number] {
  return [
    Math.max(0.1, scale[0]),
    Math.max(0.1, scale[1]),
    Math.max(0.1, scale[2]),
  ]
}

function parseAiViewportCommand(command: string, object: ViewportSceneObject): Partial<ViewportSceneObject> | null {
  const normalized = command.toLowerCase()
  const parsedNumber = Number(normalized.match(/-?\d+(?:\.\d+)?/)?.[0] ?? '1')
  const amount = Number.isFinite(parsedNumber) && parsedNumber !== 0 ? parsedNumber : 1

  if (normalized.includes('up') || normalized.includes('cima')) {
    return { position: [object.position[0], object.position[1] + amount, object.position[2]] }
  }
  if (normalized.includes('down') || normalized.includes('baixo')) {
    return { position: [object.position[0], object.position[1] - amount, object.position[2]] }
  }
  if (normalized.includes('left') || normalized.includes('esquerda')) {
    return { position: [object.position[0] - amount, object.position[1], object.position[2]] }
  }
  if (normalized.includes('right') || normalized.includes('direita')) {
    return { position: [object.position[0] + amount, object.position[1], object.position[2]] }
  }
  if (normalized.includes('forward') || normalized.includes('frente')) {
    return { position: [object.position[0], object.position[1], object.position[2] - amount] }
  }
  if (normalized.includes('back') || normalized.includes('tras')) {
    return { position: [object.position[0], object.position[1], object.position[2] + amount] }
  }
  if (normalized.includes('rotate') || normalized.includes('rotacion')) {
    return { rotation: [object.rotation[0], object.rotation[1] + THREE.MathUtils.degToRad(amount), object.rotation[2]] }
  }
  if (normalized.includes('scale') || normalized.includes('bigger') || normalized.includes('maior')) {
    const factor = 1 + amount / 10
    return { scale: clampScale([object.scale[0] * factor, object.scale[1] * factor, object.scale[2] * factor]) }
  }
  if (normalized.includes('smaller') || normalized.includes('menor')) {
    const factor = Math.max(0.1, 1 - amount / 10)
    return { scale: clampScale([object.scale[0] * factor, object.scale[1] * factor, object.scale[2] * factor]) }
  }

  return null
}

export function SceneViewportOutliner({
  objects,
  selectedIds,
  onSelectionChange,
  onObjectsChange,
}: {
  objects: ViewportSceneObject[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onObjectsChange: (objects: ViewportSceneObject[]) => void
}) {
  return (
    <div className="flex h-full flex-col bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)]">
      <div className="border-b border-[var(--aethel-border-primary)] px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Hierarchy</p>
            <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">Cena, câmeras e luzes conectadas ao viewport.</p>
          </div>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
            {objects.length} itens
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-2 py-2">
        {objects.map((object) => {
          const active = selectedIds.includes(object.id)
          const Icon = object.type === 'light' ? Sparkles : object.type === 'camera' ? Camera : Box
          return (
            <div key={object.id} className="mb-1 rounded-xl border border-transparent bg-transparent p-1 hover:border-[var(--aethel-border-subtle)]">
              <div className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${active ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_55%,transparent)]'}`}>
                <button
                  type="button"
                  aria-label={`Selecionar ${object.name}`}
                  onClick={() => onSelectionChange([object.id])}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{object.name}</span>
                  {object.asset ? (
                    <span className="rounded-full border border-[var(--aethel-border-subtle)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                      {object.asset.format}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  aria-label={`${object.visible === false ? 'Mostrar' : 'Ocultar'} ${object.name}`}
                  onClick={() => onObjectsChange(objects.map((item) => item.id === object.id ? { ...item, visible: item.visible === false } : item))}
                  className="rounded-md p-1 text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_75%,transparent)] hover:text-[var(--aethel-text-primary)]"
                >
                  {object.visible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )
        })}
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
        <h3 className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{selectedObject?.name ?? 'Nenhum objeto selecionado'}</h3>
        <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">Transform, snapping e play test conectados ao viewport soberano.</p>
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
                  aria-label={`Ativar modo ${item.label}`}
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
              aria-label={`Usar espaço ${transformSpace === 'world' ? 'local' : 'world'}`}
              onClick={() => onTransformSpaceChange(transformSpace === 'world' ? 'local' : 'world')}
              className={panelButton}
            >
              <Target className="h-4 w-4" />
              {transformSpace === 'world' ? 'World' : 'Local'}
            </button>
            <button
              type="button"
              aria-label={`${snapEnabled ? 'Desativar' : 'Ativar'} snapping`}
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
                aria-label={`Usar constraint ${constraint}`}
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
                aria-label={`Usar pivot ${label}`}
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
            <button type="button" aria-label="Executar play test" onClick={onTogglePlayTest} className={panelButton}>
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
            <button type="button" aria-label="Abrir editor facial contextual" onClick={onOpenFacialEditor} className={panelButton}>
              <Sparkles className="h-4 w-4" />
              Facial
            </button>
            <button type="button" aria-label="Abrir editor de cabelo contextual" onClick={onOpenHairEditor} className={panelButton}>
              <Box className="h-4 w-4" />
              Hair
            </button>
          </div>
          <div className="mt-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3 text-xs text-[var(--aethel-text-secondary)]">
            <p>Blend shapes ativos: <span className="font-medium text-[var(--aethel-text-primary)]">{facialBlendShapeCount}</span></p>
            <p className="mt-1">Preset de hair: <span className="font-medium text-[var(--aethel-text-primary)]">{hairPresetLabel}</span></p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Workflow Tools</p>
          <div className="grid grid-cols-1 gap-2">
            <button type="button" aria-label="Abrir editor de visual script contextual" onClick={onOpenVisualScript} className={panelButton}>
              <GitBranch className="h-4 w-4" />
              Visual Script
            </button>
            <button type="button" aria-label="Abrir editor de VFX graph contextual" onClick={onOpenVfxGraph} className={panelButton}>
              <Flame className="h-4 w-4" />
              VFX Graph
            </button>
            <button type="button" aria-label="Abrir editor de abilities contextual" onClick={onOpenAbilityEditor} className={panelButton}>
              <Shield className="h-4 w-4" />
              Ability Editor
            </button>
          </div>
          <div className="mt-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3 text-xs text-[var(--aethel-text-secondary)]">
            <p>Workflow ativo: <span className="font-medium text-[var(--aethel-text-primary)]">{activeWorkflowLabel}</span></p>
            <p className="mt-1">Visual Script: <span className="font-medium text-[var(--aethel-text-primary)]">{visualScriptNodeCount}</span> nós · <span className="font-medium text-[var(--aethel-text-primary)]">{visualScriptEdgeCount}</span> edges</p>
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
              Selecione um objeto no viewport ou na hierarchy para editar com gizmo profissional.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AethelViewport3D({
  objects,
  selectedIds,
  transformMode,
  transformSpace,
  snapEnabled,
  creativeMode,
  renderMode = 'draft',
  isPlaying,
  currentTime,
  duration,
  vfxGlowIntensity = 0,
  abilityAccentColor,
  abilityLabel,
  facialExpressionIntensity = 0,
  hairHighlightColor,
  hairVolumeIntensity = 0,
  onTogglePlayTest,
  onObjectsChange,
  onSelectionChange,
  onTransformModeChange,
  onTransformSpaceChange,
  onSnapEnabledChange,
  onAIAction,
  onGizmoTransformOperation,
  gizmoConstraint: controlledGizmoConstraint,
  gizmoPivotMode: controlledGizmoPivotMode,
  onGizmoConstraintChange,
  onGizmoPivotModeChange,
  gizmoMemoryStatus = 'idle',
  gizmoMemoryLabel,
  gizmoMemoryError,
  gizmoMemoryCanPersist = false,
  assetImportStatus = 'Drop GLTF, GLB, FBX, OBJ, USD or USDZ assets',
  onImportAssets,
}: AethelViewport3DProps) {
  const [aiCommand, setAiCommand] = useState('move this object 2 up')
  const [assetDragActive, setAssetDragActive] = useState(false)
  const [cameraPreset, setCameraPreset] = useState<ViewportCameraPreset>('perspective')
  const [localGizmoConstraint, setLocalGizmoConstraint] = useState<GizmoAxisPlaneConstraint>('free')
  const [localGizmoPivotMode, setLocalGizmoPivotMode] = useState<GizmoPivotMode>('median')
  const gizmoConstraint = controlledGizmoConstraint ?? localGizmoConstraint
  const gizmoPivotMode = controlledGizmoPivotMode ?? localGizmoPivotMode
  const commitGizmoConstraint = useCallback((constraint: GizmoAxisPlaneConstraint) => {
    setLocalGizmoConstraint(constraint)
    onGizmoConstraintChange?.(constraint)
  }, [onGizmoConstraintChange])
  const commitGizmoPivotMode = useCallback((pivotMode: GizmoPivotMode) => {
    setLocalGizmoPivotMode(pivotMode)
    onGizmoPivotModeChange?.(pivotMode)
  }, [onGizmoPivotModeChange])
  const selectedObject = objects.find((object) => object.id === selectedIds[0]) ?? null
  const topGizmoState = buildGizmoEliteControlState({
    mode: transformMode,
    space: transformSpace,
    pivotMode: gizmoPivotMode,
    constraint: gizmoConstraint,
    selectedObjectIds: selectedIds,
    activeObjectId: selectedObject?.id ?? null,
    lockedObjectIds: objects.filter((object) => selectedIds.includes(object.id) && object.locked).map((object) => object.id),
    source: 'user',
  })
  const topGizmoSummary = buildGizmoInspectorSummary(topGizmoState)
  const gizmoMemoryChip = buildGizmoTransformPersistenceChip({
    status: gizmoMemoryStatus,
    canPersist: gizmoMemoryCanPersist,
    lastOperationLabel: gizmoMemoryLabel,
    lastError: gizmoMemoryError,
  })

  const applyAiCommand = useCallback(() => {
    if (!selectedObject) return
    const patch = parseAiViewportCommand(aiCommand, selectedObject)
    if (!patch) return
    const afterObject: ViewportSceneObject = { ...selectedObject, ...patch }
    onGizmoTransformOperation?.(buildGizmoTransformOperation({
      objectsBefore: [selectedObject],
      objectsAfter: [afterObject],
      mode: Object.prototype.hasOwnProperty.call(patch, 'rotation') ? 'rotate' : Object.prototype.hasOwnProperty.call(patch, 'scale') ? 'scale' : 'translate',
      space: transformSpace,
      snapEnabled,
      source: 'agent',
      reason: aiCommand,
      evidenceRefs: ['viewport:ai-command'],
    }))
    onObjectsChange(objects.map((object) => (object.id === selectedObject.id ? afterObject : object)))
    onAIAction?.(aiCommand)
  }, [aiCommand, objects, onAIAction, onGizmoTransformOperation, onObjectsChange, selectedObject, snapEnabled, transformSpace])

  const handleAssetDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!onImportAssets) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setAssetDragActive(true)
  }, [onImportAssets])

  const handleAssetDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setAssetDragActive(false)
  }, [])

  const handleAssetDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!onImportAssets) return
    event.preventDefault()
    setAssetDragActive(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onImportAssets(files)
  }, [onImportAssets])

  useEffect(() => {
    function handleViewportHotkeys(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableViewportKeyboardTarget(event.target)) return
      if (event.code === 'KeyW') {
        event.preventDefault()
        onTransformModeChange('translate')
        return
      }
      if (event.code === 'KeyE') {
        event.preventDefault()
        onTransformModeChange('rotate')
        return
      }
      if (event.code === 'KeyR') {
        event.preventDefault()
        onTransformModeChange('scale')
        return
      }
      if (event.code === 'KeyX') {
        event.preventDefault()
        commitGizmoConstraint(gizmoConstraint === 'x' ? 'free' : 'x')
        return
      }
      if (event.code === 'KeyY') {
        event.preventDefault()
        commitGizmoConstraint(gizmoConstraint === 'y' ? 'free' : 'y')
        return
      }
      if (event.code === 'KeyZ') {
        event.preventDefault()
        commitGizmoConstraint(gizmoConstraint === 'z' ? 'free' : 'z')
        return
      }
      if (event.code === 'KeyG') {
        event.preventDefault()
        commitGizmoPivotMode(gizmoPivotMode === 'median' ? 'active-object' : 'median')
        return
      }
      if (event.code === 'Escape') {
        event.preventDefault()
        onSelectionChange([])
      }
    }

    window.addEventListener('keydown', handleViewportHotkeys)
    return () => window.removeEventListener('keydown', handleViewportHotkeys)
  }, [commitGizmoConstraint, commitGizmoPivotMode, gizmoConstraint, gizmoPivotMode, onSelectionChange, onTransformModeChange])

  return (
    <div
      className="relative h-full min-h-0 w-full overflow-hidden"
      onDragOver={handleAssetDragOver}
      onDragLeave={handleAssetDragLeave}
      onDrop={handleAssetDrop}
    >
      <ViewportTopToolbar
        transformMode={transformMode}
        transformSpace={transformSpace}
        snapEnabled={snapEnabled}
        cameraPreset={cameraPreset}
        gizmoSummary={topGizmoSummary}
        onTransformModeChange={onTransformModeChange}
        onTransformSpaceChange={onTransformSpaceChange}
        onSnapEnabledChange={onSnapEnabledChange}
        onCameraPresetChange={setCameraPreset}
      />

      <ViewportGizmoMemoryChip chip={gizmoMemoryChip} />

      <ViewportAICommandPanel
        creativeMode={creativeMode}
        abilityLabel={abilityLabel}
        isPlaying={isPlaying}
        aiCommand={aiCommand}
        assetImportStatus={assetImportStatus}
        onAiCommandChange={setAiCommand}
        onApplyAiCommand={applyAiCommand}
        onTogglePlayTest={onTogglePlayTest}
      />

      <ViewportAssetDropOverlay active={assetDragActive} />

      <ViewportScene
        objects={objects.length > 0 ? objects : defaultObjects}
        selectedIds={selectedIds}
        transformMode={transformMode}
        transformSpace={transformSpace}
        gizmoConstraint={gizmoConstraint}
        gizmoPivotMode={gizmoPivotMode}
        snapEnabled={snapEnabled}
        creativeMode={creativeMode}
        renderMode={renderMode}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        vfxGlowIntensity={vfxGlowIntensity}
        abilityAccentColor={abilityAccentColor}
        facialExpressionIntensity={facialExpressionIntensity}
        hairHighlightColor={hairHighlightColor}
        hairVolumeIntensity={hairVolumeIntensity}
        onObjectsChange={onObjectsChange}
        onSelectionChange={onSelectionChange}
        onGizmoTransformOperation={onGizmoTransformOperation}
        cameraPreset={cameraPreset}
      />
    </div>
  )
}

export const viewportSeedObjects = defaultObjects
