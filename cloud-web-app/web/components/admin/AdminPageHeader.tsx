'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AdminPageHeaderProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}

export function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div>
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold text-[var(--aethel-text-primary)] sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">{subtitle}</p>
        ) : null}
        {meta ? <div className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
