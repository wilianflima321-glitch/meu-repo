'use client'

import { AnimatePresence as FramerAnimatePresence, motion, type Variants, type Transition } from 'framer-motion'
import { type ReactNode } from 'react'

// L5 Motion Design System - Premium Animations
// Based on Figma-quality motion standards

export const easing = {
  // Professional easing curves
  smooth: [0.25, 0.1, 0.25, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  spring: [0.34, 1.56, 0.64, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  // Material Design 3 easing
  emphasized: [0.2, 0, 0, 1],
  emphasizedDecelerate: [0, 0, 0.2, 1],
  emphasizedAccelerate: [0.3, 0, 0.8, 0.15],
} as const

export const durations = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
  dramatic: 0.8,
} as const

// Stagger variants for lists
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easing.easeOut,
    },
  },
}

// Fade animations
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easing.easeOut,
    },
  },
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.slow,
      ease: easing.easeOut,
    },
  },
}

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easing.spring,
    },
  },
}

// Slide animations
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.normal,
      ease: easing.easeOut,
    },
  },
}

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: durations.normal,
      ease: easing.easeOut,
    },
  },
}

// Card hover effect
export const cardHover = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  hover: {
    scale: 1.01,
    y: -2,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 0 20px rgba(99, 102, 241, 0.15)',
    transition: {
      duration: durations.fast,
      ease: easing.spring,
    },
  },
  tap: {
    scale: 0.99,
    transition: {
      duration: durations.instant,
    },
  },
}

// Button press effect
export const buttonTap = {
  scale: 0.97,
  transition: {
    duration: durations.instant,
    ease: easing.easeOut,
  },
}

// Page transition
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.slow,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: durations.fast,
      ease: easing.easeIn,
    },
  },
}

// Modal animation
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: durations.fast,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.fast,
      delay: 0.1,
    },
  },
}

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easing.spring,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: durations.fast,
      ease: easing.easeIn,
    },
  },
}

// Skeleton shimmer effect
export const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

// Pulse animation for loading states
export const gentlePulse = {
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// Gradient text animation
export const gradientText = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

// Glow pulse effect
export const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(99, 102, 241, 0.2)',
      '0 0 40px rgba(99, 102, 241, 0.4)',
      '0 0 20px rgba(99, 102, 241, 0.2)',
    ],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// Focus ring animation
export const focusRing = {
  initial: { scale: 1 },
  focus: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 0.3,
      ease: easing.spring,
    },
  },
}

// Reveal animation for sections
export const revealUp: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.slower,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

// Number count animation helper
export function useCountAnimation(end: number, duration: number = 2) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 },
  }
}

// Magnetic button effect wrapper
interface MagneticWrapperProps {
  children: ReactNode
  className?: string
}

export function MagneticWrapper({ children, className }: MagneticWrapperProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  )
}

// Animated presence wrapper
interface AnimatedPresenceProps {
  children: ReactNode
  mode?: 'wait' | 'sync' | 'popLayout'
}

export function AnimatedPresence({ children, mode = 'wait' }: AnimatedPresenceProps) {
  return (
    <FramerAnimatePresence mode={mode}>
      <motion.div initial="hidden" animate="show" exit="exit" variants={pageTransition}>
        {children}
      </motion.div>
    </FramerAnimatePresence>
  )
}

// Scroll-triggered reveal
interface ScrollRevealProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function ScrollReveal({ children, className, delay = 0 }: ScrollRevealProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-100px' }}
      variants={{
        hidden: { opacity: 0, y: 30 },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration: durations.slow,
            delay,
            ease: easing.easeOut,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

// Stagger children wrapper
interface StaggerContainerProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.05
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={staggerItem}
    >
      {children}
    </motion.div>
  )
}

const motionPrimitives = {
  easing,
  durations,
  staggerContainer,
  staggerItem,
  fadeIn,
  fadeInUp,
  fadeInScale,
  slideInRight,
  slideInLeft,
  cardHover,
  buttonTap,
  pageTransition,
  modalOverlay,
  modalContent,
  shimmer,
  gentlePulse,
  gradientText,
  glowPulse,
  focusRing,
  revealUp,
}

export default motionPrimitives
