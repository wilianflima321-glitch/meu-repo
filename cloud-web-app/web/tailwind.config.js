/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        aethel: {
          bg: 'var(--aethel-bg)',
          panel: 'var(--aethel-panel)',
          'panel-strong': 'var(--aethel-panel-strong)',
          'panel-soft': 'var(--aethel-panel-soft)',
          text: 'var(--aethel-text-primary)',
          muted: 'var(--aethel-text-secondary)',
          dim: 'var(--aethel-text-tertiary)',
          faint: 'var(--aethel-text-quaternary)',
          border: 'var(--aethel-border-primary)',
          'border-soft': 'var(--aethel-border-secondary)',
          primary: 'var(--aethel-primary)',
          secondary: 'var(--aethel-secondary)',
          info: 'var(--aethel-info)',
          success: 'var(--aethel-success)',
          warning: 'var(--aethel-warning)',
          error: 'var(--aethel-error)',
        },
        zinc: {
          950: '#09090b',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      boxShadow: {
        'aethel-panel':
          '0 24px 80px rgba(2, 6, 23, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'aethel-glow':
          '0 0 0 1px rgba(125, 211, 252, 0.08), 0 18px 48px rgba(56, 189, 248, 0.18)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'aethel-grid':
          'linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}

module.exports = config
