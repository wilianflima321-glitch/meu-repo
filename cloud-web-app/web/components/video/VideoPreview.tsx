'use client'

import React, { useEffect, useRef } from 'react'

import { formatTime } from './VideoTimeline.helpers'

interface VideoPreviewProps {
  src?: string
  currentTime: number
  isPlaying: boolean
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
}

export function VideoPreview({ src, currentTime, isPlaying, onTimeUpdate, onDurationChange }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.play()
    } else {
      video.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (!video || isPlaying) return

    video.currentTime = currentTime
  }, [currentTime, isPlaying])

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    onTimeUpdate?.(video.currentTime)
  }

  const handleLoadedMetadata = () => {
    const video = videoRef.current
    if (!video) return
    onDurationChange?.(video.duration)
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
      {src ? (
        <video
          ref={videoRef}
          src={src}
          className="h-full w-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-500">No video selected</div>
      )}

      <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 font-mono text-xs text-white">
        {formatTime(currentTime)}
      </div>
    </div>
  )
}
