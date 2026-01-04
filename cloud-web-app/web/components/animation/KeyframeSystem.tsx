'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ============================================================================
// TYPES - Professional Keyframe System (Premiere/After Effects style)
// ============================================================================

export type EasingType = 
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bezier'
  | 'hold'
  | 'bounce'
  | 'elastic'

export type KeyframeValue = number | number[] | string

export interface Keyframe {
  id: string
  time: number          // Time in seconds
  value: KeyframeValue
  easing: EasingType
  // Bezier handles for custom curves (normalized 0-1)
  bezierIn?: { x: number; y: number }
  bezierOut?: { x: number; y: number }
  selected?: boolean
}

export interface AnimatedProperty {
  id: string
  name: string
  property: string      // e.g., 'opacity', 'position.x', 'scale', 'rotation'
  keyframes: Keyframe[]
  defaultValue: KeyframeValue
  min?: number
  max?: number
  step?: number
  unit?: string         // e.g., 'px', '%', '°'
}

export interface KeyframeTrack {
  id: string
  clipId: string
  properties: AnimatedProperty[]
  expanded?: boolean
}

export interface KeyframeEditorProps {
  tracks: KeyframeTrack[]
  currentTime: number
  duration: number
  pixelsPerSecond: number
  onKeyframeAdd: (trackId: string, propertyId: string, time: number, value: KeyframeValue) => void
  onKeyframeUpdate: (trackId: string, propertyId: string, keyframeId: string, updates: Partial<Keyframe>) => void
  onKeyframeDelete: (trackId: string, propertyId: string, keyframeId: string) => void
  onKeyframeMove: (trackId: string, propertyId: string, keyframeId: string, newTime: number) => void
  onTrackToggle?: (trackId: string) => void
  selectedKeyframes?: string[]
  onSelectionChange?: (keyframeIds: string[]) => void
}

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

export function evaluateEasing(easing: EasingType, t: number, bezierIn?: { x: number; y: number }, bezierOut?: { x: number; y: number }): number {
  switch (easing) {
    case 'linear':
      return t
    
    case 'easeIn':
      return t * t * t
    
    case 'easeOut':
      return 1 - Math.pow(1 - t, 3)
    
    case 'easeInOut':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    
    case 'hold':
      return t < 1 ? 0 : 1
    
    case 'bounce':
      if (t < 1 / 2.75) {
        return 7.5625 * t * t
      } else if (t < 2 / 2.75) {
        const t2 = t - 1.5 / 2.75
        return 7.5625 * t2 * t2 + 0.75
      } else if (t < 2.5 / 2.75) {
        const t2 = t - 2.25 / 2.75
        return 7.5625 * t2 * t2 + 0.9375
      } else {
        const t2 = t - 2.625 / 2.75
        return 7.5625 * t2 * t2 + 0.984375
      }
    
    case 'elastic':
      if (t === 0 || t === 1) return t
      const p = 0.3
      const s = p / 4
      return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1
    
    case 'bezier':
      if (!bezierIn || !bezierOut) return t
      return cubicBezier(bezierIn.x, bezierIn.y, bezierOut.x, bezierOut.y, t)
    
    default:
      return t
  }
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  // Newton-Raphson iteration to find t for given x
  const epsilon = 0.0001
  let guess = t
  
  for (let i = 0; i < 8; i++) {
    const x = bezierX(x1, x2, guess) - t
    if (Math.abs(x) < epsilon) break
    const dx = bezierDX(x1, x2, guess)
    if (Math.abs(dx) < epsilon) break
    guess -= x / dx
  }
  
  return bezierY(y1, y2, guess)
}

function bezierX(x1: number, x2: number, t: number): number {
  return 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t
}

function bezierY(y1: number, y2: number, t: number): number {
  return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t
}

function bezierDX(x1: number, x2: number, t: number): number {
  return 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2)
}

// ============================================================================
// INTERPOLATION
// ============================================================================

export function interpolateValue(
  keyframes: Keyframe[],
  time: number,
  defaultValue: KeyframeValue
): KeyframeValue {
  if (keyframes.length === 0) return defaultValue
  
  const sorted = [...keyframes].sort((a, b) => a.time - b.time)
  
  // Before first keyframe
  if (time <= sorted[0].time) return sorted[0].value
  
  // After last keyframe
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value
  
  // Find surrounding keyframes
  let prevKf = sorted[0]
  let nextKf = sorted[1]
  
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      prevKf = sorted[i]
      nextKf = sorted[i + 1]
      break
    }
  }
  
  // Calculate normalized time between keyframes
  const duration = nextKf.time - prevKf.time
  const localT = duration > 0 ? (time - prevKf.time) / duration : 0
  
  // Apply easing
  const easedT = evaluateEasing(prevKf.easing, localT, prevKf.bezierOut, nextKf.bezierIn)
  
  // Interpolate based on value type
  if (typeof prevKf.value === 'number' && typeof nextKf.value === 'number') {
    return prevKf.value + (nextKf.value - prevKf.value) * easedT
  }
  
  if (Array.isArray(prevKf.value) && Array.isArray(nextKf.value)) {
    return prevKf.value.map((v, i) => {
      const nextV = (nextKf.value as number[])[i] ?? v
      return v + (nextV - v) * easedT
    })
  }
  
  // For strings (e.g., colors), return prev value until we reach next keyframe
  return easedT < 0.5 ? prevKf.value : nextKf.value
}

// ============================================================================
// KEYFRAME EDITOR COMPONENT
// ============================================================================

export function KeyframeEditor({
  tracks,
  currentTime,
  duration,
  pixelsPerSecond,
  onKeyframeAdd,
  onKeyframeUpdate,
  onKeyframeDelete,
  onKeyframeMove,
  onTrackToggle,
  selectedKeyframes = [],
  onSelectionChange
}: KeyframeEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [dragging, setDragging] = useState<{
    trackId: string
    propertyId: string
    keyframeId: string
    startX: number
    startTime: number
  } | null>(null)
  
  const [hoveredKeyframe, setHoveredKeyframe] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    trackId: string
    propertyId: string
    keyframeId: string
  } | null>(null)
  
  const trackHeight = 24
  const propertyHeight = 20
  const headerWidth = 200
  const keyframeSize = 10
  
  // Calculate total height
  const totalHeight = useMemo(() => {
    return tracks.reduce((sum, track) => {
      let h = trackHeight
      if (track.expanded) {
        h += track.properties.length * propertyHeight
      }
      return sum + h
    }, 0)
  }, [tracks])
  
  // Draw keyframe diamonds
  const drawKeyframe = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    selected: boolean,
    hovered: boolean,
    easing: EasingType
  ) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.PI / 4)
    
    const size = keyframeSize / 2
    
    // Shadow for depth
    if (selected || hovered) {
      ctx.shadowColor = selected ? '#4dabf7' : '#aaa'
      ctx.shadowBlur = 6
    }
    
    // Fill based on state
    if (selected) {
      ctx.fillStyle = '#339af0'
    } else if (hovered) {
      ctx.fillStyle = '#74c0fc'
    } else {
      ctx.fillStyle = '#495057'
    }
    
    ctx.fillRect(-size, -size, size * 2, size * 2)
    
    // Border
    ctx.strokeStyle = selected ? '#228be6' : '#868e96'
    ctx.lineWidth = 1
    ctx.strokeRect(-size, -size, size * 2, size * 2)
    
    // Easing indicator (small icon inside)
    ctx.shadowBlur = 0
    if (easing !== 'linear') {
      ctx.fillStyle = '#fff'
      ctx.font = '6px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      let icon = ''
      switch (easing) {
        case 'easeIn': icon = '⟩'; break
        case 'easeOut': icon = '⟨'; break
        case 'easeInOut': icon = '∿'; break
        case 'hold': icon = '▬'; break
        case 'bezier': icon = '∼'; break
        case 'bounce': icon = '⌢'; break
        case 'elastic': icon = '≋'; break
      }
      
      ctx.rotate(-Math.PI / 4)
      ctx.fillText(icon, 0, 0)
    }
    
    ctx.restore()
  }, [])
  
  // Draw easing curve preview between keyframes
  const drawEasingCurve = useCallback((
    ctx: CanvasRenderingContext2D,
    x1: number,
    x2: number,
    y: number,
    easing: EasingType,
    bezierIn?: { x: number; y: number },
    bezierOut?: { x: number; y: number }
  ) => {
    ctx.beginPath()
    ctx.moveTo(x1, y)
    
    const steps = 20
    const curveHeight = 6
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const x = x1 + (x2 - x1) * t
      const easedT = evaluateEasing(easing, t, bezierIn, bezierOut)
      const yOffset = (0.5 - easedT) * curveHeight
      ctx.lineTo(x, y + yOffset)
    }
    
    ctx.strokeStyle = 'rgba(77, 171, 247, 0.5)'
    ctx.lineWidth = 1
    ctx.stroke()
  }, [])
  
  // Main render
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width
    const height = canvas.height
    
    // Clear
    ctx.fillStyle = '#1a1b1e'
    ctx.fillRect(0, 0, width, height)
    
    // Draw timeline grid
    ctx.strokeStyle = '#2c2e33'
    ctx.lineWidth = 1
    
    const secondWidth = pixelsPerSecond
    for (let s = 0; s <= duration; s++) {
      const x = headerWidth + s * secondWidth
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    // Draw tracks and keyframes
    let y = 0
    
    for (const track of tracks) {
      // Track header background
      ctx.fillStyle = '#25262b'
      ctx.fillRect(0, y, headerWidth, trackHeight)
      
      // Track label
      ctx.fillStyle = '#c1c2c5'
      ctx.font = 'bold 11px system-ui'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(track.clipId.slice(0, 20), 24, y + trackHeight / 2)
      
      // Expand/collapse button
      ctx.fillStyle = '#868e96'
      ctx.font = '10px system-ui'
      ctx.fillText(track.expanded ? '▼' : '▶', 8, y + trackHeight / 2)
      
      // Track background
      ctx.fillStyle = '#2c2e33'
      ctx.fillRect(headerWidth, y, width - headerWidth, trackHeight)
      
      y += trackHeight
      
      if (track.expanded) {
        for (const prop of track.properties) {
          // Property row background
          ctx.fillStyle = '#212226'
          ctx.fillRect(0, y, headerWidth, propertyHeight)
          
          // Property label
          ctx.fillStyle = '#909296'
          ctx.font = '10px system-ui'
          ctx.fillText(`  ${prop.name}`, 24, y + propertyHeight / 2)
          
          // Property timeline background
          ctx.fillStyle = '#1e1f23'
          ctx.fillRect(headerWidth, y, width - headerWidth, propertyHeight)
          
          // Draw keyframes and curves
          const sorted = [...prop.keyframes].sort((a, b) => a.time - b.time)
          
          for (let i = 0; i < sorted.length; i++) {
            const kf = sorted[i]
            const x = headerWidth + kf.time * pixelsPerSecond
            const centerY = y + propertyHeight / 2
            
            // Draw curve to next keyframe
            if (i < sorted.length - 1) {
              const nextKf = sorted[i + 1]
              const nextX = headerWidth + nextKf.time * pixelsPerSecond
              drawEasingCurve(ctx, x, nextX, centerY, kf.easing, kf.bezierOut, nextKf.bezierIn)
            }
            
            // Draw keyframe diamond
            drawKeyframe(
              ctx,
              x,
              centerY,
              selectedKeyframes.includes(kf.id),
              hoveredKeyframe === kf.id,
              kf.easing
            )
          }
          
          y += propertyHeight
        }
      }
    }
    
    // Draw playhead
    const playheadX = headerWidth + currentTime * pixelsPerSecond
    ctx.strokeStyle = '#fa5252'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, height)
    ctx.stroke()
    
    // Playhead head
    ctx.fillStyle = '#fa5252'
    ctx.beginPath()
    ctx.moveTo(playheadX - 6, 0)
    ctx.lineTo(playheadX + 6, 0)
    ctx.lineTo(playheadX, 8)
    ctx.closePath()
    ctx.fill()
    
  }, [tracks, currentTime, duration, pixelsPerSecond, selectedKeyframes, hoveredKeyframe, drawKeyframe, drawEasingCurve])
  
  // Hit test for keyframe
  const hitTestKeyframe = useCallback((clientX: number, clientY: number): {
    trackId: string
    propertyId: string
    keyframe: Keyframe
  } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    let currentY = 0
    
    for (const track of tracks) {
      currentY += trackHeight
      
      if (track.expanded) {
        for (const prop of track.properties) {
          const centerY = currentY + propertyHeight / 2
          
          for (const kf of prop.keyframes) {
            const kfX = headerWidth + kf.time * pixelsPerSecond
            const dist = Math.sqrt((x - kfX) ** 2 + (y - centerY) ** 2)
            
            if (dist <= keyframeSize) {
              return { trackId: track.id, propertyId: prop.id, keyframe: kf }
            }
          }
          
          currentY += propertyHeight
        }
      }
    }
    
    return null
  }, [tracks, pixelsPerSecond])
  
  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const hit = hitTestKeyframe(e.clientX, e.clientY)
    
    if (hit) {
      // Start dragging keyframe
      setDragging({
        trackId: hit.trackId,
        propertyId: hit.propertyId,
        keyframeId: hit.keyframe.id,
        startX: e.clientX,
        startTime: hit.keyframe.time
      })
      
      // Update selection
      if (e.shiftKey && onSelectionChange) {
        if (selectedKeyframes.includes(hit.keyframe.id)) {
          onSelectionChange(selectedKeyframes.filter(id => id !== hit.keyframe.id))
        } else {
          onSelectionChange([...selectedKeyframes, hit.keyframe.id])
        }
      } else if (onSelectionChange) {
        onSelectionChange([hit.keyframe.id])
      }
    } else {
      // Check for track header click
      const canvas = canvasRef.current
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      if (x < headerWidth) {
        let currentY = 0
        for (const track of tracks) {
          if (y >= currentY && y < currentY + trackHeight) {
            onTrackToggle?.(track.id)
            return
          }
          currentY += trackHeight
          if (track.expanded) {
            currentY += track.properties.length * propertyHeight
          }
        }
      } else if (e.detail === 2) {
        // Double-click to add keyframe
        const time = (x - headerWidth) / pixelsPerSecond
        
        let currentY = 0
        for (const track of tracks) {
          currentY += trackHeight
          
          if (track.expanded) {
            for (const prop of track.properties) {
              if (y >= currentY && y < currentY + propertyHeight) {
                const currentValue = interpolateValue(prop.keyframes, time, prop.defaultValue)
                onKeyframeAdd(track.id, prop.id, time, currentValue)
                return
              }
              currentY += propertyHeight
            }
          }
        }
      }
      
      // Clear selection on empty click
      if (onSelectionChange) {
        onSelectionChange([])
      }
    }
  }, [hitTestKeyframe, selectedKeyframes, onSelectionChange, tracks, pixelsPerSecond, onKeyframeAdd, onTrackToggle])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const hit = hitTestKeyframe(e.clientX, e.clientY)
    setHoveredKeyframe(hit?.keyframe.id ?? null)
    
    if (dragging) {
      const dx = e.clientX - dragging.startX
      const newTime = Math.max(0, Math.min(duration, dragging.startTime + dx / pixelsPerSecond))
      onKeyframeMove(dragging.trackId, dragging.propertyId, dragging.keyframeId, newTime)
    }
  }, [hitTestKeyframe, dragging, duration, pixelsPerSecond, onKeyframeMove])
  
  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])
  
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    
    const hit = hitTestKeyframe(e.clientX, e.clientY)
    if (hit) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        trackId: hit.trackId,
        propertyId: hit.propertyId,
        keyframeId: hit.keyframe.id
      })
    }
  }, [hitTestKeyframe])
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Delete selected keyframes
      for (const track of tracks) {
        for (const prop of track.properties) {
          for (const kf of prop.keyframes) {
            if (selectedKeyframes.includes(kf.id)) {
              onKeyframeDelete(track.id, prop.id, kf.id)
            }
          }
        }
      }
      onSelectionChange?.([])
    }
  }, [tracks, selectedKeyframes, onKeyframeDelete, onSelectionChange])
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  // Context menu UI
  const renderContextMenu = () => {
    if (!contextMenu) return null
    
    const handleEasingChange = (easing: EasingType) => {
      onKeyframeUpdate(contextMenu.trackId, contextMenu.propertyId, contextMenu.keyframeId, { easing })
      setContextMenu(null)
    }
    
    const handleDelete = () => {
      onKeyframeDelete(contextMenu.trackId, contextMenu.propertyId, contextMenu.keyframeId)
      setContextMenu(null)
    }
    
    return (
      <div
        style={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          background: '#2c2e33',
          border: '1px solid #373a40',
          borderRadius: 4,
          padding: 4,
          zIndex: 1000,
          minWidth: 150,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
        onClick={() => setContextMenu(null)}
      >
        <div style={{ padding: '4px 8px', color: '#909296', fontSize: 10, borderBottom: '1px solid #373a40' }}>
          Easing
        </div>
        {(['linear', 'easeIn', 'easeOut', 'easeInOut', 'hold', 'bounce', 'elastic', 'bezier'] as EasingType[]).map(easing => (
          <div
            key={easing}
            onClick={() => handleEasingChange(easing)}
            style={{
              padding: '6px 8px',
              cursor: 'pointer',
              color: '#c1c2c5',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#373a40')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ width: 16 }}>
              {easing === 'linear' && '—'}
              {easing === 'easeIn' && '⟩'}
              {easing === 'easeOut' && '⟨'}
              {easing === 'easeInOut' && '∿'}
              {easing === 'hold' && '▬'}
              {easing === 'bounce' && '⌢'}
              {easing === 'elastic' && '≋'}
              {easing === 'bezier' && '∼'}
            </span>
            {easing.charAt(0).toUpperCase() + easing.slice(1)}
          </div>
        ))}
        <div style={{ borderTop: '1px solid #373a40', marginTop: 4, paddingTop: 4 }}>
          <div
            onClick={handleDelete}
            style={{
              padding: '6px 8px',
              cursor: 'pointer',
              color: '#fa5252',
              fontSize: 11
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#373a40')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            🗑️ Delete Keyframe
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={Math.max(600, headerWidth + duration * pixelsPerSecond + 100)}
        height={Math.max(100, totalHeight)}
        style={{
          background: '#1a1b1e',
          borderRadius: 4,
          cursor: dragging ? 'grabbing' : hoveredKeyframe ? 'pointer' : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
      {renderContextMenu()}
      {contextMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

// ============================================================================
// KEYFRAME CONTROLS COMPONENT (add keyframe at current time)
// ============================================================================

export interface KeyframeControlsProps {
  property: AnimatedProperty
  currentTime: number
  onAdd: (value: KeyframeValue) => void
  onRemove: (keyframeId: string) => void
  onValueChange: (keyframeId: string, value: KeyframeValue) => void
}

export function KeyframeControls({
  property,
  currentTime,
  onAdd,
  onRemove,
  onValueChange
}: KeyframeControlsProps) {
  const currentKeyframe = property.keyframes.find(kf => Math.abs(kf.time - currentTime) < 0.05)
  const currentValue = interpolateValue(property.keyframes, currentTime, property.defaultValue)
  
  const hasKeyframeAtTime = !!currentKeyframe
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#909296', fontSize: 11, minWidth: 80 }}>{property.name}</span>
      
      {/* Keyframe toggle button */}
      <button
        onClick={() => {
          if (hasKeyframeAtTime && currentKeyframe) {
            onRemove(currentKeyframe.id)
          } else {
            onAdd(currentValue)
          }
        }}
        style={{
          background: hasKeyframeAtTime ? '#339af0' : 'transparent',
          border: '1px solid #339af0',
          borderRadius: 2,
          width: 16,
          height: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'rotate(45deg)'
        }}
        title={hasKeyframeAtTime ? 'Remove keyframe' : 'Add keyframe'}
      >
        <span style={{ transform: 'rotate(-45deg)', color: hasKeyframeAtTime ? '#fff' : '#339af0', fontSize: 10 }}>
          {hasKeyframeAtTime ? '✓' : '+'}
        </span>
      </button>
      
      {/* Value input */}
      {typeof currentValue === 'number' && (
        <input
          type="number"
          value={Number(currentValue).toFixed(2)}
          onChange={e => {
            const newValue = parseFloat(e.target.value)
            if (!isNaN(newValue) && currentKeyframe) {
              onValueChange(currentKeyframe.id, newValue)
            }
          }}
          min={property.min}
          max={property.max}
          step={property.step ?? 0.01}
          style={{
            background: '#25262b',
            border: '1px solid #373a40',
            borderRadius: 3,
            color: '#c1c2c5',
            padding: '2px 6px',
            width: 60,
            fontSize: 11
          }}
        />
      )}
      
      {property.unit && (
        <span style={{ color: '#909296', fontSize: 10 }}>{property.unit}</span>
      )}
      
      {/* Navigation to prev/next keyframe */}
      <button
        onClick={() => {
          const prevKf = [...property.keyframes]
            .filter(kf => kf.time < currentTime - 0.01)
            .sort((a, b) => b.time - a.time)[0]
          // Would need a callback to seek to keyframe time
        }}
        disabled={!property.keyframes.some(kf => kf.time < currentTime - 0.01)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#868e96',
          cursor: 'pointer',
          fontSize: 10
        }}
        title="Previous keyframe"
      >
        ◀
      </button>
      <button
        onClick={() => {
          const nextKf = [...property.keyframes]
            .filter(kf => kf.time > currentTime + 0.01)
            .sort((a, b) => a.time - b.time)[0]
          // Would need a callback to seek to keyframe time
        }}
        disabled={!property.keyframes.some(kf => kf.time > currentTime + 0.01)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#868e96',
          cursor: 'pointer',
          fontSize: 10
        }}
        title="Next keyframe"
      >
        ▶
      </button>
    </div>
  )
}

// ============================================================================
// UTILITY: Create default animated properties for a clip
// ============================================================================

export function createDefaultAnimatedProperties(): AnimatedProperty[] {
  return [
    {
      id: 'opacity',
      name: 'Opacity',
      property: 'opacity',
      keyframes: [],
      defaultValue: 1,
      min: 0,
      max: 1,
      step: 0.01
    },
    {
      id: 'position-x',
      name: 'Position X',
      property: 'position.x',
      keyframes: [],
      defaultValue: 0,
      unit: 'px'
    },
    {
      id: 'position-y',
      name: 'Position Y',
      property: 'position.y',
      keyframes: [],
      defaultValue: 0,
      unit: 'px'
    },
    {
      id: 'scale',
      name: 'Scale',
      property: 'scale',
      keyframes: [],
      defaultValue: 100,
      min: 0,
      max: 500,
      step: 1,
      unit: '%'
    },
    {
      id: 'rotation',
      name: 'Rotation',
      property: 'rotation',
      keyframes: [],
      defaultValue: 0,
      unit: '°'
    },
    {
      id: 'volume',
      name: 'Volume',
      property: 'volume',
      keyframes: [],
      defaultValue: 1,
      min: 0,
      max: 2,
      step: 0.01
    }
  ]
}

export default KeyframeEditor
