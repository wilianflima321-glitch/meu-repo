'use client';

import React from 'react';
import { Copy, Eye, EyeOff, Layers, Lock, Pause, Play, Plus, SkipBack, SkipForward, Trash2, Unlock } from 'lucide-react';
import type { Color, Frame, Layer } from './SpriteEditor';

const colorToHex = (color: Color): string => {
  const r = color.r.toString(16).padStart(2, '0');
  const g = color.g.toString(16).padStart(2, '0');
  const b = color.b.toString(16).padStart(2, '0');
  const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}${a}`;
};

const colorToRgba = (color: Color): string => `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

interface ToolButtonProps {
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  tooltip: string
  shortcut?: string
}

export function ToolButton({ icon, active, onClick, tooltip, shortcut }: ToolButtonProps) {
  return (
    <button type="button" aria-label={tooltip}
      onClick={onClick}
      className={`p-2 rounded transition-colors ${
        active
          ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
          : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] hover:text-[var(--aethel-text-primary)]'
      }`}
      title={`${tooltip}${shortcut ? ` (${shortcut})` : ''}`}
    >
      {icon}
    </button>
  )
}

// ============= Color Swatch Component =============

interface ColorSwatchProps {
  color: Color
  selected?: boolean
  onClick?: () => void
  onRightClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

export function ColorSwatch({ color, selected, onClick, onRightClick, size = 'md' }: ColorSwatchProps) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size]

  return (
    <button type="button" aria-label="Selecionar cor da paleta"
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault()
        onRightClick?.()
      }}
      className={`${sizeClass} rounded border-2 ${
        selected ? 'border-[var(--aethel-border-primary)]' : 'border-[var(--aethel-border-secondary)]'
      }`}
      style={{ backgroundColor: colorToRgba(color) }}
      title={colorToHex(color)}
    />
  )
}

// ============= Layer Panel Component =============

interface LayerPanelProps {
  layers: Layer[]
  currentLayerId: string
  onSelectLayer: (id: string) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onAddLayer: () => void
  onDeleteLayer: (id: string) => void
  onDuplicateLayer: (id: string) => void
  onMoveLayer: (id: string, direction: 'up' | 'down') => void
}

export function LayerPanel({
  layers,
  currentLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayer,
}: LayerPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[var(--aethel-surface-secondary)] border-l border-[var(--aethel-border-primary)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <span className="text-sm font-medium text-[var(--aethel-text-primary)] flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Layers
        </span>
        <button type="button" aria-label="Adicionar camada"
          onClick={onAddLayer}
          className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
          title="Add Layer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {[...layers].reverse().map((layer, idx) => (
          <div
            key={layer.id}
            className={`flex items-center gap-2 px-2 py-1.5 border-b border-[var(--aethel-border-primary)] cursor-pointer ${
              layer.id === currentLayerId ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]' : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)]'
            }`}
            onClick={() => onSelectLayer(layer.id)}
          >
            <button type="button" aria-label={`${layer.visible ? 'Ocultar' : 'Mostrar'} camada ${layer.name}`}
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility(layer.id)
              }}
              className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]"
            >
              {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>

            <button type="button" aria-label={`${layer.locked ? 'Desbloquear' : 'Bloquear'} camada ${layer.name}`}
              onClick={(e) => {
                e.stopPropagation()
                onToggleLock(layer.id)
              }}
              className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]"
            >
              {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>

            <span className="flex-1 text-sm text-[var(--aethel-text-primary)] truncate">{layer.name}</span>

            <div className="flex items-center gap-1">
              <button type="button" aria-label={`Duplicar camada ${layer.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicateLayer(layer.id)
                }}
                className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]"
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button type="button" aria-label={`Excluir camada ${layer.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteLayer(layer.id)
                }}
                className="p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-error)]"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============= Timeline Component =============

interface TimelineProps {
  frames: Frame[]
  currentFrameIndex: number
  isPlaying: boolean
  onSelectFrame: (index: number) => void
  onAddFrame: () => void
  onDeleteFrame: (index: number) => void
  onDuplicateFrame: (index: number) => void
  onPlay: () => void
  onPause: () => void
  onPrevFrame: () => void
  onNextFrame: () => void
  onSetFrameDuration: (index: number, duration: number) => void
}

export function Timeline({
  frames,
  currentFrameIndex,
  isPlaying,
  onSelectFrame,
  onAddFrame,
  onDeleteFrame,
  onDuplicateFrame,
  onPlay,
  onPause,
  onPrevFrame,
  onNextFrame,
  onSetFrameDuration,
}: TimelineProps) {
  return (
    <div className="flex flex-col bg-[var(--aethel-surface-secondary)] border-t border-[var(--aethel-border-primary)]">
      {/* Playback controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <button type="button" aria-label="Ir para frame anterior"
          onClick={onPrevFrame}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]"
          title="Previous Frame"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button type="button" aria-label={isPlaying ? 'Pausar animação do sprite' : 'Reproduzir animação do sprite'}
          onClick={isPlaying ? onPause : onPlay}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button type="button" aria-label="Ir para próximo frame"
          onClick={onNextFrame}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]"
          title="Next Frame"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <span className="text-xs text-[var(--aethel-text-tertiary)] ml-2">
          Frame {currentFrameIndex + 1} / {frames.length}
        </span>

        <div className="flex-1" />

        <button type="button" aria-label="Adicionar frame"
          onClick={onAddFrame}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]"
          title="Add Frame"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Frame strip */}
      <div className="flex items-center gap-1 p-2 overflow-x-auto">
        {frames.map((frame, idx) => (
          <div
            key={frame.id}
            className={`relative flex-shrink-0 w-16 h-16 rounded border-2 cursor-pointer ${
              idx === currentFrameIndex
                ? 'border-[var(--aethel-info)]'
                : 'border-[var(--aethel-border-secondary)] hover:border-[var(--aethel-border-secondary)]'
            }`}
            onClick={() => onSelectFrame(idx)}
          >
            {/* Mini preview would go here */}
            <div className="absolute inset-0 bg-[var(--aethel-surface-quaternary)] flex items-center justify-center">
              <span className="text-xs text-[var(--aethel-text-tertiary)]">{idx + 1}</span>
            </div>

            {/* Frame duration */}
            <div className="absolute bottom-0 left-0 right-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] text-center">
              <span className="text-[10px] text-[var(--aethel-text-secondary)]">{frame.duration}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
