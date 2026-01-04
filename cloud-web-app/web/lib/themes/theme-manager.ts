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

const BUILTIN_THEMES: ColorTheme[] = [
  {
    id: 'dark-plus',
    name: 'Dark+',
    type: 'dark',
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2a2a',
      'editor.selectionBackground': '#264f78',
      'editorCursor.foreground': '#aeafad',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'sideBar.background': '#252526',
      'sideBar.foreground': '#cccccc',
      'sideBar.border': '#2b2b2b',
      'activityBar.background': '#333333',
      'activityBar.foreground': '#ffffff',
      'activityBar.activeBorder': '#007acc',
      'statusBar.background': '#007acc',
      'statusBar.foreground': '#ffffff',
      'statusBar.debuggingBackground': '#cc6633',
      'panel.background': '#1e1e1e',
      'panel.border': '#2b2b2b',
      'terminal.background': '#1e1e1e',
      'terminal.foreground': '#cccccc',
      'terminal.ansiBlack': '#000000',
      'terminal.ansiRed': '#cd3131',
      'terminal.ansiGreen': '#0dbc79',
      'terminal.ansiYellow': '#e5e510',
      'terminal.ansiBlue': '#2472c8',
      'terminal.ansiMagenta': '#bc3fbc',
      'terminal.ansiCyan': '#11a8cd',
      'terminal.ansiWhite': '#e5e5e5',
      'syntax.keyword': '#569cd6',
      'syntax.string': '#ce9178',
      'syntax.number': '#b5cea8',
      'syntax.comment': '#6a9955',
      'syntax.function': '#dcdcaa',
      'syntax.variable': '#9cdcfe',
      'syntax.type': '#4ec9b0',
      'syntax.operator': '#d4d4d4',
    },
  },
  {
    id: 'light-plus',
    name: 'Light+',
    type: 'light',
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#000000',
      'editor.lineHighlightBackground': '#f0f0f0',
      'editor.selectionBackground': '#add6ff',
      'editorCursor.foreground': '#000000',
      'editorLineNumber.foreground': '#237893',
      'editorLineNumber.activeForeground': '#0b216f',
      'sideBar.background': '#f3f3f3',
      'sideBar.foreground': '#383838',
      'sideBar.border': '#e5e5e5',
      'activityBar.background': '#2c2c2c',
      'activityBar.foreground': '#ffffff',
      'activityBar.activeBorder': '#007acc',
      'statusBar.background': '#007acc',
      'statusBar.foreground': '#ffffff',
      'statusBar.debuggingBackground': '#cc6633',
      'panel.background': '#ffffff',
      'panel.border': '#e5e5e5',
      'terminal.background': '#ffffff',
      'terminal.foreground': '#333333',
      'terminal.ansiBlack': '#000000',
      'terminal.ansiRed': '#cd3131',
      'terminal.ansiGreen': '#00bc00',
      'terminal.ansiYellow': '#949800',
      'terminal.ansiBlue': '#0451a5',
      'terminal.ansiMagenta': '#bc05bc',
      'terminal.ansiCyan': '#0598bc',
      'terminal.ansiWhite': '#555555',
      'syntax.keyword': '#0000ff',
      'syntax.string': '#a31515',
      'syntax.number': '#098658',
      'syntax.comment': '#008000',
      'syntax.function': '#795e26',
      'syntax.variable': '#001080',
      'syntax.type': '#267f99',
      'syntax.operator': '#000000',
    },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    type: 'high-contrast',
    colors: {
      'editor.background': '#000000',
      'editor.foreground': '#ffffff',
      'editor.lineHighlightBackground': '#1a1a1a',
      'editor.selectionBackground': '#ffffff33',
      'editorCursor.foreground': '#ffff00',
      'editorLineNumber.foreground': '#ffffff',
      'editorLineNumber.activeForeground': '#ffff00',
      'sideBar.background': '#000000',
      'sideBar.foreground': '#ffffff',
      'sideBar.border': '#6fc3df',
      'activityBar.background': '#000000',
      'activityBar.foreground': '#ffffff',
      'activityBar.activeBorder': '#ffff00',
      'statusBar.background': '#000000',
      'statusBar.foreground': '#ffffff',
      'statusBar.debuggingBackground': '#ff0000',
      'panel.background': '#000000',
      'panel.border': '#6fc3df',
      'terminal.background': '#000000',
      'terminal.foreground': '#ffffff',
      'terminal.ansiBlack': '#000000',
      'terminal.ansiRed': '#ff0000',
      'terminal.ansiGreen': '#00ff00',
      'terminal.ansiYellow': '#ffff00',
      'terminal.ansiBlue': '#0000ff',
      'terminal.ansiMagenta': '#ff00ff',
      'terminal.ansiCyan': '#00ffff',
      'terminal.ansiWhite': '#ffffff',
      'syntax.keyword': '#00ffff',
      'syntax.string': '#00ff00',
      'syntax.number': '#00ff00',
      'syntax.comment': '#7ca668',
      'syntax.function': '#ffff00',
      'syntax.variable': '#ffffff',
      'syntax.type': '#00ffff',
      'syntax.operator': '#ffffff',
    },
  },
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
      console.log(`[Theme Manager] Applied theme: ${theme.name}`);
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
      console.log(`[Theme Manager] Applied icon theme: ${theme.name}`);
    }
  }

  /**
   * Create custom theme
   */
  createCustomTheme(theme: ColorTheme): void {
    this.customThemes.set(theme.id, theme);
    this.saveCustomThemes();
    console.log(`[Theme Manager] Created custom theme: ${theme.name}`);
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
      
      console.log(`[Theme Manager] Updated custom theme: ${themeId}`);
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
    
    console.log(`[Theme Manager] Deleted custom theme: ${themeId}`);
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
      console.error('[Theme Manager] Failed to import theme:', error);
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

    // Apply CSS variables
    root.style.setProperty('--editor-bg', colors['editor.background']);
    root.style.setProperty('--editor-fg', colors['editor.foreground']);
    root.style.setProperty('--editor-line-highlight', colors['editor.lineHighlightBackground']);
    root.style.setProperty('--editor-selection', colors['editor.selectionBackground']);
    root.style.setProperty('--editor-cursor', colors['editorCursor.foreground']);
    
    root.style.setProperty('--sidebar-bg', colors['sideBar.background']);
    root.style.setProperty('--sidebar-fg', colors['sideBar.foreground']);
    root.style.setProperty('--sidebar-border', colors['sideBar.border']);
    
    root.style.setProperty('--activitybar-bg', colors['activityBar.background']);
    root.style.setProperty('--activitybar-fg', colors['activityBar.foreground']);
    
    root.style.setProperty('--statusbar-bg', colors['statusBar.background']);
    root.style.setProperty('--statusbar-fg', colors['statusBar.foreground']);
    
    root.style.setProperty('--panel-bg', colors['panel.background']);
    root.style.setProperty('--panel-border', colors['panel.border']);
    
    root.style.setProperty('--terminal-bg', colors['terminal.background']);
    root.style.setProperty('--terminal-fg', colors['terminal.foreground']);

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
        console.log(`[Theme Manager] Loaded ${themes.length} custom themes`);
      }
    } catch (error) {
      console.error('[Theme Manager] Failed to load custom themes:', error);
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
      console.error('[Theme Manager] Failed to save custom themes:', error);
    }
  }

  /**
   * Load current theme
   */
  private loadCurrentTheme(): void {
    try {
      const themeId = localStorage.getItem(this.STORAGE_KEY_THEME);
      if (themeId) {
        const theme = this.getThemes().find(t => t.id === themeId);
        if (theme) {
          this.currentTheme = theme;
        }
      }

      const iconThemeId = localStorage.getItem(this.STORAGE_KEY_ICON_THEME);
      if (iconThemeId) {
        const iconTheme = this.getIconThemes().find(t => t.id === iconThemeId);
        if (iconTheme) {
          this.currentIconTheme = iconTheme;
        }
      }
    } catch (error) {
      console.error('[Theme Manager] Failed to load current theme:', error);
    }
  }

  /**
   * Save current theme
   */
  private saveCurrentTheme(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_THEME, this.currentTheme.id);
    } catch (error) {
      console.error('[Theme Manager] Failed to save current theme:', error);
    }
  }

  /**
   * Save current icon theme
   */
  private saveCurrentIconTheme(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_ICON_THEME, this.currentIconTheme.id);
    } catch (error) {
      console.error('[Theme Manager] Failed to save current icon theme:', error);
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
