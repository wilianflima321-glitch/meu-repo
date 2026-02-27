'use client'

import React from 'react'

interface PlaybackControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  frameRate: number
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onStepForward: () => void
  onStepBackward: () => void
  onGoToStart: () => void
  onGoToEnd: () => void
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  frameRate,
  onPlay,
  onPause,
  onSeek,
  onStepForward,
  onStepBackward,
  onGoToStart,
  onGoToEnd,
}: PlaybackControlsProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const frames = Math.floor((seconds % 1) * frameRate)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames
      .toString()
      .padStart(2, '0')}`
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
      }}
    >
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '14px',
          color: 'white',
          background: '#1e293b',
          padding: '4px 8px',
          borderRadius: '4px',
          minWidth: '100px',
          textAlign: 'center',
        }}
      >
        {formatTime(currentTime)}
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={onGoToStart}
          style={{
            width: '32px',
            height: '32px',
            background: '#1e293b',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Go to Start"
        >
          {"<<"}
        </button>

        <button
          onClick={onStepBackward}
          style={{
            width: '32px',
            height: '32px',
            background: '#1e293b',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Step Back"
        >
          {"<"}
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          style={{
            width: '40px',
            height: '32px',
            background: isPlaying ? '#ef4444' : '#22c55e',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '||' : '>'}
        </button>

        <button
          onClick={onStepForward}
          style={{
            width: '32px',
            height: '32px',
            background: '#1e293b',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Step Forward"
        >
          {">"}
        </button>

        <button
          onClick={onGoToEnd}
          style={{
            width: '32px',
            height: '32px',
            background: '#1e293b',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Go to End"
        >
          {">>"}
        </button>
      </div>

      <div style={{ color: '#64748b', fontSize: '12px' }}>/ {formatTime(duration)}</div>
    </div>
  )
}
