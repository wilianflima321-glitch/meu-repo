/**
 * Settings Manager
 * Manages workspace and user settings with persistence
 */

export interface SettingsSchema {
  editor: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
    lineNumbers: 'on' | 'off' | 'relative';
    minimap: boolean;
    formatOnSave: boolean;
    formatOnPaste: boolean;
  };
  terminal: {
    fontSize: number;
    fontFamily: string;
    cursorStyle: 'block' | 'underline' | 'bar';
    cursorBlink: boolean;
    scrollback: number;
  };
  git: {
    autoFetch: boolean;
    autoStash: boolean;
    confirmSync: boolean;
    defaultBranch: string;
  };
  debug: {
    openDebugConsole: 'never' | 'openOnSessionStart' | 'openOnFirstSessionStart';
    inlineValues: boolean;
    showInStatusBar: 'never' | 'always' | 'onFirstSessionStart';
  };
  testing: {
    autoRun: boolean;
    showCoverage: boolean;
    coverageThreshold: number;
  };
  ai: {
    enabled: boolean;
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  theme: {
    colorTheme: string;
    iconTheme: string;
    fontSize: number;
  };
  keybindings: {
    preset: 'default' | 'vim' | 'emacs';
    custom: Record<string, string>;
  };
  extensions: {
    autoUpdate: boolean;
    autoCheckUpdates: boolean;
    ignoreRecommendations: boolean;
  };
  telemetry: {
    enabled: boolean;
    level: 'off' | 'error' | 'all';
  };
}

export type SettingsPath = string;
export type SettingsValue = any;

export class SettingsManager {
  private userSettings: Partial<SettingsSchema> = {};
  private workspaceSettings: Partial<SettingsSchema> = {};
  private defaultSettings: SettingsSchema;
  private listeners: Map<string, Set<(value: any) => void>> = new Map();

  constructor() {
    this.defaultSettings = this.getDefaultSettings();
    this.loadSettings();
  }

  private getDefaultSettings(): SettingsSchema {
    return {
      editor: {
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'off',
        lineNumbers: 'on',
        minimap: true,
        formatOnSave: false,
        formatOnPaste: false
      },
      terminal: {
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        cursorStyle: 'block',
        cursorBlink: true,
        scrollback: 1000
      },
      git: {
        autoFetch: true,
        autoStash: false,
        confirmSync: true,
        defaultBranch: 'main'
      },
      debug: {
        openDebugConsole: 'openOnFirstSessionStart',
        inlineValues: true,
        showInStatusBar: 'onFirstSessionStart'
      },
      testing: {
        autoRun: false,
        showCoverage: true,
        coverageThreshold: 80
      },
      ai: {
        enabled: true,
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000
      },
      theme: {
        colorTheme: 'dark',
        iconTheme: 'default',
        fontSize: 14
      },
      keybindings: {
        preset: 'default',
        custom: {}
      },
      extensions: {
        autoUpdate: true,
        autoCheckUpdates: true,
        ignoreRecommendations: false
      },
      telemetry: {
        enabled: true,
        level: 'all'
      }
    };
  }

  private async loadSettings(): Promise<void> {
    try {
      // Load user settings
      const userSettingsStr = localStorage.getItem('user-settings');
      if (userSettingsStr) {
        this.userSettings = JSON.parse(userSettingsStr);
      }

      // Load workspace settings
      const workspaceSettingsStr = localStorage.getItem('workspace-settings');
      if (workspaceSettingsStr) {
        this.workspaceSettings = JSON.parse(workspaceSettingsStr);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  private async saveUserSettings(): Promise<void> {
    try {
      localStorage.setItem('user-settings', JSON.stringify(this.userSettings));
    } catch (error) {
      console.error('Failed to save user settings:', error);
    }
  }

  private async saveWorkspaceSettings(): Promise<void> {
    try {
      localStorage.setItem('workspace-settings', JSON.stringify(this.workspaceSettings));
    } catch (error) {
      console.error('Failed to save workspace settings:', error);
    }
  }

  get<T = any>(path: SettingsPath, scope: 'user' | 'workspace' | 'default' = 'user'): T {
    const parts = path.split('.');
    let value: any;

    if (scope === 'workspace') {
      value = this.getValueFromObject(this.workspaceSettings, parts);
    } else if (scope === 'user') {
      value = this.getValueFromObject(this.userSettings, parts);
    }

    // Fallback to default if not found
    if (value === undefined) {
      value = this.getValueFromObject(this.defaultSettings, parts);
    }

    return value as T;
  }

  async set(path: SettingsPath, value: SettingsValue, scope: 'user' | 'workspace' = 'user'): Promise<void> {
    const parts = path.split('.');
    
    if (scope === 'workspace') {
      this.setValueInObject(this.workspaceSettings, parts, value);
      await this.saveWorkspaceSettings();
    } else {
      this.setValueInObject(this.userSettings, parts, value);
      await this.saveUserSettings();
    }

    // Notify listeners
    this.notifyListeners(path, value);
  }

  async update(changes: Partial<SettingsSchema>, scope: 'user' | 'workspace' = 'user'): Promise<void> {
    if (scope === 'workspace') {
      this.workspaceSettings = this.deepMerge(this.workspaceSettings, changes);
      await this.saveWorkspaceSettings();
    } else {
      this.userSettings = this.deepMerge(this.userSettings, changes);
      await this.saveUserSettings();
    }

    // Notify all listeners
    this.notifyAllListeners();
  }

  async reset(path?: SettingsPath, scope: 'user' | 'workspace' = 'user'): Promise<void> {
    if (path) {
      const parts = path.split('.');
      const defaultValue = this.getValueFromObject(this.defaultSettings, parts);
      await this.set(path, defaultValue, scope);
    } else {
      if (scope === 'workspace') {
        this.workspaceSettings = {};
        await this.saveWorkspaceSettings();
      } else {
        this.userSettings = {};
        await this.saveUserSettings();
      }
      this.notifyAllListeners();
    }
  }

  getAll(scope: 'user' | 'workspace' | 'effective' = 'effective'): Partial<SettingsSchema> {
    if (scope === 'user') {
      return this.userSettings;
    } else if (scope === 'workspace') {
      return this.workspaceSettings;
    } else {
      // Merge: default < user < workspace
      return this.deepMerge(
        this.deepMerge({}, this.defaultSettings),
        this.deepMerge(this.userSettings, this.workspaceSettings)
      );
    }
  }

  // Compat: alguns módulos ainda chamam o método antigo.
  getAllSettings(): Partial<SettingsSchema> {
    return this.getAll('effective');
  }

  onChange(path: SettingsPath, listener: (value: any) => void): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(path);
      if (listeners) {
        listeners.delete(listener);
      }
    };
  }

  private notifyListeners(path: SettingsPath, value: any): void {
    const listeners = this.listeners.get(path);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(value);
        } catch (error) {
          console.error('Error in settings listener:', error);
        }
      }
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        try {
          listener({ path, value });
        } catch (error) {
          console.error('Error in settings listener:', error);
        }
      }
    }
  }

  private notifyAllListeners(): void {
    for (const [path, listeners] of this.listeners.entries()) {
      if (path === '*') continue;
      const value = this.get(path);
      for (const listener of listeners) {
        try {
          listener(value);
        } catch (error) {
          console.error('Error in settings listener:', error);
        }
      }
    }
  }

  private getValueFromObject(obj: any, parts: string[]): any {
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }

  private setValueInObject(obj: any, parts: string[], value: any): void {
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }

  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = (result as any)[key];
      
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        (result as any)[key] = this.deepMerge(targetValue || {}, sourceValue);
      } else {
        (result as any)[key] = sourceValue;
      }
    }
    
    return result;
  }

  async exportSettings(scope: 'user' | 'workspace' | 'all' = 'all'): Promise<string> {
    const settings: any = {};
    
    if (scope === 'user' || scope === 'all') {
      settings.user = this.userSettings;
    }
    
    if (scope === 'workspace' || scope === 'all') {
      settings.workspace = this.workspaceSettings;
    }
    
    return JSON.stringify(settings, null, 2);
  }

  async importSettings(json: string, scope: 'user' | 'workspace' = 'user'): Promise<void> {
    try {
      const settings = JSON.parse(json);
      
      if (scope === 'user' && settings.user) {
        this.userSettings = settings.user;
        await this.saveUserSettings();
      } else if (scope === 'workspace' && settings.workspace) {
        this.workspaceSettings = settings.workspace;
        await this.saveWorkspaceSettings();
      } else {
        // Import directly
        if (scope === 'user') {
          this.userSettings = settings;
          await this.saveUserSettings();
        } else {
          this.workspaceSettings = settings;
          await this.saveWorkspaceSettings();
        }
      }
      
      this.notifyAllListeners();
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }
}

// Singleton instance
let settingsManagerInstance: SettingsManager | null = null;

export function getSettingsManager(): SettingsManager {
  if (!settingsManagerInstance) {
    settingsManagerInstance = new SettingsManager();
  }
  return settingsManagerInstance;
}

export function resetSettingsManager(): void {
  settingsManagerInstance = null;
}
