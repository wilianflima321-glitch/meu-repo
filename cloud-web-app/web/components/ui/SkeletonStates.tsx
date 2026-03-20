/**
 * Skeleton States Library - Elite Loading Experiences
 * 
 * Componentes reutilizáveis para estados de carregamento
 * Padrão: Vercel, Linear, Cursor
 * 
 * Cada skeleton é otimizado para seu contexto específico
 */

'use client'

import React from 'react'

/**
 * Skeleton genérico com pulse animation
 */
export function SkeletonPulse({
  className = '',
  width = 'w-full',
  height = 'h-4',
}: {
  className?: string
  width?: string
  height?: string
}) {
  return (
    <div
      className={`${width} ${height} bg-[var(--aethel-surface-tertiary)] rounded animate-pulse ${className}`}
    />
  )
}

/**
 * Skeleton para Dashboard Cards
 */
export function DashboardCardSkeleton() {
  return (
    <div className="aethel-card aethel-p-6 space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonPulse width="w-1/3" height="h-6" />
        <SkeletonPulse width="w-12" height="h-6" className="rounded-full" />
      </div>
      <SkeletonPulse width="w-2/3" height="h-4" />
      <div className="space-y-2">
        <SkeletonPulse width="w-full" height="h-2" />
        <SkeletonPulse width="w-4/5" height="h-2" />
      </div>
    </div>
  )
}

/**
 * Skeleton para lista de itens
 */
export function ListItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <SkeletonPulse width="w-10" height="h-10" className="rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonPulse width="w-2/3" height="h-4" />
            <SkeletonPulse width="w-1/2" height="h-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para tabelas
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-2 p-3 border-b border-[var(--aethel-border-primary)]">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonPulse key={i} width="flex-1" height="h-4" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 p-3">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonPulse key={j} width="flex-1" height="h-4" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para Nexus Canvas 3D
 */
export function NexusCanvasSkeleton() {
  return (
    <div className="w-full h-full bg-[var(--aethel-surface-primary)] flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-[var(--aethel-surface-tertiary)] rounded-lg animate-pulse" />
        </div>
        <SkeletonPulse width="w-48" height="h-4" className="mx-auto" />
        <SkeletonPulse width="w-64" height="h-3" className="mx-auto" />
      </div>
    </div>
  )
}

/**
 * Skeleton para IDE Editor
 */
export function IDEEditorSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[var(--aethel-surface-primary)]">
      {/* Tabs */}
      <div className="flex gap-2 p-2 border-b border-[var(--aethel-border-primary)]">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPulse key={i} width="w-24" height="h-8" className="rounded" />
        ))}
      </div>

      {/* Code lines */}
      <div className="flex-1 p-4 space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonPulse
            key={i}
            width={i % 3 === 0 ? 'w-3/4' : i % 3 === 1 ? 'w-4/5' : 'w-2/3'}
            height="h-4"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton para Billing Plans
 */
export function BillingPlansSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="aethel-card aethel-p-6 space-y-4">
          <SkeletonPulse width="w-2/3" height="h-6" />
          <SkeletonPulse width="w-full" height="h-4" />
          <SkeletonPulse width="w-1/2" height="h-8" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <SkeletonPulse key={j} width="w-full" height="h-3" />
            ))}
          </div>
          <SkeletonPulse width="w-full" height="h-10" className="rounded-lg" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para Profile Page
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        <SkeletonPulse width="w-20" height="h-20" className="rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <SkeletonPulse width="w-1/3" height="h-6" />
          <SkeletonPulse width="w-1/2" height="h-4" />
        </div>
      </div>

      {/* Sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 p-4 border border-[var(--aethel-border-primary)] rounded-lg">
          <SkeletonPulse width="w-1/4" height="h-5" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <SkeletonPulse key={j} width="w-full" height="h-4" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para Chat Messages
 */
export function ChatMessagesSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* User message */}
      <div className="flex justify-end">
        <SkeletonPulse width="w-1/2" height="h-12" className="rounded-2xl" />
      </div>

      {/* Assistant message */}
      <div className="flex justify-start">
        <div className="space-y-2 w-1/2">
          <SkeletonPulse width="w-1/3" height="h-4" />
          <SkeletonPulse width="w-full" height="h-12" className="rounded-2xl" />
        </div>
      </div>

      {/* Another user message */}
      <div className="flex justify-end">
        <SkeletonPulse width="w-2/3" height="h-12" className="rounded-2xl" />
      </div>

      {/* Loading indicator */}
      <div className="flex justify-start">
        <div className="flex gap-2 p-3 bg-[var(--aethel-surface-secondary)] rounded-lg">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-[var(--aethel-text-tertiary)] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton para Admin Dashboard Stats
 */
export function AdminStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 border border-[var(--aethel-border-primary)] rounded-lg space-y-2">
          <SkeletonPulse width="w-1/2" height="h-4" />
          <SkeletonPulse width="w-2/3" height="h-8" />
          <SkeletonPulse width="w-1/3" height="h-3" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para Hero Section
 */
export function HeroSkeleton() {
  return (
    <div className="space-y-6 p-8">
      <SkeletonPulse width="w-2/3" height="h-12" />
      <SkeletonPulse width="w-full" height="h-6" />
      <SkeletonPulse width="w-4/5" height="h-6" />
      <div className="flex gap-4">
        <SkeletonPulse width="w-32" height="h-10" className="rounded-lg" />
        <SkeletonPulse width="w-32" height="h-10" className="rounded-lg" />
      </div>
    </div>
  )
}

/**
 * Skeleton para Workflow/Pipeline
 */
export function WorkflowSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonPulse width="w-10" height="h-10" className="rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonPulse width="w-1/3" height="h-4" />
            <SkeletonPulse width="w-2/3" height="h-3" />
          </div>
          {i < 3 && (
            <div className="w-0.5 h-8 bg-[var(--aethel-surface-tertiary)] mx-2" />
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton genérico customizável
 */
export function CustomSkeleton({
  lines = 3,
  lineWidths = ['w-full', 'w-4/5', 'w-3/4'],
  className = '',
}: {
  lines?: number
  lineWidths?: string[]
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonPulse
          key={i}
          width={lineWidths[i] || 'w-full'}
          height="h-4"
        />
      ))}
    </div>
  )
}
