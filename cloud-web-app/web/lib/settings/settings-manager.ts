import { logger } from '@/lib/observability/logger';
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
export type SettingsValue = unknown;
type SettingsRecord = Record<string, SettingsValue>;
type SettingsListener = (value: SettingsValue) => void;

function isSettingsRecord(value: unknown): value is SettingsRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class SettingsManager {
  private userSettings: Partial<SettingsSchema> = {};
  private workspaceSettings: Partial<SettingsSchema> = {};
  private defaultSettings: SettingsSchema;
  private listeners: Map<string, Set<SettingsListener>> = new Map();

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
        provider: 'openrouter',
        model: 'google/gemini-3.1-flash-lite-preview',
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
      logger.error('Failed to load settings:', error);
    }
  }

  private async saveUserSettings(): Promise<void> {
    try {
      localStorage.setItem('user-settings', JSON.stringify(this.userSettings));
    } catch (error) {
      logger.error('Failed to save user settings:', error);
    }
  }

  private async saveWorkspaceSettings(): Promise<void> {
    try {
      localStorage.setItem('workspace-settings', JSON.stringify(this.workspaceSettings));
    } catch (error) {
      logger.error('Failed to save workspace settings:', error);
    }
  }

  get<T = SettingsValue>(path: SettingsPath, scope: 'user' | 'workspace' | 'default' = 'user'): T {
    const parts = path.split('.');
    let value: SettingsValue;

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
      this.setValueInObject(this.workspaceSettings as SettingsRecord, parts, value);
      await this.saveWorkspaceSettings();
    } else {
      this.setValueInObject(this.userSettings as SettingsRecord, parts, value);
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

  onChange(path: SettingsPath, listener: SettingsListener): () => void {
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

  private notifyListeners(path: SettingsPath, value: SettingsValue): void {
    const listeners = this.listeners.get(path);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(value);
        } catch (error) {
          logger.error('Error in settings listener:', error);
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
          logger.error('Error in settings listener:', error);
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
          logger.error('Error in settings listener:', error);
        }
      }
    }
  }

  private getValueFromObject(obj: unknown, parts: string[]): SettingsValue {
    let current: unknown = obj;
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      if (!isSettingsRecord(current)) {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }

  private setValueInObject(obj: SettingsRecord, parts: string[], value: SettingsValue): void {
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!isSettingsRecord(current[part])) {
        current[part] = {};
      }
      current = current[part] as SettingsRecord;
    }
    current[parts[parts.length - 1]] = value;
  }

  private deepMerge<T extends object>(target: T, source: Partial<T>): T {
    const result: SettingsRecord = { ...(target as SettingsRecord) };
    
    for (const [key, sourceValue] of Object.entries(source as SettingsRecord)) {
      const targetValue = result[key];
      
      if (isSettingsRecord(sourceValue)) {
        result[key] = this.deepMerge(
          isSettingsRecord(targetValue) ? targetValue : {},
          sourceValue
        );
      } else {
        result[key] = sourceValue;
      }
    }
    
    return result as T;
  }

  async exportSettings(scope: 'user' | 'workspace' | 'all' = 'all'): Promise<string> {
    const settings: SettingsRecord = {};
    
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
      const settings = JSON.parse(json) as SettingsRecord;
      
      if (scope === 'user' && isSettingsRecord(settings.user)) {
        this.userSettings = settings.user as Partial<SettingsSchema>;
        await this.saveUserSettings();
      } else if (scope === 'workspace' && isSettingsRecord(settings.workspace)) {
        this.workspaceSettings = settings.workspace as Partial<SettingsSchema>;
        await this.saveWorkspaceSettings();
      } else {
        // Import directly
        if (scope === 'user') {
          this.userSettings = settings as Partial<SettingsSchema>;
          await this.saveUserSettings();
        } else {
          this.workspaceSettings = settings as Partial<SettingsSchema>;
          await this.saveWorkspaceSettings();
        }
      }
      
      this.notifyAllListeners();
    } catch (error) {
      logger.error('Failed to import settings:', error);
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
