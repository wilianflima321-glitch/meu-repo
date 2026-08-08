import { tokenColor } from '@/lib/design-system/DesignTokenSync'
'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { LayerPanel, Timeline } from './SpriteEditorParts'
import { SpriteCanvasStage, SpriteEditorHeader, SpriteEditorToolbar, SpritePalettePanel } from './SpriteEditorChrome'
import { DEFAULT_PALETTE } from './SpriteEditor.defaults'
import type { Color, Layer, SpriteEditorState, Tool } from './SpriteEditor.types'
import { colorToRgba, createEmptyFrame, createEmptyLayer } from './SpriteEditor.utils'

export default function SpriteEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

    const getVar = (name: string, fallback: string) => {
      if (typeof window === 'undefined') return fallback
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      return value || fallback
    }

    const toRgba = (color: string, alpha: number) => {
      const trimmed = color.trim()
      if (trimmed.startsWith('#')) {
        const hex = trimmed.replace('#', '')
        const normalized = hex.length === 3
          ? hex.split('').map((c) => c + c).join('')
          : hex
        const r = parseInt(normalized.slice(0, 2), 16)
        const g = parseInt(normalized.slice(2, 4), 16)
        const b = parseInt(normalized.slice(4, 6), 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      }
      if (trimmed.startsWith('rgb')) {
        return trimmed.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
      }
      return `rgba(255, 255, 255, ${alpha})`
    }

    const gridDark = getVar('--aethel-surface-tertiary', tokenColor('--aethel-surface-tertiary'))
    const gridLight = getVar('--aethel-surface-quaternary', tokenColor('--aethel-surface-quaternary'))
    const gridStroke = getVar('--aethel-text-primary', tokenColor('--aethel-text-primary'))

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Checkerboard background (transparent indicator)
    const checkerSize = zoom / 2
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isLight = (x + y) % 2 === 0
        ctx.fillStyle = isLight ? gridLight : gridDark
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
      ctx.strokeStyle = toRgba(gridStroke, 0.1)
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
    <div className="flex flex-col h-full bg-[var(--aethel-surface-primary)]">
      <SpriteEditorHeader width={state.width} height={state.height} />

      <div className="flex-1 flex overflow-hidden">
        <SpriteEditorToolbar
          tool={state.tool}
          showGrid={state.showGrid}
          primaryColor={state.primaryColor}
          secondaryColor={state.secondaryColor}
          onSetTool={(tool) => setState((current) => ({ ...current, tool }))}
          onZoomIn={() => setState((current) => ({ ...current, zoom: Math.min(32, current.zoom + 2) }))}
          onZoomOut={() => setState((current) => ({ ...current, zoom: Math.max(2, current.zoom - 2) }))}
          onToggleGrid={() => setState((current) => ({ ...current, showGrid: !current.showGrid }))}
        />

        <SpriteCanvasStage
          canvasRef={canvasRef}
          width={state.width}
          height={state.height}
          zoom={state.zoom}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />

        <div className="w-64 flex flex-col">
          <SpritePalettePanel
            palette={state.palette}
            onPrimaryColor={(color) => setState((current) => ({ ...current, primaryColor: color }))}
            onSecondaryColor={(color) => setState((current) => ({ ...current, secondaryColor: color }))}
          />

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
