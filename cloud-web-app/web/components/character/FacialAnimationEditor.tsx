'use client'

// @aethel-heavy-async-boundary
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { BLEND_SHAPE_CATEGORIES, EMOTION_PRESETS, type BlendShapeValues, type EmotionPreset, type LipSyncKeyframe } from './facial-animation-model'
import {
  AudioWaveform,
  BlendShapeSlider,
  EmotionPresetButton,
  FacePreview3D,
  FACSReference,
  LipSyncTimeline,
} from '@/lib/character/FacialAnimationEditor.parts-runtime'

// TYPES & INTERFACES

interface FacialAnimationEditorProps {
  characterId: string
  onBlendShapeUpdate?: (blendShapes: BlendShapeValues) => void
}

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
        format: 'facial-animation',
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
    <div className="flex flex-col h-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[var(--aethel-info-light)]">
             Facial Animation Editor
          </h2>
          <span className="text-xs text-[var(--aethel-text-tertiary)] bg-[var(--aethel-surface-quaternary)] px-2 py-1 rounded">
            Character: {characterId}
          </span>
          <span className="text-xs text-[var(--aethel-text-tertiary)] bg-[var(--aethel-surface-quaternary)] px-2 py-1 rounded">
            {activeBlendShapesCount}/52 Active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={showFACS ? 'Hide FACS reference' : 'Show FACS reference'}
            onClick={() => setShowFACS(!showFACS)}
            className={
              showFACS
                ? 'rounded bg-[var(--aethel-info)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--aethel-info)]'
                : 'rounded bg-[var(--aethel-surface-quaternary)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--aethel-surface-quaternary)]'
            }
          >
             FACS Reference
          </button>
          <button type="button" aria-label="Reset facial blend shapes"
            onClick={handleReset}
            className="px-3 py-1.5 text-sm bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] rounded transition-colors"
          >
             Reset
          </button>
          <button type="button" aria-label="Export facial animation as JSON"
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-[var(--aethel-info)] hover:bg-[var(--aethel-info)] rounded transition-colors"
          >
             Export JSON
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - 3D Preview & Timeline */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">
          {/* 3D Face Preview */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--aethel-text-tertiary)] mb-2">3D Preview</h3>
            <FacePreview3D blendShapes={blendShapes} />
          </div>

          {/* Emotion Presets */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--aethel-text-tertiary)] mb-2">Emotion Presets</h3>
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
            <h3 className="text-sm font-semibold text-[var(--aethel-text-tertiary)] mb-2">Audio Waveform</h3>
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
        <div className="w-96 bg-[var(--aethel-surface-secondary)] border-l border-[var(--aethel-border-primary)] flex flex-col overflow-hidden">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 p-2 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)]">
            {BLEND_SHAPE_CATEGORIES.map(category => (
              <button
                type="button"
                aria-label="Select blend shape category"
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={
                  activeCategory === category.name
                    ? 'flex items-center gap-1 rounded bg-[var(--aethel-info)] px-3 py-1.5 text-xs text-[var(--aethel-text-primary)] transition-colors'
                    : 'flex items-center gap-1 rounded bg-[var(--aethel-surface-quaternary)] px-3 py-1.5 text-xs text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[var(--aethel-surface-quaternary)]'
                }
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
                <span className="text-[var(--aethel-text-tertiary)]">({category.shapes.length})</span>
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
            <div className="border-t border-[var(--aethel-border-primary)] p-3 max-h-80 overflow-hidden">
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
          background: var(--aethel-surface-tertiary);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--aethel-text-quaternary);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--aethel-text-tertiary);
        }
      `}</style>
    </div>
  )
}

export default FacialAnimationEditor
