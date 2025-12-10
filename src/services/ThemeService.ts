import { EventBus } from './EventBus';
import { StorageService } from './StorageService';

export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light' | 'high-contrast';
  colors: ThemeColors;
}

export interface ThemeColors {
  // Editor colors
  'editor.background': string;
  'editor.foreground': string;
  'editor.lineHighlightBackground': string;
  'editor.selectionBackground': string;
  'editor.inactiveSelectionBackground': string;
  'editor.findMatchBackground': string;
  'editor.findMatchHighlightBackground': string;
  'editor.hoverHighlightBackground': string;
  'editorLineNumber.foreground': string;
  'editorLineNumber.activeForeground': string;
  'editorCursor.foreground': string;
  'editorWhitespace.foreground': string;
  'editorIndentGuide.background': string;
  'editorIndentGuide.activeBackground': string;

  // Sidebar colors
  'sideBar.background': string;
  'sideBar.foreground': string;
  'sideBar.border': string;
  'sideBarTitle.foreground': string;
  'sideBarSectionHeader.background': string;
  'sideBarSectionHeader.foreground': string;

  // Activity Bar colors
  'activityBar.background': string;
  'activityBar.foreground': string;
  'activityBar.inactiveForeground': string;
  'activityBar.border': string;
  'activityBarBadge.background': string;
  'activityBarBadge.foreground': string;

  // Panel colors
  'panel.background': string;
  'panel.border': string;
  'panelTitle.activeBorder': string;
  'panelTitle.activeForeground': string;
  'panelTitle.inactiveForeground': string;

  // Status Bar colors
  'statusBar.background': string;
  'statusBar.foreground': string;
  'statusBar.border': string;
  'statusBar.debuggingBackground': string;
  'statusBar.debuggingForeground': string;
  'statusBar.noFolderBackground': string;

  // Tab colors
  'tab.activeBackground': string;
  'tab.activeForeground': string;
  'tab.inactiveBackground': string;
  'tab.inactiveForeground': string;
  'tab.border': string;
  'tab.activeBorder': string;
  'tab.hoverBackground': string;
  'editorGroupHeader.tabsBackground': string;
  'editorGroupHeader.tabsBorder': string;

  // Input colors
  'input.background': string;
  'input.foreground': string;
  'input.border': string;
  'input.placeholderForeground': string;
  'inputOption.activeBorder': string;
  'inputValidation.errorBackground': string;
  'inputValidation.errorBorder': string;

  // Button colors
  'button.background': string;
  'button.foreground': string;
  'button.hoverBackground': string;
  'button.secondaryBackground': string;
  'button.secondaryForeground': string;
  'button.secondaryHoverBackground': string;

  // List colors
  'list.activeSelectionBackground': string;
  'list.activeSelectionForeground': string;
  'list.inactiveSelectionBackground': string;
  'list.hoverBackground': string;
  'list.focusBackground': string;
  'list.highlightForeground': string;

  // Diff colors
  'diffEditor.insertedTextBackground': string;
  'diffEditor.removedTextBackground': string;
  'diffEditor.border': string;

  // Git decoration colors
  'gitDecoration.modifiedResourceForeground': string;
  'gitDecoration.deletedResourceForeground': string;
  'gitDecoration.untrackedResourceForeground': string;
  'gitDecoration.addedResourceForeground': string;
  'gitDecoration.conflictingResourceForeground': string;

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
  'terminal.ansiBrightBlack': string;
  'terminal.ansiBrightRed': string;
  'terminal.ansiBrightGreen': string;
  'terminal.ansiBrightYellow': string;
  'terminal.ansiBrightBlue': string;
  'terminal.ansiBrightMagenta': string;
  'terminal.ansiBrightCyan': string;
  'terminal.ansiBrightWhite': string;

  // Other colors
  'focusBorder': string;
  'foreground': string;
  'descriptionForeground': string;
  'errorForeground': string;
  'widget.shadow': string;
  'scrollbar.shadow': string;
  'scrollbarSlider.background': string;
  'scrollbarSlider.hoverBackground': string;
  'scrollbarSlider.activeBackground': string;
  'badge.background': string;
  'badge.foreground': string;
  'progressBar.background': string;
}

export class ThemeService {
  private static instance: ThemeService;
  private currentTheme: Theme;
  private themes: Map<string, Theme>;
  private eventBus: EventBus;
  private storageService: StorageService;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.storageService = StorageService.getInstance();
    this.themes = new Map();
    this.initializeDefaultThemes();
    this.currentTheme = this.themes.get('dark')!;
    this.loadTheme();
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private initializeDefaultThemes(): void {
    // Dark Theme
    this.themes.set('dark', {
      id: 'dark',
      name: 'Dark',
      type: 'dark',
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2a2a2a',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editor.findMatchBackground': '#515c6a',
        'editor.findMatchHighlightBackground': '#ea5c0055',
        'editor.hoverHighlightBackground': '#264f7880',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editorCursor.foreground': '#aeafad',
        'editorWhitespace.foreground': '#3b3a32',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'sideBar.background': '#252526',
        'sideBar.foreground': '#cccccc',
        'sideBar.border': '#2d2d30',
        'sideBarTitle.foreground': '#bbbbbb',
        'sideBarSectionHeader.background': '#2d2d30',
        'sideBarSectionHeader.foreground': '#cccccc',
        'activityBar.background': '#333333',
        'activityBar.foreground': '#ffffff',
        'activityBar.inactiveForeground': '#999999',
        'activityBar.border': '#2d2d30',
        'activityBarBadge.background': '#007acc',
        'activityBarBadge.foreground': '#ffffff',
        'panel.background': '#1e1e1e',
        'panel.border': '#2d2d30',
        'panelTitle.activeBorder': '#007acc',
        'panelTitle.activeForeground': '#e7e7e7',
        'panelTitle.inactiveForeground': '#969696',
        'statusBar.background': '#007acc',
        'statusBar.foreground': '#ffffff',
        'statusBar.border': '#007acc',
        'statusBar.debuggingBackground': '#cc6633',
        'statusBar.debuggingForeground': '#ffffff',
        'statusBar.noFolderBackground': '#68217a',
        'tab.activeBackground': '#1e1e1e',
        'tab.activeForeground': '#ffffff',
        'tab.inactiveBackground': '#2d2d2d',
        'tab.inactiveForeground': '#969696',
        'tab.border': '#2d2d30',
        'tab.activeBorder': '#007acc',
        'tab.hoverBackground': '#2d2d2d',
        'editorGroupHeader.tabsBackground': '#252526',
        'editorGroupHeader.tabsBorder': '#2d2d30',
        'input.background': '#3c3c3c',
        'input.foreground': '#cccccc',
        'input.border': '#3c3c3c',
        'input.placeholderForeground': '#a6a6a6',
        'inputOption.activeBorder': '#007acc',
        'inputValidation.errorBackground': '#5a1d1d',
        'inputValidation.errorBorder': '#be1100',
        'button.background': '#0e639c',
        'button.foreground': '#ffffff',
        'button.hoverBackground': '#1177bb',
        'button.secondaryBackground': '#3a3d41',
        'button.secondaryForeground': '#cccccc',
        'button.secondaryHoverBackground': '#45494e',
        'list.activeSelectionBackground': '#094771',
        'list.activeSelectionForeground': '#ffffff',
        'list.inactiveSelectionBackground': '#37373d',
        'list.hoverBackground': '#2a2d2e',
        'list.focusBackground': '#062f4a',
        'list.highlightForeground': '#0097fb',
        'diffEditor.insertedTextBackground': '#9bb95533',
        'diffEditor.removedTextBackground': '#ff000033',
        'diffEditor.border': '#454545',
        'gitDecoration.modifiedResourceForeground': '#e2c08d',
        'gitDecoration.deletedResourceForeground': '#c74e39',
        'gitDecoration.untrackedResourceForeground': '#73c991',
        'gitDecoration.addedResourceForeground': '#81b88b',
        'gitDecoration.conflictingResourceForeground': '#e4676b',
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
        'terminal.ansiBrightBlack': '#666666',
        'terminal.ansiBrightRed': '#f14c4c',
        'terminal.ansiBrightGreen': '#23d18b',
        'terminal.ansiBrightYellow': '#f5f543',
        'terminal.ansiBrightBlue': '#3b8eea',
        'terminal.ansiBrightMagenta': '#d670d6',
        'terminal.ansiBrightCyan': '#29b8db',
        'terminal.ansiBrightWhite': '#e5e5e5',
        'focusBorder': '#007acc',
        'foreground': '#cccccc',
        'descriptionForeground': '#969696',
        'errorForeground': '#f48771',
        'widget.shadow': '#00000059',
        'scrollbar.shadow': '#000000',
        'scrollbarSlider.background': '#79797966',
        'scrollbarSlider.hoverBackground': '#646464b3',
        'scrollbarSlider.activeBackground': '#bfbfbf66',
        'badge.background': '#4d4d4d',
        'badge.foreground': '#ffffff',
        'progressBar.background': '#0e70c0'
      }
    });

    // Light Theme
    this.themes.set('light', {
      id: 'light',
      name: 'Light',
      type: 'light',
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editor.lineHighlightBackground': '#f0f0f0',
        'editor.selectionBackground': '#add6ff',
        'editor.inactiveSelectionBackground': '#e5ebf1',
        'editor.findMatchBackground': '#a8ac94',
        'editor.findMatchHighlightBackground': '#ea5c0055',
        'editor.hoverHighlightBackground': '#add6ff80',
        'editorLineNumber.foreground': '#237893',
        'editorLineNumber.activeForeground': '#0b216f',
        'editorCursor.foreground': '#000000',
        'editorWhitespace.foreground': '#33333333',
        'editorIndentGuide.background': '#d3d3d3',
        'editorIndentGuide.activeBackground': '#939393',
        'sideBar.background': '#f3f3f3',
        'sideBar.foreground': '#000000',
        'sideBar.border': '#e7e7e7',
        'sideBarTitle.foreground': '#6f6f6f',
        'sideBarSectionHeader.background': '#e7e7e7',
        'sideBarSectionHeader.foreground': '#000000',
        'activityBar.background': '#2c2c2c',
        'activityBar.foreground': '#ffffff',
        'activityBar.inactiveForeground': '#999999',
        'activityBar.border': '#2c2c2c',
        'activityBarBadge.background': '#007acc',
        'activityBarBadge.foreground': '#ffffff',
        'panel.background': '#ffffff',
        'panel.border': '#e7e7e7',
        'panelTitle.activeBorder': '#007acc',
        'panelTitle.activeForeground': '#424242',
        'panelTitle.inactiveForeground': '#6c6c6c',
        'statusBar.background': '#007acc',
        'statusBar.foreground': '#ffffff',
        'statusBar.border': '#007acc',
        'statusBar.debuggingBackground': '#cc6633',
        'statusBar.debuggingForeground': '#ffffff',
        'statusBar.noFolderBackground': '#68217a',
        'tab.activeBackground': '#ffffff',
        'tab.activeForeground': '#000000',
        'tab.inactiveBackground': '#ececec',
        'tab.inactiveForeground': '#6c6c6c',
        'tab.border': '#e7e7e7',
        'tab.activeBorder': '#007acc',
        'tab.hoverBackground': '#ececec',
        'editorGroupHeader.tabsBackground': '#f3f3f3',
        'editorGroupHeader.tabsBorder': '#e7e7e7',
        'input.background': '#ffffff',
        'input.foreground': '#000000',
        'input.border': '#cecece',
        'input.placeholderForeground': '#767676',
        'inputOption.activeBorder': '#007acc',
        'inputValidation.errorBackground': '#ffeaea',
        'inputValidation.errorBorder': '#be1100',
        'button.background': '#007acc',
        'button.foreground': '#ffffff',
        'button.hoverBackground': '#0062a3',
        'button.secondaryBackground': '#e7e7e7',
        'button.secondaryForeground': '#000000',
        'button.secondaryHoverBackground': '#d7d7d7',
        'list.activeSelectionBackground': '#0060c0',
        'list.activeSelectionForeground': '#ffffff',
        'list.inactiveSelectionBackground': '#e4e6f1',
        'list.hoverBackground': '#e8e8e8',
        'list.focusBackground': '#d6ebff',
        'list.highlightForeground': '#0066bf',
        'diffEditor.insertedTextBackground': '#9bb95533',
        'diffEditor.removedTextBackground': '#ff000033',
        'diffEditor.border': '#cecece',
        'gitDecoration.modifiedResourceForeground': '#895503',
        'gitDecoration.deletedResourceForeground': '#ad0707',
        'gitDecoration.untrackedResourceForeground': '#007100',
        'gitDecoration.addedResourceForeground': '#587c0c',
        'gitDecoration.conflictingResourceForeground': '#ad0707',
        'terminal.background': '#ffffff',
        'terminal.foreground': '#000000',
        'terminal.ansiBlack': '#000000',
        'terminal.ansiRed': '#cd3131',
        'terminal.ansiGreen': '#00bc00',
        'terminal.ansiYellow': '#949800',
        'terminal.ansiBlue': '#0451a5',
        'terminal.ansiMagenta': '#bc05bc',
        'terminal.ansiCyan': '#0598bc',
        'terminal.ansiWhite': '#555555',
        'terminal.ansiBrightBlack': '#666666',
        'terminal.ansiBrightRed': '#cd3131',
        'terminal.ansiBrightGreen': '#00bc00',
        'terminal.ansiBrightYellow': '#949800',
        'terminal.ansiBrightBlue': '#0451a5',
        'terminal.ansiBrightMagenta': '#bc05bc',
        'terminal.ansiBrightCyan': '#0598bc',
        'terminal.ansiBrightWhite': '#a5a5a5',
        'focusBorder': '#007acc',
        'foreground': '#000000',
        'descriptionForeground': '#6c6c6c',
        'errorForeground': '#e51400',
        'widget.shadow': '#00000026',
        'scrollbar.shadow': '#dddddd',
        'scrollbarSlider.background': '#64646466',
        'scrollbarSlider.hoverBackground': '#646464b3',
        'scrollbarSlider.activeBackground': '#00000099',
        'badge.background': '#c4c4c4',
        'badge.foreground': '#000000',
        'progressBar.background': '#0e70c0'
      }
    });

    // High Contrast Theme
    this.themes.set('high-contrast', {
      id: 'high-contrast',
      name: 'High Contrast',
      type: 'high-contrast',
      colors: {
        'editor.background': '#000000',
        'editor.foreground': '#ffffff',
        'editor.lineHighlightBackground': '#000000',
        'editor.selectionBackground': '#ffffff33',
        'editor.inactiveSelectionBackground': '#ffffff1a',
        'editor.findMatchBackground': '#ffffff33',
        'editor.findMatchHighlightBackground': '#ffffff1a',
        'editor.hoverHighlightBackground': '#ffffff1a',
        'editorLineNumber.foreground': '#ffffff',
        'editorLineNumber.activeForeground': '#ffffff',
        'editorCursor.foreground': '#ffffff',
        'editorWhitespace.foreground': '#ffffff33',
        'editorIndentGuide.background': '#ffffff33',
        'editorIndentGuide.activeBackground': '#ffffff66',
        'sideBar.background': '#000000',
        'sideBar.foreground': '#ffffff',
        'sideBar.border': '#6fc3df',
        'sideBarTitle.foreground': '#ffffff',
        'sideBarSectionHeader.background': '#000000',
        'sideBarSectionHeader.foreground': '#ffffff',
        'activityBar.background': '#000000',
        'activityBar.foreground': '#ffffff',
        'activityBar.inactiveForeground': '#ffffff66',
        'activityBar.border': '#6fc3df',
        'activityBarBadge.background': '#6fc3df',
        'activityBarBadge.foreground': '#000000',
        'panel.background': '#000000',
        'panel.border': '#6fc3df',
        'panelTitle.activeBorder': '#6fc3df',
        'panelTitle.activeForeground': '#ffffff',
        'panelTitle.inactiveForeground': '#ffffff66',
        'statusBar.background': '#000000',
        'statusBar.foreground': '#ffffff',
        'statusBar.border': '#6fc3df',
        'statusBar.debuggingBackground': '#000000',
        'statusBar.debuggingForeground': '#ffffff',
        'statusBar.noFolderBackground': '#000000',
        'tab.activeBackground': '#000000',
        'tab.activeForeground': '#ffffff',
        'tab.inactiveBackground': '#000000',
        'tab.inactiveForeground': '#ffffff66',
        'tab.border': '#6fc3df',
        'tab.activeBorder': '#6fc3df',
        'tab.hoverBackground': '#000000',
        'editorGroupHeader.tabsBackground': '#000000',
        'editorGroupHeader.tabsBorder': '#6fc3df',
        'input.background': '#000000',
        'input.foreground': '#ffffff',
        'input.border': '#6fc3df',
        'input.placeholderForeground': '#ffffff66',
        'inputOption.activeBorder': '#6fc3df',
        'inputValidation.errorBackground': '#000000',
        'inputValidation.errorBorder': '#ff0000',
        'button.background': '#000000',
        'button.foreground': '#ffffff',
        'button.hoverBackground': '#ffffff1a',
        'button.secondaryBackground': '#000000',
        'button.secondaryForeground': '#ffffff',
        'button.secondaryHoverBackground': '#ffffff1a',
        'list.activeSelectionBackground': '#ffffff33',
        'list.activeSelectionForeground': '#ffffff',
        'list.inactiveSelectionBackground': '#ffffff1a',
        'list.hoverBackground': '#ffffff1a',
        'list.focusBackground': '#ffffff33',
        'list.highlightForeground': '#6fc3df',
        'diffEditor.insertedTextBackground': '#00ff0033',
        'diffEditor.removedTextBackground': '#ff000033',
        'diffEditor.border': '#6fc3df',
        'gitDecoration.modifiedResourceForeground': '#ffff00',
        'gitDecoration.deletedResourceForeground': '#ff0000',
        'gitDecoration.untrackedResourceForeground': '#00ff00',
        'gitDecoration.addedResourceForeground': '#00ff00',
        'gitDecoration.conflictingResourceForeground': '#ff0000',
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
        'terminal.ansiBrightBlack': '#666666',
        'terminal.ansiBrightRed': '#ff0000',
        'terminal.ansiBrightGreen': '#00ff00',
        'terminal.ansiBrightYellow': '#ffff00',
        'terminal.ansiBrightBlue': '#0000ff',
        'terminal.ansiBrightMagenta': '#ff00ff',
        'terminal.ansiBrightCyan': '#00ffff',
        'terminal.ansiBrightWhite': '#ffffff',
        'focusBorder': '#6fc3df',
        'foreground': '#ffffff',
        'descriptionForeground': '#ffffff66',
        'errorForeground': '#ff0000',
        'widget.shadow': '#000000',
        'scrollbar.shadow': '#000000',
        'scrollbarSlider.background': '#ffffff33',
        'scrollbarSlider.hoverBackground': '#ffffff66',
        'scrollbarSlider.activeBackground': '#ffffff99',
        'badge.background': '#6fc3df',
        'badge.foreground': '#000000',
        'progressBar.background': '#6fc3df'
      }
    });
  }

  private loadTheme(): void {
    const savedThemeId = this.storageService.get<string>('theme', 'dark');
    const theme = this.themes.get(savedThemeId);
    if (theme) {
      this.currentTheme = theme;
      this.applyTheme(theme);
    }
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--vscode-${key}`, value);
    });

    root.setAttribute('data-theme', theme.type);
    this.storageService.set('theme', theme.id);
    this.eventBus.emit('theme:changed', { theme: theme.id });
  }

  public setTheme(themeId: string): boolean {
    const theme = this.themes.get(themeId);
    if (!theme) {
      console.error(`Theme not found: ${themeId}`);
      return false;
    }

    this.currentTheme = theme;
    this.applyTheme(theme);
    return true;
  }

  public getCurrentTheme(): Theme {
    return { ...this.currentTheme };
  }

  public getThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  public getTheme(themeId: string): Theme | undefined {
    return this.themes.get(themeId);
  }

  public registerTheme(theme: Theme): boolean {
    if (this.themes.has(theme.id)) {
      console.warn(`Theme already registered: ${theme.id}`);
      return false;
    }

    this.themes.set(theme.id, theme);
    this.eventBus.emit('theme:registered', { themeId: theme.id });
    return true;
  }

  public unregisterTheme(themeId: string): boolean {
    if (!this.themes.has(themeId)) {
      return false;
    }

    if (this.currentTheme.id === themeId) {
      this.setTheme('dark');
    }

    this.themes.delete(themeId);
    this.eventBus.emit('theme:unregistered', { themeId });
    return true;
  }

  public getThemeColors(themeId?: string): ThemeColors {
    const theme = themeId ? this.themes.get(themeId) : this.currentTheme;
    return theme ? { ...theme.colors } : { ...this.currentTheme.colors };
  }

  public updateThemeColor(key: keyof ThemeColors, value: string): void {
    this.currentTheme.colors[key] = value;
    document.documentElement.style.setProperty(`--vscode-${key}`, value);
    this.eventBus.emit('theme:colorUpdated', { key, value });
  }

  public resetTheme(): void {
    this.setTheme('dark');
  }

  public exportTheme(): string {
    return JSON.stringify(this.currentTheme, null, 2);
  }

  public importTheme(themeJson: string): boolean {
    try {
      const theme = JSON.parse(themeJson) as Theme;
      return this.registerTheme(theme);
    } catch (error) {
      console.error('Failed to import theme:', error);
      return false;
    }
  }
}
