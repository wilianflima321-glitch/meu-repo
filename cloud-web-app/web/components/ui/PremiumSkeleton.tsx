'use client'

import { motion } from 'framer-motion'
import { gentlePulse } from './motion'

// L5 Premium Skeleton Components - Shimmer Effects
// Professional loading states with Figma-quality animations

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  lines?: number
  animate?: boolean
}

export function ShimmerSkeleton({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1,
  animate = true,
}: SkeletonProps) {
  const baseClasses = `
    bg-gradient-to-r from-[color-mix(in_srgb,var(--aethel-surface-quaternary)_40%,transparent)] via-[color-mix(in_srgb,var(--aethel-surface-quaternary)_30%,transparent)] to-[color-mix(in_srgb,var(--aethel-surface-quaternary)_40%,transparent)]
    bg-[length:200%_100%]
    ${animate ? 'animate-shimmer' : ''}
  `

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  }

  const shimmerAnimation = {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  }

  const getStyle = () => ({
    width: width || (variant === 'circular' ? height || '40px' : '100%'),
    height: height || (variant === 'circular' ? width || '40px' : variant === 'text' ? '1rem' : '100%'),
  })

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              ...getStyle(),
              width: i === lines - 1 ? '75%' : '100%',
            }}
            animate={animate ? shimmerAnimation : {}}
          />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={getStyle()}
      animate={animate ? shimmerAnimation : {}}
    />
  )
}

// Premium Card Skeleton
export function PremiumCardSkeleton({
  header = true,
  lines = 3,
  actions = 2
}: {
  header?: boolean
  lines?: number
  actions?: number
}) {
  return (
    <GlassSkeleton className="p-6 space-y-4">
      {header && (
        <div className="flex items-center gap-4">
          <ShimmerSkeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <ShimmerSkeleton width="60%" />
            <ShimmerSkeleton width="40%" />
          </div>
        </div>
      )}
      <ShimmerSkeleton variant="text" lines={lines} />
      {actions > 0 && (
        <div className="flex gap-2 pt-2">
          {Array.from({ length: actions }).map((_, i) => (
            <ShimmerSkeleton key={i} variant="rounded" width={80} height={32} />
          ))}
        </div>
      )}
    </GlassSkeleton>
  )
}

// Dashboard Stats Skeleton
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <GlassSkeleton key={i} className="p-6 text-center">
          <ShimmerSkeleton width="60%" height={36} className="mx-auto mb-2" />
          <ShimmerSkeleton width="80%" />
        </GlassSkeleton>
      ))}
    </div>
  )
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <GlassSkeleton className="overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border-b border-[var(--aethel-border-primary)]">
        {Array.from({ length: columns }).map((_, i) => (
          <ShimmerSkeleton key={i} width={`${90 / columns}%`} />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <ShimmerSkeleton key={colIdx} width={`${90 / columns}%`} />
            ))}
          </div>
        ))}
      </div>
    </GlassSkeleton>
  )
}

// List Skeleton
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <GlassSkeleton key={i} className="flex items-center gap-3 p-3">
          <ShimmerSkeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <ShimmerSkeleton width="70%" />
            <ShimmerSkeleton width="50%" />
          </div>
        </GlassSkeleton>
      ))}
    </div>
  )
}

// Chart Skeleton
export function ChartSkeleton() {
  return (
    <GlassSkeleton className="p-6">
      <ShimmerSkeleton width="30%" className="mb-6" />
      <div className="flex items-end gap-2 h-40">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-gradient-to-t from-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] to-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] rounded-t"
            style={{ height: `${20 + Math.random() * 60}%` }}
            animate={gentlePulse.animate}
          />
        ))}
      </div>
    </GlassSkeleton>
  )
}

// Profile Skeleton
export function ProfileSkeleton() {
  return (
    <GlassSkeleton className="p-6">
      <div className="flex items-center gap-4">
        <ShimmerSkeleton variant="circular" width={64} height={64} />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton width="40%" height={24} />
          <ShimmerSkeleton width="60%" />
          <ShimmerSkeleton width="30%" />
        </div>
      </div>
    </GlassSkeleton>
  )
}

// Form Skeleton
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <GlassSkeleton className="p-6 space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <ShimmerSkeleton width="30%" height={20} />
          <ShimmerSkeleton height={48} variant="rounded" />
        </div>
      ))}
      <ShimmerSkeleton width="40%" height={44} variant="rounded" className="mt-6" />
    </GlassSkeleton>
  )
}

// Chat/Message Skeleton
export function ChatSkeleton({ messages = 4 }: { messages?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: messages }).map((_, i) => (
        <GlassSkeleton key={i} className={`p-4 ${i % 2 === 0 ? 'mr-12' : 'ml-12'}`}>
          <div className="flex items-start gap-3">
            <ShimmerSkeleton variant="circular" width={32} height={32} />
            <div className="flex-1 space-y-2">
              <ShimmerSkeleton width="20%" height={16} />
              <ShimmerSkeleton variant="text" lines={2} />
            </div>
          </div>
        </GlassSkeleton>
      ))}
    </div>
  )
}

// Image Gallery Skeleton
export function GallerySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <GlassSkeleton key={i} className="aspect-square">
          <motion.div
            className="w-full h-full bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-surface-quaternary)_30%,transparent)] via-[color-mix(in_srgb,var(--aethel-surface-quaternary)_25%,transparent)] to-[color-mix(in_srgb,var(--aethel-surface-quaternary)_30%,transparent)] bg-[length:200%_200%]"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.2,
            }}
          />
        </GlassSkeleton>
      ))}
    </div>
  )
}

// Timeline Skeleton
export function TimelineSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="relative space-y-0">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]" />
      {Array.from({ length: items }).map((_, i) => (
        <GlassSkeleton key={i} className="relative pl-12 py-4">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]" />
          <div className="space-y-2">
            <ShimmerSkeleton width="40%" />
            <ShimmerSkeleton width="70%" />
          </div>
        </GlassSkeleton>
      ))}
    </div>
  )
}

// Glass Skeleton Wrapper
function GlassSkeleton({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-primary)] backdrop-blur-sm animate-pulse ${className}`}>
      {children}
    </div>
  )
}

// Page Loading State
export function PageLoadingState() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <ShimmerSkeleton width={200} height={40} />
        <div className="flex gap-3">
          <ShimmerSkeleton variant="rounded" width={120} height={40} />
          <ShimmerSkeleton variant="circular" width={40} height={40} />
        </div>
      </div>
      <StatsSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PremiumCardSkeleton lines={5} />
        <PremiumCardSkeleton lines={3} />
      </div>
    </div>
  )
}

// Dashboard Loading State
export function DashboardLoadingState() {
  return (
    <div className="p-6 space-y-6">
      <StatsSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassSkeleton className="p-6 space-y-4">
          <ShimmerSkeleton width="40%" />
          <ShimmerSkeleton height={200} variant="rounded" />
        </GlassSkeleton>
        <GlassSkeleton className="p-6 space-y-4">
          <ShimmerSkeleton width="40%" />
          <ListSkeleton items={4} />
        </GlassSkeleton>
      </div>
    </div>
  )
}

const premiumSkeletons = {
  ShimmerSkeleton,
  PremiumCardSkeleton,
  StatsSkeleton,
  TableSkeleton,
  ListSkeleton,
  ChartSkeleton,
  ProfileSkeleton,
  FormSkeleton,
  ChatSkeleton,
  GallerySkeleton,
  TimelineSkeleton,
  PageLoadingState,
  DashboardLoadingState,
}

export default premiumSkeletons
