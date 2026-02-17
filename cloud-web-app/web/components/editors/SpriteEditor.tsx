'use client'

/**
 * Sprite Editor - Professional Pixel Art & Sprite Animation Tool
 * Similar to Aseprite/Piskel with game engine integration
 * 
 * Features:
 * - Pixel-perfect drawing tools
 * - Animation timeline with onion skinning
 * - Layer management
 * - Sprite sheet export
 * - Tileset mode
 * - Palette management
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Square,
  Circle,
  Move,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Grid,
  Layers,
  Palette,
  Download,
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react'

// ============= Types =============

interface Color {
  r: number
  g: number
  b: number
  a: number
}

interface Pixel {
  x: number
  y: number
  color: Color
}

interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  pixels: Map<string, Color> // key: "x,y"
}

interface Frame {
  id: string
  duration: number // ms
  layers: Layer[]
}

interface Animation {
  id: string
  name: string
  frames: Frame[]
}

type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'rectangle' | 'circle' | 'line' | 'select' | 'move'
type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'

interface SpriteEditorState {
  width: number
  height: number
  animations: Animation[]
  currentAnimationId: string
  currentFrameIndex: number
  currentLayerId: string
  tool: Tool
  primaryColor: Color
  secondaryColor: Color
  brushSize: number
  zoom: number
  showGrid: boolean
  gridSize: number
  onionSkinning: boolean
  onionSkinFrames: number
  palette: Color[]
}

// ============= Utility Functions =============

const colorToHex = (color: Color): string => {
  const r = color.r.toString(16).padStart(2, '0')
  const g = color.g.toString(16).padStart(2, '0')
  const b = color.b.toString(16).padStart(2, '0')
  const a = Math.round(color.a * 255).toString(16).padStart(2, '0')
  return `#${r}${g}${b}${a}`
}

const hexToColor = (hex: string): Color => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex)
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: result[4] ? parseInt(result[4], 16) / 255 : 1,
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 }
}

const colorToRgba = (color: Color): string => {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
}

const createEmptyLayer = (id: string, name: string): Layer => ({
  id,
  name,
  visible: true,
  locked: false,
  opacity: 1,
  blendMode: 'normal',
  pixels: new Map(),
})

const createEmptyFrame = (id: string, layerId: string): Frame => ({
  id,
  duration: 100,
  layers: [createEmptyLayer(layerId, 'Layer 1')],
})

// ============= Default Palette =============

const DEFAULT_PALETTE: Color[] = [
  // Row 1: Grayscale
  { r: 0, g: 0, b: 0, a: 1 },
  { r: 34, g: 34, b: 34, a: 1 },
  { r: 68, g: 68, b: 68, a: 1 },
  { r: 102, g: 102, b: 102, a: 1 },
  { r: 136, g: 136, b: 136, a: 1 },
  { r: 170, g: 170, b: 170, a: 1 },
  { r: 204, g: 204, b: 204, a: 1 },
  { r: 255, g: 255, b: 255, a: 1 },
  
  // Row 2: Reds & Oranges
  { r: 255, g: 0, b: 0, a: 1 },
  { r: 255, g: 85, b: 0, a: 1 },
  { r: 255, g: 170, b: 0, a: 1 },
  { r: 255, g: 255, b: 0, a: 1 },
  { r: 170, g: 0, b: 0, a: 1 },
  { r: 170, g: 85, b: 0, a: 1 },
  { r: 170, g: 170, b: 0, a: 1 },
  { r: 85, g: 0, b: 0, a: 1 },
  
  // Row 3: Greens
  { r: 0, g: 255, b: 0, a: 1 },
  { r: 0, g: 170, b: 0, a: 1 },
  { r: 0, g: 85, b: 0, a: 1 },
  { r: 85, g: 255, b: 85, a: 1 },
  { r: 170, g: 255, b: 0, a: 1 },
  { r: 0, g: 255, b: 170, a: 1 },
  { r: 0, g: 255, b: 255, a: 1 },
  { r: 0, g: 170, b: 170, a: 1 },
  
  // Row 4: Blues & Purples
  { r: 0, g: 0, b: 255, a: 1 },
  { r: 0, g: 85, b: 255, a: 1 },
  { r: 0, g: 170, b: 255, a: 1 },
  { r: 85, g: 85, b: 255, a: 1 },
  { r: 170, g: 0, b: 255, a: 1 },
  { r: 255, g: 0, b: 255, a: 1 },
  { r: 255, g: 0, b: 170, a: 1 },
  { r: 255, g: 85, b: 170, a: 1 },
]

// ============= Tool Button Component =============

interface ToolButtonProps {
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  tooltip: string
  shortcut?: string
}

function ToolButton({ icon, active, onClick, tooltip, shortcut }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded transition-colors ${
        active 
          ? 'bg-sky-600 text-white' 
          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
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

function ColorSwatch({ color, selected, onClick, onRightClick, size = 'md' }: ColorSwatchProps) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size]
  
  return (
    <button
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault()
        onRightClick?.()
      }}
      className={`${sizeClass} rounded border-2 ${
        selected ? 'border-white' : 'border-slate-600'
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

function LayerPanel({
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
    <div className="flex flex-col h-full bg-slate-800 border-l border-slate-700">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <span className="text-sm font-medium text-white flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Layers
        </span>
        <button
          onClick={onAddLayer}
          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
          title="Add Layer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {[...layers].reverse().map((layer, idx) => (
          <div
            key={layer.id}
            className={`flex items-center gap-2 px-2 py-1.5 border-b border-slate-700 cursor-pointer ${
              layer.id === currentLayerId ? 'bg-sky-600/20' : 'hover:bg-slate-700/50'
            }`}
            onClick={() => onSelectLayer(layer.id)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility(layer.id)
              }}
              className="p-1 hover:bg-slate-600 rounded text-slate-400"
            >
              {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleLock(layer.id)
              }}
              className="p-1 hover:bg-slate-600 rounded text-slate-400"
            >
              {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
            
            <span className="flex-1 text-sm text-white truncate">{layer.name}</span>
            
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicateLayer(layer.id)
                }}
                className="p-1 hover:bg-slate-600 rounded text-slate-400"
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteLayer(layer.id)
                }}
                className="p-1 hover:bg-slate-600 rounded text-red-400"
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

function Timeline({
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
    <div className="flex flex-col bg-slate-800 border-t border-slate-700">
      {/* Playback controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
        <button
          onClick={onPrevFrame}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
          title="Previous Frame"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        
        <button
          onClick={onNextFrame}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
          title="Next Frame"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        
        <span className="text-xs text-slate-500 ml-2">
          Frame {currentFrameIndex + 1} / {frames.length}
        </span>
        
        <div className="flex-1" />
        
        <button
          onClick={onAddFrame}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
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
                ? 'border-sky-500' 
                : 'border-slate-600 hover:border-slate-500'
            }`}
            onClick={() => onSelectFrame(idx)}
          >
            {/* Mini preview would go here */}
            <div className="absolute inset-0 bg-slate-700 flex items-center justify-center">
              <span className="text-xs text-slate-400">{idx + 1}</span>
            </div>
            
            {/* Frame duration */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-center">
              <span className="text-[10px] text-slate-300">{frame.duration}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============= Main Sprite Editor Component =============

export default function SpriteEditor() {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  
  // State
  const [state, setState] = useState<SpriteEditorState>({
    width: 32,
    height: 32,
    animations: [{
      id: 'default',
      name: 'Default',
      frames: [createEmptyFrame('frame-1', 'layer-1')],
    }],
    currentAnimationId: 'default',
    currentFrameIndex: 0,
    currentLayerId: 'layer-1',
    tool: 'pencil',
    primaryColor: { r: 0, g: 0, b: 0, a: 1 },
    secondaryColor: { r: 255, g: 255, b: 255, a: 1 },
    brushSize: 1,
    zoom: 10,
    showGrid: true,
    gridSize: 1,
    onionSkinning: false,
    onionSkinFrames: 2,
    palette: DEFAULT_PALETTE,
  })
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)
  
  // History for undo/redo
  const [history, setHistory] = useState<Layer[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Get current animation, frame, layer
  const currentAnimation = useMemo(() => 
    state.animations.find(a => a.id === state.currentAnimationId)!,
    [state.animations, state.currentAnimationId]
  )
  
  const currentFrame = useMemo(() => 
    currentAnimation.frames[state.currentFrameIndex],
    [currentAnimation, state.currentFrameIndex]
  )
  
  const currentLayer = useMemo(() => 
    currentFrame.layers.find(l => l.id === state.currentLayerId)!,
    [currentFrame, state.currentLayerId]
  )
  
  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const { width, height, zoom, showGrid, gridSize } = state
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Checkerboard background (transparent indicator)
    const checkerSize = zoom / 2
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isLight = (x + y) % 2 === 0
        ctx.fillStyle = isLight ? '#3a3a3a' : '#2a2a2a'
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom)
      }
    }
    
    // Render onion skin (previous frames)
    if (state.onionSkinning && state.currentFrameIndex > 0) {
      ctx.globalAlpha = 0.3
      for (let i = Math.max(0, state.currentFrameIndex - state.onionSkinFrames); i < state.currentFrameIndex; i++) {
        const frame = currentAnimation.frames[i]
        frame.layers.filter(l => l.visible).forEach(layer => {
          layer.pixels.forEach((color, key) => {
            const [x, y] = key.split(',').map(Number)
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom)
          })
        })
      }
      ctx.globalAlpha = 1
    }
    
    // Render layers
    currentFrame.layers.filter(l => l.visible).forEach(layer => {
      ctx.globalAlpha = layer.opacity
      layer.pixels.forEach((color, key) => {
        const [x, y] = key.split(',').map(Number)
        ctx.fillStyle = colorToRgba(color)
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom)
      })
    })
    ctx.globalAlpha = 1
    
    // Grid
    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x * zoom, 0)
        ctx.lineTo(x * zoom, height * zoom)
        ctx.stroke()
      }
      
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y * zoom)
        ctx.lineTo(width * zoom, y * zoom)
        ctx.stroke()
      }
    }
  }, [state, currentAnimation, currentFrame])
  
  // Render on state change
  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])
  
  // Set pixel
  const setPixel = useCallback((x: number, y: number, color: Color) => {
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return
    if (currentLayer.locked) return
    
    setState(prev => {
      const newAnimations = prev.animations.map(anim => {
        if (anim.id !== prev.currentAnimationId) return anim
        return {
          ...anim,
          frames: anim.frames.map((frame, idx) => {
            if (idx !== prev.currentFrameIndex) return frame
            return {
              ...frame,
              layers: frame.layers.map(layer => {
                if (layer.id !== prev.currentLayerId) return layer
                const newPixels = new Map(layer.pixels)
                if (color.a === 0) {
                  newPixels.delete(`${x},${y}`)
                } else {
                  newPixels.set(`${x},${y}`, color)
                }
                return { ...layer, pixels: newPixels }
              }),
            }
          }),
        }
      })
      return { ...prev, animations: newAnimations }
    })
  }, [state.width, state.height, currentLayer.locked])
  
  // Draw line (Bresenham's algorithm)
  const drawLine = useCallback((x0: number, y0: number, x1: number, y1: number, color: Color) => {
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy
    
    while (true) {
      setPixel(x0, y0, color)
      
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x0 += sx
      }
      if (e2 < dx) {
        err += dx
        y0 += sy
      }
    }
  }, [setPixel])
  
  // Flood fill
  const floodFill = useCallback((startX: number, startY: number, fillColor: Color) => {
    const targetColor = currentLayer.pixels.get(`${startX},${startY}`) || { r: 0, g: 0, b: 0, a: 0 }
    
    // Don't fill if target color is same as fill color
    if (targetColor.r === fillColor.r && 
        targetColor.g === fillColor.g && 
        targetColor.b === fillColor.b && 
        targetColor.a === fillColor.a) return
    
    const stack: [number, number][] = [[startX, startY]]
    const visited = new Set<string>()
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!
      const key = `${x},${y}`
      
      if (visited.has(key)) continue
      if (x < 0 || x >= state.width || y < 0 || y >= state.height) continue
      
      const pixelColor = currentLayer.pixels.get(key) || { r: 0, g: 0, b: 0, a: 0 }
      
      if (pixelColor.r !== targetColor.r ||
          pixelColor.g !== targetColor.g ||
          pixelColor.b !== targetColor.b ||
          pixelColor.a !== targetColor.a) continue
      
      visited.add(key)
      setPixel(x, y, fillColor)
      
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
  }, [currentLayer, state.width, state.height, setPixel])
  
  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / state.zoom)
    const y = Math.floor((e.clientY - rect.top) / state.zoom)
    
    setIsDrawing(true)
    setLastPos({ x, y })
    
    const color = e.button === 2 ? state.secondaryColor : state.primaryColor
    
    switch (state.tool) {
      case 'pencil':
        setPixel(x, y, color)
        break
      case 'eraser':
        setPixel(x, y, { r: 0, g: 0, b: 0, a: 0 })
        break
      case 'fill':
        floodFill(x, y, color)
        break
      case 'eyedropper':
        const pickedColor = currentLayer.pixels.get(`${x},${y}`) || { r: 255, g: 255, b: 255, a: 1 }
        if (e.button === 2) {
          setState(prev => ({ ...prev, secondaryColor: pickedColor }))
        } else {
          setState(prev => ({ ...prev, primaryColor: pickedColor }))
        }
        break
    }
  }, [state.zoom, state.tool, state.primaryColor, state.secondaryColor, currentLayer, setPixel, floodFill])
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / state.zoom)
    const y = Math.floor((e.clientY - rect.top) / state.zoom)
    
    if (x === lastPos.x && y === lastPos.y) return
    
    const color = e.buttons === 2 ? state.secondaryColor : state.primaryColor
    
    switch (state.tool) {
      case 'pencil':
        drawLine(lastPos.x, lastPos.y, x, y, color)
        break
      case 'eraser':
        drawLine(lastPos.x, lastPos.y, x, y, { r: 0, g: 0, b: 0, a: 0 })
        break
    }
    
    setLastPos({ x, y })
  }, [isDrawing, lastPos, state.zoom, state.tool, state.primaryColor, state.secondaryColor, drawLine])
  
  const handleMouseUp = useCallback(() => {
    setIsDrawing(false)
    setLastPos(null)
  }, [])
  
  // Layer operations
  const addLayer = useCallback(() => {
    const layerId = `layer-${Date.now()}`
    setState(prev => ({
      ...prev,
      animations: prev.animations.map(anim => {
        if (anim.id !== prev.currentAnimationId) return anim
        return {
          ...anim,
          frames: anim.frames.map((frame, idx) => {
            if (idx !== prev.currentFrameIndex) return frame
            return {
              ...frame,
              layers: [...frame.layers, createEmptyLayer(layerId, `Layer ${frame.layers.length + 1}`)],
            }
          }),
        }
      }),
      currentLayerId: layerId,
    }))
  }, [])
  
  // Frame operations
  const addFrame = useCallback(() => {
    const frameId = `frame-${Date.now()}`
    setState(prev => ({
      ...prev,
      animations: prev.animations.map(anim => {
        if (anim.id !== prev.currentAnimationId) return anim
        // Copy current frame's layers
        const newLayers = currentFrame.layers.map(l => ({
          ...l,
          id: `layer-${Date.now()}-${l.id}`,
          pixels: new Map(l.pixels),
        }))
        return {
          ...anim,
          frames: [...anim.frames, { id: frameId, duration: 100, layers: newLayers }],
        }
      }),
      currentFrameIndex: currentAnimation.frames.length,
    }))
  }, [currentFrame, currentAnimation])
  
  // Animation playback
  useEffect(() => {
    if (!isPlaying) return
    
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        currentFrameIndex: (prev.currentFrameIndex + 1) % currentAnimation.frames.length,
      }))
    }, currentFrame.duration)
    
    return () => clearInterval(interval)
  }, [isPlaying, currentAnimation.frames.length, currentFrame.duration])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      
      switch (e.key.toLowerCase()) {
        case 'b':
          setState(prev => ({ ...prev, tool: 'pencil' }))
          break
        case 'e':
          setState(prev => ({ ...prev, tool: 'eraser' }))
          break
        case 'g':
          setState(prev => ({ ...prev, tool: 'fill' }))
          break
        case 'i':
          setState(prev => ({ ...prev, tool: 'eyedropper' }))
          break
        case '[':
          setState(prev => ({ ...prev, brushSize: Math.max(1, prev.brushSize - 1) }))
          break
        case ']':
          setState(prev => ({ ...prev, brushSize: Math.min(10, prev.brushSize + 1) }))
          break
        case '+':
        case '=':
          setState(prev => ({ ...prev, zoom: Math.min(32, prev.zoom + 2) }))
          break
        case '-':
          setState(prev => ({ ...prev, zoom: Math.max(2, prev.zoom - 2) }))
          break
        case ' ':
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">Sprite Editor</span>
          <span className="text-xs text-slate-500">{state.width} × {state.height}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="Export">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="Import">
            <Upload className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="Settings">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left toolbar */}
        <div className="flex flex-col gap-1 p-2 bg-slate-800 border-r border-slate-700">
          <ToolButton icon={<Pencil className="w-4 h-4" />} active={state.tool === 'pencil'} onClick={() => setState(s => ({ ...s, tool: 'pencil' }))} tooltip="Pencil" shortcut="B" />
          <ToolButton icon={<Eraser className="w-4 h-4" />} active={state.tool === 'eraser'} onClick={() => setState(s => ({ ...s, tool: 'eraser' }))} tooltip="Eraser" shortcut="E" />
          <ToolButton icon={<PaintBucket className="w-4 h-4" />} active={state.tool === 'fill'} onClick={() => setState(s => ({ ...s, tool: 'fill' }))} tooltip="Fill" shortcut="G" />
          <ToolButton icon={<Pipette className="w-4 h-4" />} active={state.tool === 'eyedropper'} onClick={() => setState(s => ({ ...s, tool: 'eyedropper' }))} tooltip="Eyedropper" shortcut="I" />
          <ToolButton icon={<Square className="w-4 h-4" />} active={state.tool === 'rectangle'} onClick={() => setState(s => ({ ...s, tool: 'rectangle' }))} tooltip="Rectangle" shortcut="R" />
          <ToolButton icon={<Circle className="w-4 h-4" />} active={state.tool === 'circle'} onClick={() => setState(s => ({ ...s, tool: 'circle' }))} tooltip="Circle" shortcut="C" />
          
          <div className="h-px bg-slate-700 my-2" />
          
          <ToolButton icon={<Undo className="w-4 h-4" />} active={false} onClick={() => {}} tooltip="Undo" shortcut="Ctrl+Z" />
          <ToolButton icon={<Redo className="w-4 h-4" />} active={false} onClick={() => {}} tooltip="Redo" shortcut="Ctrl+Y" />
          
          <div className="h-px bg-slate-700 my-2" />
          
          <ToolButton icon={<ZoomIn className="w-4 h-4" />} active={false} onClick={() => setState(s => ({ ...s, zoom: Math.min(32, s.zoom + 2) }))} tooltip="Zoom In" shortcut="+" />
          <ToolButton icon={<ZoomOut className="w-4 h-4" />} active={false} onClick={() => setState(s => ({ ...s, zoom: Math.max(2, s.zoom - 2) }))} tooltip="Zoom Out" shortcut="-" />
          <ToolButton icon={<Grid className="w-4 h-4" />} active={state.showGrid} onClick={() => setState(s => ({ ...s, showGrid: !s.showGrid }))} tooltip="Toggle Grid" />
          
          <div className="flex-1" />
          
          {/* Color selectors */}
          <div className="relative">
            <ColorSwatch color={state.primaryColor} size="lg" />
            <div className="absolute bottom-0 right-0">
              <ColorSwatch color={state.secondaryColor} size="md" />
            </div>
          </div>
        </div>
        
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center bg-slate-950 overflow-auto">
          <canvas
            ref={canvasRef}
            width={state.width * state.zoom}
            height={state.height * state.zoom}
            className="cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
        
        {/* Right panel - Layers & Palette */}
        <div className="w-64 flex flex-col">
          {/* Palette */}
          <div className="p-3 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-white">Palette</span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {state.palette.map((color, idx) => (
                <ColorSwatch
                  key={idx}
                  color={color}
                  size="sm"
                  onClick={() => setState(s => ({ ...s, primaryColor: color }))}
                  onRightClick={() => setState(s => ({ ...s, secondaryColor: color }))}
                />
              ))}
            </div>
          </div>
          
          {/* Layers */}
          <LayerPanel
            layers={currentFrame.layers}
            currentLayerId={state.currentLayerId}
            onSelectLayer={(id) => setState(s => ({ ...s, currentLayerId: id }))}
            onToggleVisibility={(id) => setState(s => ({
              ...s,
              animations: s.animations.map(a => ({
                ...a,
                frames: a.frames.map((f, fi) => fi !== s.currentFrameIndex ? f : ({
                  ...f,
                  layers: f.layers.map(l => l.id !== id ? l : ({ ...l, visible: !l.visible })),
                })),
              })),
            }))}
            onToggleLock={(id) => setState(s => ({
              ...s,
              animations: s.animations.map(a => ({
                ...a,
                frames: a.frames.map((f, fi) => fi !== s.currentFrameIndex ? f : ({
                  ...f,
                  layers: f.layers.map(l => l.id !== id ? l : ({ ...l, locked: !l.locked })),
                })),
              })),
            }))}
            onAddLayer={addLayer}
            onDeleteLayer={(id) => {}}
            onDuplicateLayer={(id) => {}}
            onMoveLayer={(id, dir) => {}}
          />
        </div>
      </div>
      
      {/* Timeline */}
      <Timeline
        frames={currentAnimation.frames}
        currentFrameIndex={state.currentFrameIndex}
        isPlaying={isPlaying}
        onSelectFrame={(idx) => setState(s => ({ ...s, currentFrameIndex: idx }))}
        onAddFrame={addFrame}
        onDeleteFrame={(idx) => {}}
        onDuplicateFrame={(idx) => {}}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onPrevFrame={() => setState(s => ({ ...s, currentFrameIndex: Math.max(0, s.currentFrameIndex - 1) }))}
        onNextFrame={() => setState(s => ({ ...s, currentFrameIndex: Math.min(currentAnimation.frames.length - 1, s.currentFrameIndex + 1) }))}
        onSetFrameDuration={(idx, duration) => {}}
      />
    </div>
  )
}
