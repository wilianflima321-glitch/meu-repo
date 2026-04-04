'use client'

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline' | 'premium'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  rounded?: 'default' | 'full'
  glow?: boolean
  asChild?: boolean
}

const variantClasses: Record<string, string> = {
  primary: `
    bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))]
    text-[var(--aethel-text-primary)] font-medium
    hover:brightness-110
    active:brightness-95
    shadow-lg shadow-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)]
    border border-[color-mix(in_srgb,var(--aethel-primary)_25%,transparent)]
  `,
  secondary: `
    bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_85%,transparent)] text-[var(--aethel-text-primary)]
    hover:bg-[var(--aethel-surface-quaternary)]
    active:bg-[var(--aethel-surface-tertiary)]
    border border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)] hover:border-[var(--aethel-border-secondary)]
    shadow-md shadow-black/20
  `,
  ghost: `
    bg-transparent text-[var(--aethel-text-secondary)]
    hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] hover:text-[var(--aethel-text-primary)]
    active:bg-[var(--aethel-surface-tertiary)]
    border border-transparent hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)]
  `,
  danger: `
    bg-[var(--aethel-error)]
    text-[var(--aethel-text-primary)] font-medium
    hover:brightness-110
    active:brightness-95
    shadow-lg shadow-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)]
    border border-[color-mix(in_srgb,var(--aethel-error)_25%,transparent)]
  `,
  success: `
    bg-[var(--aethel-success)]
    text-[var(--aethel-text-primary)] font-medium
    hover:brightness-110
    active:brightness-95
    shadow-lg shadow-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)]
    border border-[color-mix(in_srgb,var(--aethel-success)_25%,transparent)]
  `,
  outline: `
    bg-transparent text-[var(--aethel-text-secondary)]
    hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_40%,transparent)] hover:text-[var(--aethel-text-primary)]
    active:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)]
    border border-[var(--aethel-border-secondary)] hover:border-[var(--aethel-border-primary)]
  `,
  premium: `
    bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))]
    text-[var(--aethel-text-primary)] font-semibold
    hover:brightness-110
    active:brightness-95
    shadow-xl shadow-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] hover:shadow-[color-mix(in_srgb,var(--aethel-info)_45%,transparent)]
    border border-[color-mix(in_srgb,var(--aethel-border-primary)_40%,transparent)]
  `,
}

const sizeClasses: Record<string, string> = {
  xs: 'px-2.5 py-1 text-xs gap-1 min-h-[28px]',
  sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[32px]',
  md: 'px-4 py-2 text-sm gap-2 min-h-[38px]',
  lg: 'px-5 py-2.5 text-base gap-2 min-h-[44px]',
  xl: 'px-6 py-3 text-base gap-2.5 min-h-[52px]',
  icon: 'p-2 aspect-square min-h-[38px]',
}

const iconSizes: Record<string, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-5 w-5',
  icon: 'h-4 w-4',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      rounded = 'default',
      glow = false,
      asChild = false,
      disabled,
      type,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading
    const roundedClass = rounded === 'full' ? 'rounded-full' : 'rounded-lg'

    const computedClassName = `
      inline-flex items-center justify-center
      ${roundedClass}
      transition-all duration-200 ease-out
      transform active:scale-[0.98]
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${fullWidth ? 'w-full' : ''}
      ${glow && !isDisabled ? 'hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]' : ''}
      ${className}
    `

    if (asChild && typeof children !== 'string' && children && (children as any).type) {
      return React.cloneElement(children as React.ReactElement, {
        className: `${computedClassName} ${(children as React.ReactElement).props?.className || ''}`,
        ...props,
      })
    }

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={computedClassName}
        type={type ?? 'button'}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className={`animate-spin ${iconSizes[size]}`} />
            {size !== 'icon' && <span className="ml-1">Aguarde...</span>}
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className={`flex-shrink-0 ${iconSizes[size]}`}>{icon}</span>
            )}
            {children}
            {icon && iconPosition === 'right' && (
              <span className={`flex-shrink-0 ${iconSizes[size]}`}>{icon}</span>
            )}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button

