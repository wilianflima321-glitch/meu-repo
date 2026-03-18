/**
 * Aethel Engine - Canonical Design Tokens
 * Source of truth for spacing, motion, typography and color across all surfaces.
 * Consumed by tailwind.config.ts, component styles, and runtime theming.
 */

// ============================================================================
// SPACING SCALE (rem-based, 4px grid)
// ============================================================================
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  32: '8rem',       // 128px
} as const

// ============================================================================
// MOTION / ANIMATION
// ============================================================================
export const motion = {
  /** Standard entry animation */
  enter: {
    duration: '150ms',
    easing: 'cubic-bezier(0, 0, 0.2, 1)', // ease-out
  },
  /** Standard exit animation */
  exit: {
    duration: '100ms',
    easing: 'cubic-bezier(0.4, 0, 1, 1)', // ease-in
  },
  /** Micro-interactions (hover, focus) */
  micro: {
    duration: '100ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-in-out
  },
  /** Page transitions */
  page: {
    duration: '250ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  /** Spring-like bounce for emphasis */
  spring: {
    duration: '300ms',
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const

// ============================================================================
// TYPOGRAPHY
// ============================================================================
export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
    sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }],
    base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
    lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.005em' }],
    xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
    '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],
    '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
    '6xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.035em' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const

// ============================================================================
// COLOR PALETTE
// ============================================================================
export const colors = {
  // Brand
  brand: {
    primary: '#6366f1',     // Indigo-500
    primaryDark: '#4f46e5', // Indigo-600
    primaryLight: '#818cf8',// Indigo-400
    secondary: '#0ea5e9',   // Sky-500
    accent: '#8b5cf6',      // Violet-500
  },
  // Semantic
  semantic: {
    success: '#10b981',
    successLight: '#34d399',
    warning: '#f59e0b',
    warningLight: '#fbbf24',
    error: '#ef4444',
    errorLight: '#f87171',
    info: '#06b6d4',
    infoLight: '#22d3ee',
  },
  // Surfaces (dark theme)
  surface: {
    primary: '#0a0a0f',
    secondary: '#111118',
    tertiary: '#1a1a24',
    elevated: '#1e1e2a',
    hover: '#252532',
  },
  // Text
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
    disabled: '#475569',
  },
  // Borders
  border: {
    primary: '#1e293b',
    secondary: '#334155',
    focus: '#6366f1',
  },
} as const

// ============================================================================
// SHADOWS
// ============================================================================
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
  glow: '0 0 20px rgba(99, 102, 241, 0.15)',
  'glow-lg': '0 0 40px rgba(99, 102, 241, 0.2)',
} as const

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const borderRadius = {
  none: '0',
  sm: '0.25rem',     // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
} as const

// ============================================================================
// Z-INDEX SCALE
// ============================================================================
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  backdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
  commandPalette: 1090,
} as const

// ============================================================================
// BREAKPOINTS
// ============================================================================
export const breakpoints = {
  xs: '375px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// ============================================================================
// EXPORTED COMBINED TOKEN SET
// ============================================================================
export const designTokens = {
  spacing,
  motion,
  typography,
  colors,
  shadows,
  borderRadius,
  zIndex,
  breakpoints,
} as const

export type DesignTokens = typeof designTokens
export default designTokens
