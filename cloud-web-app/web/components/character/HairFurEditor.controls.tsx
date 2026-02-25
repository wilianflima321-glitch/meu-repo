'use client'

import React, { useCallback, useMemo, useState } from 'react'

import type {
  GradientStop,
  LODSettings,
} from './hair-fur-core'

interface GradientPickerProps {
  gradient: GradientStop[]
  onChange: (gradient: GradientStop[]) => void
}

export function GradientPicker({ gradient, onChange }: GradientPickerProps) {
  const [selectedStop, setSelectedStop] = useState<number>(0)

  const handleStopColorChange = useCallback(
    (index: number, color: string) => {
      const nextGradient = [...gradient]
      nextGradient[index] = { ...nextGradient[index], color }
      onChange(nextGradient)
    },
    [gradient, onChange],
  )

  const handleStopPositionChange = useCallback(
    (index: number, position: number) => {
      const nextGradient = [...gradient]
      nextGradient[index] = { ...nextGradient[index], position: Math.max(0, Math.min(1, position)) }
      nextGradient.sort((a, b) => a.position - b.position)
      onChange(nextGradient)
      setSelectedStop(nextGradient.findIndex((stop) => stop.position === position))
    },
    [gradient, onChange],
  )

  const addStop = useCallback(() => {
    const newPosition = gradient.length > 0 ? (gradient[gradient.length - 1].position + 1) / 2 : 0.5
    const nextGradient = [...gradient, { position: newPosition, color: '#8b5a2b' }]
    nextGradient.sort((a, b) => a.position - b.position)
    onChange(nextGradient)
  }, [gradient, onChange])

  const removeStop = useCallback(
    (index: number) => {
      if (gradient.length <= 2) return
      const nextGradient = gradient.filter((_, i) => i !== index)
      onChange(nextGradient)
      setSelectedStop(Math.min(selectedStop, nextGradient.length - 1))
    },
    [gradient, onChange, selectedStop],
  )

  const gradientStyle = useMemo(() => {
    const stops = gradient.map((stop) => `${stop.color} ${stop.position * 100}%`).join(', ')
    return { background: `linear-gradient(to right, ${stops})` }
  }, [gradient])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">Gradient Root -> Tip</label>
        <button
          onClick={addStop}
          className="rounded bg-sky-600 px-2 py-1 text-xs text-white transition-colors hover:bg-sky-500"
        >
          + Stop
        </button>
      </div>

      <div className="relative h-8 overflow-hidden rounded-lg border border-slate-600" style={gradientStyle}>
        {gradient.map((stop, index) => (
          <div
            key={index}
            className={`absolute top-0 bottom-0 w-1 cursor-pointer transition-transform ${selectedStop === index ? 'ring-2 ring-white' : ''}`}
            style={{ left: `${stop.position * 100}%`, transform: 'translateX(-50%)' }}
            onClick={() => setSelectedStop(index)}
          >
            <div className="mx-auto mt-6 h-3 w-3 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: stop.color }} />
          </div>
        ))}
      </div>

      {gradient[selectedStop] && (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-800/50 p-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Color</label>
            <input
              type="color"
              value={gradient[selectedStop].color}
              onChange={(e) => handleStopColorChange(selectedStop, e.target.value)}
              className="h-8 w-full cursor-pointer rounded border-0"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Position</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={gradient[selectedStop].position.toFixed(2)}
              onChange={(e) => handleStopPositionChange(selectedStop, parseFloat(e.target.value))}
              className="h-8 w-full rounded border border-slate-600 bg-slate-700 px-2 text-sm text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => removeStop(selectedStop)}
              disabled={gradient.length <= 2}
              className="h-8 w-full rounded bg-red-600 text-xs text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              Remove
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

interface LODPreviewProps {
  lod: LODSettings
  currentDistance: number
}

export function LODPreview({ lod, currentDistance }: LODPreviewProps) {
  const currentMode = useMemo(() => {
    if (!lod.enableLOD) return 'strands'
    if (currentDistance < lod.strandDistance) return 'strands'
    if (currentDistance < lod.cardDistance) return 'cards'
    return 'billboard'
  }, [lod, currentDistance])

  return (
    <div className="space-y-2 rounded-lg bg-slate-800/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">Current Mode:</span>
        <span
          className={`rounded px-2 py-1 text-xs font-medium ${
            currentMode === 'strands'
              ? 'bg-green-600 text-white'
              : currentMode === 'cards'
                ? 'bg-yellow-600 text-white'
                : 'bg-red-600 text-white'
          }`}
        >
          {currentMode === 'strands' ? 'Strands' : currentMode === 'cards' ? 'Cards' : 'Billboard'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
            style={{ width: `${Math.min((currentDistance / (lod.cardDistance * 1.5)) * 100, 100)}%` }}
          />
        </div>
        <span className="w-16 text-right text-xs text-slate-400">{currentDistance.toFixed(1)}m</span>
      </div>
    </div>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

export function Slider({ label, value, min, max, step = 1, unit = '', onChange }: SliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-300">{label}</label>
        <span className="font-mono text-sm text-sky-400">
          {step < 1 ? value.toFixed(2) : value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-sky-500"
      />
    </div>
  )
}
