/**
 * Aethel IDE theme context and provider.
 *
 * Theme definitions live in ThemeContext.themes.ts so the provider stays focused.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { builtInThemes, darkPlusTheme } from './ThemeContext.themes';

// ============================================================================
// TYPES
// ============================================================================

export interface ThemeColors {
  // Editor
  'editor.background': string;
  'editor.foreground': string;
  'editor.lineHighlightBackground': string;
  'editor.selectionBackground': string;
  'editor.inactiveSelectionBackground': string;
  'editor.findMatchBackground': string;
  'editor.findMatchHighlightBackground': string;
  'editorCursor.foreground': string;
  'editorWhitespace.foreground': string;
  'editorLineNumber.foreground': string;
  'editorLineNumber.activeForeground': string;
  'editorIndentGuide.background': string;
  'editorIndentGuide.activeBackground': string;
  'editorBracketMatch.background': string;
  'editorBracketMatch.border': string;

  // Sidebar
  'sideBar.background': string;
  'sideBar.foreground': string;
  'sideBar.border': string;
  'sideBarTitle.foreground': string;
  'sideBarSectionHeader.background': string;
  'sideBarSectionHeader.foreground': string;

  // Activity Bar
  'activityBar.background': string;
  'activityBar.foreground': string;
  'activityBar.inactiveForeground': string;
  'activityBar.border': string;
  'activityBarBadge.background': string;
  'activityBarBadge.foreground': string;

  // Status Bar
  'statusBar.background': string;
  'statusBar.foreground': string;
  'statusBar.border': string;
  'statusBar.debuggingBackground': string;
  'statusBar.debuggingForeground': string;
  'statusBar.noFolderBackground': string;

  // Tabs
  'tab.activeBackground': string;
  'tab.activeForeground': string;
  'tab.inactiveBackground': string;
  'tab.inactiveForeground': string;
  'tab.border': string;
  'tab.activeBorder': string;
  'tab.activeBorderTop': string;

  // Panel
  'panel.background': string;
  'panel.border': string;
  'panelTitle.activeBorder': string;
  'panelTitle.activeForeground': string;
  'panelTitle.inactiveForeground': string;

  // Terminal
  'terminal.background': string;
  'terminal.foreground': string;
  'terminal.ansiBlack': string;
  'terminal.ansiRed': string;
  'terminal.ansiGreen': string;
  'terminal.ansiYellow': string;
  'terminal.ansiBlue': string;
  'terminal.ansiMagenta': string;
  'terminal.ansiCyan': string;
  'terminal.ansiWhite': string;
  'terminal.ansiBrightBlack': string;
  'terminal.ansiBrightRed': string;
  'terminal.ansiBrightGreen': string;
  'terminal.ansiBrightYellow': string;
  'terminal.ansiBrightBlue': string;
  'terminal.ansiBrightMagenta': string;
  'terminal.ansiBrightCyan': string;
  'terminal.ansiBrightWhite': string;

  // Inputs
  'input.background': string;
  'input.foreground': string;
  'input.border': string;
  'input.placeholderForeground': string;
  'inputOption.activeBorder': string;
  'inputOption.activeBackground': string;

  // Buttons
  'button.background': string;
  'button.foreground': string;
  'button.hoverBackground': string;
  'button.secondaryBackground': string;
  'button.secondaryForeground': string;

  // Lists
  'list.activeSelectionBackground': string;
  'list.activeSelectionForeground': string;
  'list.hoverBackground': string;
  'list.hoverForeground': string;
  'list.inactiveSelectionBackground': string;
  'list.highlightForeground': string;

  // Focus
  'focusBorder': string;

  // Scrollbar
  'scrollbar.shadow': string;
  'scrollbarSlider.background': string;
  'scrollbarSlider.hoverBackground': string;
  'scrollbarSlider.activeBackground': string;

  // Badges
  'badge.background': string;
  'badge.foreground': string;

  // Progress
  'progressBar.background': string;

  // Notifications
  'notifications.background': string;
  'notifications.foreground': string;
  'notifications.border': string;

  // Custom
  [key: string]: string;
}

export interface TokenColor {
  name?: string;
  scope: string | string[];
  settings: {
    foreground?: string;
    background?: string;
    fontStyle?: string;
  };
}

export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light' | 'hc-dark' | 'hc-light';
  colors: Partial<ThemeColors>;
  tokenColors: TokenColor[];
}

export interface ThemeContextValue {
  theme: Theme;
  themeType: 'dark' | 'light' | 'hc-dark' | 'hc-light';
  availableThemes: Theme[];
  setTheme: (themeId: string) => void;
  registerTheme: (theme: Theme) => void;
  getColor: (key: keyof ThemeColors) => string;
  isDark: boolean;
  isHighContrast: boolean;
}


// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ============================================================================
// PROVIDER
// ============================================================================

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark-plus',
}) => {
  const [themes, setThemes] = useState<Theme[]>(builtInThemes);

  const [currentThemeId, setCurrentThemeId] = useState<string>(defaultTheme);

  // Load saved theme preference
  useEffect(() => {
    const saved = localStorage.getItem('aethel-theme');
    if (saved && themes.some(t => t.id === saved)) {
      setCurrentThemeId(saved);
    }
  }, [themes]);

  // Current theme object
  const theme = useMemo(() => {
    return themes.find(t => t.id === currentThemeId) || darkPlusTheme;
  }, [themes, currentThemeId]);

  // Set theme
  const setTheme = useCallback((themeId: string) => {
    if (themes.some(t => t.id === themeId)) {
      setCurrentThemeId(themeId);
      localStorage.setItem('aethel-theme', themeId);
    }
  }, [themes]);

  // Register custom theme
  const registerTheme = useCallback((newTheme: Theme) => {
    setThemes(prev => {
      const existing = prev.findIndex(t => t.id === newTheme.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newTheme;
        return updated;
      }
      return [...prev, newTheme];
    });
  }, []);

  // Get color helper
  const getColor = useCallback((key: keyof ThemeColors): string => {
    return theme.colors[key] || '#ff00ff'; // Magenta for missing colors
  }, [theme]);

  // Apply CSS variables
  useEffect(() => {
    const root = document.documentElement;

    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssKey = `--${key.replace(/\./g, '-')}`;
      if (value !== undefined) {
        root.style.setProperty(cssKey, value);
      }
    });

    // Set data attribute for conditional CSS
    root.setAttribute('data-theme', theme.type);
  }, [theme]);

  const value: ThemeContextValue = useMemo(() => ({
    theme,
    themeType: theme.type,
    availableThemes: themes,
    setTheme,
    registerTheme,
    getColor,
    isDark: theme.type === 'dark' || theme.type === 'hc-dark',
    isHighContrast: theme.type === 'hc-dark' || theme.type === 'hc-light',
  }), [theme, themes, setTheme, registerTheme, getColor]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
