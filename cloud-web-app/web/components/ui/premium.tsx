'use client'

import { motion } from 'framer-motion'
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { cardHover, fadeInScale, easing, durations } from './motion'

// L5 Premium UI Components - Figma Quality
// Using design system tokens (CSS variables) instead of raw Tailwind colors

type MotionEventConflicts =
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onDrag'
  | 'onDragCapture'
  | 'onDragEnd'
  | 'onDragEndCapture'
  | 'onDragEnter'
  | 'onDragEnterCapture'
  | 'onDragExit'
  | 'onDragExitCapture'
  | 'onDragLeave'
  | 'onDragLeaveCapture'
  | 'onDragOver'
  | 'onDragOverCapture'
  | 'onDragStart'
  | 'onDragStartCapture'
  | 'onDrop'
  | 'onDropCapture'

type MotionSafeDivProps = Omit<HTMLAttributes<HTMLDivElement>, MotionEventConflicts>
type MotionSafeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, MotionEventConflicts>
type MotionSafeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, MotionEventConflicts>

interface GlassCardProps extends MotionSafeDivProps {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'glow' | 'gradient' | 'glass'
  intensity?: 'low' | 'medium' | 'high'
  border?: boolean
  hover?: boolean
  animate?: boolean
}

export function GlassCard({
  children,
  variant = 'default',
  intensity = 'medium',
  border = true,
  hover = true,
  animate = true,
  className = '',
  ...props
}: GlassCardProps) {
  const intensityStyles = {
    low: {
      bg: 'bg-white/[0.02]',
      blur: 'backdrop-blur-sm',
      border: 'border-white/[0.04]',
    },
    medium: {
      bg: 'bg-white/[0.04]',
      blur: 'backdrop-blur-xl',
      border: 'border-white/[0.08]',
    },
    high: {
      bg: 'bg-white/[0.08]',
      blur: 'backdrop-blur-2xl',
      border: 'border-white/[0.12]',
    },
  }

  const variantStyles = {
    default: `${intensityStyles[intensity].bg} ${intensityStyles[intensity].blur}`,
    elevated: `${intensityStyles[intensity].bg} ${intensityStyles[intensity].blur} shadow-2xl shadow-black/30`,
    glow: `${intensityStyles[intensity].bg} ${intensityStyles[intensity].blur} shadow-[0_0_40px_rgba(99,102,241,0.15)]`,
    gradient: 'bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent backdrop-blur-xl',
    glass: 'bg-slate-900/30 backdrop-blur-2xl backdrop-saturate-150',
  }

  const baseClasses = `
    rounded-2xl
    ${variantStyles[variant]}
    ${border ? `border ${intensityStyles[intensity].border}` : ''}
    overflow-hidden
    transition-all duration-300
    ${className}
  `

  if (animate && hover) {
    return (
      <motion.div
        className={baseClasses}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={cardHover}
        {...props}
      >
        {children}
      </motion.div>
    )
  }

  if (animate) {
    return (
      <motion.div
        className={baseClasses}
        initial="hidden"
        animate="show"
        variants={fadeInScale}
        {...props}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={baseClasses} {...props}>
      {children}
    </div>
  )
}

// Premium Gradient Button - uses design system primary color
interface GradientButtonProps extends MotionSafeButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'glow'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  loading?: boolean
  fullWidth?: boolean
}

export function GradientButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  ...props
}: GradientButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  }

  const variantClasses = {
    primary: `
      bg-[var(--aethel-primary)]
      hover:bg-[var(--aethel-primary-dark)]
      text-white
      shadow-lg shadow-[var(--aethel-primary)]/25
      hover:shadow-xl hover:shadow-[var(--aethel-primary)]/40
      border-0
    `,
    secondary: `
      bg-white/[0.05]
      hover:bg-white/[0.1]
      text-[var(--aethel-text-secondary)]
      border border-white/[0.1]
      hover:border-white/[0.2]
      shadow-lg shadow-black/20
    `,
    ghost: `
      bg-transparent
      hover:bg-white/[0.05]
      text-[var(--aethel-text-secondary)]
      hover:text-[var(--aethel-text-primary)]
      border border-transparent
      hover:border-white/[0.1]
    `,
    glow: `
      bg-[var(--aethel-info)]
      text-white
      shadow-[0_0_20px_rgba(6,182,212,0.5)]
      hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]
      border-0
    `,
  }

  return (
    <motion.button
      className={`
        relative
        inline-flex items-center justify-center gap-2
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        rounded-xl
        font-medium
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </motion.span>
      )}
      <span className={`flex items-center gap-2 ${loading ? 'opacity-0' : ''}`}>
        {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
      </span>
    </motion.button>
  )
}

// Premium Badge with glow - using design system colors
interface GlowBadgeProps {
  children: ReactNode
  color?: 'primary' | 'info' | 'success' | 'warning' | 'error' | 'accent' | 'emerald' | 'cyan'
  pulse?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function GlowBadge({
  children,
  color = 'primary',
  pulse = false,
  size = 'md',
  className = '',
}: GlowBadgeProps) {
  const colorClasses = {
    primary: 'bg-[var(--aethel-primary)]/20 text-[var(--aethel-primary-light)] border-[var(--aethel-primary)]/30',
    info: 'bg-[var(--aethel-info)]/20 text-[var(--aethel-info-light)] border-[var(--aethel-info)]/30',
    success: 'bg-[var(--aethel-success)]/20 text-[var(--aethel-success-light)] border-[var(--aethel-success)]/30',
    warning: 'bg-[var(--aethel-warning)]/20 text-[var(--aethel-warning-light)] border-[var(--aethel-warning)]/30',
    error: 'bg-[var(--aethel-error)]/20 text-[var(--aethel-error-light)] border-[var(--aethel-error)]/30',
    accent: 'bg-[var(--aethel-accent)]/20 text-[var(--aethel-accent-light)] border-[var(--aethel-accent)]/30',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <motion.span
      className={`
        inline-flex items-center gap-1.5
        rounded-full
        ${colorClasses[color]}
        border
        ${sizeClasses[size]}
        font-medium
        backdrop-blur-sm
        ${className}
      `}
      animate={pulse ? {
        boxShadow: [
          '0 0 0 rgba(99, 102, 241, 0)',
          '0 0 20px rgba(99, 102, 241, 0.3)',
          '0 0 0 rgba(99, 102, 241, 0)',
        ],
      } : {}}
      transition={{ duration: 2, repeat: pulse ? Infinity : 0 }}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {children}
    </motion.span>
  )
}

// Gradient text component - using design system colors
interface GradientTextProps {
  children: ReactNode
  className?: string
  animate?: boolean
  from?: string
  via?: string
  to?: string
}

export function GradientText({
  children,
  className = '',
  animate = false,
  from = 'from-[var(--aethel-primary-light)]',
  via = 'via-[var(--aethel-info-light)]',
  to = 'to-[var(--aethel-primary-light)]',
}: GradientTextProps) {
  return (
    <motion.span
      className={`
        bg-gradient-to-r ${from} ${via} ${to}
        bg-clip-text text-transparent
        ${className}
      `}
      animate={animate ? {
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      } : {}}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    >
      {children}
    </motion.span>
  )
}

// Animated background gradient
interface AnimatedGradientProps {
  className?: string
  children?: ReactNode
}

export function AnimatedGradient({ className = '', children }: AnimatedGradientProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.3), transparent 50%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute -inset-[100%] opacity-20"
        style={{
          background: 'conic-gradient(from 0deg, transparent, rgba(99, 102, 241, 0.3), transparent 30%)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// Premium input with focus glow
interface GlowInputProps extends MotionSafeInputProps {
  icon?: ReactNode
  error?: string
  label?: string
}

export function GlowInput({
  icon,
  error,
  label,
  className = '',
  ...props
}: GlowInputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <motion.div
        className="relative"
        whileFocus={{ scale: 1.01 }}
      >
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full
            ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3
            bg-white/[0.05]
            border border-white/[0.1]
            rounded-xl
            text-slate-200 placeholder:text-slate-500
            transition-all duration-200
            focus:outline-none
            focus:border-[var(--aethel-primary)]/50
            focus:shadow-[0_0_20px_rgba(99,102,241,0.2)]
            focus:bg-white/[0.08]
            ${error ? 'border-[var(--aethel-error)]/50 focus:border-[var(--aethel-error)]/50 focus:shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}
            ${className}
          `}
          {...props}
        />
      </motion.div>
      {error && (
        <motion.p
          className="text-xs text-[var(--aethel-error-light)]"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

// Feature card with icon and hover effects - using design system colors
interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  badge?: string
  color?: 'primary' | 'info' | 'success' | 'warning' | 'error' | 'accent'
}

export function FeatureCard({
  icon,
  title,
  description,
  badge,
  color = 'primary',
}: FeatureCardProps) {
  const colorClasses = {
    primary: 'bg-[var(--aethel-primary)] text-white',
    info: 'bg-[var(--aethel-info)] text-white',
    success: 'bg-[var(--aethel-success)] text-white',
    warning: 'bg-[var(--aethel-warning)] text-white',
    error: 'bg-[var(--aethel-error)] text-white',
    accent: 'bg-[var(--aethel-accent)] text-white',
  }

  return (
    <GlassCard
      variant="glass"
      hover
      className="group p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`
          p-3 rounded-xl
          ${colorClasses[color]}
          shadow-lg
          transition-transform duration-300
          group-hover:scale-110 group-hover:rotate-3
        `}>
          {icon}
        </div>
        {badge && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-white/[0.05] px-2 py-1 rounded">
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </GlassCard>
  )
}

// Stats card with animated numbers - using design system colors
interface StatCardProps {
  value: string
  label: string
  trend?: { value: string; positive: boolean }
  icon?: ReactNode
  color?: 'primary' | 'info' | 'success' | 'warning'
}

export function StatCard({
  value,
  label,
  trend,
  icon,
  color = 'primary',
}: StatCardProps) {
  const colorClasses = {
    primary: 'text-[var(--aethel-primary-light)]',
    info: 'text-[var(--aethel-info-light)]',
    success: 'text-[var(--aethel-success-light)]',
    warning: 'text-[var(--aethel-warning-light)]',
  }

  return (
    <GlassCard variant="default" className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <motion.p
            className={`text-3xl font-bold ${colorClasses[color]}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: easing.spring }}
          >
            {value}
          </motion.p>
          <p className="mt-1 text-sm text-slate-400">{label}</p>
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-white/[0.05] text-slate-400">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5">
          <span className={`text-xs font-medium ${trend.positive ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-error-light)]'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-xs text-[var(--aethel-text-quaternary)]">vs último mês</span>
        </div>
      )}
    </GlassCard>
  )
}

// Section divider with gradient - using design system color
export function GradientDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-px ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--aethel-primary)]/50 to-transparent" />
    </div>
  )
}

// Floating particles background
interface ParticlesProps {
  count?: number
  className?: string
}

function particleValue(seed: number, offset = 0) {
  const raw = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453
  return raw - Math.floor(raw)
}

export function FloatingParticles({ count = 20, className = '' }: ParticlesProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {Array.from({ length: count }).map((_, i) => {
        const seed = i + 1
        const left = particleValue(seed, 1) * 100
        const top = particleValue(seed, 2) * 100
        const duration = 3 + particleValue(seed, 3) * 2
        const delay = particleValue(seed, 4) * 2

        return (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[var(--aethel-primary-light)]/30"
            style={{
              left: `${left}%`,
              top: `${top}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration,
              repeat: Infinity,
              delay,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </div>
  )
}

const premiumComponents = {
  GlassCard,
  GradientButton,
  GlowBadge,
  GradientText,
  AnimatedGradient,
  GlowInput,
  FeatureCard,
  StatCard,
  GradientDivider,
  FloatingParticles,
}

export default premiumComponents
