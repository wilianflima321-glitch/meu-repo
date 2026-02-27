'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

import type { TimelineClip, TimelineMarker, Track } from './VideoTimelineEditor'

interface TimelineRulerProps {
  duration: number
  zoom: number
  scrollX: number
  playhead: number
  frameRate: number
  workArea: { in: number; out: number }
  markers: TimelineMarker[]
  onSeek: (time: number) => void
  onMarkerClick: (marker: TimelineMarker) => void
}

export function TimelineRuler({
  duration,
  zoom,
  scrollX,
  playhead,
  frameRate,
  workArea,
  markers,
  onSeek,
  onMarkerClick,
}: TimelineRulerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const frames = Math.floor((seconds % 1) * frameRate)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames
      .toString()
      .padStart(2, '0')}`
  }

  const pixelsPerSecond = 100 * zoom
  const tickInterval = zoom < 0.5 ? 5 : zoom < 1 ? 2 : zoom < 2 ? 1 : 0.5

  const handleClick = (event: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left + scrollX
    const time = x / pixelsPerSecond
    onSeek(Math.max(0, Math.min(duration, time)))
  }

  const visibleStart = scrollX / pixelsPerSecond
  const visibleEnd = visibleStart + (containerRef.current?.clientWidth ?? 1000) / pixelsPerSecond

  const ticks = useMemo(() => {
    const result: number[] = []
    const start = Math.floor(visibleStart / tickInterval) * tickInterval

    for (let time = start; time <= Math.min(visibleEnd + tickInterval, duration); time += tickInterval) {
      result.push(time)
    }

    return result
  }, [visibleStart, visibleEnd, tickInterval, duration])

  return (
    <div
      ref={containerRef}
      style={{
        height: '32px',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      onClick={handleClick}
    >
      <div
        style={{
          position: 'absolute',
          left: `${workArea.in * pixelsPerSecond - scrollX}px`,
          width: `${(workArea.out - workArea.in) * pixelsPerSecond}px`,
          height: '100%',
          background: 'rgba(59, 130, 246, 0.1)',
          borderLeft: '2px solid #3b82f6',
          borderRight: '2px solid #3b82f6',
        }}
      />

      {ticks.map((time) => (
        <div
          key={time}
          style={{
            position: 'absolute',
            left: `${time * pixelsPerSecond - scrollX}px`,
            height: time % 1 === 0 ? '100%' : '50%',
            width: '1px',
            background: time % 5 === 0 ? '#475569' : '#374151',
            bottom: 0,
          }}
        >
          {time % (tickInterval * 2) === 0 && (
            <span
              style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                fontSize: '10px',
                color: '#94a3b8',
                whiteSpace: 'nowrap',
              }}
            >
              {formatTime(time)}
            </span>
          )}
        </div>
      ))}

      {markers.map((marker) => (
        <div
          key={marker.id}
          onClick={(event) => {
            event.stopPropagation()
            onMarkerClick(marker)
          }}
          style={{
            position: 'absolute',
            left: `${marker.time * pixelsPerSecond - scrollX - 6}px`,
            bottom: '4px',
            width: '12px',
            height: '12px',
            background: marker.color,
            borderRadius: '2px',
            cursor: 'pointer',
          }}
          title={marker.name}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: `${playhead * pixelsPerSecond - scrollX}px`,
          top: 0,
          bottom: 0,
          width: '2px',
          background: '#ef4444',
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '-6px',
            width: '14px',
            height: '14px',
            background: '#ef4444',
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
          }}
        />
      </div>
    </div>
  )
}

interface TrackHeaderProps {
  track: Track
  onToggleVisible: () => void
  onToggleLock: () => void
  onToggleMute: () => void
  onToggleSolo: () => void
  onVolumeChange: (volume: number) => void
}

export function TrackHeader({
  track,
  onToggleVisible,
  onToggleLock,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
}: TrackHeaderProps) {
  return (
    <div
      style={{
        width: '200px',
        height: `${track.height}px`,
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: '8px',
      }}
    >
      <div
        style={{
          width: '4px',
          height: '60%',
          background: track.color,
          borderRadius: '2px',
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: 'white',
            fontSize: '12px',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {track.name}
        </div>
        <div style={{ color: '#64748b', fontSize: '10px' }}>{track.type.toUpperCase()}</div>
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={onToggleVisible}
          style={{
            width: '20px',
            height: '20px',
            background: track.visible ? '#374151' : '#1e293b',
            border: 'none',
            borderRadius: '2px',
            color: track.visible ? 'white' : '#64748b',
            cursor: 'pointer',
            fontSize: '10px',
          }}
          title="Visibility"
        >
          V
        </button>

        <button
          onClick={onToggleMute}
          style={{
            width: '20px',
            height: '20px',
            background: track.muted ? '#ef4444' : '#1e293b',
            border: 'none',
            borderRadius: '2px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '10px',
          }}
          title="Mute"
        >
          M
        </button>

        {track.type === 'audio' && (
          <button
            onClick={onToggleSolo}
            style={{
              width: '20px',
              height: '20px',
              background: track.solo ? '#f59e0b' : '#1e293b',
              border: 'none',
              borderRadius: '2px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '10px',
            }}
            title="Solo"
          >
            S
          </button>
        )}

        <button
          onClick={onToggleLock}
          style={{
            width: '20px',
            height: '20px',
            background: track.locked ? '#3b82f6' : '#1e293b',
            border: 'none',
            borderRadius: '2px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '10px',
          }}
          title="Lock"
        >
          L
        </button>
      </div>
    </div>
  )
}

interface TimelineClipComponentProps {
  clip: TimelineClip
  track: Track
  zoom: number
  scrollX: number
  isSelected: boolean
  onSelect: () => void
  onMove: (newStart: number) => void
  onTrimStart: (newIn: number) => void
  onTrimEnd: (newOut: number) => void
}

export function TimelineClipComponent({
  clip,
  track,
  zoom,
  scrollX,
  isSelected,
  onSelect,
  onMove,
  onTrimStart,
  onTrimEnd,
}: TimelineClipComponentProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState<'move' | 'trim-start' | 'trim-end' | null>(null)
  const [dragStartX, setDragStartX] = useState(0)
  const [originalStart, setOriginalStart] = useState(0)
  const [originalDuration, setOriginalDuration] = useState(0)

  const pixelsPerSecond = 100 * zoom
  const clipLeft = clip.startTime * pixelsPerSecond - scrollX
  const clipWidth = clip.duration * pixelsPerSecond

  const handleMouseDown = (event: React.MouseEvent, type: 'move' | 'trim-start' | 'trim-end') => {
    event.stopPropagation()
    if (track.locked || clip.locked) return

    setIsDragging(true)
    setDragType(type)
    setDragStartX(event.clientX)
    setOriginalStart(clip.startTime)
    setOriginalDuration(clip.duration)
    onSelect()
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - dragStartX
      const deltaTime = deltaX / pixelsPerSecond

      if (dragType === 'move') {
        onMove(Math.max(0, originalStart + deltaTime))
      } else if (dragType === 'trim-start') {
        const newIn = Math.max(0, clip.sourceIn + deltaTime)
        if (newIn < clip.sourceOut) {
          onTrimStart(newIn)
        }
      } else if (dragType === 'trim-end') {
        const newDuration = Math.max(0.1, originalDuration + deltaTime)
        onTrimEnd(newDuration)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setDragType(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    isDragging,
    dragType,
    dragStartX,
    originalStart,
    originalDuration,
    pixelsPerSecond,
    clip,
    onMove,
    onTrimStart,
    onTrimEnd,
  ])

  return (
    <div
      style={{
        position: 'absolute',
        left: `${clipLeft}px`,
        width: `${clipWidth}px`,
        top: '4px',
        bottom: '4px',
        background: clip.color,
        borderRadius: '4px',
        border: isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
        overflow: 'hidden',
        cursor: track.locked ? 'not-allowed' : 'pointer',
        opacity: clip.muted ? 0.5 : 1,
      }}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '8px',
          cursor: track.locked ? 'not-allowed' : 'ew-resize',
          background: isSelected ? 'rgba(255,255,255,0.3)' : 'transparent',
        }}
        onMouseDown={(event) => handleMouseDown(event, 'trim-start')}
      />

      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '8px',
          cursor: track.locked ? 'not-allowed' : 'ew-resize',
          background: isSelected ? 'rgba(255,255,255,0.3)' : 'transparent',
        }}
        onMouseDown={(event) => handleMouseDown(event, 'trim-end')}
      />

      <div
        style={{
          padding: '4px 12px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          cursor: track.locked ? 'not-allowed' : 'move',
        }}
        onMouseDown={(event) => handleMouseDown(event, 'move')}
      >
        {clip.type === 'video' && clip.thumbnail && clipWidth > 60 && (
          <div
            style={{
              position: 'absolute',
              left: '4px',
              top: '4px',
              bottom: '4px',
              width: '40px',
              background: `url(${clip.thumbnail}) center/cover`,
              borderRadius: '2px',
            }}
          />
        )}

        <div
          style={{
            color: 'white',
            fontSize: '11px',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginLeft: clip.type === 'video' && clip.thumbnail && clipWidth > 60 ? '48px' : 0,
          }}
        >
          {clip.name}
        </div>

        {clipWidth > 100 && (
          <div
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '9px',
              marginLeft: clip.type === 'video' && clip.thumbnail && clipWidth > 60 ? '48px' : 0,
            }}
          >
            {clip.duration.toFixed(2)}s
          </div>
        )}

        {clip.type === 'audio' && (
          <div
            style={{
              position: 'absolute',
              left: '8px',
              right: '8px',
              bottom: '4px',
              height: '20px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '1px',
              opacity: 0.5,
            }}
          >
            {Array.from({ length: Math.min(50, Math.floor(clipWidth / 4)) }).map((_, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: `${20 + Math.random() * 80}%`,
                  background: 'white',
                  borderRadius: '1px',
                }}
              />
            ))}
          </div>
        )}

        {clip.keyframes.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '2px',
              height: '4px',
              display: 'flex',
            }}
          >
            {clip.keyframes.map((keyframe) => (
              <div
                key={keyframe.id}
                style={{
                  position: 'absolute',
                  left: `${(keyframe.time / clip.duration) * 100}%`,
                  width: '4px',
                  height: '4px',
                  background: '#f59e0b',
                  borderRadius: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
            ))}
          </div>
        )}

        {clip.locked && (
          <div style={{ position: 'absolute', right: '4px', top: '4px', fontSize: '10px' }}>L</div>
        )}
      </div>
    </div>
  )
}

interface TrackContentProps {
  track: Track
  clips: TimelineClip[]
  zoom: number
  scrollX: number
  selectedClipId: string | null
  onSelectClip: (clipId: string) => void
  onClipChange: (clip: TimelineClip) => void
}

export function TrackContent({
  track,
  clips,
  zoom,
  scrollX,
  selectedClipId,
  onSelectClip,
  onClipChange,
}: TrackContentProps) {
  const trackClips = clips.filter((clip) => clip.trackId === track.id)

  return (
    <div
      style={{
        flex: 1,
        height: `${track.height}px`,
        background: track.visible ? '#1e293b' : '#0f172a',
        borderBottom: '1px solid #374151',
        position: 'relative',
      }}
    >
      {trackClips.map((clip) => (
        <TimelineClipComponent
          key={clip.id}
          clip={clip}
          track={track}
          zoom={zoom}
          scrollX={scrollX}
          isSelected={selectedClipId === clip.id}
          onSelect={() => onSelectClip(clip.id)}
          onMove={(newStart) => onClipChange({ ...clip, startTime: newStart })}
          onTrimStart={(newIn) => {
            const delta = newIn - clip.sourceIn
            onClipChange({
              ...clip,
              sourceIn: newIn,
              startTime: clip.startTime + delta,
              duration: clip.duration - delta,
            })
          }}
          onTrimEnd={(newDuration) => onClipChange({ ...clip, duration: newDuration })}
        />
      ))}
    </div>
  )
}
