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
  default:
    'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)] border-[var(--aethel-border-secondary)]',
  secondary:
    'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)] border-[var(--aethel-border-secondary)]',
  primary:
    'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)] border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)]',
  success:
    'bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] text-[var(--aethel-success-light)] border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)]',
  warning:
    'bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] text-[var(--aethel-warning-light)] border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)]',
  error:
    'bg-[color-mix(in_srgb,var(--aethel-error)_18%,transparent)] text-[var(--aethel-error-light)] border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)]',
  info:
    'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)] border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)]',
}

const dotColors: Record<string, string> = {
  default: 'bg-[var(--aethel-text-tertiary)]',
  secondary: 'bg-[var(--aethel-text-tertiary)]',
  primary: 'bg-[var(--aethel-primary-light)]',
  success: 'bg-[var(--aethel-success-light)]',
  warning: 'bg-[var(--aethel-warning-light)]',
  error: 'bg-[var(--aethel-error-light)]',
  info: 'bg-[var(--aethel-info-light)]',
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
