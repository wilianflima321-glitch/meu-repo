/**
 * @file SettingsService.ts
 * @description Gerenciamento de configurações da IDE
 */

import { EventBus, IDE_EVENTS } from './EventBus';
import { StorageService } from './StorageService';

export interface IDESettings {
  // Editor
  editor: EditorSettings;
  
  // Workbench
  workbench: WorkbenchSettings;
  
  // Terminal
  terminal: TerminalSettings;
  
  // Git
  git: GitSettings;
  
  // Files
  files: FileSettings;
  
  // Extensions
  extensions: Record<string, any>;
  
  // Keybindings
  keybindings: KeybindingSettings;
}

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  lineHeight: number;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  wordWrapColumn: number;
  minimap: {
    enabled: boolean;
    maxColumn: number;
    showSlider: 'always' | 'mouseover';
  };
  lineNumbers: 'on' | 'off' | 'relative' | 'interval';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  cursorStyle: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin';
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  autoClosingQuotes: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  formatOnSave: boolean;
  formatOnPaste: boolean;
  formatOnType: boolean;
  autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';
  autoSaveDelay: number;
  scrollBeyondLastLine: boolean;
  smoothScrolling: boolean;
  suggestOnTriggerCharacters: boolean;
  quickSuggestions: boolean;
  snippetSuggestions: 'top' | 'bottom' | 'inline' | 'none';
  acceptSuggestionOnEnter: 'on' | 'smart' | 'off';
  bracketPairColorization: boolean;
  guides: {
    bracketPairs: boolean;
    indentation: boolean;
  };
}

export interface WorkbenchSettings {
  colorTheme: string;
  iconTheme: string;
  productIconTheme: string;
  sideBar: {
    location: 'left' | 'right';
  };
  panel: {
    defaultLocation: 'bottom' | 'right' | 'left';
  };
  activityBar: {
    visible: boolean;
    location: 'side' | 'top';
  };
  statusBar: {
    visible: boolean;
  };
  startupEditor: 'none' | 'welcomePage' | 'readme' | 'newUntitledFile' | 'welcomePageInEmptyWorkbench';
  tree: {
    indent: number;
    renderIndentGuides: 'none' | 'onHover' | 'always';
  };
}

export interface TerminalSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlinking: boolean;
  scrollback: number;
  copyOnSelection: boolean;
  defaultProfile: string;
  profiles: Record<string, TerminalProfile>;
}

export interface TerminalProfile {
  path: string;
  args?: string[];
  icon?: string;
  color?: string;
}

export interface GitSettings {
  enabled: boolean;
  autofetch: boolean;
  autofetchPeriod: number;
  confirmSync: boolean;
  enableSmartCommit: boolean;
  decorations: {
    enabled: boolean;
  };
  defaultCloneDirectory: string;
}

export interface FileSettings {
  autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';
  autoSaveDelay: number;
  encoding: string;
  eol: '\n' | '\r\n' | 'auto';
  trimTrailingWhitespace: boolean;
  insertFinalNewline: boolean;
  exclude: Record<string, boolean>;
  associations: Record<string, string>;
  watcherExclude: Record<string, boolean>;
}

export interface KeybindingSettings {
  [command: string]: string | string[];
}

/**
 * Configurações padrão da IDE
 */
const DEFAULT_SETTINGS: IDESettings = {
  editor: {
    fontSize: 14,
    fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
    fontWeight: 'normal',
    lineHeight: 1.5,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    wordWrapColumn: 80,
    minimap: {
      enabled: true,
      maxColumn: 120,
      showSlider: 'mouseover'
    },
    lineNumbers: 'on',
    renderWhitespace: 'selection',
    cursorStyle: 'line',
    cursorBlinking: 'blink',
    autoClosingBrackets: 'languageDefined',
    autoClosingQuotes: 'languageDefined',
    formatOnSave: true,
    formatOnPaste: false,
    formatOnType: false,
    autoSave: 'afterDelay',
    autoSaveDelay: 1000,
    scrollBeyondLastLine: true,
    smoothScrolling: true,
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    snippetSuggestions: 'top',
    acceptSuggestionOnEnter: 'on',
    bracketPairColorization: true,
    guides: {
      bracketPairs: true,
      indentation: true
    }
  },
  workbench: {
    colorTheme: 'Aethel Dark Pro',
    iconTheme: 'aethel-icons',
    productIconTheme: 'default',
    sideBar: {
      location: 'left'
    },
    panel: {
      defaultLocation: 'bottom'
    },
    activityBar: {
      visible: true,
      location: 'side'
    },
    statusBar: {
      visible: true
    },
    startupEditor: 'welcomePage',
    tree: {
      indent: 8,
      renderIndentGuides: 'onHover'
    }
  },
  terminal: {
    fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
    fontSize: 13,
    lineHeight: 1.4,
    cursorStyle: 'block',
    cursorBlinking: true,
    scrollback: 10000,
    copyOnSelection: false,
    defaultProfile: 'powershell',
    profiles: {
      powershell: {
        path: 'powershell.exe',
        icon: 'terminal-powershell'
      },
      cmd: {
        path: 'cmd.exe',
        icon: 'terminal-cmd'
      },
      bash: {
        path: 'bash',
        icon: 'terminal-bash'
      }
    }
  },
  git: {
    enabled: true,
    autofetch: true,
    autofetchPeriod: 180,
    confirmSync: true,
    enableSmartCommit: true,
    decorations: {
      enabled: true
    },
    defaultCloneDirectory: ''
  },
  files: {
    autoSave: 'afterDelay',
    autoSaveDelay: 1000,
    encoding: 'utf8',
    eol: 'auto',
    trimTrailingWhitespace: true,
    insertFinalNewline: true,
    exclude: {
      '**/.git': true,
      '**/.svn': true,
      '**/.hg': true,
      '**/CVS': true,
      '**/.DS_Store': true,
      '**/Thumbs.db': true,
      '**/node_modules': true
    },
    associations: {
      '*.tsx': 'typescriptreact',
      '*.jsx': 'javascriptreact'
    },
    watcherExclude: {
      '**/.git/objects/**': true,
      '**/.git/subtree-cache/**': true,
      '**/node_modules/**': true,
      '**/.hg/store/**': true
    }
  },
  extensions: {},
  keybindings: {}
};

/**
 * SettingsService - Gerencia configurações da IDE
 */
export class SettingsService {
  private static instance: SettingsService;
  private eventBus: EventBus;
  private storage: StorageService;
  private settings: IDESettings;
  private workspaceSettings: Record<string, any> = {};

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.storage = StorageService.getInstance();
    this.settings = this.loadSettings();
  }

  /**
   * Obtém instância singleton
   */
  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  /**
   * Carrega configurações do storage
   */
  private loadSettings(): IDESettings {
    const saved = this.storage.get<Partial<IDESettings>>('settings', {});
    return this.mergeDeep(DEFAULT_SETTINGS, saved || {}) as IDESettings;
  }

  /**
   * Merge profundo de objetos
   */
  private mergeDeep(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Obtém todas as configurações
   */
  public getAll(): IDESettings {
    return { ...this.settings };
  }

  /**
   * Obtém configuração por caminho (ex: "editor.fontSize")
   */
  public get<T>(path: string, defaultValue?: T): T {
    const parts = path.split('.');
    let current: any = this.settings;
    
    for (const part of parts) {
      if (current === undefined || current === null) {
        return defaultValue as T;
      }
      current = current[part];
    }
    
    return (current !== undefined ? current : defaultValue) as T;
  }

  /**
   * Define configuração por caminho
   */
  public set(path: string, value: any): void {
    const parts = path.split('.');
    let current: any = this.settings;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    const lastPart = parts[parts.length - 1];
    const oldValue = current[lastPart];
    current[lastPart] = value;
    
    // Salvar no storage
    this.save();
    
    // Emitir evento de mudança
    this.eventBus.emit(IDE_EVENTS.SETTINGS_CHANGED, {
      path,
      oldValue,
      newValue: value
    });
    
    // Eventos específicos
    if (path.startsWith('workbench.colorTheme')) {
      this.eventBus.emit(IDE_EVENTS.THEME_CHANGED, { theme: value });
    }
  }

  /**
   * Atualiza múltiplas configurações
   */
  public update(settings: Record<string, any>): void {
    Object.entries(settings).forEach(([path, value]) => {
      this.set(path, value);
    });
  }

  /**
   * Salva configurações no storage
   */
  private save(): void {
    this.storage.set('settings', this.settings);
  }

  /**
   * Restaura configurações padrão
   */
  public reset(path?: string): void {
    if (path) {
      // Reset configuração específica
      const defaultValue = this.getDefault(path);
      if (defaultValue !== undefined) {
        this.set(path, defaultValue);
      }
    } else {
      // Reset todas
      this.settings = { ...DEFAULT_SETTINGS };
      this.save();
      this.eventBus.emit(IDE_EVENTS.SETTINGS_CHANGED, {
        path: '*',
        reset: true
      });
    }
  }

  /**
   * Obtém valor padrão de uma configuração
   */
  public getDefault<T>(path: string): T | undefined {
    const parts = path.split('.');
    let current: any = DEFAULT_SETTINGS;
    
    for (const part of parts) {
      if (current === undefined) return undefined;
      current = current[part];
    }
    
    return current as T;
  }

  /**
   * Define configuração de workspace (override)
   */
  public setWorkspaceSetting(path: string, value: any): void {
    this.workspaceSettings[path] = value;
  }

  /**
   * Obtém configuração efetiva (workspace > user > default)
   */
  public getEffective<T>(path: string): T {
    // Workspace override
    if (this.workspaceSettings[path] !== undefined) {
      return this.workspaceSettings[path] as T;
    }
    
    // User setting
    return this.get<T>(path);
  }

  /**
   * Exporta configurações para JSON
   */
  public exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Importa configurações de JSON
   */
  public importSettings(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      this.settings = this.mergeDeep(DEFAULT_SETTINGS, imported) as IDESettings;
      this.save();
      this.eventBus.emit(IDE_EVENTS.SETTINGS_CHANGED, {
        path: '*',
        imported: true
      });
      return true;
    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      return false;
    }
  }

  /**
   * Registra listener para mudanças de configuração
   */
  public onDidChange(callback: (event: { path: string; oldValue: any; newValue: any }) => void) {
    return this.eventBus.on(IDE_EVENTS.SETTINGS_CHANGED, callback);
  }

  // Atalhos para configurações comuns
  public get theme(): string {
    return this.get('workbench.colorTheme', 'Aethel Dark Pro');
  }

  public set theme(value: string) {
    this.set('workbench.colorTheme', value);
  }

  public get fontSize(): number {
    return this.get('editor.fontSize', 14);
  }

  public set fontSize(value: number) {
    this.set('editor.fontSize', value);
  }

  public get fontFamily(): string {
    return this.get('editor.fontFamily', "'Fira Code', Consolas, monospace");
  }

  public set fontFamily(value: string) {
    this.set('editor.fontFamily', value);
  }

  public get tabSize(): number {
    return this.get('editor.tabSize', 2);
  }

  public set tabSize(value: number) {
    this.set('editor.tabSize', value);
  }

  public get autoSave(): string {
    return this.get('editor.autoSave', 'afterDelay');
  }

  public set autoSave(value: string) {
    this.set('editor.autoSave', value);
  }
}

// Exportar instância global
export const settingsService = SettingsService.getInstance();
