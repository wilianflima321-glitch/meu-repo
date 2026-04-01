/**
 * Glassmorphism UI Components - Nível Studio L5
 *
 * Componentes com efeitos de vidro, glows dinâmicos e transições de elite
 * Inspirado em: Vercel, Linear, Cursor, Figma
 */

'use client'

import React, { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Padrões de animação de elite
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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
  },

  pageEnter: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },

  fadeInUp: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 30 },
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
  },
}

/**
 * Glassmorphic Card Component
 */
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
    <motion.div
      variants={animated ? eliteAnimations.itemVariants : undefined}
      initial={animated ? 'hidden' : undefined}
      animate={animated ? 'visible' : undefined}
      className={`
        relative rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] backdrop-blur-xl
        transition-all duration-300
        ${hover ? 'hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:shadow-2xl' : ''}
        ${glow ? 'shadow-[0_0_40px_rgba(59,130,246,0.2)]' : ''}
        ${className}
      `}
    >
      {/* Glow effect background */}
      {glow && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] via-transparent to-[color-mix(in_srgb,var(--aethel-accent)_10%,transparent)] opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}

      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

/**
 * Glassmorphic Button Component
 */
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
  const baseClasses = 'relative font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2'

  const variantClasses = {
    primary: 'bg-gradient-to-r from-[var(--aethel-info)] to-[var(--aethel-primary)] text-[var(--aethel-text-primary)] hover:shadow-lg hover:shadow-[color-mix(in_srgb,var(--aethel-info)_45%,transparent)] active:scale-95',
    secondary: 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-primary)] border border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:border-[var(--aethel-border-primary)]',
    ghost: 'text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-transparent hover:border-[var(--aethel-border-primary)]',
    danger: 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] hover:border-[color-mix(in_srgb,var(--aethel-error)_50%,transparent)]',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4 border-2 border-[var(--aethel-border-primary)] border-t-white rounded-full"
        />
      )}
      {children}
    </motion.button>
  )
}

/**
 * Glassmorphic Input Component
 */
export function GlassInput({
  placeholder = '',
  value = '',
  onChange,
  type = 'text',
  icon: Icon,
  className = '',
}: {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className="relative">
      {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aethel-text-primary)]/50">{Icon}</div>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`
          w-full px-4 py-2.5 rounded-lg
          bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border border-[var(--aethel-border-primary)]
          text-[var(--aethel-text-primary)] placeholder-white/40
          backdrop-blur-xl
          transition-all duration-200
          focus:outline-none focus:border-[var(--aethel-border-primary)] focus:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]
          ${Icon ? 'pl-10' : ''}
          ${className}
        `}
      />
    </div>
  )
}

/**
 * Animated Badge Component
 */
export function AnimatedBadge({
  children,
  variant = 'default',
  animated = true,
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  animated?: boolean
}) {
  const variantClasses = {
    default: 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info-light)] border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]',
    success: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)] border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]',
    warning: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]',
    error: 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)] border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]',
    info: 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)] border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]',
  }

  return (
    <motion.div
      {...(animated ? eliteAnimations.scaleIn : {})}
      className={`
        inline-flex items-center gap-2 px-3 py-1 rounded-full
        text-xs font-medium border
        ${variantClasses[variant]}
      `}
    >
      {children}
    </motion.div>
  )
}

/**
 * Pulse Glow Effect Component
 */
export function PulseGlow({
  children,
  color = 'blue',
  intensity = 'medium',
}: {
  children: ReactNode
  color?: 'blue' | 'green' | 'red' | 'purple' | 'cyan'
  intensity?: 'low' | 'medium' | 'high'
}) {
  const colorClasses = {
    blue: 'shadow-[0_0_60px_rgba(59,130,246,0.4)]',
    green: 'shadow-[0_0_60px_rgba(34,197,94,0.4)]',
    red: 'shadow-[0_0_60px_rgba(239,68,68,0.4)]',
    purple: 'shadow-[0_0_60px_color-mix(in_srgb,var(--aethel-accent)_40%,transparent)]',
    cyan: 'shadow-[0_0_60px_rgba(34,211,238,0.4)]',
  }

  const intensityClasses = {
    low: 'opacity-50',
    medium: 'opacity-75',
    high: 'opacity-100',
  }

  return (
    <div className="relative">
      <motion.div
        animate={{
          boxShadow: [
            `0 0 20px rgba(59,130,246,0)`,
            `0 0 40px rgba(59,130,246,0.3)`,
            `0 0 20px rgba(59,130,246,0)`,
          ],
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className={`absolute inset-0 rounded-lg ${colorClasses[color]} ${intensityClasses[intensity]}`}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/**
 * Animated Gradient Background
 */
export function AnimatedGradientBg({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{ duration: 15, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-br from-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] via-[color-mix(in_srgb,var(--aethel-accent)_20%,transparent)] to-[color-mix(in_srgb,var(--aethel-secondary)_20%,transparent)] bg-[length:200%_200%]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/**
 * Staggered Container for List Animations
 */
export function StaggerContainer({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={eliteAnimations.containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Animated Counter Component
 */
export function AnimatedCounter({
  from = 0,
  to = 100,
  duration = 2,
  suffix = '',
}: {
  from?: number
  to?: number
  duration?: number
  suffix?: string
}) {
  const [count, setCount] = React.useState(from)

  React.useEffect(() => {
    const steps = 60
    const stepValue = (to - from) / steps
    const stepDuration = (duration * 1000) / steps
    let current = from
    let step = 0

    const interval = setInterval(() => {
      if (step < steps) {
        current += stepValue
        setCount(Math.floor(current))
        step++
      } else {
        setCount(to)
        clearInterval(interval)
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [from, to, duration])

  return (
    <span>
      {count}
      {suffix}
    </span>
  )
}

/**
 * Hover Card with Tooltip
 */
export function HoverCard({
  children,
  tooltip,
  side = 'top',
}: {
  children: ReactNode
  tooltip: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}) {
  const [isHovered, setIsHovered] = React.useState(false)

  const tooltipPosition = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`
              absolute ${tooltipPosition[side]} whitespace-nowrap
              px-3 py-1.5 rounded-lg
              bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] backdrop-blur-xl border border-[var(--aethel-border-primary)]
              text-xs text-[var(--aethel-text-primary)]/80
              pointer-events-none z-50
            `}
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Loading Skeleton com Shimmer Effect
 */
export function ShimmerSkeleton({
  width = 'w-full',
  height = 'h-4',
  className = '',
}: {
  width?: string
  height?: string
  className?: string
}) {
  return (
    <motion.div
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{ duration: 2, repeat: Infinity }}
      className={`
        ${width} ${height}
        rounded-lg
        bg-gradient-to-r from-white/5 via-white/10 to-white/5
        bg-[length:200%_100%]
        ${className}
      `}
    />
  )
}

/**
 * Animated Progress Bar
 */
export function AnimatedProgressBar({
  progress = 0,
  color = 'blue',
  showLabel = true,
}: {
  progress?: number
  color?: 'blue' | 'green' | 'red' | 'purple'
  showLabel?: boolean
}) {
  const colorClasses = {
    blue: 'from-[var(--aethel-info-light)] to-[var(--aethel-primary)]',
    green: 'from-green-400 to-green-600',
    red: 'from-[color-mix(in_srgb,var(--aethel-error)_60%,transparent)] to-[var(--aethel-error)]',
    purple: 'from-[var(--aethel-accent-light)] to-[var(--aethel-accent-dark)]',
  }

  return (
    <div className="w-full space-y-2">
      <div className="w-full h-2 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-full overflow-hidden border border-[var(--aethel-border-primary)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${colorClasses[color]} shadow-lg`}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-[var(--aethel-text-primary)]/60 text-right">{Math.round(progress)}%</div>
      )}
    </div>
  )
}

/**
 * Floating Action Button (FAB)
 */
export function FloatingActionButton({
  icon: Icon,
  onClick,
  label = '',
  color = 'blue',
}: {
  icon: React.ReactNode
  onClick: () => void
  label?: string
  color?: 'blue' | 'green' | 'red' | 'purple'
}) {
  const colorClasses = {
    blue: 'from-[var(--aethel-info)] to-[var(--aethel-primary)] hover:shadow-[color-mix(in_srgb,var(--aethel-info)_45%,transparent)]',
    green: 'from-green-500 to-green-600 hover:shadow-green-500/50',
    red: 'from-[color-mix(in_srgb,var(--aethel-error)_70%,transparent)] to-[var(--aethel-error)] hover:shadow-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)]',
    purple: 'from-[var(--aethel-accent)] to-[var(--aethel-accent-dark)] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--aethel-accent)_50%,transparent)]',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        fixed bottom-8 right-8 z-40
        w-14 h-14 rounded-full
        bg-gradient-to-r ${colorClasses[color]}
        text-[var(--aethel-text-primary)] shadow-lg hover:shadow-2xl
        flex items-center justify-center
        transition-all duration-200
      `}
      title={label}
    >
      {Icon}
    </motion.button>
  )
}
