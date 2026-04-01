'use client'

import { type ReactNode, type HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'gradient' | 'glass' | 'glow'
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  hoverable?: boolean
  rounded?: 'md' | 'lg' | 'xl' | '2xl'
  children: ReactNode
}

const variantClasses: Record<string, string> = {
  default: `
    bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]
    border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)]
    shadow-lg shadow-black/10
  `,
  elevated: `
    bg-gradient-to-b from-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] to-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)]
    shadow-2xl shadow-black/30
    border border-[color-mix(in_srgb,var(--aethel-border-secondary)_40%,transparent)]
  `,
  bordered: `
    bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]
    border-2 border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)]
    hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)]
  `,
  gradient: `
    bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] via-[color-mix(in_srgb,var(--aethel-surface-secondary)_85%,transparent)] to-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)]
    border border-[color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)]
    shadow-xl shadow-black/20
  `,
  glass: `
    bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]
    backdrop-blur-xl backdrop-saturate-150
    border border-[color-mix(in_srgb,var(--aethel-border-secondary)_30%,transparent)]
    shadow-2xl shadow-black/20
  `,
  glow: `
    bg-gradient-to-b from-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] to-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)]
    border border-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]
    shadow-[0_0_30px_rgba(99,102,241,0.15)]
    hover:shadow-[0_0_40px_rgba(99,102,241,0.25)]
    hover:border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)]
  `,
}

const paddingClasses: Record<string, string> = {
  none: '',
  xs: 'p-3',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
}

const roundedClasses: Record<string, string> = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
}

export function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  rounded = 'xl',
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        ${roundedClasses[rounded]}
        transition-all duration-300 ease-out
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hoverable ? `
          hover:translate-y-[-2px]
          hover:shadow-2xl hover:shadow-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)]
          hover:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]
          cursor-pointer
          active:translate-y-0 active:shadow-xl
        ` : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  children?: ReactNode
}

const headerSizes = {
  sm: { title: 'text-base font-semibold', desc: 'text-xs' },
  md: { title: 'text-lg font-semibold', desc: 'text-sm' },
  lg: { title: 'text-xl font-bold', desc: 'text-sm' },
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  size = 'md',
  children,
  className = '',
  ...props
}: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-5 ${className}`} {...props}>
      {children ? (
        children
      ) : (
        <>
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="flex-shrink-0 p-2 rounded-lg bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info)]">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className={`${headerSizes[size].title} text-[var(--aethel-text-primary)] leading-tight`}>
                  {title}
                </h3>
              )}
              {description && (
                <p className={`mt-1 ${headerSizes[size].desc} text-[var(--aethel-text-tertiary)] leading-relaxed`}>
                  {description}
                </p>
              )}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </>
      )}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-[var(--aethel-text-primary)] ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-[var(--aethel-text-tertiary)] ${className}`}>{children}</p>;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  justify?: 'start' | 'end' | 'between' | 'center'
}

const justifyClasses = {
  start: 'justify-start',
  end: 'justify-end',
  between: 'justify-between',
  center: 'justify-center',
}

export function CardFooter({
  children,
  justify = 'end',
  className = '',
  ...props
}: CardFooterProps) {
  return (
    <div
      className={`
        mt-6 pt-5
        border-t border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)]
        flex items-center ${justifyClasses[justify]} gap-3
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardContent({ children, className = '', ...props }: CardContentProps) {
  return (
    <div className={`text-[var(--aethel-text-secondary)] ${className}`} {...props}>
      {children}
    </div>
  )
}

export default Card

