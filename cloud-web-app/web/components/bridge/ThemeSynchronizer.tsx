'use client';

/**
 * AETHEL ENGINE - Theme Synchronizer
 * 
 * Synchronizes theme between Theia IDE shell and Next.js web modules.
 * Part of the Proteus Bridge System.
 * 
 * Reference: AETHEL_UNIFIED_BRIDGE_SYSTEM.md - Section 2.1 (Theme Sync)
 * 
 * The Theia shell (leader) sends theme updates via postMessage.
 * This component (follower) applies the colors to CSS variables.
 */

import { useEffect, useCallback, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ThemeColors {
  'bg-primary'?: string;
  'bg-surface'?: string;
  'bg-elevated'?: string;
  'bg-hover'?: string;
  'text-primary'?: string;
  'text-secondary'?: string;
  'text-muted'?: string;
  'border-primary'?: string;
  'border-focus'?: string;
  'color-primary'?: string;
  'color-accent'?: string;
}

interface ThemeMessage {
  type: 'AETHEL_THEME_UPDATE' | 'UPDATE_THEME';
  theme: 'dark' | 'light';
  colors: ThemeColors;
}

interface BridgeMessage {
  type: string;
  [key: string]: unknown;
}

// ============================================================================
// Default Themes
// ============================================================================

const DARK_THEME: ThemeColors = {
  'bg-primary': '#09090b',
  'bg-surface': '#18181b',
  'bg-elevated': '#27272a',
  'bg-hover': '#3f3f46',
  'text-primary': '#fafafa',
  'text-secondary': '#a1a1aa',
  'text-muted': '#71717a',
  'border-primary': '#27272a',
  'border-focus': '#6366f1',
  'color-primary': '#6366f1',
  'color-accent': '#a855f7',
};

const LIGHT_THEME: ThemeColors = {
  'bg-primary': '#ffffff',
  'bg-surface': '#f4f4f5',
  'bg-elevated': '#e4e4e7',
  'bg-hover': '#d4d4d8',
  'text-primary': '#18181b',
  'text-secondary': '#52525b',
  'text-muted': '#71717a',
  'border-primary': '#d4d4d8',
  'border-focus': '#6366f1',
  'color-primary': '#6366f1',
  'color-accent': '#a855f7',
};

// ============================================================================
// Hook: useThemeBridge
// ============================================================================

export function useThemeBridge() {
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark');
  const [isHosted, setIsHosted] = useState(false);

  // Apply colors to CSS variables
  const applyColors = useCallback((colors: ThemeColors) => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--${key}`, value);
      }
    });
  }, []);

  // Handle incoming messages from Theia
  const handleMessage = useCallback((event: MessageEvent) => {
    const data = event.data as BridgeMessage;
    
    if (data?.type === 'AETHEL_THEME_UPDATE' || data?.type === 'UPDATE_THEME') {
      const themeData = data as unknown as ThemeMessage;
      setCurrentTheme(themeData.theme || 'dark');
      applyColors(themeData.colors || {});
      console.debug('[ThemeBridge] Theme updated:', themeData.theme);
    }
  }, [applyColors]);

  // Check if running inside Theia iframe
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsHosted(window.parent !== window);
    }
  }, []);

  // Listen for theme messages
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('message', handleMessage);
    
    // Request initial theme from host
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'AETHEL_REQUEST_THEME' }, '*');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  // Apply default dark theme on mount
  useEffect(() => {
    applyColors(DARK_THEME);
  }, [applyColors]);

  return {
    currentTheme,
    isHosted,
    setTheme: (theme: 'dark' | 'light') => {
      setCurrentTheme(theme);
      applyColors(theme === 'dark' ? DARK_THEME : LIGHT_THEME);
    },
  };
}

// ============================================================================
// Component: ThemeSynchronizer
// ============================================================================

interface ThemeSynchronizerProps {
  children: React.ReactNode;
  defaultTheme?: 'dark' | 'light';
}

export default function ThemeSynchronizer({ 
  children, 
  defaultTheme = 'dark' 
}: ThemeSynchronizerProps) {
  const { currentTheme, isHosted } = useThemeBridge();

  // Add data attributes for CSS targeting
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', currentTheme);
      document.documentElement.setAttribute('data-hosted', String(isHosted));
    }
  }, [currentTheme, isHosted]);

  return <>{children}</>;
}

// ============================================================================
// Utility: sendBridgeMessage
// ============================================================================

/**
 * Send a message to the Theia host
 */
export function sendBridgeMessage(type: string, payload: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && window.parent !== window) {
    window.parent.postMessage({ type, ...payload }, '*');
  }
}

/**
 * Notify Theia that save was completed
 */
export function notifySaveComplete(data: unknown) {
  sendBridgeMessage('AETHEL_SAVE_COMPLETE', { data });
}

/**
 * Request Theia to open a folder
 */
export function requestOpenFolder(path: string) {
  sendBridgeMessage('OPEN_FOLDER', { path });
}

/**
 * Request Theia to open a file
 */
export function requestOpenFile(path: string) {
  sendBridgeMessage('OPEN_FILE', { path });
}
