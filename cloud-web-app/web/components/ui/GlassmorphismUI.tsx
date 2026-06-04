'use client'

import type { ChangeEvent, ReactNode } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { GlassCard as CanonicalGlassCard, GlowBadge } from './premium'
import { StaggerContainer } from './motion'

/**
 * @deprecated Compatibility bridge only.
 *
 * Older Studio modules imported bespoke "glassmorphism" primitives from this
 * file. The visual implementation now delegates to the canonical UI primitives
 * so Studio does not carry a second design system.
 */

export const eliteAnimations = {
  containerVariants: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  },
  itemVariants: {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.24,
        ease: 'easeOut',
      },
    },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.24, ease: 'easeOut' },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: { duration: 0.18, ease: 'easeOut' },
  },
}

export function GlassCard({
  children,
  className = '',
  hover = true,
  glow = false,
  animated = true,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  animated?: boolean
}) {
  return (
    <CanonicalGlassCard
      animate={animated}
      hover={hover}
      variant={glow ? 'elevated' : 'default'}
      className={className}
    >
      {children}
    </CanonicalGlassCard>
  )
}

export function GlassButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  className?: string
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant={variant}
      size={size}
      disabled={disabled}
      loading={loading}
      className={className}
    >
      {children}
    </Button>
  )
}

export function AnimatedBadge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  animated?: boolean
}) {
  const color = variant === 'default' ? 'primary' : variant
  return <GlowBadge color={color}>{children}</GlowBadge>
}

export function GlassInput({
  placeholder = '',
  value = '',
  onChange,
  type = 'text',
  className = '',
}: {
  placeholder?: string
  value?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  type?: string
  icon?: ReactNode
  className?: string
}) {
  return (
    <Input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
    />
  )
}

export { StaggerContainer }
