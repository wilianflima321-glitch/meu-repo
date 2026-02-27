'use client'

import React, { useMemo } from 'react'
import { MixerChannel } from '../audio/AudioEngine'
import {
  formatTime,
  getEffectValue,
  upsertEffect,
  type MediaProject,
  type TransitionType,
} from './MediaStudio.utils'

type StudioClip = MediaProject['clips'][number]

interface MediaStudioInspectorProps {
  selectedClip: StudioClip | null
  currentTime: number
  setProject: React.Dispatch<React.SetStateAction<MediaProject>>
}

export function MediaStudioInspector({
  selectedClip,
  currentTime,
  setProject,
}: MediaStudioInspectorProps): React.ReactNode {
  return useMemo(() => {
    if (!selectedClip) return null

    const isAudio = selectedClip.type === 'audio'
    const isVisual = selectedClip.type === 'video' || selectedClip.type === 'image'

    return (
      <div className="p-3 space-y-3">
        <div className="text-sm font-semibold text-slate-200">Inspector</div>

        <div className="space-y-1">
          <div className="text-xs text-slate-400">Clip</div>
          <div className="text-sm text-slate-200 truncate">{selectedClip.name}</div>
          <div className="text-xs text-slate-500">{selectedClip.type.toUpperCase()}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">
            Start
            <input
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              type="number"
              step="0.1"
              value={selectedClip.startTime}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setProject((prev) => ({
                  ...prev,
                  clips: prev.clips.map((c) =>
                    c.id === selectedClip.id
                      ? { ...c, startTime: Number.isFinite(v) ? v : c.startTime }
                      : c,
                  ),
                }))
              }}
            />
          </label>

          <label className="text-xs text-slate-400">
            Duration
            <input
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              type="number"
              step="0.1"
              value={selectedClip.duration}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setProject((prev) => ({
                  ...prev,
                  clips: prev.clips.map((c) =>
                    c.id === selectedClip.id
                      ? {
                          ...c,
                          duration: Number.isFinite(v) ? v : c.duration,
                          outPoint: Number.isFinite(v) ? c.inPoint + v : c.outPoint,
                        }
                      : c,
                  ),
                }))
              }}
            />
          </label>

          <label className="text-xs text-slate-400">
            In
            <input
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              type="number"
              step="0.1"
              value={selectedClip.inPoint}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setProject((prev) => ({
                  ...prev,
                  clips: prev.clips.map((c) =>
                    c.id === selectedClip.id
                      ? { ...c, inPoint: Number.isFinite(v) ? v : c.inPoint }
                      : c,
                  ),
                }))
              }}
            />
          </label>

          <label className="text-xs text-slate-400">
            Out
            <input
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              type="number"
              step="0.1"
              value={selectedClip.outPoint}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setProject((prev) => ({
                  ...prev,
                  clips: prev.clips.map((c) =>
                    c.id === selectedClip.id
                      ? { ...c, outPoint: Number.isFinite(v) ? v : c.outPoint }
                      : c,
                  ),
                }))
              }}
            />
          </label>

          {isAudio && (
            <label className="col-span-2 text-xs text-slate-400">
              Gain
              <input
                className="mt-1 w-full"
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={selectedClip.gain ?? 1}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setProject((prev) => ({
                    ...prev,
                    clips: prev.clips.map((c) =>
                      c.id === selectedClip.id
                        ? { ...c, gain: Number.isFinite(v) ? v : (c.gain ?? 1) }
                        : c,
                    ),
                  }))
                }}
              />
            </label>
          )}

          <label className="col-span-2 text-xs text-slate-400">
            Transition (overlap)
            <select
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              value={selectedClip.transition ?? 'crossfade'}
              onChange={(e) => {
                const v = e.target.value as TransitionType
                setProject((prev) => ({
                  ...prev,
                  clips: prev.clips.map((c) =>
                    c.id === selectedClip.id ? { ...c, transition: v } : c,
                  ),
                }))
              }}
            >
              <option value="crossfade">Crossfade</option>
              <option value="dipToBlack">Dip to Black</option>
            </select>
          </label>

          <label className="col-span-2 text-xs text-slate-400">
            Crossfade (overlap)
            <input
              className="mt-1 w-full"
              type="range"
              min="0"
              max="5"
              step="0.05"
              value={selectedClip.crossfade ?? 0.5}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setProject((prev) => ({
                  ...prev,
                  clips: prev.clips.map((c) =>
                    c.id === selectedClip.id
                      ? { ...c, crossfade: Number.isFinite(v) ? v : (c.crossfade ?? 0.5) }
                      : c,
                  ),
                }))
              }}
            />
          </label>

          {isVisual && (
            <label className="col-span-2 text-xs text-slate-400">
              Opacity
              <input
                className="mt-1 w-full"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={getEffectValue(selectedClip.effects, 'opacity', 1)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setProject((prev) => ({
                    ...prev,
                    clips: prev.clips.map((c) =>
                      c.id === selectedClip.id
                        ? {
                            ...c,
                            effects: upsertEffect(c.effects, {
                              type: 'opacity',
                              value: Number.isFinite(v) ? v : 1,
                            }),
                          }
                        : c,
                    ),
                  }))
                }}
              />
            </label>
          )}

          {isVisual && (
            <label className="col-span-2 text-xs text-slate-400">
              Color (Brightness / Contrast / Saturation)
              <div className="mt-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-slate-500">Bright</span>
                  <input
                    className="flex-1"
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={getEffectValue(selectedClip.effects, 'brightness', 1)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setProject((prev) => ({
                        ...prev,
                        clips: prev.clips.map((c) =>
                          c.id === selectedClip.id
                            ? {
                                ...c,
                                effects: upsertEffect(c.effects, {
                                  type: 'brightness',
                                  value: Number.isFinite(v) ? v : 1,
                                }),
                              }
                            : c,
                        ),
                      }))
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-slate-500">Contrast</span>
                  <input
                    className="flex-1"
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={getEffectValue(selectedClip.effects, 'contrast', 1)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setProject((prev) => ({
                        ...prev,
                        clips: prev.clips.map((c) =>
                          c.id === selectedClip.id
                            ? {
                                ...c,
                                effects: upsertEffect(c.effects, {
                                  type: 'contrast',
                                  value: Number.isFinite(v) ? v : 1,
                                }),
                              }
                            : c,
                        ),
                      }))
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-slate-500">Saturate</span>
                  <input
                    className="flex-1"
                    type="range"
                    min="0"
                    max="3"
                    step="0.01"
                    value={getEffectValue(selectedClip.effects, 'saturation', 1)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setProject((prev) => ({
                        ...prev,
                        clips: prev.clips.map((c) =>
                          c.id === selectedClip.id
                            ? {
                                ...c,
                                effects: upsertEffect(c.effects, {
                                  type: 'saturation',
                                  value: Number.isFinite(v) ? v : 1,
                                }),
                              }
                            : c,
                        ),
                      }))
                    }}
                  />
                </div>
              </div>
            </label>
          )}

          {isVisual && (
            <label className="col-span-2 text-xs text-slate-400">
              Blur / Grayscale
              <div className="mt-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-slate-500">Blur</span>
                  <input
                    className="flex-1"
                    type="range"
                    min="0"
                    max="16"
                    step="0.1"
                    value={getEffectValue(selectedClip.effects, 'blur', 0)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setProject((prev) => ({
                        ...prev,
                        clips: prev.clips.map((c) =>
                          c.id === selectedClip.id
                            ? {
                                ...c,
                                effects: upsertEffect(c.effects, {
                                  type: 'blur',
                                  value: Number.isFinite(v) ? v : 0,
                                }),
                              }
                            : c,
                        ),
                      }))
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-slate-500">Gray</span>
                  <input
                    className="flex-1"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={getEffectValue(selectedClip.effects, 'grayscale', 0)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setProject((prev) => ({
                        ...prev,
                        clips: prev.clips.map((c) =>
                          c.id === selectedClip.id
                            ? {
                                ...c,
                                effects: upsertEffect(c.effects, {
                                  type: 'grayscale',
                                  value: Number.isFinite(v) ? v : 0,
                                }),
                              }
                            : c,
                        ),
                      }))
                    }}
                  />
                </div>
              </div>
            </label>
          )}
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Playhead: {formatTime(currentTime)}
        </div>
      </div>
    )
  }, [currentTime, selectedClip, setProject])
}

interface MediaStudioMixerProps {
  clips: MediaProject['clips']
  setProject: React.Dispatch<React.SetStateAction<MediaProject>>
}

export function MediaStudioMixer({ clips, setProject }: MediaStudioMixerProps): React.ReactNode {
  return useMemo(() => {
    const audioClips = clips.filter((c) => c.type === 'audio')
    if (audioClips.length === 0) return null

    return (
      <div className="p-3">
        <div className="text-sm font-semibold text-slate-200 mb-2">Mixer</div>
        <div className="flex gap-2 overflow-x-auto">
          {audioClips.map((c) => (
            <MixerChannel
              key={c.id}
              name={c.name}
              volume={Math.min(1, Math.max(0, (c.gain ?? 1) / 2))}
              pan={0}
              muted={false}
              solo={false}
              peakLevel={0}
              onVolumeChange={(vol) => {
                const gain = vol * 2
                setProject((prev) => ({
                  ...prev,
                  clips: prev.clips.map((cc) =>
                    cc.id === c.id ? { ...cc, gain } : cc,
                  ),
                }))
              }}
              onPanChange={() => {}}
              onMuteToggle={() => {}}
              onSoloToggle={() => {}}
            />
          ))}
        </div>
      </div>
    )
  }, [clips, setProject])
}
