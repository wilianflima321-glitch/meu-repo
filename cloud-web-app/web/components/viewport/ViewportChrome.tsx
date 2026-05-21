'use client'

import { Camera, Film, Move3D, RotateCw, Scale3D, Sparkles, Target, Wand2 } from 'lucide-react'
import {
  VIEWPORT_CAMERA_PRESETS,
  type ViewportCameraPreset,
} from '@/components/viewport/viewport-camera-presets'
import type {
  ViewportCreativeMode,
  ViewportTransformMode,
  ViewportTransformSpace,
} from '@/components/viewport/AethelViewport3D'
import type { GizmoInspectorSummary } from '@/lib/viewport/gizmo-elite-controls'
import type { GizmoTransformPersistenceChipTone } from '@/lib/viewport/gizmo-transform-persistence'

const iconButton = 'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] p-2 text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'
const activeButton = 'inline-flex items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] p-2 text-[var(--aethel-primary-light)] transition hover:brightness-110'
const panelButton = 'inline-flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)]'
const compactTextButton = 'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'

const memoryChipToneClass: Record<GizmoTransformPersistenceChipTone, string> = {
  neutral: 'border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.78)] text-[var(--aethel-text-tertiary)]',
  saving: 'border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_14%,rgba(7,12,20,0.72))] text-[var(--aethel-info-light)]',
  success: 'border-[color-mix(in_srgb,var(--aethel-success)_36%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_14%,rgba(7,12,20,0.72))] text-[var(--aethel-success-light)]',
  warning: 'border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_14%,rgba(7,12,20,0.72))] text-[var(--aethel-warning-light)]',
  error: 'border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_14%,rgba(7,12,20,0.72))] text-[var(--aethel-error-light)]',
}

export function ViewportTopToolbar({
  transformMode,
  transformSpace,
  snapEnabled,
  cameraPreset,
  gizmoSummary,
  onTransformModeChange,
  onTransformSpaceChange,
  onSnapEnabledChange,
  onCameraPresetChange,
}: {
  transformMode: ViewportTransformMode
  transformSpace: ViewportTransformSpace
  snapEnabled: boolean
  cameraPreset: ViewportCameraPreset
  gizmoSummary: GizmoInspectorSummary
  onTransformModeChange: (mode: ViewportTransformMode) => void
  onTransformSpaceChange: (space: ViewportTransformSpace) => void
  onSnapEnabledChange: (enabled: boolean) => void
  onCameraPresetChange: (preset: ViewportCameraPreset) => void
}) {
  return (
    <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
      <button type="button" aria-label="Activate move mode" onClick={() => onTransformModeChange('translate')} className={transformMode === 'translate' ? activeButton : iconButton}>
        <Move3D className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Activate rotate mode" onClick={() => onTransformModeChange('rotate')} className={transformMode === 'rotate' ? activeButton : iconButton}>
        <RotateCw className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Activate scale mode" onClick={() => onTransformModeChange('scale')} className={transformMode === 'scale' ? activeButton : iconButton}>
        <Scale3D className="h-4 w-4" />
      </button>
      <button type="button" aria-label={`${snapEnabled ? 'Disable' : 'Enable'} grid snapping`} onClick={() => onSnapEnabledChange(!snapEnabled)} className={snapEnabled ? activeButton : iconButton}>
        <Target className="h-4 w-4" />
      </button>
      <button type="button" aria-label={`Switch to space ${transformSpace === 'world' ? 'local' : 'world'}`} onClick={() => onTransformSpaceChange(transformSpace === 'world' ? 'local' : 'world')} className={transformSpace === 'local' ? activeButton : iconButton}>
        <Film className="h-4 w-4" />
      </button>
      <span className="mx-1 h-6 w-px bg-[var(--aethel-border-subtle)]" aria-hidden />
      {VIEWPORT_CAMERA_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          aria-label={`Activate ${preset.label} camera`}
          onClick={() => onCameraPresetChange(preset.id)}
          className={cameraPreset === preset.id ? activeButton : compactTextButton}
        >
          {preset.id === 'perspective' ? <Camera className="h-4 w-4" /> : preset.label}
        </button>
      ))}
      <span
        className="rounded-full border border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.72)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-tertiary)]"
        title={gizmoSummary.detail}
      >
        {gizmoSummary.chips.slice(2, 4).join(' / ')}
      </span>
    </div>
  )
}

export function ViewportGizmoMemoryChip({
  chip,
}: {
  chip: {
    visible: boolean
    tone: GizmoTransformPersistenceChipTone
    label: string
    detail: string
  }
}) {
  if (!chip.visible) return null

  return (
    <div
      className={`absolute left-4 top-[58px] z-20 max-w-[360px] rounded-full border px-3 py-2 text-xs shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-md ${memoryChipToneClass[chip.tone]}`}
      role={chip.tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="font-semibold">{chip.label}</span>
      <span className="mx-2 text-[var(--aethel-text-quaternary)]">/</span>
      <span className="text-[var(--aethel-text-secondary)]">{chip.detail}</span>
    </div>
  )
}

export function ViewportAICommandPanel({
  creativeMode,
  abilityLabel,
  isPlaying,
  aiCommand,
  assetImportStatus,
  onAiCommandChange,
  onApplyAiCommand,
  onTogglePlayTest,
}: {
  creativeMode: ViewportCreativeMode
  abilityLabel?: string | null
  isPlaying: boolean
  aiCommand: string
  assetImportStatus: string
  onAiCommandChange: (value: string) => void
  onApplyAiCommand: () => void
  onTogglePlayTest: () => void
}) {
  return (
    <div className="absolute right-4 top-4 z-20 w-[340px] rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.86)] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Informative AI</p>
          <p className="mt-1 text-sm font-medium text-[var(--aethel-text-primary)]">Apply commands directly to the gizmo</p>
          <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">
            {creativeMode === 'film' ? 'Film mode prioritizes timing, cinematic glow, and fast rendering.' : 'Game mode prioritizes playtesting, visual logic, and ability iteration.'}
            {abilityLabel ? ` Active ability: ${abilityLabel}.` : ''}
          </p>
        </div>
        <button type="button" aria-label={isPlaying ? 'Stop viewport play test' : 'Run viewport play test'} onClick={onTogglePlayTest} className={panelButton}>
          <Sparkles className="h-4 w-4" />
          {isPlaying ? 'Stop' : 'Play'}
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={aiCommand}
          onChange={(event) => onAiCommandChange(event.target.value)}
          aria-label="AI command for the selected object"
          className="flex-1 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] outline-none"
        />
        <button type="button" aria-label="Apply AI command to the selected object" onClick={onApplyAiCommand} className={panelButton}>
          <Wand2 className="h-4 w-4" />
          Apply
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--aethel-text-quaternary)]">Shift+Click selects multiple items. W/E/R switch gizmos. X/Y/Z lock axes. G toggles pivot. Esc clears selection. Use Top/Front/Side to review proportion.</p>
      <div className="mt-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
        <span className="font-medium text-[var(--aethel-text-primary)]">Asset intake:</span> {assetImportStatus}
      </div>
    </div>
  )
}

export function ViewportAssetDropOverlay({ active }: { active: boolean }) {
  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-4 z-30 grid place-items-center rounded-3xl border border-dashed border-[color-mix(in_srgb,var(--aethel-primary)_56%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_72%,transparent)] shadow-[inset_0_0_80px_rgba(0,0,0,0.42)] backdrop-blur-md">
      <div className="max-w-sm rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.9)] px-5 py-4 text-center">
        <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Drop assets into the Scene Graph</p>
        <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">Aethel will create preview objects, attach provenance evidence, and hold license review before release.</p>
      </div>
    </div>
  )
}
