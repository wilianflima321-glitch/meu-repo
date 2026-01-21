'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface FacialAnimationEditorProps {
  characterId: string
  onBlendShapeUpdate?: (blendShapes: BlendShapeValues) => void
}

interface BlendShapeValues {
  [key: string]: number
}

interface Viseme {
  id: string
  label: string
  blendShapes: Partial<BlendShapeValues>
}

interface LipSyncKeyframe {
  id: string
  time: number
  viseme: string
  intensity: number
}

interface EmotionPreset {
  name: string
  icon: string
  blendShapes: Partial<BlendShapeValues>
}

interface FACSActionUnit {
  au: string
  name: string
  description: string
  relatedBlendShapes: string[]
}

interface BlendShapeCategory {
  name: string
  icon: string
  shapes: string[]
}

// ============================================================================
// ARKIT 52 BLEND SHAPES - ORGANIZED BY CATEGORY
// ============================================================================

const BLEND_SHAPE_CATEGORIES: BlendShapeCategory[] = [
  {
    name: 'Eye',
    icon: '👁️',
    shapes: [
      'eyeBlinkLeft',
      'eyeBlinkRight',
      'eyeLookDownLeft',
      'eyeLookDownRight',
      'eyeLookInLeft',
      'eyeLookInRight',
      'eyeLookOutLeft',
      'eyeLookOutRight',
      'eyeLookUpLeft',
      'eyeLookUpRight',
      'eyeSquintLeft',
      'eyeSquintRight',
      'eyeWideLeft',
      'eyeWideRight',
    ],
  },
  {
    name: 'Mouth',
    icon: '👄',
    shapes: [
      'jawOpen',
      'jawForward',
      'jawLeft',
      'jawRight',
      'mouthClose',
      'mouthFunnel',
      'mouthPucker',
      'mouthLeft',
      'mouthRight',
      'mouthSmileLeft',
      'mouthSmileRight',
      'mouthFrownLeft',
      'mouthFrownRight',
      'mouthDimpleLeft',
      'mouthDimpleRight',
      'mouthStretchLeft',
      'mouthStretchRight',
      'mouthRollLower',
      'mouthRollUpper',
      'mouthShrugLower',
      'mouthShrugUpper',
      'mouthPressLeft',
      'mouthPressRight',
      'mouthLowerDownLeft',
      'mouthLowerDownRight',
      'mouthUpperUpLeft',
      'mouthUpperUpRight',
    ],
  },
  {
    name: 'Brow',
    icon: '🤨',
    shapes: [
      'browDownLeft',
      'browDownRight',
      'browInnerUp',
      'browOuterUpLeft',
      'browOuterUpRight',
    ],
  },
  {
    name: 'Cheek',
    icon: '😊',
    shapes: [
      'cheekPuff',
      'cheekSquintLeft',
      'cheekSquintRight',
    ],
  },
  {
    name: 'Nose',
    icon: '👃',
    shapes: [
      'noseSneerLeft',
      'noseSneerRight',
    ],
  },
  {
    name: 'Tongue',
    icon: '👅',
    shapes: [
      'tongueOut',
    ],
  },
]

// ============================================================================
// EMOTION PRESETS
// ============================================================================

const EMOTION_PRESETS: EmotionPreset[] = [
  {
    name: 'Neutral',
    icon: '😐',
    blendShapes: {},
  },
  {
    name: 'Happy',
    icon: '😊',
    blendShapes: {
      mouthSmileLeft: 0.8,
      mouthSmileRight: 0.8,
      cheekSquintLeft: 0.5,
      cheekSquintRight: 0.5,
      eyeSquintLeft: 0.3,
      eyeSquintRight: 0.3,
      browInnerUp: 0.2,
    },
  },
  {
    name: 'Sad',
    icon: '😢',
    blendShapes: {
      mouthFrownLeft: 0.7,
      mouthFrownRight: 0.7,
      browDownLeft: 0.4,
      browDownRight: 0.4,
      browInnerUp: 0.6,
      eyeLookDownLeft: 0.3,
      eyeLookDownRight: 0.3,
    },
  },
  {
    name: 'Angry',
    icon: '😠',
    blendShapes: {
      browDownLeft: 0.8,
      browDownRight: 0.8,
      eyeSquintLeft: 0.5,
      eyeSquintRight: 0.5,
      noseSneerLeft: 0.4,
      noseSneerRight: 0.4,
      mouthFrownLeft: 0.3,
      mouthFrownRight: 0.3,
      jawForward: 0.2,
    },
  },
  {
    name: 'Surprised',
    icon: '😲',
    blendShapes: {
      eyeWideLeft: 0.9,
      eyeWideRight: 0.9,
      browInnerUp: 0.8,
      browOuterUpLeft: 0.7,
      browOuterUpRight: 0.7,
      jawOpen: 0.5,
      mouthFunnel: 0.3,
    },
  },
  {
    name: 'Disgusted',
    icon: '🤢',
    blendShapes: {
      noseSneerLeft: 0.8,
      noseSneerRight: 0.8,
      browDownLeft: 0.4,
      browDownRight: 0.4,
      mouthUpperUpLeft: 0.5,
      mouthUpperUpRight: 0.5,
      eyeSquintLeft: 0.3,
      eyeSquintRight: 0.3,
    },
  },
  {
    name: 'Fear',
    icon: '😨',
    blendShapes: {
      eyeWideLeft: 0.8,
      eyeWideRight: 0.8,
      browInnerUp: 0.9,
      browOuterUpLeft: 0.5,
      browOuterUpRight: 0.5,
      mouthStretchLeft: 0.4,
      mouthStretchRight: 0.4,
      jawOpen: 0.3,
    },
  },
]

// ============================================================================
// VISEMES FOR LIP SYNC
// ============================================================================

const VISEMES: Viseme[] = [
  {
    id: 'sil',
    label: 'Silence',
    blendShapes: { mouthClose: 0.1 },
  },
  {
    id: 'aa',
    label: 'A',
    blendShapes: { jawOpen: 0.6, mouthFunnel: 0.2 },
  },
  {
    id: 'ee',
    label: 'E',
    blendShapes: { jawOpen: 0.3, mouthSmileLeft: 0.4, mouthSmileRight: 0.4 },
  },
  {
    id: 'ih',
    label: 'I',
    blendShapes: { jawOpen: 0.2, mouthSmileLeft: 0.5, mouthSmileRight: 0.5 },
  },
  {
    id: 'oh',
    label: 'O',
    blendShapes: { jawOpen: 0.5, mouthFunnel: 0.6, mouthPucker: 0.3 },
  },
  {
    id: 'ou',
    label: 'U',
    blendShapes: { jawOpen: 0.3, mouthPucker: 0.7, mouthFunnel: 0.4 },
  },
  {
    id: 'pp',
    label: 'P/B/M',
    blendShapes: { mouthClose: 0.9, mouthPressLeft: 0.5, mouthPressRight: 0.5 },
  },
  {
    id: 'ff',
    label: 'F/V',
    blendShapes: { mouthClose: 0.3, mouthRollLower: 0.6, mouthUpperUpLeft: 0.2, mouthUpperUpRight: 0.2 },
  },
  {
    id: 'th',
    label: 'TH',
    blendShapes: { jawOpen: 0.2, tongueOut: 0.4, mouthClose: 0.1 },
  },
  {
    id: 'dd',
    label: 'D/T/N',
    blendShapes: { jawOpen: 0.15, tongueOut: 0.1, mouthClose: 0.2 },
  },
  {
    id: 'kk',
    label: 'K/G',
    blendShapes: { jawOpen: 0.25, mouthFunnel: 0.1 },
  },
  {
    id: 'ch',
    label: 'CH/SH',
    blendShapes: { jawOpen: 0.2, mouthPucker: 0.4, mouthFunnel: 0.3 },
  },
  {
    id: 'ss',
    label: 'S/Z',
    blendShapes: { jawOpen: 0.1, mouthSmileLeft: 0.2, mouthSmileRight: 0.2 },
  },
  {
    id: 'rr',
    label: 'R',
    blendShapes: { jawOpen: 0.2, mouthPucker: 0.3, mouthFunnel: 0.2 },
  },
  {
    id: 'll',
    label: 'L',
    blendShapes: { jawOpen: 0.25, tongueOut: 0.2 },
  },
]

// ============================================================================
// FACS ACTION UNITS REFERENCE
// ============================================================================

const FACS_ACTION_UNITS: FACSActionUnit[] = [
  { au: 'AU1', name: 'Inner Brow Raiser', description: 'Raises inner portion of eyebrows', relatedBlendShapes: ['browInnerUp'] },
  { au: 'AU2', name: 'Outer Brow Raiser', description: 'Raises outer portion of eyebrows', relatedBlendShapes: ['browOuterUpLeft', 'browOuterUpRight'] },
  { au: 'AU4', name: 'Brow Lowerer', description: 'Draws eyebrows down and together', relatedBlendShapes: ['browDownLeft', 'browDownRight'] },
  { au: 'AU5', name: 'Upper Lid Raiser', description: 'Opens eyes wide', relatedBlendShapes: ['eyeWideLeft', 'eyeWideRight'] },
  { au: 'AU6', name: 'Cheek Raiser', description: 'Raises cheeks, causes crow\'s feet', relatedBlendShapes: ['cheekSquintLeft', 'cheekSquintRight'] },
  { au: 'AU7', name: 'Lid Tightener', description: 'Tightens eyelids', relatedBlendShapes: ['eyeSquintLeft', 'eyeSquintRight'] },
  { au: 'AU9', name: 'Nose Wrinkler', description: 'Wrinkles nose bridge', relatedBlendShapes: ['noseSneerLeft', 'noseSneerRight'] },
  { au: 'AU10', name: 'Upper Lip Raiser', description: 'Raises upper lip', relatedBlendShapes: ['mouthUpperUpLeft', 'mouthUpperUpRight'] },
  { au: 'AU12', name: 'Lip Corner Puller', description: 'Pulls lip corners up (smile)', relatedBlendShapes: ['mouthSmileLeft', 'mouthSmileRight'] },
  { au: 'AU14', name: 'Dimpler', description: 'Creates dimples', relatedBlendShapes: ['mouthDimpleLeft', 'mouthDimpleRight'] },
  { au: 'AU15', name: 'Lip Corner Depressor', description: 'Pulls lip corners down (frown)', relatedBlendShapes: ['mouthFrownLeft', 'mouthFrownRight'] },
  { au: 'AU16', name: 'Lower Lip Depressor', description: 'Pulls lower lip down', relatedBlendShapes: ['mouthLowerDownLeft', 'mouthLowerDownRight'] },
  { au: 'AU17', name: 'Chin Raiser', description: 'Raises chin, pushes lower lip up', relatedBlendShapes: ['mouthShrugLower'] },
  { au: 'AU18', name: 'Lip Pucker', description: 'Puckers lips', relatedBlendShapes: ['mouthPucker'] },
  { au: 'AU20', name: 'Lip Stretcher', description: 'Stretches lips horizontally', relatedBlendShapes: ['mouthStretchLeft', 'mouthStretchRight'] },
  { au: 'AU22', name: 'Lip Funneler', description: 'Funnels lips outward', relatedBlendShapes: ['mouthFunnel'] },
  { au: 'AU23', name: 'Lip Tightener', description: 'Tightens and narrows lips', relatedBlendShapes: ['mouthPressLeft', 'mouthPressRight'] },
  { au: 'AU24', name: 'Lip Pressor', description: 'Presses lips together', relatedBlendShapes: ['mouthClose'] },
  { au: 'AU25', name: 'Lips Part', description: 'Parts lips', relatedBlendShapes: ['jawOpen'] },
  { au: 'AU26', name: 'Jaw Drop', description: 'Drops jaw', relatedBlendShapes: ['jawOpen'] },
  { au: 'AU27', name: 'Mouth Stretch', description: 'Opens mouth wide', relatedBlendShapes: ['jawOpen', 'mouthStretchLeft', 'mouthStretchRight'] },
  { au: 'AU28', name: 'Lip Suck', description: 'Sucks lips inward', relatedBlendShapes: ['mouthRollLower', 'mouthRollUpper'] },
  { au: 'AU33', name: 'Cheek Blow', description: 'Puffs out cheeks', relatedBlendShapes: ['cheekPuff'] },
  { au: 'AU45', name: 'Blink', description: 'Closes eyelids', relatedBlendShapes: ['eyeBlinkLeft', 'eyeBlinkRight'] },
]

// ============================================================================
// SUBCOMPONENT: BlendShapeSlider
// ============================================================================

interface BlendShapeSliderProps {
  name: string
  value: number
  onChange: (name: string, value: number) => void
}

const BlendShapeSlider: React.FC<BlendShapeSliderProps> = React.memo(({ name, value, onChange }) => {
  const displayName = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()

  return (
    <div className="flex items-center gap-2 py-1">
      <label className="text-xs text-slate-400 w-32 truncate" title={displayName}>
        {displayName}
      </label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => onChange(name, parseFloat(e.target.value))}
        className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                   [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                   [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:hover:bg-indigo-400"
      />
      <span className="text-xs text-slate-500 w-10 text-right font-mono">
        {value.toFixed(2)}
      </span>
    </div>
  )
})

BlendShapeSlider.displayName = 'BlendShapeSlider'

// ============================================================================
// SUBCOMPONENT: EmotionPresetButton
// ============================================================================

interface EmotionPresetButtonProps {
  preset: EmotionPreset
  isActive: boolean
  onClick: () => void
}

const EmotionPresetButton: React.FC<EmotionPresetButtonProps> = React.memo(({ preset, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
    >
      <span className="text-2xl mb-1">{preset.icon}</span>
      <span className="text-xs font-medium">{preset.name}</span>
    </button>
  )
})

EmotionPresetButton.displayName = 'EmotionPresetButton'

// ============================================================================
// SUBCOMPONENT: AudioWaveform
// ============================================================================

interface AudioWaveformProps {
  audioData: number[]
  duration: number
  currentTime: number
  onSeek: (time: number) => void
}

const AudioWaveform: React.FC<AudioWaveformProps> = React.memo(({ audioData, duration, currentTime, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const barWidth = width / audioData.length
    const playheadX = (currentTime / duration) * width

    // Clear canvas
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, width, height)

    // Draw waveform bars
    audioData.forEach((value, index) => {
      const x = index * barWidth
      const barHeight = value * height * 0.8
      const y = (height - barHeight) / 2

      const isPast = x < playheadX
      ctx.fillStyle = isPast ? '#6366f1' : '#475569'
      ctx.fillRect(x, y, barWidth - 1, barHeight)
    })

    // Draw playhead
    ctx.fillStyle = '#f97316'
    ctx.fillRect(playheadX - 1, 0, 2, height)

  }, [audioData, currentTime, duration])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / canvas.width) * duration
    onSeek(Math.max(0, Math.min(duration, time)))
  }

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={60}
        onClick={handleClick}
        className="w-full h-16 rounded cursor-pointer"
      />
    </div>
  )
})

AudioWaveform.displayName = 'AudioWaveform'

// ============================================================================
// SUBCOMPONENT: LipSyncTimeline
// ============================================================================

interface LipSyncTimelineProps {
  keyframes: LipSyncKeyframe[]
  duration: number
  currentTime: number
  onAddKeyframe: (time: number, viseme: string) => void
  onRemoveKeyframe: (id: string) => void
  onUpdateKeyframe: (id: string, updates: Partial<LipSyncKeyframe>) => void
  onTimeChange: (time: number) => void
}

const LipSyncTimeline: React.FC<LipSyncTimelineProps> = React.memo(({
  keyframes,
  duration,
  currentTime,
  onAddKeyframe,
  onRemoveKeyframe,
  onUpdateKeyframe,
  onTimeChange,
}) => {
  const [selectedViseme, setSelectedViseme] = useState<string>('aa')
  const [isPlaying, setIsPlaying] = useState(false)
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentTimeRef = useRef(currentTime)

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      playIntervalRef.current = setInterval(() => {
        const next = currentTimeRef.current + 0.033
        const clamped = next >= duration ? 0 : next
        currentTimeRef.current = clamped
        onTimeChange(clamped)
      }, 33)
    }
  }, [isPlaying, duration, onTimeChange])

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [])

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / rect.width) * duration
    
    if (e.shiftKey) {
      onAddKeyframe(time, selectedViseme)
    } else {
      onTimeChange(time)
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-300">Lip Sync Timeline</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayback}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-medium transition-colors"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <span className="text-xs text-slate-400 font-mono">
            {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
          </span>
        </div>
      </div>

      {/* Viseme Selector */}
      <div className="flex flex-wrap gap-1 mb-3">
        {VISEMES.map(viseme => (
          <button
            key={viseme.id}
            onClick={() => setSelectedViseme(viseme.id)}
            className={`px-2 py-1 text-xs rounded transition-colors
                        ${selectedViseme === viseme.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
          >
            {viseme.label}
          </button>
        ))}
      </div>

      {/* Timeline Track */}
      <div
        onClick={handleTimelineClick}
        className="relative h-16 bg-slate-900 rounded cursor-crosshair"
      >
        {/* Time markers */}
        {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 h-full border-l border-slate-700"
            style={{ left: `${(i / duration) * 100}%` }}
          >
            <span className="absolute top-0 left-1 text-xs text-slate-600">{i}s</span>
          </div>
        ))}

        {/* Keyframes */}
        {keyframes.map(kf => (
          <div
            key={kf.id}
            className="absolute top-1/2 -translate-y-1/2 transform cursor-pointer group"
            style={{ left: `${(kf.time / duration) * 100}%` }}
            onClick={(e) => {
              e.stopPropagation()
              if (e.altKey) {
                onRemoveKeyframe(kf.id)
              }
            }}
          >
            <div className="w-4 h-8 bg-indigo-500 rounded-sm flex items-center justify-center
                            group-hover:bg-indigo-400 transition-colors">
              <span className="text-xs font-bold text-white">
                {VISEMES.find(v => v.id === kf.viseme)?.label.charAt(0) || '?'}
              </span>
            </div>
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-orange-500"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>

      <p className="text-xs text-slate-500 mt-2">
        Shift+Click to add keyframe • Alt+Click on keyframe to remove • Click to seek
      </p>
    </div>
  )
})

LipSyncTimeline.displayName = 'LipSyncTimeline'

// ============================================================================
// SUBCOMPONENT: FACSReference
// ============================================================================

interface FACSReferenceProps {
  onSelectAU: (blendShapes: string[]) => void
}

const FACSReference: React.FC<FACSReferenceProps> = React.memo(({ onSelectAU }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedAU, setExpandedAU] = useState<string | null>(null)

  const filteredAUs = useMemo(() => {
    if (!searchQuery) return FACS_ACTION_UNITS
    const query = searchQuery.toLowerCase()
    return FACS_ACTION_UNITS.filter(au =>
      au.au.toLowerCase().includes(query) ||
      au.name.toLowerCase().includes(query) ||
      au.description.toLowerCase().includes(query)
    )
  }, [searchQuery])

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-slate-300 mb-3">FACS Action Units Reference</h4>
      
      <input
        type="text"
        placeholder="Search action units..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm
                   text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 
                   focus:ring-indigo-500 mb-3"
      />

      <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
        {filteredAUs.map(au => (
          <div
            key={au.au}
            className="bg-slate-900 rounded p-2 cursor-pointer hover:bg-slate-850 transition-colors"
            onClick={() => setExpandedAU(expandedAU === au.au ? null : au.au)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-indigo-600 px-2 py-0.5 rounded">
                  {au.au}
                </span>
                <span className="text-sm text-slate-300">{au.name}</span>
              </div>
              <span className="text-slate-500">{expandedAU === au.au ? '▼' : '▶'}</span>
            </div>
            
            {expandedAU === au.au && (
              <div className="mt-2 pl-2 border-l-2 border-slate-700">
                <p className="text-xs text-slate-400 mb-2">{au.description}</p>
                <div className="flex flex-wrap gap-1">
                  {au.relatedBlendShapes.map(bs => (
                    <span
                      key={bs}
                      className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300"
                    >
                      {bs}
                    </span>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectAU(au.relatedBlendShapes)
                  }}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Apply to sliders →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
})

FACSReference.displayName = 'FACSReference'

// ============================================================================
// SUBCOMPONENT: FacePreview3D
// ============================================================================

interface FacePreview3DProps {
  blendShapes: BlendShapeValues
}

const FaceMesh: React.FC<FacePreview3DProps> = ({ blendShapes }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const morphTargetsRef = useRef<{ [key: string]: number }>({})

  // Create a generic face geometry with morph targets
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 64, 64)
    
    // Create morph target attributes for face deformation
    const morphAttributes: { [key: string]: THREE.BufferAttribute[] } = {
      position: []
    }

    const positions = geo.attributes.position
    const posArray = positions.array as Float32Array

    // Generate morph targets for each blend shape category
    const allShapes = BLEND_SHAPE_CATEGORIES.flatMap(cat => cat.shapes)
    
    allShapes.forEach((shapeName, idx) => {
      const morphPositions = new Float32Array(posArray.length)
      
      for (let i = 0; i < posArray.length; i += 3) {
        const x = posArray[i]
        const y = posArray[i + 1]
        const z = posArray[i + 2]

        let dx = 0, dy = 0, dz = 0

        // Apply different deformations based on shape type
        if (shapeName.includes('eyeBlink')) {
          const isLeft = shapeName.includes('Left')
          const eyeX = isLeft ? -0.3 : 0.3
          const dist = Math.sqrt((x - eyeX) ** 2 + (y - 0.3) ** 2)
          if (dist < 0.2) {
            dy = -0.1 * (1 - dist / 0.2)
          }
        } else if (shapeName.includes('eyeWide')) {
          const isLeft = shapeName.includes('Left')
          const eyeX = isLeft ? -0.3 : 0.3
          const dist = Math.sqrt((x - eyeX) ** 2 + (y - 0.3) ** 2)
          if (dist < 0.2) {
            dy = 0.1 * (1 - dist / 0.2)
          }
        } else if (shapeName.includes('jawOpen')) {
          if (y < 0) {
            dy = -0.2 * Math.abs(y)
          }
        } else if (shapeName.includes('mouthSmile')) {
          const isLeft = shapeName.includes('Left')
          const mouthX = isLeft ? -0.2 : 0.2
          const dist = Math.sqrt((x - mouthX) ** 2 + (y + 0.3) ** 2)
          if (dist < 0.15) {
            dy = 0.1 * (1 - dist / 0.15)
            dx = (isLeft ? -1 : 1) * 0.05 * (1 - dist / 0.15)
          }
        } else if (shapeName.includes('mouthFrown')) {
          const isLeft = shapeName.includes('Left')
          const mouthX = isLeft ? -0.2 : 0.2
          const dist = Math.sqrt((x - mouthX) ** 2 + (y + 0.3) ** 2)
          if (dist < 0.15) {
            dy = -0.1 * (1 - dist / 0.15)
          }
        } else if (shapeName.includes('browDown')) {
          const isLeft = shapeName.includes('Left')
          const browX = isLeft ? -0.35 : 0.35
          const dist = Math.sqrt((x - browX) ** 2 + (y - 0.5) ** 2)
          if (dist < 0.15) {
            dy = -0.08 * (1 - dist / 0.15)
          }
        } else if (shapeName.includes('browInnerUp') || shapeName.includes('browOuterUp')) {
          const isLeft = shapeName.includes('Left')
          const browX = shapeName.includes('Inner') ? (isLeft ? -0.2 : 0.2) : (isLeft ? -0.45 : 0.45)
          const dist = Math.sqrt((x - browX) ** 2 + (y - 0.5) ** 2)
          if (dist < 0.12) {
            dy = 0.08 * (1 - dist / 0.12)
          }
        } else if (shapeName.includes('cheekPuff')) {
          const dist = Math.sqrt(x ** 2 + (y + 0.1) ** 2)
          if (dist < 0.4 && z > 0.5) {
            dz = 0.15 * (1 - dist / 0.4)
          }
        } else if (shapeName.includes('noseSneer')) {
          const dist = Math.sqrt(x ** 2 + (y - 0.1) ** 2)
          if (dist < 0.15) {
            dy = 0.05 * (1 - dist / 0.15)
            dz = 0.03 * (1 - dist / 0.15)
          }
        } else if (shapeName.includes('mouthPucker')) {
          const dist = Math.sqrt(x ** 2 + (y + 0.3) ** 2)
          if (dist < 0.15) {
            dz = 0.1 * (1 - dist / 0.15)
            const angle = Math.atan2(y + 0.3, x)
            dx = -Math.cos(angle) * 0.05 * (1 - dist / 0.15)
            dy = -Math.sin(angle) * 0.05 * (1 - dist / 0.15)
          }
        } else if (shapeName.includes('mouthFunnel')) {
          const dist = Math.sqrt(x ** 2 + (y + 0.3) ** 2)
          if (dist < 0.2) {
            dz = 0.08 * (1 - dist / 0.2)
          }
        }

        morphPositions[i] = dx
        morphPositions[i + 1] = dy
        morphPositions[i + 2] = dz
      }

      morphAttributes.position.push(new THREE.BufferAttribute(morphPositions, 3))
      morphTargetsRef.current[shapeName] = idx
    })

    geo.morphAttributes = morphAttributes
    geo.morphTargetsRelative = true

    return geo
  }, [])

  // Update morph target influences based on blend shapes
  useFrame(() => {
    if (!meshRef.current) return
    
    const morphInfluences = meshRef.current.morphTargetInfluences
    if (!morphInfluences) return

    Object.entries(blendShapes).forEach(([shapeName, value]) => {
      const idx = morphTargetsRef.current[shapeName]
      if (idx !== undefined && morphInfluences[idx] !== undefined) {
        morphInfluences[idx] = THREE.MathUtils.lerp(
          morphInfluences[idx],
          value,
          0.15
        )
      }
    })
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#e2a98f"
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  )
}

const FacePreview3D: React.FC<FacePreview3DProps> = React.memo(({ blendShapes }) => {
  return (
    <div className="w-full h-full min-h-[300px] bg-slate-900 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, 5, 5]} intensity={0.5} />
        <FaceMesh blendShapes={blendShapes} />
        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={5}
          target={[0, 0, 0]}
        />
        <Environment preset="studio" />
      </Canvas>
    </div>
  )
})

FacePreview3D.displayName = 'FacePreview3D'

// ============================================================================
// MAIN COMPONENT: FacialAnimationEditor
// ============================================================================

const FacialAnimationEditor: React.FC<FacialAnimationEditorProps> = ({
  characterId,
  onBlendShapeUpdate,
}) => {
  // Initialize all 52 blend shapes to 0
  const initialBlendShapes = useMemo(() => {
    const shapes: BlendShapeValues = {}
    BLEND_SHAPE_CATEGORIES.forEach(category => {
      category.shapes.forEach(shape => {
        shapes[shape] = 0
      })
    })
    return shapes
  }, [])

  const [blendShapes, setBlendShapes] = useState<BlendShapeValues>(initialBlendShapes)
  const [activeCategory, setActiveCategory] = useState<string>('Eye')
  const [activeEmotion, setActiveEmotion] = useState<string>('Neutral')
  const [lipSyncKeyframes, setLipSyncKeyframes] = useState<LipSyncKeyframe[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration] = useState(5)
  const [showFACS, setShowFACS] = useState(false)
  const [audioData] = useState<number[]>(() => 
    Array.from({ length: 100 }, () => Math.random() * 0.5 + 0.2)
  )

  // Update blend shape value
  const handleBlendShapeChange = useCallback((name: string, value: number) => {
    setBlendShapes(prev => {
      const updated = { ...prev, [name]: value } as BlendShapeValues
      onBlendShapeUpdate?.(updated)
      return updated
    })
    setActiveEmotion('')
  }, [onBlendShapeUpdate])

  // Apply emotion preset
  const applyEmotionPreset = useCallback((preset: EmotionPreset) => {
    setBlendShapes(prev => {
      const reset: BlendShapeValues = {}
      Object.keys(prev).forEach(key => {
        reset[key] = 0
      })
      const updated = { ...reset, ...preset.blendShapes } as BlendShapeValues
      onBlendShapeUpdate?.(updated)
      return updated
    })
    setActiveEmotion(preset.name)
  }, [onBlendShapeUpdate])

  // Add lip sync keyframe
  const handleAddKeyframe = useCallback((time: number, viseme: string) => {
    const newKeyframe: LipSyncKeyframe = {
      id: `kf-${Date.now()}`,
      time,
      viseme,
      intensity: 1,
    }
    setLipSyncKeyframes(prev => [...prev, newKeyframe].sort((a, b) => a.time - b.time))
  }, [])

  // Remove lip sync keyframe
  const handleRemoveKeyframe = useCallback((id: string) => {
    setLipSyncKeyframes(prev => prev.filter(kf => kf.id !== id))
  }, [])

  // Update lip sync keyframe
  const handleUpdateKeyframe = useCallback((id: string, updates: Partial<LipSyncKeyframe>) => {
    setLipSyncKeyframes(prev =>
      prev.map(kf => kf.id === id ? { ...kf, ...updates } : kf)
    )
  }, [])

  // Apply FACS action unit blend shapes
  const handleFACSSelect = useCallback((shapes: string[]) => {
    setBlendShapes(prev => {
      const updated = { ...prev }
      shapes.forEach(shape => {
        if (shape in updated) {
          updated[shape] = 1
        }
      })
      onBlendShapeUpdate?.(updated)
      return updated
    })
  }, [onBlendShapeUpdate])

  // Reset all blend shapes
  const handleReset = useCallback(() => {
    setBlendShapes(initialBlendShapes)
    setActiveEmotion('Neutral')
    onBlendShapeUpdate?.(initialBlendShapes)
  }, [initialBlendShapes, onBlendShapeUpdate])

  // Export to JSON
  const handleExport = useCallback(() => {
    const exportData = {
      characterId,
      timestamp: new Date().toISOString(),
      blendShapes,
      lipSyncKeyframes,
      metadata: {
        format: 'aethel-facial-animation',
        version: '1.0.0',
        blendShapeCount: Object.keys(blendShapes).length,
      },
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `facial-animation-${characterId}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [characterId, blendShapes, lipSyncKeyframes])

  // Get current category shapes
  const currentCategoryShapes = useMemo(() => {
    return BLEND_SHAPE_CATEGORIES.find(cat => cat.name === activeCategory)?.shapes || []
  }, [activeCategory])

  // Calculate active blend shapes count
  const activeBlendShapesCount = useMemo(() => {
    return Object.values(blendShapes).filter(v => v > 0).length
  }, [blendShapes])

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-indigo-400">
            🎭 Facial Animation Editor
          </h2>
          <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
            Character: {characterId}
          </span>
          <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
            {activeBlendShapesCount}/52 Active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFACS(!showFACS)}
            className={`px-3 py-1.5 text-sm rounded transition-colors
                        ${showFACS ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            📖 FACS Reference
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            🔄 Reset
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
          >
            📥 Export JSON
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - 3D Preview & Timeline */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">
          {/* 3D Face Preview */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">3D Preview</h3>
            <FacePreview3D blendShapes={blendShapes} />
          </div>

          {/* Emotion Presets */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Emotion Presets</h3>
            <div className="grid grid-cols-7 gap-2">
              {EMOTION_PRESETS.map(preset => (
                <EmotionPresetButton
                  key={preset.name}
                  preset={preset}
                  isActive={activeEmotion === preset.name}
                  onClick={() => applyEmotionPreset(preset)}
                />
              ))}
            </div>
          </div>

          {/* Audio Waveform */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Audio Waveform</h3>
            <AudioWaveform
              audioData={audioData}
              duration={duration}
              currentTime={currentTime}
              onSeek={setCurrentTime}
            />
          </div>

          {/* Lip Sync Timeline */}
          <div>
            <LipSyncTimeline
              keyframes={lipSyncKeyframes}
              duration={duration}
              currentTime={currentTime}
              onAddKeyframe={handleAddKeyframe}
              onRemoveKeyframe={handleRemoveKeyframe}
              onUpdateKeyframe={handleUpdateKeyframe}
              onTimeChange={setCurrentTime}
            />
          </div>
        </div>

        {/* Right Panel - Blend Shape Sliders */}
        <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 p-2 bg-slate-850 border-b border-slate-700">
            {BLEND_SHAPE_CATEGORIES.map(category => (
              <button
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1
                            ${activeCategory === category.name
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
                <span className="text-slate-500">({category.shapes.length})</span>
              </button>
            ))}
          </div>

          {/* Blend Shape Sliders */}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            <div className="space-y-1">
              {currentCategoryShapes.map(shape => (
                <BlendShapeSlider
                  key={shape}
                  name={shape}
                  value={blendShapes[shape] || 0}
                  onChange={handleBlendShapeChange}
                />
              ))}
            </div>
          </div>

          {/* FACS Reference Panel (Collapsible) */}
          {showFACS && (
            <div className="border-t border-slate-700 p-3 max-h-80 overflow-hidden">
              <FACSReference onSelectAU={handleFACSSelect} />
            </div>
          )}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  )
}

export default FacialAnimationEditor
