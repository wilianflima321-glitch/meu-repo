'use client'

import { type ReactNode, type HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  icon?: ReactNode
  children: ReactNode
}

const variantClasses: Record<string, string> = {
  default: 'bg-slate-700 text-slate-200 border-slate-600',
  secondary: 'bg-slate-700 text-slate-200 border-slate-600',
  primary: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  error: 'bg-red-500/20 text-red-300 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
}

const dotColors: Record<string, string> = {
  default: 'bg-slate-400',
  secondary: 'bg-slate-400',
  primary: 'bg-indigo-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  icon,
  children,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  )
}

// Plan badges
export function PlanBadge({ plan }: { plan: 'free' | 'pro' | 'enterprise' }) {
  const planConfig = {
    free: { label: 'Free', variant: 'default' as const },
    pro: { label: 'Pro', variant: 'primary' as const },
    enterprise: { label: 'Enterprise', variant: 'success' as const },
  }

  const config = planConfig[plan]

  return (
    <Badge variant={config.variant} size="sm">
      {config.label}
    </Badge>
  )
}

// Status badges
export function StatusBadge({ status }: { status: 'online' | 'offline' | 'busy' | 'away' }) {
  const statusConfig = {
    online: { label: 'Online', variant: 'success' as const },
    offline: { label: 'Offline', variant: 'default' as const },
    busy: { label: 'Ocupado', variant: 'error' as const },
    away: { label: 'Ausente', variant: 'warning' as const },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} size="sm" dot>
      {config.label}
    </Badge>
  )
}

export default Badge
