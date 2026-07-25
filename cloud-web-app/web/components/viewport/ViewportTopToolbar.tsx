'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Activity,
  Camera,
  ChevronDown,
  Cpu,
  Crosshair,
  Film,
  Gauge,
  Move3D,
  RotateCw,
  Scale3D,
  Target,
} from 'lucide-react'
import {
  VIEWPORT_CAMERA_PRESETS,
  type ViewportCameraPreset,
} from '@/components/viewport/viewport-camera-presets'
import type {
  ViewportRenderStats,
  ViewportTransformMode,
  ViewportTransformSpace,
} from '@/components/viewport/AethelViewport3D'
import type { GizmoInspectorSummary } from '@/lib/viewport/gizmo-elite-controls'

const iconButton =
  'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] p-2 text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'
const activeButton =
  'inline-flex items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] p-2 text-[var(--aethel-primary-light)] transition hover:brightness-110'
const compactTextButton =
  'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'

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
  onFrameSelection,
  renderStats = null,
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
  onFrameSelection: () => void
  /** Real R3F `gl.info` telemetry (Anti-Mock fix) — null until the first sample lands. */
  renderStats?: ViewportRenderStats | null
}) {
  const cameraPresetLabel =
    VIEWPORT_CAMERA_PRESETS.find((preset) => preset.id === cameraPreset)
      ?.label ?? 'View'
  const transformTools: Array<{
    id: ViewportTransformMode
    label: string
    shortcut: string
    icon: typeof Move3D
  }> = [
    { id: 'translate', label: 'Move', shortcut: 'W', icon: Move3D },
    { id: 'rotate', label: 'Rotate', shortcut: 'E', icon: RotateCw },
    { id: 'scale', label: 'Scale', shortcut: 'R', icon: Scale3D },
  ]

  const [showStats, setShowStats] = useState(false)

  return (
    <>
      <div
        className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.78)] p-1.5 shadow-[0_18px_54px_rgba(0,0,0,0.32)] backdrop-blur-md"
        role="toolbar"
        aria-label="Viewport compact tool rail"
        data-viewport-top-toolbar="compact"
        title={gizmoSummary.detail}
      >
        {transformTools.map((tool) => {
          const Icon = tool.icon
          const active = transformMode === tool.id
          return (
            <button
              key={tool.id}
              type="button"
              aria-label={`Activate ${tool.label} mode`}
              title={`${tool.label} (${tool.shortcut})`}
              onClick={() => onTransformModeChange(tool.id)}
              className={active ? activeButton : iconButton}
            >
              <Icon className="h-4 w-4" />
              <span className="sr-only">{tool.shortcut}</span>
            </button>
          )
        })}
        <span
          className="mx-1 h-6 w-px bg-[var(--aethel-border-subtle)]"
          aria-hidden
        />
        <button
          type="button"
          aria-label={`${snapEnabled ? 'Disable' : 'Enable'} grid snapping`}
          title={snapEnabled ? 'Snap on' : 'Snap off'}
          onClick={() => onSnapEnabledChange(!snapEnabled)}
          className={snapEnabled ? activeButton : iconButton}
        >
          <Target className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Switch to space ${transformSpace === 'world' ? 'local' : 'world'}`}
          title={`${transformSpace === 'world' ? 'World' : 'Local'} space`}
          onClick={() =>
            onTransformSpaceChange(transformSpace === 'world' ? 'local' : 'world')
          }
          className={transformSpace === 'local' ? activeButton : iconButton}
        >
          <Film className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Frame selected object"
          title="Frame selection (F)"
          onClick={onFrameSelection}
          className={iconButton}
        >
          <Crosshair className="h-4 w-4" />
          <span className="sr-only">F</span>
        </button>
        <button
          type="button"
          aria-label="Toggle real-time stat FPS overlay"
          title="Stat FPS / GPU Unit (UE5 Parity)"
          onClick={() => setShowStats((s) => !s)}
          className={showStats ? activeButton : iconButton}
        >
          <Gauge className="h-4 w-4" />
        </button>
        <ViewportCameraDropdown
          cameraPreset={cameraPreset}
          cameraPresetLabel={cameraPresetLabel}
          onCameraPresetChange={onCameraPresetChange}
          activeButton={activeButton}
          compactTextButton={compactTextButton}
        />
      </div>

      {/* Stat FPS Overlay — real THREE.WebGLRenderer.info telemetry, sampled in RenderStatsProbe (no fabricated numbers) */}
      {showStats && (
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-1 rounded-xl border border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.85)] p-3 font-mono text-[11px] text-[var(--aethel-text-primary)] shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--aethel-border-subtle)] pb-1.5 mb-1">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <Activity className="h-3.5 w-3.5 animate-pulse" /> Stat FPS
            </span>
            <span className="text-[10px] text-[var(--aethel-text-quaternary)]">
              {renderStats?.pipelineLabel ?? 'r3f-webgl2'}
            </span>
          </div>
          {renderStats ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-[var(--aethel-text-tertiary)]">Frame Rate:</span>
              <span className="font-bold text-emerald-400">{renderStats.fps.toFixed(1)} FPS</span>

              <span className="text-[var(--aethel-text-tertiary)]">Frame Time:</span>
              <span className="font-bold text-cyan-400">{renderStats.frameTimeMs.toFixed(1)} ms</span>

              <span className="text-[var(--aethel-text-tertiary)]">Draw Calls:</span>
              <span className="text-[var(--aethel-text-primary)]">{renderStats.drawCalls} calls</span>

              <span className="text-[var(--aethel-text-tertiary)]">Triangles:</span>
              <span className="text-[var(--aethel-text-primary)]">
                {renderStats.triangles >= 1000
                  ? `${(renderStats.triangles / 1000).toFixed(1)}k tris`
                  : `${renderStats.triangles} tris`}
              </span>

              <span className="text-[var(--aethel-text-tertiary)]">Geometries:</span>
              <span className="text-[var(--aethel-text-primary)]">{renderStats.geometries}</span>

              <span className="text-[var(--aethel-text-tertiary)]">Textures:</span>
              <span className="text-[var(--aethel-text-primary)]">{renderStats.textures}</span>
            </div>
          ) : (
            <p className="py-1 text-[var(--aethel-text-quaternary)]">Sampling renderer…</p>
          )}
        </div>
      )}
    </>
  )
}

function ViewportCameraDropdown({
  cameraPreset,
  cameraPresetLabel,
  onCameraPresetChange,
  activeButton,
  compactTextButton,
}: {
  cameraPreset: ViewportCameraPreset
  cameraPresetLabel: string
  onCameraPresetChange: (preset: ViewportCameraPreset) => void
  activeButton: string
  compactTextButton: string
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={menuRef} className="relative" data-viewport-camera-menu="progressive">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Open viewport view menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
      >
        <Camera className="h-4 w-4" />
        <span>{cameraPresetLabel}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-30 grid min-w-[140px] gap-1 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.94)] p-2 shadow-[0_22px_64px_rgba(0,0,0,0.44)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
            View menu
          </p>
          {VIEWPORT_CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-label={`Activate ${preset.label} camera`}
              onClick={() => {
                onCameraPresetChange(preset.id)
                setOpen(false)
              }}
              className={
                cameraPreset === preset.id ? activeButton : compactTextButton
              }
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
