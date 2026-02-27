import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ========== COLORS ========== */
      colors: {
        // AETHEL DESIGN SYSTEM - Deep Space Dark Mode
        // Reference: AETHEL_WEB_INTERFACE_STANDARD.md
        
        // Base backgrounds (Zinc scale for Dark Space mode)
        background: {
          DEFAULT: '#09090b', // Zinc 950 - Main background
          surface: '#18181b', // Zinc 900 - Cards/Surfaces
          elevated: '#27272a', // Zinc 800 - Elevated surfaces
          hover: '#3f3f46',   // Zinc 700 - Hover states
        },
        
        // Borders
        border: {
          DEFAULT: '#27272a', // Zinc 800 - Subtle borders
          muted: '#1f1f23',   // Darker border
          focus: '#6366f1',   // Primary color for focus rings
        },
        
        // Text colors
        foreground: {
          DEFAULT: '#fafafa', // Zinc 50 - Primary text
          muted: '#a1a1aa',   // Zinc 400 - Secondary text
          dim: '#71717a',     // Zinc 500 - Tertiary text
        },
        
        // Extend slate/zinc with custom values
        slate: {
          950: '#020617',
        },
        zinc: {
          950: '#09090b',
        },
        
        // Primary brand colors (Indigo)
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        
        // Accent colors (Purple)
        accent: {
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
        },
        
        // Semantic colors
        success: {
          DEFAULT: '#22c55e',
          muted: '#166534',
        },
        warning: {
          DEFAULT: '#f59e0b',
          muted: '#92400e',
        },
        error: {
          DEFAULT: '#ef4444',
          muted: '#991b1b',
        },
        info: {
          DEFAULT: '#3b82f6',
          muted: '#1e40af',
        },
      },

      /* ========== TYPOGRAPHY ========== */
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },

      /* ========== SPACING ========== */
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },

      /* ========== LAYOUT ========== */
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      width: {
        'sidebar': '280px',
        'sidebar-collapsed': '64px',
      },
      height: {
        'header': '64px',
      },

      /* ========== BORDER RADIUS ========== */
      borderRadius: {
        '4xl': '2rem',
      },

      /* ========== SHADOWS ========== */
      boxShadow: {
        'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-sm': '0 0 10px rgba(99, 102, 241, 0.2)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.4)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },

      /* ========== ANIMATIONS ========== */
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-in-up': 'fadeInUp 300ms ease-out',
        'fade-in-down': 'fadeInDown 300ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        'slide-in-right': 'slideInRight 300ms ease-out',
        'slide-in-left': 'slideInLeft 300ms ease-out',
        'slide-in-up': 'slideInUp 300ms ease-out',
        'slide-in-down': 'slideInDown 300ms ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-subtle': 'bounceSubtle 1s ease infinite',
        'bounce-slow': 'bounceSlow 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'typing': 'typing 1s steps(3) infinite',
        'float': 'float 3s ease-in-out infinite',
        'gradient-x': 'gradientX 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        slideInUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        slideInDown: {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.6)' },
        },
        typing: {
          '0%': { content: '.' },
          '33%': { content: '..' },
          '66%': { content: '...' },
        },
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },

      /* ========== TRANSITIONS ========== */
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      /* ========== BACKDROP BLUR ========== */
      backdropBlur: {
        xs: '2px',
      },

      /* ========== BACKGROUND IMAGE ========== */
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        'gradient-primary': 'linear-gradient(135deg, #4f46e5, #9333ea)',
        'gradient-primary-hover': 'linear-gradient(135deg, #6366f1, #a855f7)',
        'grid-pattern': 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23374151\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M0 0h1v40H0V0zm39 0h1v40h-1V0zM0 0h40v1H0V0zm0 39h40v1H0v-1z\'/%3E%3C/g%3E%3C/svg%3E")',
      },

      /* ========== Z-INDEX ========== */
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    // Plugin for text-shadow utilities
    function({ addUtilities }: { addUtilities: Function }) {
      addUtilities({
        '.text-shadow': {
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        },
        '.text-shadow-lg': {
          textShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
        },
        '.text-shadow-none': {
          textShadow: 'none',
        },
        '.text-glow': {
          textShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
        },
      })
    },
    // Plugin for scrollbar utilities
    function({ addUtilities }: { addUtilities: Function }) {
      addUtilities({
        '.scrollbar-thin': {
          scrollbarWidth: 'thin',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      })
    },
  ],
}

export default config
