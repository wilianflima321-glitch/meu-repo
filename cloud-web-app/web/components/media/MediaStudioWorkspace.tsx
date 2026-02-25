'use client'

import React from 'react'
import WaveformRenderer from '../audio/AudioEngine'
import { ImageEditor } from '../image/ImageEditor'
import { VideoPreview, VideoTimeline, type VideoClip } from '../video/VideoTimeline'
import type { MediaAsset, MediaKind, MediaProject } from './MediaStudio.utils'

type PreviewPayload = {
  kind: MediaKind | null
  src?: string
}

type ActiveTimelineVideoClip = Pick<VideoClip, 'startTime' | 'inPoint'> | null

type MediaStudioWorkspaceProps = {
  project: MediaProject
  currentTime: number
  zoom: number
  exporting: boolean
  exportStatus: string
  isPlaying: boolean
  selectedAssetId: string | null
  preview: PreviewPayload
  previewVideoTime: number
  activeTimelineVideoClip: ActiveTimelineVideoClip
  audioProgress: number
  audioElRef: React.RefObject<HTMLAudioElement | null>
  inspector: React.ReactNode
  mixer: React.ReactNode
  onTogglePlay: () => void
  onStop: () => void
  onExportWebM: () => void
  onZoomChange: (zoom: number) => void
  onImportLocal: (file: File) => void
  onSelectAsset: (assetId: string) => void
  onTimeChange: (time: number) => void
  onClipMove: (clipId: string, startTime: number, trackIndex: number) => void
  onClipTrim: (clipId: string, inPoint: number, outPoint: number) => void
  onClipSelect: (clipId: string | null) => void
  selectedClipId: string | null
  formatTime: (time: number) => string
}

export function MediaStudioWorkspace({
  project,
  currentTime,
  zoom,
  exporting,
  exportStatus,
  isPlaying,
  selectedAssetId,
  preview,
  previewVideoTime,
  activeTimelineVideoClip,
  audioProgress,
  audioElRef,
  inspector,
  mixer,
  onTogglePlay,
  onStop,
  onExportWebM,
  onZoomChange,
  onImportLocal,
  onSelectAsset,
  onTimeChange,
  onClipMove,
  onClipTrim,
  onClipSelect,
  selectedClipId,
  formatTime,
}: MediaStudioWorkspaceProps) {
  return (
    <div className="h-full w-full flex flex-col bg-slate-900">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900">
        <div className="text-sm font-semibold text-slate-200">Media Studio</div>

        <button
          className="ml-3 px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
          onClick={onTogglePlay}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700" onClick={onStop}>
          Stop
        </button>

        <button
          className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700 disabled:opacity-50"
          onClick={onExportWebM}
          disabled={exporting}
        >
          {exporting ? 'Exportando...' : 'Exportar WebM'}
        </button>

        {exportStatus && <div className="text-xs text-slate-400">{exportStatus}</div>}

        <div className="ml-3 text-xs text-slate-400 font-mono">
          {formatTime(currentTime)} / {formatTime(project.duration)}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-slate-400 flex items-center gap-2">
            Zoom
            <input
              type="range"
              min={20}
              max={200}
              value={zoom}
              onChange={(e) => onZoomChange(parseInt(e.target.value, 10))}
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
                onImportLocal(file)
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-64 border-r border-slate-800 bg-slate-950/30">
          <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-800">Assets</div>
          <div className="p-2 space-y-1 overflow-auto h-full">
            {project.assets.length === 0 ? (
              <div className="text-sm text-slate-500 p-2">
                Importe um arquivo de midia (imagem/audio/video) para comecar.
              </div>
            ) : (
              project.assets.map((asset: MediaAsset) => (
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

        <div className="flex-1 flex flex-col min-h-0">
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
                      const timelineT = activeTimelineVideoClip.startTime + (videoTime - activeTimelineVideoClip.inPoint)
                      onTimeChange(Math.max(0, Math.min(project.duration, timelineT)))
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
                    onSeek={(pos) => {
                      const el = audioElRef.current
                      if (!el || !el.duration) return
                      el.currentTime = el.duration * pos
                    }}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
                      onClick={() => {
                        const el = audioElRef.current
                        if (!el) return
                        void el.play()
                      }}
                    >
                      Play Audio
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
                      onClick={() => {
                        const el = audioElRef.current
                        if (!el) return
                        el.pause()
                      }}
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
            </div>
          </div>

          <div className="border-t border-slate-800 p-3 bg-slate-950/20">
            <VideoTimeline
              tracks={project.tracks}
              clips={project.clips}
              duration={project.duration}
              currentTime={currentTime}
              zoom={zoom}
              onTimeChange={onTimeChange}
              onClipMove={onClipMove}
              onClipTrim={onClipTrim}
              onClipSelect={onClipSelect}
              selectedClipId={selectedClipId}
            />
          </div>
        </div>

        <div className="w-80 border-l border-slate-800 bg-slate-950/30 overflow-auto">
          {inspector}
          {mixer}
        </div>
      </div>
    </div>
  )
}
