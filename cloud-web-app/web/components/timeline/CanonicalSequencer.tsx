'use client'

import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { DEMO_SEQUENCE } from '@/components/sequencer/SequencerTimeline.demo'
import type { SequenceData, TimelineKeyframe, TimelineTrack } from '@/components/sequencer/SequencerTimeline.types'
import { EMPTY_SEQUENCE_DATA } from '@/lib/sequencer/timeline-ui-adapter'

const SequencerTimeline = dynamic(() => import('@/components/sequencer/SequencerTimeline'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] text-sm text-[var(--aethel-text-secondary)]">
      Preparing sequencer...
    </div>
  ),
})

export type CanonicalSequencerProps = {
  /**
   * Project sequence document. Defaults to an honest empty sequence.
   * Pass `DEMO_SEQUENCE` (or any fixture with that id) only for explicit demo paths.
   */
  initialSequence?: SequenceData
  className?: string
}

export function CanonicalSequencer({
  initialSequence = EMPTY_SEQUENCE_DATA,
  className = '',
}: CanonicalSequencerProps) {
  const [sequence, setSequence] = useState<SequenceData>(initialSequence)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const isDemoSequence = initialSequence.id === DEMO_SEQUENCE.id || sequence.id === DEMO_SEQUENCE.id
  const isEmptyLive =
    !isDemoSequence &&
    sequence.groups.every((group) => group.tracks.every((track) => track.keyframes.length === 0))

  const updateTrack = useCallback((trackId: string, updater: (track: TimelineTrack) => TimelineTrack) => {
    setSequence((current) => ({
      ...current,
      groups: current.groups.map((group) => ({
        ...group,
        tracks: group.tracks.map((track) => (track.id === trackId ? updater(track) : track)),
      })),
    }))
  }, [])

  return (
    <section
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] ${className}`}
      data-canonical-sequencer="true"
      data-sequencer-empty={isEmptyLive ? 'true' : 'false'}
    >
      <header className="flex min-h-12 items-center justify-between border-b border-[var(--aethel-border-subtle)] px-4">
        <div>
          <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">Sequencer</p>
          <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
            {isEmptyLive
              ? 'No tracks yet — create clips/keyframes to author a sequence'
              : 'Camera, animation, dialogue, audio, FX, gameplay'}
          </p>
        </div>
        <span
          className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={
            isDemoSequence
              ? {
                  borderColor: 'color-mix(in srgb, var(--aethel-warning) 40%, transparent)',
                  color: 'var(--aethel-warning)',
                }
              : {
                  borderColor: 'var(--aethel-border-subtle)',
                  color: 'var(--aethel-text-tertiary)',
                }
          }
          data-sequencer-demo={isDemoSequence ? 'true' : 'false'}
          title={
            isDemoSequence
              ? 'Demo sequence fixture — not live scene/animation timeline data'
              : isEmptyLive
                ? 'Live sequence document with no authored tracks'
                : 'Live sequence data'
          }
        >
          {isDemoSequence ? 'Demo sequence' : isEmptyLive ? 'Empty' : 'Live'}
        </span>
      </header>
      <div className="min-h-0 flex-1">
        <SequencerTimeline
          sequence={sequence}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onTimeChange={setCurrentTime}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onStop={() => {
            setIsPlaying(false)
            setCurrentTime(0)
          }}
          onKeyframeAdd={(trackId: string, time: number, value: unknown) => {
            updateTrack(trackId, (track) => ({
              ...track,
              keyframes: [
                ...track.keyframes,
                {
                  id: `kf-${Date.now()}`,
                  time,
                  value: value as TimelineKeyframe['value'],
                  easing: 'linear',
                },
              ],
            }))
          }}
          onKeyframeUpdate={(trackId: string, keyframeId: string, updates: Partial<TimelineKeyframe>) => {
            updateTrack(trackId, (track) => ({
              ...track,
              keyframes: track.keyframes.map((keyframe) =>
                keyframe.id === keyframeId ? { ...keyframe, ...updates } : keyframe,
              ),
            }))
          }}
          onKeyframeDelete={(trackId: string, keyframeId: string) => {
            updateTrack(trackId, (track) => ({
              ...track,
              keyframes: track.keyframes.filter((keyframe) => keyframe.id !== keyframeId),
            }))
          }}
          onTrackAdd={(groupId: string, track: Omit<TimelineTrack, 'id' | 'keyframes'>) => {
            setSequence((current) => ({
              ...current,
              groups: current.groups.map((group) =>
                group.id === groupId
                  ? { ...group, tracks: [...group.tracks, { ...track, id: `track-${Date.now()}`, keyframes: [] }] }
                  : group,
              ),
            }))
          }}
          onTrackDelete={(trackId: string) => {
            setSequence((current) => ({
              ...current,
              groups: current.groups.map((group) => ({
                ...group,
                tracks: group.tracks.filter((track) => track.id !== trackId),
              })),
            }))
          }}
          onSequenceUpdate={(updates: Partial<SequenceData>) => setSequence((current) => ({ ...current, ...updates }))}
        />
      </div>
    </section>
  )
}

export default CanonicalSequencer
