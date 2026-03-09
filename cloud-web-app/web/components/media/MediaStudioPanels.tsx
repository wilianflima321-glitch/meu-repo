'use client'

import { type Dispatch, type SetStateAction } from 'react'
import { ImageEditor } from '../image/ImageEditor'
import WaveformRenderer, { MixerChannel } from '../audio/AudioEngine'
import { VideoPreview, type VideoClip } from '../video/VideoTimeline'
import {
  formatTime,
  getEffectValue,
  type MediaAsset,
  type MediaKind,
  type MediaProject,
  type TransitionType,
  upsertEffect,
} from './media-studio-core'
import type { ClipEffect } from '../../lib/video-encoder-real'

type ProjectSetter = Dispatch<SetStateAction<MediaProject>>

type ToolbarProps = {
  currentTime: number
  duration: number
  exporting: boolean
  exportStatus: string
  isPlaying: boolean
  zoom: number
  onExport: () => void
  onImport: (file: File) => void
  onSetZoom: (zoom: number) => void
  onTogglePlay: () => void
  onStop: () => void
}

export function MediaStudioToolbar({
  currentTime,
  duration,
  exporting,
  exportStatus,
  isPlaying,
  zoom,
  onExport,
  onImport,
  onSetZoom,
  onTogglePlay,
  onStop,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900">
      <div className="text-sm font-semibold text-slate-200">Media Studio</div>

      <button
        className="ml-3 px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
        onClick={onTogglePlay}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button
        className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
        onClick={onStop}
      >
        Stop
      </button>

      <button
        className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700 disabled:opacity-50"
        onClick={onExport}
        disabled={exporting}
      >
        {exporting ? 'Exportando...' : 'Exportar WebM'}
      </button>

      {exportStatus && <div className="text-xs text-slate-400">{exportStatus}</div>}

      <div className="ml-3 text-xs text-slate-400 font-mono">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label className="text-xs text-slate-400 flex items-center gap-2">
          Zoom
          <input
            type="range"
            min={20}
            max={200}
            value={zoom}
            onChange={(e) => onSetZoom(parseInt(e.target.value, 10))}
          />
        </label>

        <label className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700 cursor-pointer">
          Importar
          <input
            className="hidden"
            type="file"
            accept="audio/*,video/*,image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              onImport(file)
              e.currentTarget.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}

type AssetBinProps = {
  assets: MediaAsset[]
  selectedAssetId: string | null
  onSelectAsset: (assetId: string) => void
}

export function MediaStudioAssetBin({ assets, selectedAssetId, onSelectAsset }: AssetBinProps) {
  return (
    <div className="w-64 border-r border-slate-800 bg-slate-950/30">
      <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-800">Assets</div>
      <div className="p-2 space-y-1 overflow-auto h-full">
        {assets.length === 0 ? (
          <div className="text-sm text-slate-500 p-2">
            Importe um arquivo de midia (imagem, audio ou video) para comecar.
          </div>
        ) : (
          assets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onSelectAsset(asset.id)}
              className={
                'w-full text-left px-2 py-1.5 rounded border ' +
                (selectedAssetId === asset.id
                  ? 'bg-slate-800 border-slate-700 text-slate-100'
                  : 'bg-transparent border-transparent hover:bg-slate-800/50 text-slate-300')
              }
            >
              <div className="text-sm truncate">{asset.name}</div>
              <div className="text-xs text-slate-500">{asset.kind.toUpperCase()}</div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

type PreviewProps = {
  activeTimelineVideoClip: VideoClip | null
  audioProgress: number
  currentTime: number
  duration: number
  isPlaying: boolean
  onAudioPause: () => void
  onAudioPlay: () => void
  onAudioSeek: (position: number) => void
  onSetCurrentTime: (time: number) => void
  preview: { kind: MediaKind | null; src?: string }
  previewVideoTime: number
}

export function MediaStudioPreviewPanel({
  activeTimelineVideoClip,
  audioProgress,
  currentTime,
  duration,
  isPlaying,
  onAudioPause,
  onAudioPlay,
  onAudioSeek,
  onSetCurrentTime,
  preview,
  previewVideoTime,
}: PreviewProps) {
  return (
    <div className="flex-1 min-h-0 p-3">
      <div className="h-full bg-slate-950/30 border border-slate-800 rounded">
        {preview.kind === 'video' ? (
          <div className="p-3">
            <VideoPreview
              src={preview.src}
              currentTime={previewVideoTime}
              isPlaying={isPlaying}
              onTimeUpdate={(videoTime) => {
                if (!activeTimelineVideoClip) return
                const timelineTime =
                  activeTimelineVideoClip.startTime +
                  (videoTime - activeTimelineVideoClip.inPoint)
                onSetCurrentTime(Math.max(0, Math.min(duration, timelineTime)))
              }}
            />
          </div>
        ) : preview.kind === 'image' ? (
          <div className="h-full">
            <ImageEditor width={980} height={640} initialImage={preview.src} />
          </div>
        ) : preview.kind === 'audio' ? (
          <div className="p-3">
            <WaveformRenderer
              audioUrl={preview.src}
              width={900}
              height={180}
              progress={audioProgress}
              onSeek={onAudioSeek}
            />
            <div className="mt-2 flex gap-2">
              <button
                className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
                onClick={onAudioPlay}
              >
                Play Audio
              </button>
              <button
                className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
                onClick={onAudioPause}
              >
                Pause Audio
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            Selecione um asset ou clip para visualizar.
          </div>
        )}
        <div className="sr-only">Tempo atual {currentTime}</div>
      </div>
    </div>
  )
}

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

        <label className="text-xs text-slate-400">
          Duration
          <input
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
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

        <label className="text-xs text-slate-400">
          In
          <input
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
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

        <label className="text-xs text-slate-400">
          Out
          <input
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
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

        <label className="col-span-2 text-xs text-slate-400">
          Transition (overlap)
          <select
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
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
          <label className="col-span-2 text-xs text-slate-400">
            Color (Brightness / Contrast / Saturation)
            <div className="mt-1 space-y-2">
              <InspectorRangeRow
                label="Bright"
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
                label="Saturate"
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
          <label className="col-span-2 text-xs text-slate-400">
            Blur / Grayscale
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

      <div className="text-xs text-slate-500 font-mono">Playhead: {formatTime(currentTime)}</div>
    </div>
  )
}

type MixerProps = {
  clips: (VideoClip & { gain?: number })[]
  setProject: ProjectSetter
}

export function MediaStudioMixerPanel({ clips, setProject }: MixerProps) {
  const audioClips = clips.filter((clip) => clip.type === 'audio')
  if (audioClips.length === 0) return null

  return (
    <div className="p-3">
      <div className="text-sm font-semibold text-slate-200 mb-2">Mixer</div>
      <div className="flex gap-2 overflow-x-auto">
        {audioClips.map((clip) => (
          <MixerChannel
            key={clip.id}
            name={clip.name}
            volume={Math.min(1, Math.max(0, (clip.gain ?? 1) / 2))}
            pan={0}
            muted={false}
            solo={false}
            peakLevel={0}
            onVolumeChange={(volume) => {
              const gain = volume * 2
              setProject((prev) => ({
                ...prev,
                clips: prev.clips.map((currentClip) =>
                  currentClip.id === clip.id ? { ...currentClip, gain } : currentClip
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
      <span className="w-16 text-[11px] text-slate-500">{label}</span>
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
    </div>
  )
}
