/**
 * Aethel Engine - Theme Service
 * Complete theme management system with built-in themes and custom theme support
 */

import { EventEmitter } from 'events';
import type {
  IconTheme,
  ThemeDefinition,
  ThemeServiceEvents,
  ThemeType,
} from './theme-types';

export type {
  EditorColors,
  IconTheme,
  SyntaxColors,
  ThemeDefinition,
  ThemeServiceEvents,
  ThemeType,
  UIColors,
} from './theme-types';

// ============================================================================
// Built-in Themes
// ============================================================================

import {
  catppuccinLatte,
  catppuccinMocha,
  dracula,
  githubDark,
  oneDarkPro,
} from './theme-builtins';

// ============================================================================
// Theme Service Implementation
// ============================================================================

const STORAGE_KEY_THEME = 'aethel-engine-theme';
const STORAGE_KEY_ICON_THEME = 'aethel-engine-icon-theme';

export class ThemeService extends EventEmitter {
  private themes: Map<string, ThemeDefinition> = new Map();
  private currentTheme: ThemeDefinition;
  private currentIconTheme: IconTheme | null = null;
  private initialized: boolean = false;

  constructor() {
    super();
    this.registerBuiltInThemes();
    this.currentTheme = this.themes.get('catppuccin-mocha')!;
  }

  /**
   * Initialize the theme service
   */
  public initialize(): void {
    if (this.initialized) return;

    const savedThemeId = this.loadPreference(STORAGE_KEY_THEME);
    if (savedThemeId && this.themes.has(savedThemeId)) {
      this.currentTheme = this.themes.get(savedThemeId)!;
    }

    this.applyTheme(this.currentTheme);
    this.initialized = true;
  }

  /**
   * Register all built-in themes
   */
  private registerBuiltInThemes(): void {
    this.themes.set(catppuccinMocha.id, catppuccinMocha);
    this.themes.set(catppuccinLatte.id, catppuccinLatte);
    this.themes.set(oneDarkPro.id, oneDarkPro);
    this.themes.set(githubDark.id, githubDark);
    this.themes.set(dracula.id, dracula);
  }

  /**
   * Get all available themes
   */
  public getThemes(): ThemeDefinition[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get themes filtered by type
   */
  public getThemesByType(type: ThemeType): ThemeDefinition[] {
    return this.getThemes().filter(theme => theme.type === type);
  }

  /**
   * Get a theme by ID
   */
  public getTheme(id: string): ThemeDefinition | undefined {
    return this.themes.get(id);
  }

  /**
   * Get the current active theme
   */
  public getCurrentTheme(): ThemeDefinition {
    return this.currentTheme;
  }

  /**
   * Set the active theme
   */
  public setTheme(themeId: string): boolean {
    const theme = this.themes.get(themeId);
    if (!theme) {
      console.warn(`Theme "${themeId}" not found`);
      return false;
    }

    this.currentTheme = theme;
    this.applyTheme(theme);
    this.savePreference(STORAGE_KEY_THEME, themeId);
    this.emit('themeChanged', theme);
    return true;
  }

  /**
   * Register a custom theme
   */
  public registerTheme(theme: ThemeDefinition): void {
    if (this.themes.has(theme.id)) {
      console.warn(`Theme "${theme.id}" already exists, overwriting`);
    }
    this.themes.set(theme.id, theme);
    this.emit('themeAdded', theme);
  }

  /**
   * Remove a custom theme
   */
  public removeTheme(themeId: string): boolean {
    const builtInIds = ['catppuccin-mocha', 'catppuccin-latte', 'one-dark-pro', 'github-dark', 'dracula'];
    if (builtInIds.includes(themeId)) {
      console.warn('Cannot remove built-in themes');
      return false;
    }

    if (this.themes.delete(themeId)) {
      if (this.currentTheme.id === themeId) {
        this.setTheme('catppuccin-mocha');
      }
      this.emit('themeRemoved', themeId);
      return true;
    }
    return false;
  }

  /**
   * Apply theme to document
   */
  private applyTheme(theme: ThemeDefinition): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const { editor, syntax, ui } = theme.colors;

    // Apply editor colors
    root.style.setProperty('--editor-background', editor.background);
    root.style.setProperty('--editor-foreground', editor.foreground);
    root.style.setProperty('--editor-line-highlight', editor.lineHighlight);
    root.style.setProperty('--editor-selection', editor.selection);
    root.style.setProperty('--editor-selection-highlight', editor.selectionHighlight);
    root.style.setProperty('--editor-cursor', editor.cursor);
    root.style.setProperty('--editor-whitespace', editor.whitespace);
    root.style.setProperty('--editor-indent-guide', editor.indentGuide);
    root.style.setProperty('--editor-active-indent-guide', editor.activeIndentGuide);
    root.style.setProperty('--editor-matching-bracket', editor.matchingBracket);
    root.style.setProperty('--editor-gutter', editor.gutter);
    root.style.setProperty('--editor-line-number-foreground', editor.lineNumberForeground);
    root.style.setProperty('--editor-line-number-active-foreground', editor.lineNumberActiveForeground);
    root.style.setProperty('--editor-ruler-foreground', editor.rulerForeground);
    root.style.setProperty('--editor-find-match', editor.findMatch);
    root.style.setProperty('--editor-find-match-highlight', editor.findMatchHighlight);
    root.style.setProperty('--editor-word-highlight', editor.wordHighlight);
    root.style.setProperty('--editor-word-highlight-strong', editor.wordHighlightStrong);

    // Apply syntax colors
    root.style.setProperty('--syntax-keyword', syntax.keyword);
    root.style.setProperty('--syntax-string', syntax.string);
    root.style.setProperty('--syntax-number', syntax.number);
    root.style.setProperty('--syntax-comment', syntax.comment);
    root.style.setProperty('--syntax-function', syntax.function);
    root.style.setProperty('--syntax-variable', syntax.variable);
    root.style.setProperty('--syntax-type', syntax.type);
    root.style.setProperty('--syntax-operator', syntax.operator);
    root.style.setProperty('--syntax-punctuation', syntax.punctuation);
    root.style.setProperty('--syntax-constant', syntax.constant);
    root.style.setProperty('--syntax-class', syntax.class);
    root.style.setProperty('--syntax-parameter', syntax.parameter);
    root.style.setProperty('--syntax-property', syntax.property);
    root.style.setProperty('--syntax-tag', syntax.tag);
    root.style.setProperty('--syntax-attribute', syntax.attribute);
    root.style.setProperty('--syntax-regex', syntax.regex);
    root.style.setProperty('--syntax-escape', syntax.escape);
    root.style.setProperty('--syntax-invalid', syntax.invalid);

    // Apply UI colors
    root.style.setProperty('--ui-background', ui.background);
    root.style.setProperty('--ui-foreground', ui.foreground);
    root.style.setProperty('--ui-border', ui.border);
    root.style.setProperty('--ui-focus-border', ui.focusBorder);
    root.style.setProperty('--ui-shadow', ui.shadow);

    // Panel
    root.style.setProperty('--panel-background', ui.panelBackground);
    root.style.setProperty('--panel-border', ui.panelBorder);
    root.style.setProperty('--panel-foreground', ui.panelForeground);

    // Button
    root.style.setProperty('--button-background', ui.buttonBackground);
    root.style.setProperty('--button-foreground', ui.buttonForeground);
    root.style.setProperty('--button-hover-background', ui.buttonHoverBackground);
    root.style.setProperty('--button-secondary-background', ui.buttonSecondaryBackground);
    root.style.setProperty('--button-secondary-foreground', ui.buttonSecondaryForeground);
    root.style.setProperty('--button-secondary-hover-background', ui.buttonSecondaryHoverBackground);

    // Input
    root.style.setProperty('--input-background', ui.inputBackground);
    root.style.setProperty('--input-foreground', ui.inputForeground);
    root.style.setProperty('--input-border', ui.inputBorder);
    root.style.setProperty('--input-placeholder', ui.inputPlaceholder);
    root.style.setProperty('--input-active-background', ui.inputActiveBackground);
    root.style.setProperty('--input-active-border', ui.inputActiveBorder);

    // List
    root.style.setProperty('--list-active-selection-background', ui.listActiveSelectionBackground);
    root.style.setProperty('--list-active-selection-foreground', ui.listActiveSelectionForeground);
    root.style.setProperty('--list-hover-background', ui.listHoverBackground);
    root.style.setProperty('--list-hover-foreground', ui.listHoverForeground);
    root.style.setProperty('--list-inactive-selection-background', ui.listInactiveSelectionBackground);
    root.style.setProperty('--list-focus-background', ui.listFocusBackground);

    // Sidebar
    root.style.setProperty('--sidebar-background', ui.sideBarBackground);
    root.style.setProperty('--sidebar-foreground', ui.sideBarForeground);
    root.style.setProperty('--sidebar-border', ui.sideBarBorder);
    root.style.setProperty('--sidebar-section-header-background', ui.sideBarSectionHeaderBackground);
    root.style.setProperty('--sidebar-section-header-foreground', ui.sideBarSectionHeaderForeground);

    // Activity Bar
    root.style.setProperty('--activity-bar-background', ui.activityBarBackground);
    root.style.setProperty('--activity-bar-foreground', ui.activityBarForeground);
    root.style.setProperty('--activity-bar-inactive-foreground', ui.activityBarInactiveForeground);
    root.style.setProperty('--activity-bar-border', ui.activityBarBorder);
    root.style.setProperty('--activity-bar-badge-background', ui.activityBarBadgeBackground);
    root.style.setProperty('--activity-bar-badge-foreground', ui.activityBarBadgeForeground);

    // Status Bar
    root.style.setProperty('--status-bar-background', ui.statusBarBackground);
    root.style.setProperty('--status-bar-foreground', ui.statusBarForeground);
    root.style.setProperty('--status-bar-border', ui.statusBarBorder);
    root.style.setProperty('--status-bar-debugging-background', ui.statusBarDebuggingBackground);
    root.style.setProperty('--status-bar-no-folder-background', ui.statusBarNoFolderBackground);

    // Tab
    root.style.setProperty('--tab-active-background', ui.tabActiveBackground);
    root.style.setProperty('--tab-active-foreground', ui.tabActiveForeground);
    root.style.setProperty('--tab-inactive-background', ui.tabInactiveBackground);
    root.style.setProperty('--tab-inactive-foreground', ui.tabInactiveForeground);
    root.style.setProperty('--tab-border', ui.tabBorder);
    root.style.setProperty('--tab-active-border', ui.tabActiveBorder);
    root.style.setProperty('--tab-active-border-top', ui.tabActiveBorderTop);

    // Title Bar
    root.style.setProperty('--title-bar-active-background', ui.titleBarActiveBackground);
    root.style.setProperty('--title-bar-active-foreground', ui.titleBarActiveForeground);
    root.style.setProperty('--title-bar-inactive-background', ui.titleBarInactiveBackground);
    root.style.setProperty('--title-bar-inactive-foreground', ui.titleBarInactiveForeground);
    root.style.setProperty('--title-bar-border', ui.titleBarBorder);

    // Menu
    root.style.setProperty('--menu-background', ui.menuBackground);
    root.style.setProperty('--menu-foreground', ui.menuForeground);
    root.style.setProperty('--menu-border', ui.menuBorder);
    root.style.setProperty('--menu-selection-background', ui.menuSelectionBackground);
    root.style.setProperty('--menu-selection-foreground', ui.menuSelectionForeground);
    root.style.setProperty('--menu-separator', ui.menuSeparator);

    // Scrollbar
    root.style.setProperty('--scrollbar-slider-background', ui.scrollbarSliderBackground);
    root.style.setProperty('--scrollbar-slider-hover-background', ui.scrollbarSliderHoverBackground);
    root.style.setProperty('--scrollbar-slider-active-background', ui.scrollbarSliderActiveBackground);

    // Notification
    root.style.setProperty('--notification-background', ui.notificationBackground);
    root.style.setProperty('--notification-foreground', ui.notificationForeground);
    root.style.setProperty('--notification-border', ui.notificationBorder);

    // Semantic colors
    root.style.setProperty('--error-foreground', ui.errorForeground);
    root.style.setProperty('--error-background', ui.errorBackground);
    root.style.setProperty('--warning-foreground', ui.warningForeground);
    root.style.setProperty('--warning-background', ui.warningBackground);
    root.style.setProperty('--info-foreground', ui.infoForeground);
    root.style.setProperty('--info-background', ui.infoBackground);
    root.style.setProperty('--success-foreground', ui.successForeground);
    root.style.setProperty('--success-background', ui.successBackground);

    // Links
    root.style.setProperty('--link-foreground', ui.linkForeground);
    root.style.setProperty('--link-active-foreground', ui.linkActiveForeground);

    // Badge
    root.style.setProperty('--badge-background', ui.badgeBackground);
    root.style.setProperty('--badge-foreground', ui.badgeForeground);

    // Progress
    root.style.setProperty('--progress-bar-background', ui.progressBarBackground);

    // Set theme type attribute
    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-theme-type', theme.type);
  }

  /**
   * Set icon theme
   */
  public setIconTheme(iconTheme: IconTheme | null): void {
    this.currentIconTheme = iconTheme;
    if (iconTheme) {
      this.savePreference(STORAGE_KEY_ICON_THEME, iconTheme.id);
    } else {
      this.removePreference(STORAGE_KEY_ICON_THEME);
    }
    this.emit('iconThemeChanged', iconTheme);
  }

  /**
   * Get current icon theme
   */
  public getIconTheme(): IconTheme | null {
    return this.currentIconTheme;
  }

  /**
   * Get color value from current theme
   */
  public getColor(path: string): string | undefined {
    const parts = path.split('.');
    let value: unknown = this.currentTheme.colors;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Check if current theme is dark
   */
  public isDarkTheme(): boolean {
    return this.currentTheme.type === 'dark';
  }

  /**
   * Toggle between light and dark theme
   */
  public toggleThemeType(): void {
    const currentType = this.currentTheme.type;
    const targetType: ThemeType = currentType === 'dark' ? 'light' : 'dark';
    const themesOfType = this.getThemesByType(targetType);

    if (themesOfType.length > 0) {
      this.setTheme(themesOfType[0].id);
    }
  }

  /**
   * Export theme as JSON
   */
  public exportTheme(themeId: string): string | null {
    const theme = this.themes.get(themeId);
    if (!theme) return null;
    return JSON.stringify(theme, null, 2);
  }

  /**
   * Import theme from JSON
   */
  public importTheme(json: string): ThemeDefinition | null {
    try {
      const theme = JSON.parse(json) as ThemeDefinition;
      if (!this.validateTheme(theme)) {
        console.error('Invalid theme format');
        return null;
      }
      this.registerTheme(theme);
      return theme;
    } catch (error) {
      console.error('Failed to parse theme JSON:', error);
      return null;
    }
  }

  /**
   * Validate theme structure
   */
  private validateTheme(theme: unknown): theme is ThemeDefinition {
    if (!theme || typeof theme !== 'object') return false;
    const t = theme as Record<string, unknown>;
    
    return (
      typeof t.id === 'string' &&
      typeof t.name === 'string' &&
      (t.type === 'light' || t.type === 'dark') &&
      typeof t.colors === 'object' &&
      t.colors !== null
    );
  }

  /**
   * Save preference to localStorage
   */
  private savePreference(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn('Failed to save preference:', error);
      }
    }
  }

  /**
   * Load preference from localStorage
   */
  private loadPreference(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('Failed to load preference:', error);
      }
    }
    return null;
  }

  /**
   * Remove preference from localStorage
   */
  private removePreference(key: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Failed to remove preference:', error);
      }
    }
  }

  /**
   * Dispose the service
   */
  public dispose(): void {
    this.removeAllListeners();
    this.themes.clear();
    this.initialized = false;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const themeService = new ThemeService();

export default themeService;
