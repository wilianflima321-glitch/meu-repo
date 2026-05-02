/**
 * Aethel Design System - Unified Tokens v2.1
 * Centralized design tokens for consistent UX across all interfaces
 */

export const tokens = {
  // Color System - Deep Space Dark
  colors: {
    // Background hierarchy
    bg: {
      primary: '#020617',      // slate-950 - main app background
      surface: '#0f172a',    // slate-900 - panels, cards
      elevated: '#1e293b',    // slate-800 - popovers, modals
      hover: '#334155',      // slate-700 - interactive hover
      active: '#475569',     // slate-600 - active states
    },
    
    // Text hierarchy
    text: {
      primary: '#f8fafc',    // slate-50 - headings, important
      secondary: '#94a3b8',  // slate-400 - body, descriptions
      muted: '#64748b',     // slate-500 - placeholders, disabled
      inverse: '#020617',   // slate-950 - on accent backgrounds
    },
    
    // Accent colors - cyan/emerald gradient system
    accent: {
      cyan: '#06b6d4',      // cyan-500 - primary actions
      cyanLight: '#22d3ee', // cyan-400 - hover states
      cyanDark: '#0891b2',  // cyan-600 - pressed states
      emerald: '#10b981',   // emerald-500 - success states
      emeraldLight: '#34d399', // emerald-400
      indigo: '#6366f1',    // indigo-500 - secondary accent
      violet: '#8b5cf6',    // violet-500 - special features
      amber: '#f59e0b',     // amber-500 - warning states
      rose: '#f43f5e',      // rose-500 - error states
    },
    
    // Status colors
    status: {
      success: '#10b981',
      warning: '#f59e0b',   // amber-500
      error: '#ef4444',    // red-500
      info: '#06b6d4',     // cyan-500
      neutral: '#64748b',  // slate-500
    },
    
    // Border hierarchy
    border: {
      subtle: 'rgba(255, 255, 255, 0.04)',
      light: 'rgba(255, 255, 255, 0.08)',
      medium: 'rgba(255, 255, 255, 0.12)',
      strong: 'rgba(255, 255, 255, 0.2)',
    },
  },

  // Spacing System - 4px base grid
  spacing: {
    '0': '0',
    '0.5': '0.125rem',  // 2px
    '1': '0.25rem',     // 4px
    '1.5': '0.375rem',  // 6px
    '2': '0.5rem',      // 8px
    '2.5': '0.625rem',  // 10px
    '3': '0.75rem',     // 12px
    '3.5': '0.875rem',  // 14px
    '4': '1rem',        // 16px
    '5': '1.25rem',     // 20px
    '6': '1.5rem',      // 24px
    '8': '2rem',        // 32px
    '10': '2.5rem',     // 40px
    '12': '3rem',       // 48px
    '16': '4rem',       // 64px
    '20': '5rem',       // 80px
    '24': '6rem',       // 96px
  },

  // Typography System
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, monospace",
      display: "'Cal Sans', 'Inter', sans-serif",
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Animation System
  animation: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slower: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      snappy: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    },
  },

  // Effects - Glassmorphism
  effects: {
    glass: {
      light: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
      medium: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02))',
      strong: 'linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04))',
    },
    glow: {
      cyan: '0 0 20px rgba(6, 182, 212, 0.3)',
      emerald: '0 0 20px rgba(16, 185, 129, 0.3)',
      indigo: '0 0 20px rgba(99, 102, 241, 0.3)',
      subtle: '0 0 40px rgba(6, 182, 212, 0.15)',
    },
    shadow: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
      panel: '0 24px 80px rgba(2, 6, 23, 0.4)',
    },
  },

  // Border Radius System
  radius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.25rem', // 20px
    '3xl': '1.5rem',  // 24px
    '4xl': '2rem',    // 32px
    full: '9999px',
  },

  // Z-Index Scale
  zIndex: {
    hide: -1,
    base: 0,
    docked: 10,
    dropdown: 100,
    sticky: 200,
    banner: 300,
    overlay: 400,
    modal: 500,
    popover: 600,
    toast: 700,
    tooltip: 800,
    drawer: 900,
    floating: 1000,
    highest: 9999,
  },
} as const;

// Utility type for tokens
export type Tokens = typeof tokens;

// Helper to get nested token values
export function getToken<T extends keyof Tokens>(
  category: T,
  path: string
): string | undefined {
  const parts = path.split('.');
  let value: unknown = tokens[category];
  
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  
  return typeof value === 'string' ? value : undefined;
}

// Predefined gradient combinations
export const gradients = {
  // Primary brand gradient
  brand: 'linear-gradient(135deg, rgba(79, 70, 229, 0.95), rgba(14, 165, 233, 0.92))',
  
  // Glass panel gradients
  glassSubtle: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(2, 6, 23, 0.82))',
  glassMedium: 'linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.88))',
  glassStrong: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.94))',
  
  // Glow effects as gradients
  glowCyan: 'radial-gradient(circle at top, rgba(6, 182, 212, 0.15), transparent 40%)',
  glowIndigo: 'radial-gradient(circle at top, rgba(99, 102, 241, 0.15), transparent 40%)',
  
  // Mesh gradient backgrounds
  mesh: `
    radial-gradient(circle at 20% 30%, rgba(79, 70, 229, 0.08), transparent 40%),
    radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.08), transparent 35%),
    radial-gradient(circle at 40% 80%, rgba(99, 102, 241, 0.06), transparent 50%)
  `,
} as const;

// Animation keyframes as strings (for CSS-in-JS)
export const keyframes = {
  fadeIn: `
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  `,
  fadeOut: `
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-8px); }
  `,
  scaleIn: `
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  `,
  slideInRight: `
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  `,
  slideInLeft: `
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  `,
  pulse: `
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  `,
  spin: `
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  `,
  bounce: `
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-25%); }
  `,
} as const;

// Preset combinations for common UI patterns
export const presets = {
  // Glass panel with border
  glassPanel: `
    background: ${gradients.glassMedium};
    border: 1px solid ${tokens.colors.border.light};
    border-radius: ${tokens.radius['2xl']};
    box-shadow: ${tokens.effects.shadow.panel};
  `,
  
  // Primary action button
  primaryButton: `
    background: ${gradients.brand};
    color: ${tokens.colors.text.primary};
    border-radius: ${tokens.radius.xl};
    font-weight: ${tokens.typography.fontWeight.semibold};
    transition: all ${tokens.animation.duration.fast} ${tokens.animation.easing.smooth};
  `,
  
  // Secondary/ghost button
  ghostButton: `
    background: transparent;
    border: 1px solid ${tokens.colors.border.light};
    color: ${tokens.colors.text.secondary};
    border-radius: ${tokens.radius.lg};
    transition: all ${tokens.animation.duration.fast} ${tokens.animation.easing.smooth};
  `,
  
  // Card with hover effect
  interactiveCard: `
    background: ${tokens.colors.bg.surface};
    border: 1px solid ${tokens.colors.border.subtle};
    border-radius: ${tokens.radius['2xl']};
    transition: all ${tokens.animation.duration.normal} ${tokens.animation.easing.smooth};
    
    &:hover {
      border-color: ${tokens.colors.border.light};
      transform: translateY(-2px);
      box-shadow: ${tokens.effects.shadow.lg};
    }
  `,
  
  // Input field
  input: `
    background: ${tokens.colors.bg.primary};
    border: 1px solid ${tokens.colors.border.light};
    border-radius: ${tokens.radius.lg};
    color: ${tokens.colors.text.primary};
    
    &:focus {
      outline: none;
      border-color: ${tokens.colors.accent.cyan};
      box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
    }
    
    &::placeholder {
      color: ${tokens.colors.text.muted};
    }
  `,
} as const;

export default tokens;
