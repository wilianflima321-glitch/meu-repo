'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react'

export interface MediaItem {
  id: string
  type: 'image' | 'video'
  url: string
  thumbnailUrl: string
  title: string
}

interface ArcadeMediaGalleryProps {
  items: MediaItem[]
  title: string
}

export function ArcadeMediaGallery({ items, title }: ArcadeMediaGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  const currentItem = items[selectedIndex] ?? items[0]

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
  }, [items.length])

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
  }, [items.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrev, handleNext, isFullscreen])

  if (!items.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main viewport */}
      <div className={`relative overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] shadow-[var(--aethel-shadow-lg)] ${isFullscreen ? 'fixed inset-4 z-50 flex items-center justify-center bg-black/95' : 'aspect-[16/9] w-full'}`}>
        {currentItem?.type === 'video' ? (
          <div className="relative h-full w-full">
            <video
              key={currentItem.url}
              src={currentItem.url}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="h-full w-full object-cover"
            />
            {/* Audio toggle */}
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              className="absolute bottom-4 right-14 flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] text-[var(--aethel-text-primary)] backdrop-blur-md transition hover:bg-[var(--aethel-surface-tertiary)]"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          currentItem?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentItem.url}
              alt={`${title} - screenshot ${selectedIndex + 1}`}
              className="h-full w-full object-cover"
            />
          )
        )}

        {/* Navigation arrows */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous media"
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] text-[var(--aethel-text-primary)] backdrop-blur-md transition hover:bg-[var(--aethel-surface-tertiary)] active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next media"
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] text-[var(--aethel-text-primary)] backdrop-blur-md transition hover:bg-[var(--aethel-surface-tertiary)] active:scale-95"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Fullscreen toggle */}
        <button
          type="button"
          onClick={() => setIsFullscreen((f) => !f)}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] text-[var(--aethel-text-primary)] backdrop-blur-md transition hover:bg-[var(--aethel-surface-tertiary)]"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        {/* Counter badge */}
        <div className="absolute bottom-4 left-4 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] px-2.5 py-1 text-xs font-mono text-[var(--aethel-text-secondary)] backdrop-blur-md">
          {selectedIndex + 1} / {items.length}
        </div>
      </div>

      {/* Thumbnail carousel */}
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((item, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                aria-label={`Select media ${idx + 1}`}
                className={`relative aspect-[16/9] w-24 shrink-0 overflow-hidden rounded-xl border transition-all duration-150 ${isSelected
                  ? 'border-[var(--aethel-primary)] ring-2 ring-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] shadow-[0_0_12px_color-mix(in_srgb,var(--aethel-primary)_35%,transparent)]'
                  : 'border-[var(--aethel-border-subtle)] opacity-70 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Play className="h-4 w-4 text-[var(--aethel-text-primary)]" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
