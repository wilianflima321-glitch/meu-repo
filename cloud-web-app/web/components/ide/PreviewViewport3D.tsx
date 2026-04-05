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
  Cube,
  Camera,
  Settings,
  Sparkles,
  Brain,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react'

interface Viewport3DProps {
  content: string
  mode: '3d' | '2d' | 'code' | 'ai'
  onAIAction: (action: string) => void
}

type CameraMode = 'orbit' | 'fly' | 'first-person'
type ViewMode = 'solid' | 'wireframe' | 'material' | 'render'

export function PreviewViewport3D({ content, mode = '3d', onAIAction }: Viewport3DProps) {
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

  // Simular renderização 3D
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let lastTime = 0

    const render = (timestamp: number) => {
      const deltaTime = timestamp - lastTime
      lastTime = timestamp

      // Limpar canvas
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Desenhar grid 3D (simulado)
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.lineWidth = 1
        const gridSize = 50
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2

        // Grid horizontal
        for (let i = -10; i <= 10; i++) {
          ctx.beginPath()
          ctx.moveTo(centerX + i * gridSize, 0)
          ctx.lineTo(centerX + i * gridSize, canvas.height)
          ctx.stroke()
        }

        // Grid vertical
        for (let i = -10; i <= 10; i++) {
          ctx.beginPath()
          ctx.moveTo(0, centerY + i * gridSize)
          ctx.lineTo(canvas.width, centerY + i * gridSize)
          ctx.stroke()
        }

        // Eixos
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(centerX + 100, centerY)
        ctx.stroke()

        ctx.strokeStyle = '#4ecdc4'
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(centerX, centerY - 100)
        ctx.stroke()

        ctx.strokeStyle = '#ffe66d'
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(centerX - 100, centerY)
        ctx.stroke()
      }

      // Desenhar cubo 3D (simulado)
      const cubeSize = 100
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const rotation = timestamp * 0.001

      const vertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
      ]

      const projected = vertices.map(([x, y, z]) => {
        // Rotação Y
        const cos = Math.cos(rotation)
        const sin = Math.sin(rotation)
        const rx = x * cos - z * sin
        const rz = x * sin + z * cos

        // Projeção perspectiva
        const scale = 300 / (rz + 4)
        return [
          cx + rx * cubeSize * scale,
          cy - y * cubeSize * scale
        ]
      })

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ]

      ctx.strokeStyle = viewMode === 'wireframe'  '#ffffff' : '#6366f1'
      ctx.lineWidth = viewMode === 'wireframe'  2 : 3

      edges.forEach(([i, j]) => {
        ctx.beginPath()
        ctx.moveTo(projected[i][0], projected[i][1])
        ctx.lineTo(projected[j][0], projected[j][1])
        ctx.stroke()
      })

      // Gizmo de câmera
      if (showGizmo) {
        const gizmoSize = 50
        const gizmoX = 60
        const gizmoY = canvas.height - 60

        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(gizmoX, gizmoY)
        ctx.lineTo(gizmoX + gizmoSize, gizmoY)
        ctx.stroke()

        ctx.strokeStyle = '#4ecdc4'
        ctx.beginPath()
        ctx.moveTo(gizmoX, gizmoY)
        ctx.lineTo(gizmoX, gizmoY - gizmoSize)
        ctx.stroke()

        ctx.strokeStyle = '#ffe66d'
        ctx.beginPath()
        ctx.moveTo(gizmoX, gizmoY)
        ctx.lineTo(gizmoX - gizmoSize * 0.5, gizmoY + gizmoSize * 0.5)
        ctx.stroke()
      }

      // Stats
      if (showStats) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(10, 10, 150, 80)
        ctx.fillStyle = '#ffffff'
        ctx.font = '12px monospace'
        ctx.fillText(`FPS: ${Math.round(1000 / deltaTime)}`, 20, 30)
        ctx.fillText(`Objects: 1`, 20, 50)
        ctx.fillText(`Triangles: 12`, 20, 70)
      }

      if (isPlaying) {
        animationId = requestAnimationFrame(render)
      }
    }

    if (isPlaying) {
      animationId = requestAnimationFrame(render)
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [isPlaying, showGrid, showGizmo, showStats, viewMode])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setSelectedObject(`object_${Math.round(x)}_${Math.round(y)}`)
  }, [])

  const simulateAIThinking = () => {
    setAiOverlay(true)
    setAiThinking(['Analisando geometria...', 'Calculando iluminação...', 'Gerando texturas...', 'Aplicando materiais...'])
    
    setTimeout(() => {
      setAiThinking(prev => [...prev, 'Renderização completa!'])
    }, 2000)
  }

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      {/* Toolbar Superior */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-lg transition-colors ${
              isPlaying
                 'bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]'
            }`}
            title={isPlaying  'Pausar' : 'Reproduzir'}
          >
            {isPlaying  <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <div className="w-px h-6 bg-[var(--aethel-border-primary)]" />

          <button
            type="button"
            onClick={() => setCameraMode('orbit')}
            className={`p-2 rounded-lg transition-colors ${
              cameraMode === 'orbit'
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            title="Câmera Orbit"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setCameraMode('fly')}
            className={`p-2 rounded-lg transition-colors ${
              cameraMode === 'fly'
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            title="Câmera Fly"
          >
            <Box className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-[var(--aethel-border-primary)]" />

          <button
            type="button"
            onClick={() => setViewMode('solid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'solid'
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            title="Solid"
          >
            <Cube className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setViewMode('wireframe')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'wireframe'
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            title="Wireframe"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-[var(--aethel-border-primary)]" />

          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${
              showGrid
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            title="Grid"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowGizmo(!showGizmo)}
            className={`p-2 rounded-lg transition-colors ${
              showGizmo
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            title="Gizmo"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowStats(!showStats)}
            className={`p-2 rounded-lg transition-colors ${
              showStats
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            title="Stats"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={simulateAIThinking}
            className="flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] border border-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-primary-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]"
          >
            <Sparkles className="w-4 h-4" />
            IA Render
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Tela cheia"
          >
            {isFullscreen  <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setTimelinePosition(0)}
            className="p-2 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Viewport 3D */}
      <div className="flex-1 relative bg-[var(--aethel-surface-secondary)]">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full cursor-crosshair"
          onClick={handleCanvasClick}
        />

        {/* AI Overlay */}
        {aiOverlay && (
          <div className="absolute inset-4 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] backdrop-blur-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[var(--aethel-primary-light)] animate-pulse" />
                <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">IA Processando</span>
              </div>
              <button
                type="button"
                onClick={() => setAiOverlay(false)}
                className="p-1 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {aiThinking.map((step, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-[var(--aethel-text-secondary)]">
                  <div className={`w-2 h-2 rounded-full ${index === aiThinking.length - 1  'bg-[var(--aethel-primary-light)] animate-pulse' : 'bg-[var(--aethel-success-light)]'}`} />
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Object Info */}
        {selectedObject && (
          <div className="absolute bottom-4 left-4 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] backdrop-blur-sm px-3 py-2">
            <div className="text-[10px] text-[var(--aethel-text-tertiary)]">Selecionado</div>
            <div className="text-xs font-mono text-[var(--aethel-text-primary)]">{selectedObject}</div>
          </div>
        )}

        {/* Camera Info */}
        <div className="absolute top-4 right-4 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] backdrop-blur-sm px-3 py-2">
          <div className="text-[10px] text-[var(--aethel-text-tertiary)]">Câmera</div>
          <div className="text-xs text-[var(--aethel-text-primary)] capitalize">{cameraMode}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-[var(--aethel-text-tertiary)]">Timeline</span>
          <div className="flex-1 h-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] overflow-hidden">
            <div 
              className="h-full bg-[var(--aethel-primary)] transition-all"
              style={{ width: `${timelinePosition}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--aethel-text-tertiary)] font-mono">{(timelinePosition / 100).toFixed(2)}s</span>
        </div>
      </div>
    </div>
  )
}
