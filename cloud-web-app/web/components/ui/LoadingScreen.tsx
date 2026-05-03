'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

interface LoadingScreenProps {
  message?: string
  showLogo?: boolean
}

export function LoadingScreen({
  message = 'Loading...',
  showLogo = true
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100
        return prev + Math.random() * 15
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--aethel-surface-primary)]">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] rounded-full blur-[100px] animate-pulse delay-500" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Logo */}
        {showLogo && (
          <div className="mb-10 flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--aethel-info)] via-[var(--aethel-accent)] to-[var(--aethel-primary)] flex items-center justify-center shadow-2xl shadow-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] mb-4 animate-bounce-slow">
              <Sparkles className="w-10 h-10 text-[var(--aethel-text-primary)]" />
            </div>
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-[var(--aethel-info-light)] via-[var(--aethel-accent-light)] to-[var(--aethel-primary-light)] bg-clip-text text-transparent">
                Aethel
              </span>
            </h1>
          </div>
        )}

        {/* Loading Spinner */}
        <div className="relative w-24 h-24 mb-8">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-[var(--aethel-border-primary)]" />

          {/* Spinning gradient ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--aethel-info)] border-r-[var(--aethel-accent)] animate-spin" />

          {/* Inner glow */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] to-[color-mix(in_srgb,var(--aethel-accent)_20%,transparent)] blur-sm" />

          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[var(--aethel-info)] to-[var(--aethel-accent)] animate-pulse" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1.5 bg-[var(--aethel-surface-secondary)] rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-[var(--aethel-info)] via-[var(--aethel-accent)] to-[var(--aethel-primary)] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Message */}
        <p className="text-[var(--aethel-text-tertiary)] text-sm animate-pulse">{message}</p>
      </div>

      {/* Version */}
      <div className="absolute bottom-6 text-xs text-[var(--aethel-text-quaternary)]">
        v1.0.0 - Enterprise Edition
      </div>
    </div>
  )
}

/* ============================================
   Page Loader (for route transitions)
============================================ */
export function PageLoader({ text = 'Loading page...' }: { text?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-[var(--aethel-border-primary)]" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--aethel-info)] animate-spin" />
      </div>
      <p className="text-[var(--aethel-text-tertiary)] text-sm">{text}</p>
    </div>
  )
}

/* ============================================
   Inline Loader (for components)
============================================ */
export function InlineLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  }

  return (
    <div className={`${sizes[size]} rounded-full border-[var(--aethel-border-primary)] border-t-[var(--aethel-info)] animate-spin`} />
  )
}

/* ============================================
   Dots Loader
============================================ */
export function DotsLoader() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-[var(--aethel-info)] animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}

/* ============================================
   Skeleton Pulse Loader
============================================ */
export function PulseLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[var(--aethel-surface-secondary)]/60 animate-pulse rounded ${className}`} />
  )
}

export default LoadingScreen
