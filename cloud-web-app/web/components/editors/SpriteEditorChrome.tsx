'use client'

import type { MouseEvent, Ref } from 'react'
import {
  Circle,
  Download,
  Eraser,
  Grid,
  PaintBucket,
  Palette,
  Pencil,
  Pipette,
  Redo,
  Settings,
  Square,
  Undo,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { ColorSwatch, ToolButton } from './SpriteEditorParts'
import type { Color, Tool } from './SpriteEditor.types'

export function SpriteEditorHeader({ width, height }: { width: number; height: number }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)]">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[var(--aethel-text-primary)]">Sprite Editor</span>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">{width} x {height}</span>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" aria-label="Export sprite" className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]" title="Export">
          <Download className="w-4 h-4" />
        </button>
        <button type="button" aria-label="Import sprite" className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]" title="Import">
          <Upload className="w-4 h-4" />
        </button>
        <button type="button" aria-label="Open sprite editor settings" className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]" title="Settings">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function SpriteEditorToolbar({
  tool,
  showGrid,
  primaryColor,
  secondaryColor,
  onSetTool,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
}: {
  tool: Tool
  showGrid: boolean
  primaryColor: Color
  secondaryColor: Color
  onSetTool: (tool: Tool) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleGrid: () => void
}) {
  return (
    <div className="flex flex-col gap-1 p-2 bg-[var(--aethel-surface-secondary)] border-r border-[var(--aethel-border-primary)]">
      <ToolButton icon={<Pencil className="w-4 h-4" />} active={tool === 'pencil'} onClick={() => onSetTool('pencil')} tooltip="Pencil" shortcut="B" />
      <ToolButton icon={<Eraser className="w-4 h-4" />} active={tool === 'eraser'} onClick={() => onSetTool('eraser')} tooltip="Eraser" shortcut="E" />
      <ToolButton icon={<PaintBucket className="w-4 h-4" />} active={tool === 'fill'} onClick={() => onSetTool('fill')} tooltip="Fill" shortcut="G" />
      <ToolButton icon={<Pipette className="w-4 h-4" />} active={tool === 'eyedropper'} onClick={() => onSetTool('eyedropper')} tooltip="Eyedropper" shortcut="I" />
      <ToolButton icon={<Square className="w-4 h-4" />} active={tool === 'rectangle'} onClick={() => onSetTool('rectangle')} tooltip="Rectangle" shortcut="R" />
      <ToolButton icon={<Circle className="w-4 h-4" />} active={tool === 'circle'} onClick={() => onSetTool('circle')} tooltip="Circle" shortcut="C" />

      <div className="h-px bg-[var(--aethel-surface-quaternary)] my-2" />

      <ToolButton icon={<Undo className="w-4 h-4" />} active={false} onClick={() => {}} tooltip="Undo" shortcut="Ctrl+Z" />
      <ToolButton icon={<Redo className="w-4 h-4" />} active={false} onClick={() => {}} tooltip="Redo" shortcut="Ctrl+Y" />

      <div className="h-px bg-[var(--aethel-surface-quaternary)] my-2" />

      <ToolButton icon={<ZoomIn className="w-4 h-4" />} active={false} onClick={onZoomIn} tooltip="Zoom In" shortcut="+" />
      <ToolButton icon={<ZoomOut className="w-4 h-4" />} active={false} onClick={onZoomOut} tooltip="Zoom Out" shortcut="-" />
      <ToolButton icon={<Grid className="w-4 h-4" />} active={showGrid} onClick={onToggleGrid} tooltip="Toggle Grid" />

      <div className="flex-1" />

      <div className="relative">
        <ColorSwatch color={primaryColor} size="lg" />
        <div className="absolute bottom-0 right-0">
          <ColorSwatch color={secondaryColor} size="md" />
        </div>
      </div>
    </div>
  )
}

export function SpritePalettePanel({
  palette,
  onPrimaryColor,
  onSecondaryColor,
}: {
  palette: Color[]
  onPrimaryColor: (color: Color) => void
  onSecondaryColor: (color: Color) => void
}) {
  return (
    <div className="p-3 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)]">
      <div className="flex items-center gap-2 mb-2">
        <Palette className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
        <span className="text-sm font-medium text-[var(--aethel-text-primary)]">Palette</span>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {palette.map((color, idx) => (
          <ColorSwatch
            key={idx}
            color={color}
            size="sm"
            onClick={() => onPrimaryColor(color)}
            onRightClick={() => onSecondaryColor(color)}
          />
        ))}
      </div>
    </div>
  )
}

export function SpriteCanvasStage({
  canvasRef,
  width,
  height,
  zoom,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: {
  canvasRef: Ref<HTMLCanvasElement>
  width: number
  height: number
  zoom: number
  onMouseDown: (event: MouseEvent<HTMLCanvasElement>) => void
  onMouseMove: (event: MouseEvent<HTMLCanvasElement>) => void
  onMouseUp: () => void
}) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--aethel-surface-primary)] overflow-auto">
      <canvas
        ref={canvasRef}
        width={width * zoom}
        height={height * zoom}
        className="cursor-crosshair"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onContextMenu={(event) => event.preventDefault()}
      />
    </div>
  )
}
