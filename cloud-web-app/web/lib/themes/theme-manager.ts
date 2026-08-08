import {createComponentLogger, logger} from '@/lib/observability/logger'
import { cssVarRef, resolveCssColor } from '@/lib/design-system/resolveCssColor'
import {
  getIconThemePreferenceId,
  getThemePreferenceId,
  setIconThemePreferenceId,
  setThemePreferenceId,
} from '@/lib/storage/ui-persistence-spine'

const log = createComponentLogger('themes/theme-manager')


/**
 * Theme Manager
 * Manages color themes, icon themes, and theme customization
 */

export interface ColorTheme {
  id: string;
  name: string;
  type: 'dark' | 'light' | 'high-contrast';
  colors: {
    // Editor colors
    'editor.background': string;
    'editor.foreground': string;
    'editor.lineHighlightBackground': string;
    'editor.selectionBackground': string;
    'editorCursor.foreground': string;
    'editorLineNumber.foreground': string;
    'editorLineNumber.activeForeground': string;
    
    // Sidebar colors
    'sideBar.background': string;
    'sideBar.foreground': string;
    'sideBar.border': string;
    
    // Activity bar colors
    'activityBar.background': string;
    'activityBar.foreground': string;
    'activityBar.activeBorder': string;
    
    // Status bar colors
    'statusBar.background': string;
    'statusBar.foreground': string;
    'statusBar.debuggingBackground': string;
    
    // Panel colors
    'panel.background': string;
    'panel.border': string;
    
    // Terminal colors
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
    
    // Syntax colors
    'syntax.keyword': string;
    'syntax.string': string;
    'syntax.number': string;
    'syntax.comment': string;
    'syntax.function': string;
    'syntax.variable': string;
    'syntax.type': string;
    'syntax.operator': string;
  };
}

export interface IconTheme {
  id: string;
  name: string;
  icons: Record<string, string>;
}

const THEME_COLOR_KEYS: Array<keyof ColorTheme['colors']> = [
  'editor.background',
  'editor.foreground',
  'editor.lineHighlightBackground',
  'editor.selectionBackground',
  'editorCursor.foreground',
  'editorLineNumber.foreground',
  'editorLineNumber.activeForeground',
  'sideBar.background',
  'sideBar.foreground',
  'sideBar.border',
  'activityBar.background',
  'activityBar.foreground',
  'activityBar.activeBorder',
  'statusBar.background',
  'statusBar.foreground',
  'statusBar.debuggingBackground',
  'panel.background',
  'panel.border',
  'terminal.background',
  'terminal.foreground',
  'terminal.ansiBlack',
  'terminal.ansiRed',
  'terminal.ansiGreen',
  'terminal.ansiYellow',
  'terminal.ansiBlue',
  'terminal.ansiMagenta',
  'terminal.ansiCyan',
  'terminal.ansiWhite',
  'syntax.keyword',
  'syntax.string',
  'syntax.number',
  'syntax.comment',
  'syntax.function',
  'syntax.variable',
  'syntax.type',
  'syntax.operator',
];

/** Map workbench color id → CSS custom property under `--aethel-theme-<id>-*`. */
function themeCssVar(themeId: string, colorKey: keyof ColorTheme['colors']): string {
  return cssVarRef(`--aethel-theme-${themeId}-${colorKey.replace(/\./g, '-')}`);
}

function buildBuiltinTheme(
  id: string,
  name: string,
  type: ColorTheme['type'],
): ColorTheme {
  const colors = {} as ColorTheme['colors'];
  for (const key of THEME_COLOR_KEYS) {
    colors[key] = themeCssVar(id, key);
  }
  return { id, name, type, colors };
}

/** Builtin catalogs — concrete hex lives in globals.css `--aethel-theme-*`. */
const BUILTIN_THEMES: ColorTheme[] = [
  buildBuiltinTheme('dark-plus', 'Dark+', 'dark'),
  buildBuiltinTheme('light-plus', 'Light+', 'light'),
  buildBuiltinTheme('high-contrast', 'High Contrast', 'high-contrast'),
];

const BUILTIN_ICON_THEMES: IconTheme[] = [
  {
    id: 'vs-seti',
    name: 'Seti (Visual Studio Code)',
    icons: {
      'file': 'FILE',
      'folder': 'DIR',
      'folder-open': 'DIR',
      'typescript': 'TS',
      'javascript': 'JS',
      'python': 'PY',
      'go': 'GO',
      'rust': 'RS',
      'java': 'JAVA',
      'csharp': 'CS',
      'cpp': 'CPP',
      'json': '{}',
      'markdown': 'MD',
      'html': 'HTML',
      'css': 'CSS',
      'git': 'GIT',
    },
  },
  {
    id: 'vs-minimal',
    name: 'Minimal (Visual Studio Code)',
    icons: {
      'file': 'FILE',
      'folder': 'DIR',
      'folder-open': 'DIR',
    },
  },
];

export class ThemeManager {
  private currentTheme: ColorTheme;
  private currentIconTheme: IconTheme;
  private customThemes: Map<string, ColorTheme> = new Map();
  private customIconThemes: Map<string, IconTheme> = new Map();
  private readonly STORAGE_KEY_THEME = 'current-theme';
  private readonly STORAGE_KEY_ICON_THEME = 'current-icon-theme';
  private readonly STORAGE_KEY_CUSTOM_THEMES = 'custom-themes';

  constructor() {
    this.currentTheme = BUILTIN_THEMES[0];
    this.currentIconTheme = BUILTIN_ICON_THEMES[0];
    this.loadThemes();
    this.loadCurrentTheme();
    this.applyTheme();
  }

  /**
   * Get all available themes
   */
  getThemes(): ColorTheme[] {
    return [...BUILTIN_THEMES, ...Array.from(this.customThemes.values())];
  }

  /**
   * Get all available icon themes
   */
  getIconThemes(): IconTheme[] {
    return [...BUILTIN_ICON_THEMES, ...Array.from(this.customIconThemes.values())];
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): ColorTheme {
    return this.currentTheme;
  }

  /**
   * Get current icon theme
   */
  getCurrentIconTheme(): IconTheme {
    return this.currentIconTheme;
  }

  /**
   * Set theme
   */
  setTheme(themeId: string): void {
    const theme = this.getThemes().find(t => t.id === themeId);
    if (theme) {
      this.currentTheme = theme;
      this.saveCurrentTheme();
      this.applyTheme();
      log.info(`[Theme Manager] Applied theme: ${theme.name}`);
    }
  }

  /**
   * Set icon theme
   */
  setIconTheme(themeId: string): void {
    const theme = this.getIconThemes().find(t => t.id === themeId);
    if (theme) {
      this.currentIconTheme = theme;
      this.saveCurrentIconTheme();
      log.info(`[Theme Manager] Applied icon theme: ${theme.name}`);
    }
  }

  /**
   * Create custom theme
   */
  createCustomTheme(theme: ColorTheme): void {
    this.customThemes.set(theme.id, theme);
    this.saveCustomThemes();
    log.info(`[Theme Manager] Created custom theme: ${theme.name}`);
  }

  /**
   * Update custom theme
   */
  updateCustomTheme(themeId: string, updates: Partial<ColorTheme>): void {
    const theme = this.customThemes.get(themeId);
    if (theme) {
      const updated = { ...theme, ...updates };
      this.customThemes.set(themeId, updated);
      this.saveCustomThemes();
      
      if (this.currentTheme.id === themeId) {
        this.currentTheme = updated;
        this.applyTheme();
      }
      
      log.info(`[Theme Manager] Updated custom theme: ${themeId}`);
    }
  }

  /**
   * Delete custom theme
   */
  deleteCustomTheme(themeId: string): void {
    this.customThemes.delete(themeId);
    this.saveCustomThemes();
    
    if (this.currentTheme.id === themeId) {
      this.setTheme(BUILTIN_THEMES[0].id);
    }
    
    log.info(`[Theme Manager] Deleted custom theme: ${themeId}`);
  }

  /**
   * Export theme
   */
  exportTheme(themeId: string): string {
    const theme = this.getThemes().find(t => t.id === themeId);
    if (theme) {
      return JSON.stringify(theme, null, 2);
    }
    return '';
  }

  /**
   * Import theme
   */
  importTheme(json: string): void {
    try {
      const theme = JSON.parse(json) as ColorTheme;
      this.createCustomTheme(theme);
    } catch (error) {
      logger.error('[Theme Manager] Failed to import theme:', error);
      throw error;
    }
  }

  /**
   * Customize color
   */
  customizeColor(colorKey: keyof ColorTheme['colors'], value: string): void {
    if (!this.currentTheme.id.startsWith('custom-')) {
      // Create custom theme based on current
      const customTheme: ColorTheme = {
        ...this.currentTheme,
        id: `custom-${Date.now()}`,
        name: `${this.currentTheme.name} (Custom)`,
      };
      this.createCustomTheme(customTheme);
      this.setTheme(customTheme.id);
    }

    this.currentTheme.colors[colorKey] = value;
    this.updateCustomTheme(this.currentTheme.id, this.currentTheme);
  }

  /**
   * Apply theme to DOM
   */
  private applyTheme(): void {
    const root = document.documentElement;
    const colors = this.currentTheme.colors;
    const paint = (value: string) => resolveCssColor(value);

    // Apply CSS variables (resolve var(--aethel-theme-*) catalogs to concrete paint values)
    root.style.setProperty('--editor-bg', paint(colors['editor.background']));
    root.style.setProperty('--editor-fg', paint(colors['editor.foreground']));
    root.style.setProperty('--editor-line-highlight', paint(colors['editor.lineHighlightBackground']));
    root.style.setProperty('--editor-selection', paint(colors['editor.selectionBackground']));
    root.style.setProperty('--editor-cursor', paint(colors['editorCursor.foreground']));
    
    root.style.setProperty('--sidebar-bg', paint(colors['sideBar.background']));
    root.style.setProperty('--sidebar-fg', paint(colors['sideBar.foreground']));
    root.style.setProperty('--sidebar-border', paint(colors['sideBar.border']));
    
    root.style.setProperty('--activitybar-bg', paint(colors['activityBar.background']));
    root.style.setProperty('--activitybar-fg', paint(colors['activityBar.foreground']));
    
    root.style.setProperty('--statusbar-bg', paint(colors['statusBar.background']));
    root.style.setProperty('--statusbar-fg', paint(colors['statusBar.foreground']));
    
    root.style.setProperty('--panel-bg', paint(colors['panel.background']));
    root.style.setProperty('--panel-border', paint(colors['panel.border']));
    
    root.style.setProperty('--terminal-bg', paint(colors['terminal.background']));
    root.style.setProperty('--terminal-fg', paint(colors['terminal.foreground']));

    // Set theme type class
    root.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');
    root.classList.add(`theme-${this.currentTheme.type}`);
  }

  /**
   * Load themes from storage
   */
  private loadThemes(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_CUSTOM_THEMES);
      if (stored) {
        const themes = JSON.parse(stored) as ColorTheme[];
        themes.forEach(theme => {
          this.customThemes.set(theme.id, theme);
        });
        log.info(`[Theme Manager] Loaded ${themes.length} custom themes`);
      }
    } catch (error) {
      logger.error('[Theme Manager] Failed to load custom themes:', error);
    }
  }

  /**
   * Save custom themes
   */
  private saveCustomThemes(): void {
    try {
      const themes = Array.from(this.customThemes.values());
      localStorage.setItem(this.STORAGE_KEY_CUSTOM_THEMES, JSON.stringify(themes));
    } catch (error) {
      logger.error('[Theme Manager] Failed to save custom themes:', error);
    }
  }

  /**
   * Load current theme
   */
  private loadCurrentTheme(): void {
    try {
      // CW4: theme id via spine (legacy key mirrored). Never store secrets here.
      const themeId = getThemePreferenceId() ?? localStorage.getItem(this.STORAGE_KEY_THEME);
      if (themeId) {
        const theme = this.getThemes().find(t => t.id === themeId);
        if (theme) {
          this.currentTheme = theme;
        }
      }

      const iconThemeId =
        getIconThemePreferenceId() ?? localStorage.getItem(this.STORAGE_KEY_ICON_THEME);
      if (iconThemeId) {
        const iconTheme = this.getIconThemes().find(t => t.id === iconThemeId);
        if (iconTheme) {
          this.currentIconTheme = iconTheme;
        }
      }
    } catch (error) {
      logger.error('[Theme Manager] Failed to load current theme:', error);
    }
  }

  /**
   * Save current theme
   */
  private saveCurrentTheme(): void {
    try {
      setThemePreferenceId(this.currentTheme.id);
    } catch (error) {
      logger.error('[Theme Manager] Failed to save current theme:', error);
    }
  }

  /**
   * Save current icon theme
   */
  private saveCurrentIconTheme(): void {
    try {
      setIconThemePreferenceId(this.currentIconTheme.id);
    } catch (error) {
      logger.error('[Theme Manager] Failed to save current icon theme:', error);
    }
  }

  /**
   * Get icon for file
   */
  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'cs': 'csharp',
      'cpp': 'cpp',
      'c': 'cpp',
      'h': 'cpp',
      'json': 'json',
      'md': 'markdown',
      'html': 'html',
      'css': 'css',
    };

    const iconKey = iconMap[ext || ''] || 'file';
    return this.currentIconTheme.icons[iconKey] || this.currentIconTheme.icons['file'] || 'FILE';
  }

  /**
   * Get folder icon
   */
  getFolderIcon(isOpen: boolean = false): string {
    const key = isOpen ? 'folder-open' : 'folder';
    return this.currentIconTheme.icons[key] || 'DIR';
  }
}

// Singleton instance
let themeManagerInstance: ThemeManager | null = null;

export function getThemeManager(): ThemeManager {
  if (!themeManagerInstance) {
    themeManagerInstance = new ThemeManager();
  }
  return themeManagerInstance;
}
