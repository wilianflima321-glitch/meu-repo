'use client'

// ============================================================================
// PROFESSIONAL TRANSITIONS SYSTEM (Premiere Pro / DaVinci style)
// ============================================================================

export type TransitionType =
  | 'cut'
  | 'crossfade'
  | 'dipToBlack'
  | 'dipToWhite'
  | 'wipeLeft'
  | 'wipeRight'
  | 'wipeUp'
  | 'wipeDown'
  | 'slideLeft'
  | 'slideRight'
  | 'slideUp'
  | 'slideDown'
  | 'pushLeft'
  | 'pushRight'
  | 'pushUp'
  | 'pushDown'
  | 'zoomIn'
  | 'zoomOut'
  | 'spin'
  | 'blur'
  | 'iris'
  | 'clock'

export type TransitionDirection = 'in' | 'out'

export interface TransitionParams {
  type: TransitionType
  duration: number           // Duration in seconds
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
  // Advanced params
  softness?: number          // 0-1, edge softness for wipes
  angle?: number             // Degrees for directional transitions
  color?: string             // For dip to color
  feather?: number           // Blur amount for blur transition
}

export interface TransitionResult {
  // For video: alpha and transform values
  alpha: number
  scaleX: number
  scaleY: number
  translateX: number
  translateY: number
  rotation: number
  blur: number
  // For wipes: clip path or mask
  clipPath?: string
}

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

function applyEasing(t: number, easing: string = 'linear'): number {
  switch (easing) {
    case 'easeIn':
      return t * t * t
    case 'easeOut':
      return 1 - Math.pow(1 - t, 3)
    case 'easeInOut':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    default:
      return t
  }
}

// ============================================================================
// COMPUTE TRANSITION VALUES
// ============================================================================

export function computeTransition(
  params: TransitionParams,
  progress: number,         // 0-1 through the transition
  direction: TransitionDirection
): TransitionResult {
  const { type, easing = 'easeInOut', softness = 0.1, angle = 0, feather = 20 } = params
  
  // Apply easing
  let t = applyEasing(progress, easing)
  
  // For 'out' transitions, invert progress
  if (direction === 'out') {
    t = 1 - t
  }
  
  const result: TransitionResult = {
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0,
    rotation: 0,
    blur: 0
  }
  
  switch (type) {
    case 'cut':
      result.alpha = direction === 'in' ? (progress >= 0.5 ? 1 : 0) : (progress >= 0.5 ? 0 : 1)
      break
    
    case 'crossfade':
      result.alpha = t
      break
    
    case 'dipToBlack':
    case 'dipToWhite':
      // First half: fade to black/white, second half: fade from black/white
      if (progress < 0.5) {
        result.alpha = direction === 'out' ? (1 - progress * 2) : 0
      } else {
        result.alpha = direction === 'in' ? ((progress - 0.5) * 2) : 0
      }
      break
    
    case 'wipeLeft':
      result.clipPath = createWipeClipPath('left', t, softness)
      break
    
    case 'wipeRight':
      result.clipPath = createWipeClipPath('right', t, softness)
      break
    
    case 'wipeUp':
      result.clipPath = createWipeClipPath('up', t, softness)
      break
    
    case 'wipeDown':
      result.clipPath = createWipeClipPath('down', t, softness)
      break
    
    case 'slideLeft':
      result.translateX = direction === 'in' ? (1 - t) * 100 : -t * 100
      break
    
    case 'slideRight':
      result.translateX = direction === 'in' ? -(1 - t) * 100 : t * 100
      break
    
    case 'slideUp':
      result.translateY = direction === 'in' ? (1 - t) * 100 : -t * 100
      break
    
    case 'slideDown':
      result.translateY = direction === 'in' ? -(1 - t) * 100 : t * 100
      break
    
    case 'pushLeft':
      result.translateX = direction === 'in' ? (1 - t) * 100 : -t * 100
      break
    
    case 'pushRight':
      result.translateX = direction === 'in' ? -(1 - t) * 100 : t * 100
      break
    
    case 'pushUp':
      result.translateY = direction === 'in' ? (1 - t) * 100 : -t * 100
      break
    
    case 'pushDown':
      result.translateY = direction === 'in' ? -(1 - t) * 100 : t * 100
      break
    
    case 'zoomIn':
      const zoomInScale = direction === 'in' ? t : (1 - t)
      result.scaleX = zoomInScale
      result.scaleY = zoomInScale
      result.alpha = t
      break
    
    case 'zoomOut':
      const zoomOutScale = direction === 'in' ? (2 - t) : (1 + t)
      result.scaleX = zoomOutScale
      result.scaleY = zoomOutScale
      result.alpha = t
      break
    
    case 'spin':
      result.rotation = direction === 'in' ? (1 - t) * 360 : t * 360
      result.alpha = t
      result.scaleX = t
      result.scaleY = t
      break
    
    case 'blur':
      result.blur = (1 - t) * feather
      result.alpha = t
      break
    
    case 'iris':
      result.clipPath = createIrisClipPath(t)
      break
    
    case 'clock':
      result.clipPath = createClockClipPath(t)
      break
  }
  
  return result
}

// ============================================================================
// CLIP PATH GENERATORS
// ============================================================================

function createWipeClipPath(direction: 'left' | 'right' | 'up' | 'down', t: number, softness: number): string {
  const edgeSoftness = softness * 20 // Convert to percentage
  
  switch (direction) {
    case 'left':
      return `polygon(${t * 100}% 0%, 100% 0%, 100% 100%, ${t * 100}% 100%)`
    case 'right':
      return `polygon(0% 0%, ${(1 - t) * 100}% 0%, ${(1 - t) * 100}% 100%, 0% 100%)`
    case 'up':
      return `polygon(0% ${t * 100}%, 100% ${t * 100}%, 100% 100%, 0% 100%)`
    case 'down':
      return `polygon(0% 0%, 100% 0%, 100% ${(1 - t) * 100}%, 0% ${(1 - t) * 100}%)`
  }
}

function createIrisClipPath(t: number): string {
  // Circle expanding from center
  const radius = t * 71 // 71% to cover corners at 100%
  return `circle(${radius}% at 50% 50%)`
}

function createClockClipPath(t: number): string {
  // Clock wipe from 12 o'clock position
  const angle = t * 360
  const points: string[] = ['50% 50%', '50% 0%']
  
  // Add points around the clock
  for (let deg = 0; deg <= angle; deg += 15) {
    const rad = (deg - 90) * Math.PI / 180
    const x = 50 + 70 * Math.cos(rad)
    const y = 50 + 70 * Math.sin(rad)
    points.push(`${x}% ${y}%`)
  }
  
  return `polygon(${points.join(', ')})`
}

// ============================================================================
// APPLY TRANSITION TO CANVAS/ELEMENT
// ============================================================================

export function applyTransitionToCanvas(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  result: TransitionResult,
  width: number,
  height: number
) {
  ctx.save()
  
  // Apply transforms
  ctx.translate(width / 2, height / 2)
  ctx.scale(result.scaleX, result.scaleY)
  ctx.rotate(result.rotation * Math.PI / 180)
  ctx.translate(
    -width / 2 + (result.translateX / 100) * width,
    -height / 2 + (result.translateY / 100) * height
  )
  
  // Apply alpha
  ctx.globalAlpha = result.alpha
  
  // Apply blur (via filter)
  if (result.blur > 0) {
    ctx.filter = `blur(${result.blur}px)`
  }
  
  // Apply clip path (for wipes)
  if (result.clipPath) {
    applyClipPathToCanvas(ctx, result.clipPath, width, height)
  }
  
  // Draw image
  ctx.drawImage(image, 0, 0, width, height)
  
  ctx.restore()
}

function applyClipPathToCanvas(
  ctx: CanvasRenderingContext2D,
  clipPath: string,
  width: number,
  height: number
) {
  ctx.beginPath()
  
  if (clipPath.startsWith('polygon')) {
    const points = clipPath
      .replace('polygon(', '')
      .replace(')', '')
      .split(',')
      .map(p => p.trim())
    
    points.forEach((point, i) => {
      const [xStr, yStr] = point.split(' ')
      const x = (parseFloat(xStr) / 100) * width
      const y = (parseFloat(yStr) / 100) * height
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.closePath()
  } else if (clipPath.startsWith('circle')) {
    const match = clipPath.match(/circle\(([^%]+)% at ([^%]+)% ([^%]+)%\)/)
    if (match) {
      const radius = (parseFloat(match[1]) / 100) * Math.max(width, height)
      const cx = (parseFloat(match[2]) / 100) * width
      const cy = (parseFloat(match[3]) / 100) * height
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    }
  }
  
  ctx.clip()
}

// ============================================================================
// CSS TRANSFORM STRING GENERATOR
// ============================================================================

export function transitionResultToCSS(result: TransitionResult): {
  transform: string
  opacity: number
  filter: string
  clipPath: string
} {
  const transforms: string[] = []
  
  if (result.translateX !== 0 || result.translateY !== 0) {
    transforms.push(`translate(${result.translateX}%, ${result.translateY}%)`)
  }
  if (result.scaleX !== 1 || result.scaleY !== 1) {
    transforms.push(`scale(${result.scaleX}, ${result.scaleY})`)
  }
  if (result.rotation !== 0) {
    transforms.push(`rotate(${result.rotation}deg)`)
  }
  
  return {
    transform: transforms.length > 0 ? transforms.join(' ') : 'none',
    opacity: result.alpha,
    filter: result.blur > 0 ? `blur(${result.blur}px)` : 'none',
    clipPath: result.clipPath || 'none'
  }
}

// ============================================================================
// TRANSITION PRESETS
// ============================================================================

export const TRANSITION_PRESETS: Record<TransitionType, { name: string; category: string; icon: string }> = {
  cut: { name: 'Cut', category: 'Basic', icon: '✂️' },
  crossfade: { name: 'Crossfade', category: 'Dissolve', icon: '🔄' },
  dipToBlack: { name: 'Dip to Black', category: 'Dissolve', icon: '⬛' },
  dipToWhite: { name: 'Dip to White', category: 'Dissolve', icon: '⬜' },
  wipeLeft: { name: 'Wipe Left', category: 'Wipe', icon: '◀' },
  wipeRight: { name: 'Wipe Right', category: 'Wipe', icon: '▶' },
  wipeUp: { name: 'Wipe Up', category: 'Wipe', icon: '▲' },
  wipeDown: { name: 'Wipe Down', category: 'Wipe', icon: '▼' },
  slideLeft: { name: 'Slide Left', category: 'Slide', icon: '⬅️' },
  slideRight: { name: 'Slide Right', category: 'Slide', icon: '➡️' },
  slideUp: { name: 'Slide Up', category: 'Slide', icon: '⬆️' },
  slideDown: { name: 'Slide Down', category: 'Slide', icon: '⬇️' },
  pushLeft: { name: 'Push Left', category: 'Push', icon: '👈' },
  pushRight: { name: 'Push Right', category: 'Push', icon: '👉' },
  pushUp: { name: 'Push Up', category: 'Push', icon: '👆' },
  pushDown: { name: 'Push Down', category: 'Push', icon: '👇' },
  zoomIn: { name: 'Zoom In', category: 'Zoom', icon: '🔍' },
  zoomOut: { name: 'Zoom Out', category: 'Zoom', icon: '🔎' },
  spin: { name: 'Spin', category: '3D', icon: '🌀' },
  blur: { name: 'Blur', category: 'Stylize', icon: '💨' },
  iris: { name: 'Iris', category: 'Shape', icon: '⭕' },
  clock: { name: 'Clock Wipe', category: 'Shape', icon: '🕐' }
}

// ============================================================================
// TRANSITION SELECTOR COMPONENT
// ============================================================================

import React, { useState } from 'react'

interface TransitionSelectorProps {
  value: TransitionType
  onChange: (type: TransitionType) => void
  duration: number
  onDurationChange: (duration: number) => void
}

export function TransitionSelector({
  value,
  onChange,
  duration,
  onDurationChange
}: TransitionSelectorProps) {
  const [showPicker, setShowPicker] = useState(false)
  
  const categories = Array.from(new Set(Object.values(TRANSITION_PRESETS).map(p => p.category)))
  
  const current = TRANSITION_PRESETS[value]
  
  return (
    <div style={{ position: 'relative' }}>
      {/* Current selection button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: '#25262b',
          border: '1px solid #373a40',
          borderRadius: 4,
          color: '#c1c2c5',
          cursor: 'pointer',
          fontSize: 12
        }}
      >
        <span>{current.icon}</span>
        <span>{current.name}</span>
        <span style={{ color: '#868e96' }}>▼</span>
      </button>
      
      {/* Duration slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <span style={{ color: '#909296', fontSize: 11 }}>Duration:</span>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          value={duration}
          onChange={e => onDurationChange(parseFloat(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ color: '#c1c2c5', fontSize: 11, minWidth: 35 }}>{duration.toFixed(1)}s</span>
      </div>
      
      {/* Picker dropdown */}
      {showPicker && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setShowPicker(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: '#2c2e33',
            border: '1px solid #373a40',
            borderRadius: 6,
            padding: 8,
            zIndex: 1000,
            minWidth: 280,
            maxHeight: 400,
            overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
          }}>
            {categories.map(category => (
              <div key={category} style={{ marginBottom: 8 }}>
                <div style={{
                  color: '#868e96',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '4px 8px',
                  borderBottom: '1px solid #373a40',
                  marginBottom: 4
                }}>
                  {category}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(Object.entries(TRANSITION_PRESETS) as [TransitionType, typeof TRANSITION_PRESETS[TransitionType]][])
                    .filter(([, preset]) => preset.category === category)
                    .map(([type, preset]) => (
                      <button
                        key={type}
                        onClick={() => {
                          onChange(type)
                          setShowPicker(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 8px',
                          background: type === value ? '#339af0' : '#25262b',
                          border: '1px solid ' + (type === value ? '#228be6' : '#373a40'),
                          borderRadius: 3,
                          color: type === value ? '#fff' : '#c1c2c5',
                          cursor: 'pointer',
                          fontSize: 11
                        }}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default TransitionSelector
