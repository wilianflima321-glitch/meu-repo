'use client'

import { Download, Film, Gamepad2, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import type { ViewportRenderQuality } from '@/lib/viewport/viewport-render-contract'

export type ViewportTimelineMode = 'game' | 'film'

type TimelineOverlayProps = {
  mode: ViewportTimelineMode
  duration: number
  currentTime: number
  isPlaying: boolean
  activeWorkflowLabel: string
  selectedObjectName?: string | null
  statusLabel?: string
  renderQuality: ViewportRenderQuality
  onModeChange: (mode: ViewportTimelineMode) => void
  onRenderQualityChange: (quality: ViewportRenderQuality) => void
  onTimeChange: (time: number) => void
  onTogglePlay: () => void
  onExport: () => void | Promise<void>
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function TimelineOverlay({
  mode,
  duration,
  currentTime,
  isPlaying,
  activeWorkflowLabel,
  selectedObjectName,
  statusLabel,
  renderQuality,
  onModeChange,
  onRenderQualityChange,
  onTimeChange,
  onTogglePlay,
  onExport,
}: TimelineOverlayProps) {
  const progress = duration <= 0 ? 0 : clamp((currentTime / duration) * 100, 0, 100)
  const exportLabel = mode === 'film' ? 'Render Film' : 'Export Game Clip'

  return (
    <div className="flex h-44 flex-col border-t border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_94%,transparent))]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--aethel-border-primary)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={isPlaying ? 'Pausar timeline do viewport' : 'Reproduzir timeline do viewport'}
            onClick={onTogglePlay}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
              isPlaying
                ? 'border-[color-mix(in_srgb,var(--aethel-warning)_36%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_16%,transparent)] text-[var(--aethel-warning-light)]'
                : 'border-[color-mix(in_srgb,var(--aethel-success)_36%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_14%,transparent)] text-[var(--aethel-success-light)]'
            }`}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label="Voltar timeline para o inicio"
            onClick={() => onTimeChange(0)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Avancar timeline para o final"
            onClick={() => onTimeChange(duration)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <div className="ml-2 flex items-center gap-1 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-1">
            <button
              type="button"
              aria-label="Ativar modo game para o viewport"
              onClick={() => onModeChange('game')}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${
                mode === 'game'
                  ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-text-primary)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              Game
            </button>
            <button
              type="button"
              aria-label="Ativar modo film para o viewport"
              onClick={() => onModeChange('film')}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${
                mode === 'film'
                  ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-text-primary)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              <Film className="h-3.5 w-3.5" />
              Film
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-1 lg:flex">
            {(['draft', 'review', 'final'] as const).map((quality) => (
              <button
                key={quality}
                type="button"
                aria-label={`Set viewport render quality to ${quality}`}
                onClick={() => onRenderQualityChange(quality)}
                className={`rounded-xl px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${
                  renderQuality === quality
                    ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-text-primary)]'
                    : 'text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)]'
                }`}
              >
                {quality}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)] md:flex">
            <span>{activeWorkflowLabel}</span>
            {selectedObjectName ? <span className="text-[var(--aethel-text-primary)]">{selectedObjectName}</span> : null}
            {statusLabel ? <span className="text-[var(--aethel-primary-light)]">{statusLabel}</span> : null}
          </div>
          <button
            type="button"
            aria-label={mode === 'film' ? 'Renderizar preview de filme do viewport' : 'Exportar clip de jogo do viewport'}
            onClick={() => {
              void onExport()
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:brightness-110"
          >
            <Download className="h-3.5 w-3.5" />
            {exportLabel}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-4 py-4">
        <div className="mb-3 flex items-center justify-between text-xs text-[var(--aethel-text-tertiary)]">
          <span>{currentTime.toFixed(2)}s</span>
          <span>{duration.toFixed(2)}s</span>
        </div>
        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--aethel-border-primary)]" />
          <div className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-[var(--aethel-primary)]" style={{ width: `${progress}%` }} />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.05}
            value={currentTime}
            aria-label="Controlar playhead da timeline do viewport"
            onChange={(event) => onTimeChange(Number(event.target.value))}
            className="relative h-8 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[var(--aethel-primary-light)] [&::-webkit-slider-thumb]:bg-[var(--aethel-primary)]"
          />
        </div>
        <div className="mt-3 grid grid-cols-6 gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
          {Array.from({ length: 6 }).map((_, index) => {
            const tick = (duration / 5) * index
            return <span key={tick} className={index === 0 ? 'text-left' : index === 5 ? 'text-right' : 'text-center'}>{tick.toFixed(1)}s</span>
          })}
        </div>
      </div>
    </div>
  )
}
