/**
 * Aethel Settings System
 * 
 * Sistema completo de configurações com sync, profiles,
 * e importação/exportação.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface SettingDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  default: any;
  description: string;
  markdownDescription?: string;
  scope: 'user' | 'workspace' | 'window' | 'resource' | 'machine';
  enum?: any[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  items?: SettingDefinition;
  properties?: Record<string, SettingDefinition>;
  deprecationMessage?: string;
  tags?: string[];
  order?: number;
}

export interface SettingCategory {
  id: string;
  label: string;
  icon?: string;
  order: number;
  settings: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  icon?: string;
  settings: Record<string, any>;
  extensions: string[];
  keybindings: any[];
  snippets: Record<string, any>;
  tasks: any[];
  globalState: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface SyncState {
  enabled: boolean;
  lastSync: number | null;
  syncedItems: ('settings' | 'extensions' | 'keybindings' | 'snippets' | 'tasks' | 'profiles')[];
  conflicts: SyncConflict[];
  status: 'idle' | 'syncing' | 'error';
  error?: string;
}

export interface SyncConflict {
  key: string;
  localValue: any;
  remoteValue: any;
  timestamp: number;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_SETTINGS: Record<string, any> = {
  // Editor
  'editor.fontSize': 14,
  'editor.fontFamily': "'JetBrains Mono', 'Fira Code', monospace",
  'editor.fontLigatures': true,
  'editor.tabSize': 2,
  'editor.insertSpaces': true,
  'editor.wordWrap': 'off',
  'editor.lineNumbers': 'on',
  'editor.minimap.enabled': true,
  'editor.minimap.maxColumn': 120,
  'editor.renderWhitespace': 'selection',
  'editor.cursorBlinking': 'smooth',
  'editor.cursorStyle': 'line',
  'editor.smoothScrolling': true,
  'editor.formatOnSave': false,
  'editor.formatOnPaste': false,
  'editor.autoSave': 'off',
  'editor.autoSaveDelay': 1000,
  'editor.bracketPairColorization.enabled': true,
  'editor.guides.bracketPairs': true,
  'editor.guides.indentation': true,
  'editor.inlineSuggest.enabled': true,
  'editor.suggest.showKeywords': true,
  'editor.suggest.showSnippets': true,
  'editor.quickSuggestions': true,
  'editor.parameterHints.enabled': true,
  'editor.hover.enabled': true,
  'editor.hover.delay': 300,
  
  // Workbench
  'workbench.colorTheme': 'Catppuccin Mocha',
  'workbench.iconTheme': 'catppuccin-mocha',
  'workbench.productIconTheme': 'Default',
  'workbench.startupEditor': 'welcomePage',
  'workbench.sideBar.location': 'left',
  'workbench.activityBar.location': 'side',
  'workbench.panel.defaultLocation': 'bottom',
  'workbench.editor.enablePreview': true,
  'workbench.editor.showTabs': 'multiple',
  'workbench.tree.indent': 20,
  'workbench.tree.renderIndentGuides': 'always',
  
  // Terminal
  'terminal.integrated.fontSize': 14,
  'terminal.integrated.fontFamily': "'JetBrains Mono', monospace",
  'terminal.integrated.cursorBlinking': true,
  'terminal.integrated.cursorStyle': 'block',
  'terminal.integrated.scrollback': 10000,
  'terminal.integrated.copyOnSelection': false,
  'terminal.integrated.defaultProfile.windows': 'PowerShell',
  'terminal.integrated.defaultProfile.linux': 'bash',
  'terminal.integrated.defaultProfile.osx': 'zsh',
  
  // Files
  'files.autoSave': 'off',
  'files.autoSaveDelay': 1000,
  'files.exclude': {
    '**/.git': true,
    '**/.svn': true,
    '**/.hg': true,
    '**/CVS': true,
    '**/.DS_Store': true,
    '**/Thumbs.db': true,
    '**/node_modules': true,
  },
  'files.watcherExclude': {
    '**/.git/objects/**': true,
    '**/.git/subtree-cache/**': true,
    '**/node_modules/**': true,
    '**/.hg/store/**': true,
  },
  'files.encoding': 'utf8',
  'files.eol': 'auto',
  'files.trimTrailingWhitespace': false,
  'files.insertFinalNewline': false,
  
  // Search
  'search.exclude': {
    '**/node_modules': true,
    '**/bower_components': true,
    '**/*.code-search': true,
  },
  'search.useIgnoreFiles': true,
  'search.followSymlinks': true,
  'search.smartCase': false,
  
  // Git
  'git.enabled': true,
  'git.autofetch': false,
  'git.autorefresh': true,
  'git.confirmSync': true,
  'git.enableSmartCommit': false,
  'git.fetchOnPull': false,
  
  // AI
  'ai.enabled': true,
  'ai.ghostText.enabled': true,
  'ai.ghostText.debounceMs': 300,
  'ai.chat.enabled': true,
  'ai.agentMode.enabled': true,
  'ai.agentMode.requireApproval': true,
  'ai.model': 'gpt-4',
  'ai.temperature': 0.7,
  
  // Debug
  'debug.console.fontSize': 14,
  'debug.console.wordWrap': true,
  'debug.inlineValues': 'auto',
  'debug.toolBarLocation': 'floating',
  'debug.openDebug': 'openOnFirstSessionStart',
  'debug.showInStatusBar': 'onFirstSessionStart',
  
  // Extensions
  'extensions.autoUpdate': true,
  'extensions.autoCheckUpdates': true,
  'extensions.ignoreRecommendations': false,
  
  // Telemetry
  'telemetry.telemetryLevel': 'error',
  
  // Window
  'window.zoomLevel': 0,
  'window.newWindowDimensions': 'default',
  'window.restoreWindows': 'all',
  'window.titleBarStyle': 'custom',
};

// ============================================================================
// SETTING DEFINITIONS
// ============================================================================

export const SETTING_DEFINITIONS: Record<string, SettingDefinition> = {
  'editor.fontSize': {
    key: 'editor.fontSize',
    type: 'number',
    default: 14,
    description: 'Controls the font size in pixels.',
    scope: 'resource',
    minimum: 6,
    maximum: 100,
    tags: ['editor', 'font'],
  },
  'editor.fontFamily': {
    key: 'editor.fontFamily',
    type: 'string',
    default: "'JetBrains Mono', 'Fira Code', monospace",
    description: 'Controls the font family.',
    scope: 'resource',
    tags: ['editor', 'font'],
  },
  'editor.tabSize': {
    key: 'editor.tabSize',
    type: 'number',
    default: 2,
    description: 'The number of spaces a tab is equal to.',
    scope: 'resource',
    minimum: 1,
    maximum: 16,
    tags: ['editor', 'whitespace'],
  },
  'editor.wordWrap': {
    key: 'editor.wordWrap',
    type: 'enum',
    default: 'off',
    description: 'Controls how lines should wrap.',
    scope: 'resource',
    enum: ['off', 'on', 'wordWrapColumn', 'bounded'],
    enumDescriptions: [
      'Lines will never wrap.',
      'Lines will wrap at the viewport width.',
      'Lines will wrap at wordWrapColumn.',
      'Lines will wrap at the minimum of viewport and wordWrapColumn.',
    ],
    tags: ['editor'],
  },
  'workbench.colorTheme': {
    key: 'workbench.colorTheme',
    type: 'string',
    default: 'Catppuccin Mocha',
    description: 'Specifies the color theme.',
    scope: 'user',
    tags: ['workbench', 'theme'],
  },
  'ai.enabled': {
    key: 'ai.enabled',
    type: 'boolean',
    default: true,
    description: 'Enable AI features.',
    scope: 'user',
    tags: ['ai'],
  },
  'ai.ghostText.enabled': {
    key: 'ai.ghostText.enabled',
    type: 'boolean',
    default: true,
    description: 'Enable inline AI completions (ghost text).',
    scope: 'user',
    tags: ['ai', 'editor'],
  },
  'ai.model': {
    key: 'ai.model',
    type: 'enum',
    default: 'gpt-4',
    description: 'AI model to use for completions and chat.',
    scope: 'user',
    enum: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'],
    tags: ['ai'],
  },
};

// ============================================================================
// SETTING CATEGORIES
// ============================================================================

export const SETTING_CATEGORIES: SettingCategory[] = [
  {
    id: 'editor',
    label: 'Text Editor',
    icon: 'edit',
    order: 1,
    settings: [
      'editor.fontSize',
      'editor.fontFamily',
      'editor.fontLigatures',
      'editor.tabSize',
      'editor.insertSpaces',
      'editor.wordWrap',
      'editor.lineNumbers',
      'editor.minimap.enabled',
      'editor.formatOnSave',
      'editor.autoSave',
    ],
  },
  {
    id: 'workbench',
    label: 'Workbench',
    icon: 'layout',
    order: 2,
    settings: [
      'workbench.colorTheme',
      'workbench.iconTheme',
      'workbench.sideBar.location',
      'workbench.activityBar.location',
    ],
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: 'terminal',
    order: 3,
    settings: [
      'terminal.integrated.fontSize',
      'terminal.integrated.fontFamily',
      'terminal.integrated.cursorStyle',
    ],
  },
  {
    id: 'ai',
    label: 'AI Features',
    icon: 'sparkles',
    order: 4,
    settings: [
      'ai.enabled',
      'ai.ghostText.enabled',
      'ai.chat.enabled',
      'ai.agentMode.enabled',
      'ai.model',
    ],
  },
  {
    id: 'git',
    label: 'Source Control',
    icon: 'git-branch',
    order: 5,
    settings: [
      'git.enabled',
      'git.autofetch',
      'git.confirmSync',
    ],
  },
];

// ============================================================================
// SETTINGS SERVICE
// ============================================================================

export class SettingsService extends EventEmitter {
  private settings: Map<string, any> = new Map();
  private workspaceSettings: Map<string, any> = new Map();
  private profiles: Map<string, UserProfile> = new Map();
  private activeProfileId: string = 'default';
  private syncState: SyncState = {
    enabled: false,
    lastSync: null,
    syncedItems: [],
    conflicts: [],
    status: 'idle',
  };
  
  constructor() {
    super();
    this.loadDefaults();
  }
  
  // ==========================================================================
  // SETTINGS CRUD
  // ==========================================================================
  
  get<T>(key: string): T {
    // Check workspace settings first
    if (this.workspaceSettings.has(key)) {
      return this.workspaceSettings.get(key);
    }
    // Then user settings
    if (this.settings.has(key)) {
      return this.settings.get(key);
    }
    // Fall back to default
    return DEFAULT_SETTINGS[key];
  }
  
  async set(key: string, value: any, scope: 'user' | 'workspace' = 'user'): Promise<void> {
    const oldValue = this.get(key);
    
    if (scope === 'workspace') {
      this.workspaceSettings.set(key, value);
    } else {
      this.settings.set(key, value);
    }
    
    this.emit('change', { key, value, oldValue, scope });
    
    // Update profile if active
    if (scope === 'user' && this.activeProfileId !== 'default') {
      const profile = this.profiles.get(this.activeProfileId);
      if (profile) {
        profile.settings[key] = value;
        profile.updatedAt = Date.now();
      }
    }
  }
  
  async reset(key: string): Promise<void> {
    const defaultValue = DEFAULT_SETTINGS[key];
    await this.set(key, defaultValue);
  }
  
  async resetAll(): Promise<void> {
    this.settings.clear();
    this.workspaceSettings.clear();
    this.loadDefaults();
    this.emit('reset');
  }
  
  has(key: string): boolean {
    return this.settings.has(key) || this.workspaceSettings.has(key) || key in DEFAULT_SETTINGS;
  }
  
  getAll(): Record<string, any> {
    const result: Record<string, any> = { ...DEFAULT_SETTINGS };
    
    for (const [key, value] of this.settings) {
      result[key] = value;
    }
    
    for (const [key, value] of this.workspaceSettings) {
      result[key] = value;
    }
    
    return result;
  }
  
  getUserSettings(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.settings) {
      result[key] = value;
    }
    return result;
  }
  
  getWorkspaceSettings(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.workspaceSettings) {
      result[key] = value;
    }
    return result;
  }
  
  // ==========================================================================
  // PROFILES
  // ==========================================================================
  
  async createProfile(name: string, icon?: string): Promise<UserProfile> {
    const id = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const profile: UserProfile = {
      id,
      name,
      icon,
      settings: this.getUserSettings(),
      extensions: [],
      keybindings: [],
      snippets: {},
      tasks: [],
      globalState: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    this.profiles.set(id, profile);
    this.emit('profileCreated', profile);
    
    return profile;
  }
  
  async deleteProfile(id: string): Promise<void> {
    if (id === 'default') {
      throw new Error('Cannot delete default profile');
    }
    
    if (this.activeProfileId === id) {
      await this.switchProfile('default');
    }
    
    this.profiles.delete(id);
    this.emit('profileDeleted', id);
  }
  
  async switchProfile(id: string): Promise<void> {
    if (id !== 'default' && !this.profiles.has(id)) {
      throw new Error(`Profile ${id} not found`);
    }
    
    const oldProfileId = this.activeProfileId;
    this.activeProfileId = id;
    
    // Load profile settings
    if (id !== 'default') {
      const profile = this.profiles.get(id)!;
      this.settings.clear();
      for (const [key, value] of Object.entries(profile.settings)) {
        this.settings.set(key, value);
      }
    } else {
      this.settings.clear();
      this.loadDefaults();
    }
    
    this.emit('profileSwitched', { oldProfileId, newProfileId: id });
  }
  
  getActiveProfile(): UserProfile | null {
    return this.profiles.get(this.activeProfileId) || null;
  }
  
  getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }
  
  // ==========================================================================
  // SYNC
  // ==========================================================================
  
  async enableSync(items: SyncState['syncedItems']): Promise<void> {
    this.syncState.enabled = true;
    this.syncState.syncedItems = items;
    
    this.emit('syncEnabled', items);
    
    // Initial sync
    await this.sync();
  }
  
  async disableSync(): Promise<void> {
    this.syncState.enabled = false;
    this.syncState.syncedItems = [];
    
    this.emit('syncDisabled');
  }
  
  async sync(): Promise<void> {
    if (!this.syncState.enabled) return;
    
    this.syncState.status = 'syncing';
    this.emit('syncStarted');
    
    try {
      // Simulate sync
      await this.sleep(1000);
      
      this.syncState.lastSync = Date.now();
      this.syncState.status = 'idle';
      this.syncState.error = undefined;
      
      this.emit('syncCompleted', { lastSync: this.syncState.lastSync });
      
    } catch (error: any) {
      this.syncState.status = 'error';
      this.syncState.error = error.message;
      
      this.emit('syncError', error);
    }
  }
  
  getSyncState(): SyncState {
    return { ...this.syncState };
  }
  
  async resolveConflict(key: string, resolution: 'local' | 'remote'): Promise<void> {
    const conflict = this.syncState.conflicts.find(c => c.key === key);
    if (!conflict) return;
    
    if (resolution === 'remote') {
      await this.set(key, conflict.remoteValue);
    }
    // If local, keep current value
    
    this.syncState.conflicts = this.syncState.conflicts.filter(c => c.key !== key);
    
    this.emit('conflictResolved', { key, resolution });
  }
  
  // ==========================================================================
  // IMPORT / EXPORT
  // ==========================================================================
  
  async exportSettings(): Promise<string> {
    const data = {
      version: 1,
      timestamp: Date.now(),
      settings: this.getUserSettings(),
      profiles: Array.from(this.profiles.values()),
    };
    
    return JSON.stringify(data, null, 2);
  }
  
  async importSettings(json: string, merge: boolean = true): Promise<void> {
    const data = JSON.parse(json);
    
    if (!data.version || !data.settings) {
      throw new Error('Invalid settings file');
    }
    
    if (!merge) {
      this.settings.clear();
    }
    
    for (const [key, value] of Object.entries(data.settings)) {
      this.settings.set(key, value);
    }
    
    if (data.profiles) {
      for (const profile of data.profiles) {
        this.profiles.set(profile.id, profile);
      }
    }
    
    this.emit('imported', { merge });
  }
  
  // ==========================================================================
  // SEARCH
  // ==========================================================================
  
  search(query: string): Array<{ key: string; value: any; definition?: SettingDefinition }> {
    const results: Array<{ key: string; value: any; definition?: SettingDefinition }> = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [key, definition] of Object.entries(SETTING_DEFINITIONS)) {
      if (
        key.toLowerCase().includes(lowerQuery) ||
        definition.description.toLowerCase().includes(lowerQuery) ||
        definition.tags?.some(t => t.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          key,
          value: this.get(key),
          definition,
        });
      }
    }
    
    return results;
  }
  
  // ==========================================================================
  // VALIDATION
  // ==========================================================================
  
  validate(key: string, value: any): { valid: boolean; error?: string } {
    const definition = SETTING_DEFINITIONS[key];
    if (!definition) {
      return { valid: true }; // Unknown settings are allowed
    }
    
    // Type check
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (definition.type !== 'enum' && actualType !== definition.type && value !== null) {
      return { valid: false, error: `Expected ${definition.type}, got ${actualType}` };
    }
    
    // Enum check
    if (definition.type === 'enum' && definition.enum && !definition.enum.includes(value)) {
      return { valid: false, error: `Value must be one of: ${definition.enum.join(', ')}` };
    }
    
    // Number range
    if (definition.type === 'number') {
      if (definition.minimum !== undefined && value < definition.minimum) {
        return { valid: false, error: `Value must be at least ${definition.minimum}` };
      }
      if (definition.maximum !== undefined && value > definition.maximum) {
        return { valid: false, error: `Value must be at most ${definition.maximum}` };
      }
    }
    
    // Pattern check
    if (definition.pattern && typeof value === 'string') {
      if (!new RegExp(definition.pattern).test(value)) {
        return { valid: false, error: 'Value does not match required pattern' };
      }
    }
    
    return { valid: true };
  }
  
  // ==========================================================================
  // PRIVATE
  // ==========================================================================
  
  private loadDefaults(): void {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (!this.settings.has(key)) {
        // Don't set default as user setting, just use DEFAULT_SETTINGS as fallback
      }
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const settingsService = new SettingsService();

export default settingsService;
