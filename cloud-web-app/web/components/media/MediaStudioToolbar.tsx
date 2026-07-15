'use client'

import { formatTime } from './media-studio-core'

type ToolbarProps = {
  currentTime: number
  duration: number
  exporting: boolean
  exportStatus: string
  isPlaying: boolean
  zoom: number
  onExport: () => void
  onImport: (file: File) => void
  onSetZoom: (zoom: number) => void
  onTogglePlay: () => void
  onStop: () => void
}

export function MediaStudioToolbar({
  currentTime,
  duration,
  exporting,
  exportStatus,
  isPlaying,
  zoom,
  onExport,
  onImport,
  onSetZoom,
  onTogglePlay,
  onStop,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]">
      <div className="text-sm font-semibold text-[var(--aethel-text-primary)]">Media Studio</div>

      <button type="button" aria-label="Toggle Media Studio playback"
        className="ml-3 px-3 py-1 rounded bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)] text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_85%,transparent)]"
        onClick={onTogglePlay}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button type="button" aria-label="Stop Media Studio playback"
        className="px-3 py-1 rounded bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)] text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_85%,transparent)]"
        onClick={onStop}
      >
        Stop
      </button>

      <button type="button" aria-label={exporting ? 'Exporting Media Studio media' : 'Export Media Studio media'}
        className="px-3 py-1 rounded bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)] text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_85%,transparent)] disabled:opacity-50"
        onClick={onExport}
        disabled={exporting}
      >
        {exporting ? 'Exporting...' : 'Export WebM'}
      </button>

      {exportStatus && <div className="text-xs text-[var(--aethel-text-tertiary)]">{exportStatus}</div>}

      <div className="ml-3 text-xs text-[var(--aethel-text-quaternary)] font-mono">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label className="text-xs text-[var(--aethel-text-quaternary)] flex items-center gap-2">
          Zoom
          <input
            type="range"
            min={20}
            max={200}
            value={zoom}
            onChange={(e) => onSetZoom(parseInt(e.target.value, 10))}
          />
        </label>

        <label className="px-3 py-1 rounded bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)] text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_85%,transparent)] cursor-pointer">
          Import
          <input
            className="hidden"
            type="file"
            accept="audio/*,video/*,image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              onImport(file)
              e.currentTarget.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}
