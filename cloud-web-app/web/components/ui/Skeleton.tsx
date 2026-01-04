'use client'

import { type HTMLAttributes } from 'react'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  lines?: number
  animate?: boolean
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  animate = true,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const baseClasses = `bg-slate-700/50 ${animate ? 'animate-pulse' : ''}`
  
  const variantClasses: Record<string, string> = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  }

  const getStyle = () => ({
    width: width || (variant === 'circular' ? height || '40px' : '100%'),
    height: height || (variant === 'circular' ? width || '40px' : variant === 'text' ? '1rem' : '100%'),
    ...style,
  })

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              ...getStyle(),
              width: i === lines - 1 ? '75%' : '100%',
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={getStyle()}
      {...props}
    />
  )
}

// Pre-built skeleton patterns
export function SkeletonCard() {
  return (
    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="text" lines={3} />
      <div className="flex gap-2">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-3 bg-slate-800/30 rounded-lg">
        <Skeleton variant="text" width="20%" />
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="text" width="25%" />
        <Skeleton variant="text" width="15%" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3">
          <Skeleton variant="text" width="20%" />
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="25%" />
          <Skeleton variant="text" width="15%" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="50%" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default Skeleton
