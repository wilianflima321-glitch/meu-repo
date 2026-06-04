'use client'

import { type Dispatch, type SetStateAction } from 'react'
import { MixerChannel } from '../audio/AudioEngine'
import type { VideoClip } from '../video/VideoTimeline'
import type { MediaProject } from './media-studio-core'

type ProjectSetter = Dispatch<SetStateAction<MediaProject>>

type MixerProps = {
  clips: (VideoClip & { gain?: number })[]
  setProject: ProjectSetter
}

export function MediaStudioMixerPanel({ clips, setProject }: MixerProps) {
  const audioClips = clips.filter((clip) => clip.type === 'audio')
  if (audioClips.length === 0) return null

  return (
    <div className="p-3">
      <div className="text-sm font-semibold text-[var(--aethel-text-primary)] mb-2">Mixer</div>
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
