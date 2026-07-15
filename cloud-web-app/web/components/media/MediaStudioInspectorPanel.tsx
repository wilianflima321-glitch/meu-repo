'use client'

import { type Dispatch, type SetStateAction } from 'react'
import type { VideoClip } from '../video/VideoTimeline'
import {
  formatTime,
  getEffectValue,
  type MediaProject,
  type TransitionType,
  upsertEffect,
} from './media-studio-core'
import type { ClipEffect } from '../../lib/video-encoder-real'

type ProjectSetter = Dispatch<SetStateAction<MediaProject>>

type InspectorProps = {
  currentTime: number
  selectedClip: (VideoClip & {
    gain?: number
    effects?: ClipEffect[]
    crossfade?: number
    transition?: TransitionType
  }) | null
  setProject: ProjectSetter
}

export function MediaStudioInspectorPanel({
  currentTime,
  selectedClip,
  setProject,
}: InspectorProps) {
  if (!selectedClip) return null

  const isAudio = selectedClip.type === 'audio'
  const isVisual = selectedClip.type === 'video' || selectedClip.type === 'image'

  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-semibold text-[var(--aethel-text-primary)]">Inspector</div>

      <div className="space-y-1">
        <div className="text-xs text-[var(--aethel-text-quaternary)]">Clip</div>
        <div className="text-sm text-[var(--aethel-text-secondary)] truncate">{selectedClip.name}</div>
        <div className="text-xs text-[var(--aethel-text-quaternary)]">{selectedClip.type.toUpperCase()}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-[var(--aethel-text-quaternary)]">
          Start
          <input
            className="mt-1 w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)] rounded px-2 py-1 text-[var(--aethel-text-primary)]"
            type="number"
            step="0.1"
            value={selectedClip.startTime}
            onChange={(e) => {
              const value = parseFloat(e.target.value)
              setProject((prev) => ({
                ...prev,
                clips: prev.clips.map((clip) =>
                  clip.id === selectedClip.id
                    ? { ...clip, startTime: Number.isFinite(value) ? value : clip.startTime }
                    : clip
                ),
              }))
            }}
          />
        </label>

        <label className="text-xs text-[var(--aethel-text-quaternary)]">
          Duration
          <input
            className="mt-1 w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)] rounded px-2 py-1 text-[var(--aethel-text-primary)]"
            type="number"
            step="0.1"
            value={selectedClip.duration}
            onChange={(e) => {
              const value = parseFloat(e.target.value)
              setProject((prev) => ({
                ...prev,
                clips: prev.clips.map((clip) =>
                  clip.id === selectedClip.id
                    ? {
                        ...clip,
                        duration: Number.isFinite(value) ? value : clip.duration,
                        outPoint: Number.isFinite(value) ? clip.inPoint + value : clip.outPoint,
                      }
                    : clip
                ),
              }))
            }}
          />
        </label>

        <label className="text-xs text-[var(--aethel-text-quaternary)]">
          In
          <input
            className="mt-1 w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)] rounded px-2 py-1 text-[var(--aethel-text-primary)]"
            type="number"
            step="0.1"
            value={selectedClip.inPoint}
            onChange={(e) => {
              const value = parseFloat(e.target.value)
              setProject((prev) => ({
                ...prev,
                clips: prev.clips.map((clip) =>
                  clip.id === selectedClip.id
                    ? { ...clip, inPoint: Number.isFinite(value) ? value : clip.inPoint }
                    : clip
                ),
              }))
            }}
          />
        </label>

        <label className="text-xs text-[var(--aethel-text-quaternary)]">
          Out
          <input
            className="mt-1 w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)] rounded px-2 py-1 text-[var(--aethel-text-primary)]"
            type="number"
            step="0.1"
            value={selectedClip.outPoint}
            onChange={(e) => {
              const value = parseFloat(e.target.value)
              setProject((prev) => ({
                ...prev,
                clips: prev.clips.map((clip) =>
                  clip.id === selectedClip.id
                    ? { ...clip, outPoint: Number.isFinite(value) ? value : clip.outPoint }
                    : clip
                ),
              }))
            }}
          />
        </label>

        {isAudio && (
          <label className="col-span-2 text-xs text-[var(--aethel-text-quaternary)]">
            Gain
            <input
              className="mt-1 w-full"
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={selectedClip.gain ?? 1}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                setProject((prev) => ({
                  ...prev,
                  clips: prev.clips.map((clip) =>
                    clip.id === selectedClip.id
                      ? { ...clip, gain: Number.isFinite(value) ? value : (clip.gain ?? 1) }
                      : clip
                  ),
                }))
              }}
            />
          </label>
        )}

        <label className="col-span-2 text-xs text-[var(--aethel-text-quaternary)]">
          Transition overlap
          <select
            className="mt-1 w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)] rounded px-2 py-1 text-[var(--aethel-text-primary)]"
            value={selectedClip.transition ?? 'crossfade'}
            onChange={(e) => {
              const value = e.target.value as TransitionType
              setProject((prev) => ({
                ...prev,
                clips: prev.clips.map((clip) =>
                  clip.id === selectedClip.id ? { ...clip, transition: value } : clip
                ),
              }))
            }}
          >
            <option value="crossfade">Crossfade</option>
            <option value="dipToBlack">Dip to black</option>
          </select>
        </label>

        <label className="col-span-2 text-xs text-[var(--aethel-text-quaternary)]">
          Crossfade overlap
          <input
            className="mt-1 w-full"
            type="range"
            min="0"
            max="5"
            step="0.05"
            value={selectedClip.crossfade ?? 0.5}
            onChange={(e) => {
              const value = parseFloat(e.target.value)
              setProject((prev) => ({
                ...prev,
                clips: prev.clips.map((clip) =>
                  clip.id === selectedClip.id
                    ? { ...clip, crossfade: Number.isFinite(value) ? value : (clip.crossfade ?? 0.5) }
                    : clip
                ),
              }))
            }}
          />
        </label>

        {isVisual && (
          <label className="col-span-2 text-xs text-[var(--aethel-text-quaternary)]">
            Opacity
            <input
              className="mt-1 w-full"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={getEffectValue(selectedClip.effects, 'opacity', 1)}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                setProject((prev) => ({
                  ...prev,
                  clips: prev.clips.map((clip) =>
                    clip.id === selectedClip.id
                      ? {
                          ...clip,
                          effects: upsertEffect(clip.effects, {
                            type: 'opacity',
                            value: Number.isFinite(value) ? value : 1,
                          }),
                        }
                      : clip
                  ),
                }))
              }}
            />
          </label>
        )}

        {isVisual && (
          <label className="col-span-2 text-xs text-[var(--aethel-text-quaternary)]">
            Color (brightness / contrast / saturation)
            <div className="mt-1 space-y-2">
              <InspectorRangeRow
                label="Brightness"
                max={2}
                min={0}
                step={0.01}
                value={getEffectValue(selectedClip.effects, 'brightness', 1)}
                onChange={(value) => {
                  setProject((prev) => ({
                    ...prev,
                    clips: prev.clips.map((clip) =>
                      clip.id === selectedClip.id
                        ? {
                            ...clip,
                            effects: upsertEffect(clip.effects, { type: 'brightness', value }),
                          }
                        : clip
                    ),
                  }))
                }}
              />
              <InspectorRangeRow
                label="Contrast"
                max={2}
                min={0}
                step={0.01}
                value={getEffectValue(selectedClip.effects, 'contrast', 1)}
                onChange={(value) => {
                  setProject((prev) => ({
                    ...prev,
                    clips: prev.clips.map((clip) =>
                      clip.id === selectedClip.id
                        ? {
                            ...clip,
                            effects: upsertEffect(clip.effects, { type: 'contrast', value }),
                          }
                        : clip
                    ),
                  }))
                }}
              />
              <InspectorRangeRow
                label="Saturation"
                max={3}
                min={0}
                step={0.01}
                value={getEffectValue(selectedClip.effects, 'saturation', 1)}
                onChange={(value) => {
                  setProject((prev) => ({
                    ...prev,
                    clips: prev.clips.map((clip) =>
                      clip.id === selectedClip.id
                        ? {
                            ...clip,
                            effects: upsertEffect(clip.effects, { type: 'saturation', value }),
                          }
                        : clip
                    ),
                  }))
                }}
              />
            </div>
          </label>
        )}

        {isVisual && (
          <label className="col-span-2 text-xs text-[var(--aethel-text-quaternary)]">
            Blur / grayscale
            <div className="mt-1 space-y-2">
              <InspectorRangeRow
                label="Blur"
                max={16}
                min={0}
                step={0.1}
                value={getEffectValue(selectedClip.effects, 'blur', 0)}
                onChange={(value) => {
                  setProject((prev) => ({
                    ...prev,
                    clips: prev.clips.map((clip) =>
                      clip.id === selectedClip.id
                        ? {
                            ...clip,
                            effects: upsertEffect(clip.effects, { type: 'blur', value }),
                          }
                        : clip
                    ),
                  }))
                }}
              />
              <InspectorRangeRow
                label="Gray"
                max={1}
                min={0}
                step={0.01}
                value={getEffectValue(selectedClip.effects, 'grayscale', 0)}
                onChange={(value) => {
                  setProject((prev) => ({
                    ...prev,
                    clips: prev.clips.map((clip) =>
                      clip.id === selectedClip.id
                        ? {
                            ...clip,
                            effects: upsertEffect(clip.effects, { type: 'grayscale', value }),
                          }
                        : clip
                    ),
                  }))
                }}
              />
            </div>
          </label>
        )}
      </div>

      <div className="text-xs text-[var(--aethel-text-quaternary)] font-mono">Playhead: {formatTime(currentTime)}</div>
    </div>
  )
}

type InspectorRangeRowProps = {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}

function InspectorRangeRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: InspectorRangeRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[11px] text-[var(--aethel-text-quaternary)]">{label}</span>
      <input
        className="flex-1"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const nextValue = parseFloat(e.target.value)
          onChange(Number.isFinite(nextValue) ? nextValue : value)
        }}
      />
      <span className="w-10 text-[11px] text-right text-[var(--aethel-text-quaternary)]">
        {Number.isFinite(value) ? value.toFixed(2) : '0.00'}
      </span>
    </div>
  )
}
