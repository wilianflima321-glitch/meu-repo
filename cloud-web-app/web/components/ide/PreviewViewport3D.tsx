'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import {
  Box,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  Eye,
  Grid3x3,
  Camera,
  Sparkles,
  Brain,
  X,
} from 'lucide-react'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

interface Viewport3DProps {
  content?: string
  mode?: '3d' | '2d' | 'code' | 'ai'
  onAIAction?: (action: string) => void
}

type CameraMode = 'orbit' | 'fly' | 'first-person'
type ViewMode = 'solid' | 'wireframe' | 'material' | 'render'

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '')
  if (sanitized.length !== 6) return hex
  const r = Number.parseInt(sanitized.slice(0, 2), 16)
  const g = Number.parseInt(sanitized.slice(2, 4), 16)
  const b = Number.parseInt(sanitized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const resolveCssVar = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

const ICON_BUTTON_CLASS = `rounded-lg p-2 text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] hover:text-[var(--aethel-text-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
const ACTIVE_ICON_BUTTON_CLASS = `rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] p-2 text-[var(--aethel-primary-light)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
const TOOLBAR_PILL_CLASS = `flex items-center gap-2 rounded-lg border border-[var(--aethel-primary)] bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-primary-light)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
const FLOATING_CARD_CLASS = 'absolute rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] px-3 py-2 backdrop-blur-sm'

export function PreviewViewport3D({ content: _content = '', mode: _mode = '3d', onAIAction = () => undefined }: Viewport3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit')
  const [viewMode, setViewMode] = useState<ViewMode>('solid')
  const [showGrid, setShowGrid] = useState(true)
  const [showGizmo, setShowGizmo] = useState(true)
  const [showStats, setShowStats] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [aiOverlay, setAiOverlay] = useState(false)
  const [aiThinking, setAiThinking] = useState<string[]>([])
  const [timelinePosition, setTimelinePosition] = useState(0)
  const [fps, setFps] = useState(60)
  const [selectedObject, setSelectedObject] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number | undefined
    let lastTime = 0

    const backgroundColor = resolveCssVar('--aethel-surface-primary', 'rgb(15, 23, 42)')
    const gridColor = resolveCssVar('--aethel-border-primary', 'rgb(51, 65, 85)')
    const axisX = resolveCssVar('--aethel-error', 'rgb(239, 68, 68)')
    const axisY = resolveCssVar('--aethel-success', 'rgb(34, 197, 94)')
    const axisZ = resolveCssVar('--aethel-warning', 'rgb(245, 158, 11)')
    const wireframeColor = resolveCssVar('--aethel-text-primary', 'rgb(248, 250, 252)')
    const solidColor = resolveCssVar('--aethel-primary', 'rgb(79, 70, 229)')
    const statsTextColor = resolveCssVar('--aethel-text-primary', 'rgb(248, 250, 252)')
    const statsBackground = hexToRgba(backgroundColor.startsWith('#') ? backgroundColor : 'rgb(15, 23, 42)', 0.72)

    const render = (timestamp: number) => {
      const deltaTime = timestamp - lastTime || 16.67
      lastTime = timestamp
      setFps(Math.round(1000 / deltaTime))

      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      if (showGrid) {
        ctx.strokeStyle = gridColor
        ctx.lineWidth = 1
        const gridSize = 50

        for (let i = -10; i <= 10; i++) {
          ctx.beginPath()
          ctx.moveTo(centerX + i * gridSize, 0)
          ctx.lineTo(centerX + i * gridSize, canvas.height)
          ctx.stroke()
        }

        for (let i = -10; i <= 10; i++) {
          ctx.beginPath()
          ctx.moveTo(0, centerY + i * gridSize)
          ctx.lineTo(canvas.width, centerY + i * gridSize)
          ctx.stroke()
        }

        ctx.strokeStyle = axisX
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(centerX + 100, centerY)
        ctx.stroke()

        ctx.strokeStyle = axisY
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(centerX, centerY - 100)
        ctx.stroke()

        ctx.strokeStyle = axisZ
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(centerX - 100, centerY)
        ctx.stroke()
      }

      const cubeSize = 100
      const rotation = timestamp * 0.001
      const vertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
      ] as const

      const projected = vertices.map(([x, y, z]) => {
        const cos = Math.cos(rotation)
        const sin = Math.sin(rotation)
        const rx = x * cos - z * sin
        const rz = x * sin + z * cos
        const scale = 300 / (rz + 4)
        return [
          centerX + rx * cubeSize * scale,
          centerY - y * cubeSize * scale,
        ]
      })

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ] as const

      ctx.strokeStyle = viewMode === 'wireframe' ? wireframeColor : solidColor
      ctx.lineWidth = viewMode === 'wireframe' ? 2 : 3

      edges.forEach(([i, j]) => {
        ctx.beginPath()
        ctx.moveTo(projected[i][0], projected[i][1])
        ctx.lineTo(projected[j][0], projected[j][1])
        ctx.stroke()
      })

      if (showGizmo) {
        const gizmoSize = 50
        const gizmoX = 60
        const gizmoY = canvas.height - 60

        ctx.strokeStyle = axisX
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(gizmoX, gizmoY)
        ctx.lineTo(gizmoX + gizmoSize, gizmoY)
        ctx.stroke()

        ctx.strokeStyle = axisY
        ctx.beginPath()
        ctx.moveTo(gizmoX, gizmoY)
        ctx.lineTo(gizmoX, gizmoY - gizmoSize)
        ctx.stroke()

        ctx.strokeStyle = axisZ
        ctx.beginPath()
        ctx.moveTo(gizmoX, gizmoY)
        ctx.lineTo(gizmoX - gizmoSize * 0.5, gizmoY + gizmoSize * 0.5)
        ctx.stroke()
      }

      if (showStats) {
        ctx.fillStyle = statsBackground
        ctx.fillRect(10, 10, 150, 80)
        ctx.fillStyle = statsTextColor
        ctx.font = '12px monospace'
        ctx.fillText(`FPS: ${Math.round(1000 / deltaTime)}`, 20, 30)
        ctx.fillText('Objects: 1', 20, 50)
        ctx.fillText('Triangles: 12', 20, 70)
      }

      if (isPlaying) {
        animationId = requestAnimationFrame(render)
      }
    }

    if (isPlaying) {
      animationId = requestAnimationFrame(render)
    } else {
      render(lastTime)
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [isPlaying, showGrid, showGizmo, showStats, viewMode])

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    setSelectedObject(`object_${Math.round(x)}_${Math.round(y)}`)
  }, [])

  const simulateAIThinking = () => {
    setAiOverlay(true)
    setAiThinking(['Analyzing geometry...', 'Calculating lighting...', 'Generating textures...', 'Applying materials...'])
    onAIAction('simulate-render-pass')

    window.setTimeout(() => {
      setAiThinking((prev) => [...prev, 'Render complete!'])
    }, 2000)
  }

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? 'Pause 3D viewport' : 'Play 3D viewport'}
            className={`rounded-lg p-2 ${CANONICAL_FOCUS} ${CANONICAL_MOTION} ${
              isPlaying
                ? 'bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <div className="h-6 w-px bg-[var(--aethel-border-primary)]" />

          <button type="button" onClick={() => setCameraMode('orbit')} aria-label="Use orbit camera" className={cameraMode === 'orbit' ? ACTIVE_ICON_BUTTON_CLASS : ICON_BUTTON_CLASS} title="Camera Orbit">
            <Camera className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setCameraMode('fly')} aria-label="Use fly camera" className={cameraMode === 'fly' ? ACTIVE_ICON_BUTTON_CLASS : ICON_BUTTON_CLASS} title="Camera Fly">
            <Box className="h-4 w-4" />
          </button>

          <div className="h-6 w-px bg-[var(--aethel-border-primary)]" />

          <button type="button" onClick={() => setViewMode('solid')} aria-label="Use solid viewport mode" className={viewMode === 'solid' ? ACTIVE_ICON_BUTTON_CLASS : ICON_BUTTON_CLASS} title="Solid">
            <Box className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setViewMode('wireframe')} aria-label="Use wireframe viewport mode" className={viewMode === 'wireframe' ? ACTIVE_ICON_BUTTON_CLASS : ICON_BUTTON_CLASS} title="Wireframe">
            <Grid3x3 className="h-4 w-4" />
          </button>

          <div className="h-6 w-px bg-[var(--aethel-border-primary)]" />

          <button type="button" onClick={() => setShowGrid(!showGrid)} aria-label={showGrid ? 'Hide viewport grid' : 'Show viewport grid'} className={showGrid ? ACTIVE_ICON_BUTTON_CLASS : ICON_BUTTON_CLASS} title="Grid">
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setShowGizmo(!showGizmo)} aria-label={showGizmo ? 'Hide viewport gizmo' : 'Show viewport gizmo'} className={showGizmo ? ACTIVE_ICON_BUTTON_CLASS : ICON_BUTTON_CLASS} title="Gizmo">
            <Layers className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setShowStats(!showStats)} aria-label={showStats ? 'Hide viewport stats' : 'Show viewport stats'} className={showStats ? ACTIVE_ICON_BUTTON_CLASS : ICON_BUTTON_CLASS} title="Stats">
            <Eye className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={simulateAIThinking} aria-label="Run AI render pass in the viewport" className={TOOLBAR_PILL_CLASS}>
            <Sparkles className="h-4 w-4" />
            AI Render
          </button>
          <button type="button" onClick={() => setIsFullscreen(!isFullscreen)} aria-label={isFullscreen ? 'Exit viewport fullscreen mode' : 'Enter viewport fullscreen mode'} className={ICON_BUTTON_CLASS} title="Fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => setTimelinePosition(0)} aria-label="Reset viewport timeline" className={ICON_BUTTON_CLASS} title="Reset">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-[var(--aethel-surface-secondary)]">
        <canvas ref={canvasRef} width={800} height={600} className="h-full w-full cursor-crosshair" onClick={handleCanvasClick} />

        {aiOverlay && (
          <div className="absolute inset-4 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 animate-pulse text-[var(--aethel-primary-light)]" />
                <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">AI processing</span>
              </div>
              <button type="button" onClick={() => setAiOverlay(false)} aria-label="Close AI processing overlay" className={ICON_BUTTON_CLASS.replace('p-2', 'p-1')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {aiThinking.map((step, index) => (
                <div key={`${step}-${index}`} className="flex items-center gap-2 text-xs text-[var(--aethel-text-secondary)]">
                  <div className={`h-2 w-2 rounded-full ${index === aiThinking.length - 1 ? 'animate-pulse bg-[var(--aethel-primary-light)]' : 'bg-[var(--aethel-success-light)]'}`} />
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedObject && (
          <div className={`${FLOATING_CARD_CLASS} bottom-4 left-4`}>
            <div className="text-xs text-[var(--aethel-text-tertiary)]">Selected</div>
            <div className="text-xs font-mono text-[var(--aethel-text-primary)]">{selectedObject}</div>
          </div>
        )}

        <div className={`${FLOATING_CARD_CLASS} right-4 top-4`}>
          <div className="text-xs text-[var(--aethel-text-tertiary)]">Camera</div>
          <div className="text-xs capitalize text-[var(--aethel-text-primary)]">{cameraMode}</div>
          <div className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">{fps} FPS</div>
        </div>
      </div>

      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">Timeline</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]">
            <div className="h-full bg-[var(--aethel-primary)] transition-all" style={{ width: `${timelinePosition}%` }} />
          </div>
          <span className="text-xs font-mono text-[var(--aethel-text-tertiary)]">{(timelinePosition / 100).toFixed(2)}s</span>
        </div>
      </div>
    </div>
  )
}
