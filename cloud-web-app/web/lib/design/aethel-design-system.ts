/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ╔═╗╔═╗╔╦╗╦ ╦╔═╗╦    ╔╦╗╔═╗╔═╗╦╔═╗╔╗╔  ╔═╗╦ ╦╔═╗╔╦╗╔═╗╔╦╗
 * ╠═╣║╣  ║ ╠═╣║╣ ║     ║║║╣ ╚═╗║║ ╦║║║  ╚═╗╚╦╝╚═╗ ║ ║╣ ║║║
 * ╩ ╩╚═╝ ╩ ╩ ╩╚═╝╩═╝  ═╩╝╚═╝╚═╝╩╚═╝╝╚╝  ╚═╝ ╩ ╚═╝ ╩ ╚═╝╩ ╩
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * AETHEL DESIGN SYSTEM - AAA Game Engine Interface Standards
 * 
 * "Superior to Veo3, Adobe Enterprise Pro, Unreal Engine 5, Unity 6"
 * 
 * This is the SINGLE SOURCE OF TRUTH for ALL visual decisions.
 * Every component, every page, every interaction follows these tokens.
 * 
 * @version 4.0.0 - AAA Professional Edition
 * @author Aethel Design Authority
 * @license Proprietary
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: COLOR TOKENS - Deep Space Dark Mode
// ═══════════════════════════════════════════════════════════════════════════════

export const AETHEL_COLORS = {
  // ──────────────────────────────────────────────────────────────────────────────
  // Background Hierarchy (Zinc 950 Based - "Deep Space")
  // ──────────────────────────────────────────────────────────────────────────────
  bg: {
    void: '#000000',           // True black for maximum contrast
    deep: '#09090b',           // Zinc 950 - Primary background (THE standard)
    base: '#0c0c0e',           // Slightly elevated base
    elevated: '#141417',       // Panels, sidebars
    surface: '#1a1a1e',        // Cards, containers
    overlay: '#222226',        // Dropdowns, popovers
    hover: '#2a2a2f',          // Interactive hover
    active: '#323238',         // Active/pressed state
    highlight: '#3f3f46',      // Selection highlight
  },
  
  // ──────────────────────────────────────────────────────────────────────────────
  // Accent Colors - Professional AAA Palette
  // ──────────────────────────────────────────────────────────────────────────────
  accent: {
    // Primary - Electric Blue (Innovation, Technology)
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',   // Main
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      glow: 'rgba(59, 130, 246, 0.4)',
    },
    
    // Secondary - Violet (Creativity, Premium)
    secondary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',   // Main
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
      glow: 'rgba(139, 92, 246, 0.4)',
    },
    
    // Tertiary - Cyan (Futuristic, Sci-Fi)
    tertiary: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',   // Main
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
      glow: 'rgba(6, 182, 212, 0.4)',
    },
    
    // Success - Emerald
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',   // Main
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      glow: 'rgba(16, 185, 129, 0.4)',
    },
    
    // Warning - Amber
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',   // Main
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      glow: 'rgba(245, 158, 11, 0.4)',
    },
    
    // Error - Red
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',   // Main
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      glow: 'rgba(239, 68, 68, 0.4)',
    },
  },
  
  // ──────────────────────────────────────────────────────────────────────────────
  // Text Colors
  // ──────────────────────────────────────────────────────────────────────────────
  text: {
    primary: '#fafafa',        // White - Main text
    secondary: '#a1a1aa',      // Zinc 400 - Secondary
    tertiary: '#71717a',       // Zinc 500 - Muted
    disabled: '#52525b',       // Zinc 600 - Disabled
    inverse: '#09090b',        // For light backgrounds
    link: '#60a5fa',           // Blue 400 - Links
    code: '#f472b6',           // Pink 400 - Code
  },
  
  // ──────────────────────────────────────────────────────────────────────────────
  // Border Colors
  // ──────────────────────────────────────────────────────────────────────────────
  border: {
    subtle: '#1f1f23',         // Barely visible
    default: '#27272a',        // Standard borders
    strong: '#3f3f46',         // Emphasis borders
    focus: '#3b82f6',          // Focus rings
    error: '#ef4444',          // Error state
    success: '#10b981',        // Success state
  },
  
  // ──────────────────────────────────────────────────────────────────────────────
  // Semantic Colors for Editors
  // ──────────────────────────────────────────────────────────────────────────────
  editor: {
    // 3D Viewport
    viewport: {
      grid: '#2a2a2f',
      gridMajor: '#3f3f46',
      selection: '#3b82f6',
      selectionHover: '#60a5fa',
      gizmoX: '#ef4444',
      gizmoY: '#22c55e',
      gizmoZ: '#3b82f6',
      gizmoW: '#f59e0b',
    },
    
    // Node Graph
    nodes: {
      output: '#ef4444',
      input: '#22c55e',
      math: '#f59e0b',
      texture: '#8b5cf6',
      constant: '#06b6d4',
      function: '#ec4899',
      comment: '#6b7280',
    },
    
    // Timeline
    timeline: {
      playhead: '#ef4444',
      keyframe: '#f59e0b',
      track: '#27272a',
      trackAlt: '#1f1f23',
      clip: '#3b82f6',
      clipAudio: '#22c55e',
      clipEffect: '#8b5cf6',
    },
    
    // Console/Log
    console: {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      success: '#22c55e',
      verbose: '#71717a',
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: TYPOGRAPHY TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

export const AETHEL_TYPOGRAPHY = {
  // Font Families
  fontFamily: {
    display: '"Inter Display", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    body: '"Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "SF Mono", "Menlo", monospace',
    ui: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  
  // Font Sizes (rem based)
  fontSize: {
    '3xs': '0.625rem',   // 10px
    '2xs': '0.6875rem',  // 11px
    xs: '0.75rem',       // 12px
    sm: '0.8125rem',     // 13px
    base: '0.875rem',    // 14px (default for IDEs)
    md: '1rem',          // 16px
    lg: '1.125rem',      // 18px
    xl: '1.25rem',       // 20px
    '2xl': '1.5rem',     // 24px
    '3xl': '1.875rem',   // 30px
    '4xl': '2.25rem',    // 36px
    '5xl': '3rem',       // 48px
  },
  
  // Font Weights
  fontWeight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  
  // Line Heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: SPACING & SIZING
// ═══════════════════════════════════════════════════════════════════════════════

export const AETHEL_SPACING = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',    // 2px
  1: '0.25rem',       // 4px
  1.5: '0.375rem',    // 6px
  2: '0.5rem',        // 8px
  2.5: '0.625rem',    // 10px
  3: '0.75rem',       // 12px
  3.5: '0.875rem',    // 14px
  4: '1rem',          // 16px
  5: '1.25rem',       // 20px
  6: '1.5rem',        // 24px
  7: '1.75rem',       // 28px
  8: '2rem',          // 32px
  9: '2.25rem',       // 36px
  10: '2.5rem',       // 40px
  11: '2.75rem',      // 44px
  12: '3rem',         // 48px
  14: '3.5rem',       // 56px
  16: '4rem',         // 64px
  20: '5rem',         // 80px
  24: '6rem',         // 96px
  28: '7rem',         // 112px
  32: '8rem',         // 128px
} as const;

export const AETHEL_SIZING = {
  // Panel widths
  panel: {
    sidebar: '280px',
    sidebarCollapsed: '48px',
    outliner: '260px',
    details: '320px',
    contentBrowser: '100%',
    toolbar: '40px',
  },
  
  // Heights
  height: {
    menuBar: '28px',
    toolbar: '40px',
    tabBar: '36px',
    statusBar: '24px',
    header: '48px',
    row: '24px',
    rowLarge: '32px',
  },
  
  // Icons
  icon: {
    '2xs': '12px',
    xs: '14px',
    sm: '16px',
    md: '18px',
    lg: '20px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: BORDER RADIUS
// ═══════════════════════════════════════════════════════════════════════════════

export const AETHEL_RADIUS = {
  none: '0',
  sm: '2px',
  default: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: SHADOWS & ELEVATION
// ═══════════════════════════════════════════════════════════════════════════════

export const AETHEL_SHADOWS = {
  none: 'none',
  
  // Subtle shadows for cards/panels
  xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
  md: '0 4px 8px rgba(0, 0, 0, 0.3)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.4)',
  xl: '0 16px 32px rgba(0, 0, 0, 0.5)',
  '2xl': '0 24px 48px rgba(0, 0, 0, 0.6)',
  
  // Glow shadows for interactive elements
  glow: {
    blue: '0 0 20px rgba(59, 130, 246, 0.4)',
    purple: '0 0 20px rgba(139, 92, 246, 0.4)',
    cyan: '0 0 20px rgba(6, 182, 212, 0.4)',
    green: '0 0 20px rgba(16, 185, 129, 0.4)',
    amber: '0 0 20px rgba(245, 158, 11, 0.4)',
    red: '0 0 20px rgba(239, 68, 68, 0.4)',
  },
  
  // Inner shadows
  inner: {
    sm: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
    md: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
    lg: 'inset 0 4px 8px rgba(0, 0, 0, 0.2)',
  },
  
  // Focus rings
  focus: {
    default: '0 0 0 2px rgba(59, 130, 246, 0.5)',
    error: '0 0 0 2px rgba(239, 68, 68, 0.5)',
    success: '0 0 0 2px rgba(16, 185, 129, 0.5)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: ANIMATIONS & TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const AETHEL_ANIMATION = {
  // Durations
  duration: {
    instant: '0ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '1000ms',
  },
  
  // Easings
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  
  // Presets
  transition: {
    all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors: 'color, background-color, border-color, fill, stroke 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    shadow: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Keyframes (for CSS-in-JS)
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
    slideUp: {
      from: { opacity: 0, transform: 'translateY(10px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    slideDown: {
      from: { opacity: 0, transform: 'translateY(-10px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    scaleIn: {
      from: { opacity: 0, transform: 'scale(0.95)' },
      to: { opacity: 1, transform: 'scale(1)' },
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    shimmer: {
      from: { backgroundPosition: '-200% 0' },
      to: { backgroundPosition: '200% 0' },
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Z-INDEX LAYERS
// ═══════════════════════════════════════════════════════════════════════════════

export const AETHEL_Z_INDEX = {
  behind: -1,
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
  max: 9999,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: BREAKPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

export const AETHEL_BREAKPOINTS = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
  '4xl': '2560px',  // 4K
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: COMPONENT PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const AETHEL_PRESETS = {
  // Button Variants
  button: {
    primary: {
      bg: AETHEL_COLORS.accent.primary[500],
      bgHover: AETHEL_COLORS.accent.primary[600],
      text: '#ffffff',
      border: 'transparent',
    },
    secondary: {
      bg: AETHEL_COLORS.bg.surface,
      bgHover: AETHEL_COLORS.bg.hover,
      text: AETHEL_COLORS.text.primary,
      border: AETHEL_COLORS.border.default,
    },
    ghost: {
      bg: 'transparent',
      bgHover: AETHEL_COLORS.bg.hover,
      text: AETHEL_COLORS.text.secondary,
      border: 'transparent',
    },
    danger: {
      bg: AETHEL_COLORS.accent.error[500],
      bgHover: AETHEL_COLORS.accent.error[600],
      text: '#ffffff',
      border: 'transparent',
    },
  },
  
  // Input Fields
  input: {
    bg: AETHEL_COLORS.bg.base,
    bgFocus: AETHEL_COLORS.bg.elevated,
    text: AETHEL_COLORS.text.primary,
    placeholder: AETHEL_COLORS.text.tertiary,
    border: AETHEL_COLORS.border.default,
    borderFocus: AETHEL_COLORS.accent.primary[500],
    borderError: AETHEL_COLORS.accent.error[500],
  },
  
  // Cards
  card: {
    bg: AETHEL_COLORS.bg.surface,
    bgHover: AETHEL_COLORS.bg.overlay,
    border: AETHEL_COLORS.border.subtle,
    shadow: AETHEL_SHADOWS.md,
  },
  
  // Panels
  panel: {
    header: {
      bg: AETHEL_COLORS.bg.elevated,
      border: AETHEL_COLORS.border.subtle,
      height: '28px',
    },
    body: {
      bg: AETHEL_COLORS.bg.base,
    },
  },
  
  // Tooltips
  tooltip: {
    bg: AETHEL_COLORS.bg.overlay,
    text: AETHEL_COLORS.text.primary,
    border: AETHEL_COLORS.border.default,
    shadow: AETHEL_SHADOWS.lg,
  },
  
  // Menus
  menu: {
    bg: AETHEL_COLORS.bg.overlay,
    bgHover: AETHEL_COLORS.bg.hover,
    text: AETHEL_COLORS.text.primary,
    textMuted: AETHEL_COLORS.text.tertiary,
    border: AETHEL_COLORS.border.default,
    separator: AETHEL_COLORS.border.subtle,
    shadow: AETHEL_SHADOWS.xl,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: CSS CUSTOM PROPERTIES GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function generateCSSVariables(): string {
  return `
:root {
  /* Background */
  --aethel-bg-void: ${AETHEL_COLORS.bg.void};
  --aethel-bg-deep: ${AETHEL_COLORS.bg.deep};
  --aethel-bg-base: ${AETHEL_COLORS.bg.base};
  --aethel-bg-elevated: ${AETHEL_COLORS.bg.elevated};
  --aethel-bg-surface: ${AETHEL_COLORS.bg.surface};
  --aethel-bg-overlay: ${AETHEL_COLORS.bg.overlay};
  --aethel-bg-hover: ${AETHEL_COLORS.bg.hover};
  --aethel-bg-active: ${AETHEL_COLORS.bg.active};
  
  /* Text */
  --aethel-text-primary: ${AETHEL_COLORS.text.primary};
  --aethel-text-secondary: ${AETHEL_COLORS.text.secondary};
  --aethel-text-tertiary: ${AETHEL_COLORS.text.tertiary};
  --aethel-text-disabled: ${AETHEL_COLORS.text.disabled};
  
  /* Accent */
  --aethel-accent-primary: ${AETHEL_COLORS.accent.primary[500]};
  --aethel-accent-secondary: ${AETHEL_COLORS.accent.secondary[500]};
  --aethel-accent-success: ${AETHEL_COLORS.accent.success[500]};
  --aethel-accent-warning: ${AETHEL_COLORS.accent.warning[500]};
  --aethel-accent-error: ${AETHEL_COLORS.accent.error[500]};
  
  /* Border */
  --aethel-border-subtle: ${AETHEL_COLORS.border.subtle};
  --aethel-border-default: ${AETHEL_COLORS.border.default};
  --aethel-border-strong: ${AETHEL_COLORS.border.strong};
  
  /* Typography */
  --aethel-font-display: ${AETHEL_TYPOGRAPHY.fontFamily.display};
  --aethel-font-body: ${AETHEL_TYPOGRAPHY.fontFamily.body};
  --aethel-font-mono: ${AETHEL_TYPOGRAPHY.fontFamily.mono};
  
  /* Spacing */
  --aethel-spacing-1: ${AETHEL_SPACING[1]};
  --aethel-spacing-2: ${AETHEL_SPACING[2]};
  --aethel-spacing-3: ${AETHEL_SPACING[3]};
  --aethel-spacing-4: ${AETHEL_SPACING[4]};
  --aethel-spacing-6: ${AETHEL_SPACING[6]};
  --aethel-spacing-8: ${AETHEL_SPACING[8]};
  
  /* Radius */
  --aethel-radius-sm: ${AETHEL_RADIUS.sm};
  --aethel-radius-default: ${AETHEL_RADIUS.default};
  --aethel-radius-md: ${AETHEL_RADIUS.md};
  --aethel-radius-lg: ${AETHEL_RADIUS.lg};
  
  /* Shadows */
  --aethel-shadow-sm: ${AETHEL_SHADOWS.sm};
  --aethel-shadow-md: ${AETHEL_SHADOWS.md};
  --aethel-shadow-lg: ${AETHEL_SHADOWS.lg};
  --aethel-shadow-glow-blue: ${AETHEL_SHADOWS.glow.blue};
}
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get color with opacity
 */
export function withOpacity(color: string, opacity: number): string {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

/**
 * Create glassmorphism effect
 */
export function glassmorphism(intensity: 'light' | 'medium' | 'strong' = 'medium'): Record<string, string> {
  const configs = {
    light: { blur: '8px', bg: 'rgba(20, 20, 23, 0.6)' },
    medium: { blur: '12px', bg: 'rgba(20, 20, 23, 0.8)' },
    strong: { blur: '20px', bg: 'rgba(20, 20, 23, 0.9)' },
  };
  
  const config = configs[intensity];
  
  return {
    background: config.bg,
    backdropFilter: `blur(${config.blur})`,
    WebkitBackdropFilter: `blur(${config.blur})`,
    border: `1px solid ${AETHEL_COLORS.border.default}`,
  };
}

/**
 * Create gradient
 */
export function gradient(
  direction: string,
  ...colors: string[]
): string {
  return `linear-gradient(${direction}, ${colors.join(', ')})`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT ALL
// ═══════════════════════════════════════════════════════════════════════════════

export const AethelDesignSystem = {
  colors: AETHEL_COLORS,
  typography: AETHEL_TYPOGRAPHY,
  spacing: AETHEL_SPACING,
  sizing: AETHEL_SIZING,
  radius: AETHEL_RADIUS,
  shadows: AETHEL_SHADOWS,
  animation: AETHEL_ANIMATION,
  zIndex: AETHEL_Z_INDEX,
  breakpoints: AETHEL_BREAKPOINTS,
  presets: AETHEL_PRESETS,
  utils: {
    withOpacity,
    glassmorphism,
    gradient,
    generateCSSVariables,
  },
} as const;

export default AethelDesignSystem;
