'use client'

import { ImageEditor } from '../image/ImageEditor'
import WaveformRenderer from '../audio/AudioEngine'
import { VideoPreview, type VideoClip } from '../video/VideoTimeline'
import type { MediaKind } from './media-studio-core'

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
      <div className="h-full bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] border border-[var(--aethel-border-primary)] rounded">
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
              <button type="button" aria-label="Play Media Studio audio"
                className="px-3 py-1 rounded bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)] text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_85%,transparent)]"
                onClick={onAudioPlay}
              >
                Play audio
              </button>
              <button type="button" aria-label="Pause Media Studio audio"
                className="px-3 py-1 rounded bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)] text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_85%,transparent)]"
                onClick={onAudioPause}
              >
                Pause audio
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-[var(--aethel-text-quaternary)]">
            Select an asset or clip to preview.
          </div>
        )}
        <div className="sr-only">Current time {currentTime}</div>
      </div>
    </div>
  )
}
