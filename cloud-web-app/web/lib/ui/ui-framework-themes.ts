import type { Theme } from './ui-framework';

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#0f0f0f',
    surface: '#1a1a1a',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#22c55e',
    info: '#3b82f6',
    text: {
      primary: '#ffffff',
      secondary: '#a1a1aa',
      disabled: '#52525b',
      inverse: '#0f0f0f',
    },
    border: '#27272a',
    divider: '#3f3f46',
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      xxl: '1.5rem',
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
  },
  transitions: {
    fast: '0.1s ease',
    normal: '0.2s ease',
    slow: '0.3s ease',
  },
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070,
  },
};

export const lightTheme: Theme = {
  ...darkTheme,
  name: 'light',
  colors: {
    ...darkTheme.colors,
    background: '#ffffff',
    surface: '#f4f4f5',
    text: {
      primary: '#18181b',
      secondary: '#52525b',
      disabled: '#a1a1aa',
      inverse: '#ffffff',
    },
    border: '#e4e4e7',
    divider: '#d4d4d8',
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.15)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.2)',
  },
};

export const gameTheme: Theme = {
  ...darkTheme,
  name: 'game',
  colors: {
    primary: '#fbbf24',
    secondary: '#f59e0b',
    accent: '#ef4444',
    background: '#0a0a0a',
    surface: '#18181b',
    error: '#dc2626',
    warning: '#f59e0b',
    success: '#16a34a',
    info: '#2563eb',
    text: {
      primary: '#fafafa',
      secondary: '#a1a1aa',
      disabled: '#52525b',
      inverse: '#0a0a0a',
    },
    border: '#3f3f46',
    divider: '#52525b',
    overlay: 'rgba(0, 0, 0, 0.85)',
    shadow: 'rgba(0, 0, 0, 0.7)',
  },
};

