/**
 * Aethel Extension System
 * 
 * Sistema completo de extensões similar ao VS Code.
 * Permite desenvolvedores criar e distribuir extensões.
 */

import { EventEmitter } from 'events';

// ============================================================================
// EXTENSION MANIFEST (package.json)
// ============================================================================

export interface ExtensionManifest {
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  icon?: string;
  license?: string;
  repository?: { type: string; url: string };
  homepage?: string;
  bugs?: { url: string };
  
  // VS Code compatible fields
  engines: { aethel: string; vscode?: string };
  categories?: ExtensionCategory[];
  keywords?: string[];
  
  // Activation
  activationEvents?: string[];
  main?: string;            // CommonJS entry
  browser?: string;         // Browser entry
  
  // Contribution points
  contributes?: ExtensionContributions;
  
  // Dependencies
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  extensionDependencies?: string[];
  extensionPack?: string[];
  
  // Settings
  enableProposedApi?: boolean;
  preview?: boolean;
}

export type ExtensionCategory = 
  | 'Programming Languages'
  | 'Snippets'
  | 'Linters'
  | 'Themes'
  | 'Debuggers'
  | 'Formatters'
  | 'Keymaps'
  | 'SCM Providers'
  | 'Other'
  | 'Extension Packs'
  | 'Language Packs'
  | 'Data Science'
  | 'Machine Learning'
  | 'Visualization'
  | 'Notebooks'
  | 'Education'
  | 'Testing'
  | 'AI';

export interface ExtensionContributions {
  commands?: ContributedCommand[];
  menus?: ContributedMenus;
  keybindings?: ContributedKeybinding[];
  languages?: ContributedLanguage[];
  grammars?: ContributedGrammar[];
  themes?: ContributedTheme[];
  iconThemes?: ContributedIconTheme[];
  snippets?: ContributedSnippet[];
  configuration?: ContributedConfiguration;
  configurationDefaults?: Record<string, any>;
  views?: ContributedViews;
  viewsContainers?: ContributedViewsContainers;
  viewsWelcome?: ContributedViewsWelcome[];
  colors?: ContributedColor[];
  debuggers?: ContributedDebugger[];
  breakpoints?: ContributedBreakpoint[];
  problemMatchers?: ContributedProblemMatcher[];
  problemPatterns?: ContributedProblemPattern[];
  taskDefinitions?: ContributedTaskDefinition[];
  terminal?: ContributedTerminal;
  customEditors?: ContributedCustomEditor[];
  webviewPanels?: ContributedWebviewPanel[];
  walkthroughs?: ContributedWalkthrough[];
}

export interface ContributedCommand {
  command: string;
  title: string;
  shortTitle?: string;
  category?: string;
  icon?: string | { light: string; dark: string };
  enablement?: string;
}

export interface ContributedMenus {
  'editor/title'?: MenuItem[];
  'editor/context'?: MenuItem[];
  'explorer/context'?: MenuItem[];
  'view/title'?: MenuItem[];
  'view/item/context'?: MenuItem[];
  'commandPalette'?: MenuItem[];
  'scm/title'?: MenuItem[];
  'scm/resourceGroup/context'?: MenuItem[];
  'scm/resource/context'?: MenuItem[];
  [key: string]: MenuItem[] | undefined;
}

export interface MenuItem {
  command: string;
  when?: string;
  group?: string;
  alt?: string;
}

export interface ContributedKeybinding {
  command: string;
  key: string;
  mac?: string;
  linux?: string;
  win?: string;
  when?: string;
  args?: any;
}

export interface ContributedLanguage {
  id: string;
  aliases?: string[];
  extensions?: string[];
  filenames?: string[];
  filenamePatterns?: string[];
  firstLine?: string;
  configuration?: string;
  icon?: { light: string; dark: string };
}

export interface ContributedGrammar {
  language?: string;
  scopeName: string;
  path: string;
  embeddedLanguages?: Record<string, string>;
  tokenTypes?: Record<string, string>;
  injectTo?: string[];
}

export interface ContributedTheme {
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
  path: string;
}

export interface ContributedIconTheme {
  id: string;
  label: string;
  path: string;
}

export interface ContributedSnippet {
  language: string;
  path: string;
}

export interface ContributedConfiguration {
  title?: string;
  order?: number;
  properties: Record<string, ConfigurationProperty>;
}

export interface ConfigurationProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | ('string' | 'number' | 'boolean' | 'array' | 'object' | 'null')[];
  default?: any;
  description?: string;
  markdownDescription?: string;
  enum?: any[];
  enumDescriptions?: string[];
  enumItemLabels?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternErrorMessage?: string;
  format?: string;
  items?: ConfigurationProperty;
  properties?: Record<string, ConfigurationProperty>;
  additionalProperties?: boolean | ConfigurationProperty;
  scope?: 'application' | 'machine' | 'window' | 'resource' | 'language-overridable' | 'machine-overridable';
  editPresentation?: 'singlelineText' | 'multilineText';
  order?: number;
  deprecationMessage?: string;
  markdownDeprecationMessage?: string;
}

export interface ContributedViews {
  explorer?: ViewDescriptor[];
  scm?: ViewDescriptor[];
  debug?: ViewDescriptor[];
  test?: ViewDescriptor[];
  [containerId: string]: ViewDescriptor[] | undefined;
}

export interface ViewDescriptor {
  id: string;
  name: string;
  when?: string;
  icon?: string;
  contextualTitle?: string;
  visibility?: 'visible' | 'hidden' | 'collapsed';
  initialSize?: number;
}

export interface ContributedViewsContainers {
  activitybar?: ViewContainerDescriptor[];
  panel?: ViewContainerDescriptor[];
}

export interface ViewContainerDescriptor {
  id: string;
  title: string;
  icon: string;
}

export interface ContributedViewsWelcome {
  view: string;
  contents: string;
  when?: string;
}

export interface ContributedColor {
  id: string;
  description: string;
  defaults: {
    dark: string;
    light: string;
    highContrast?: string;
    highContrastLight?: string;
  };
}

export interface ContributedDebugger {
  type: string;
  label?: string;
  program?: string;
  args?: string[];
  runtime?: string;
  runtimeArgs?: string[];
  languages?: string[];
  configurationAttributes?: Record<string, any>;
  initialConfigurations?: any[];
  configurationSnippets?: any[];
}

export interface ContributedBreakpoint {
  language: string;
}

export interface ContributedProblemMatcher {
  name: string;
  owner: string;
  fileLocation?: string | string[];
  pattern: string | ContributedProblemPattern;
  severity?: 'error' | 'warning' | 'info';
  source?: string;
}

export interface ContributedProblemPattern {
  name?: string;
  regexp: string;
  kind?: 'file' | 'location';
  file?: number;
  location?: number;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  severity?: number;
  code?: number;
  message?: number;
  loop?: boolean;
}

export interface ContributedTaskDefinition {
  type: string;
  required?: string[];
  properties?: Record<string, ConfigurationProperty>;
  when?: string;
}

export interface ContributedTerminal {
  profiles?: ContributedTerminalProfile[];
}

export interface ContributedTerminalProfile {
  id: string;
  title: string;
  icon?: string;
}

export interface ContributedCustomEditor {
  viewType: string;
  displayName: string;
  selector: { filenamePattern: string }[];
  priority?: 'default' | 'option';
}

export interface ContributedWebviewPanel {
  viewType: string;
  id: string;
  label: string;
}

export interface ContributedWalkthrough {
  id: string;
  title: string;
  description: string;
  steps: WalkthroughStep[];
  featuredFor?: string[];
  when?: string;
}

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  media?: { image?: string; markdown?: string; altText?: string };
  completionEvents?: string[];
  when?: string;
}

// ============================================================================
// EXTENSION CONTEXT
// ============================================================================

export interface ExtensionContext {
  // Unique ID
  readonly extensionId: string;
  readonly extensionUri: string;
  readonly extensionPath: string;
  
  // Storage paths
  readonly globalStoragePath: string;
  readonly storagePath: string;
  readonly logPath: string;
  
  // State storage
  readonly globalState: Memento;
  readonly workspaceState: Memento;
  
  // Secrets
  readonly secrets: SecretStorage;
  
  // Subscriptions for cleanup
  readonly subscriptions: { dispose(): void }[];
  
  // Extension mode
  readonly extensionMode: ExtensionMode;
  
  // Environment
  readonly environmentVariableCollection: EnvironmentVariableCollection;
  
  // Extension
  readonly extension: Extension;
  
  // Storage URI
  readonly globalStorageUri: { fsPath: string; path: string };
  readonly storageUri: { fsPath: string; path: string } | undefined;
  readonly logUri: { fsPath: string; path: string };
}

export interface Memento {
  keys(): readonly string[];
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Promise<void>;
  setKeysForSync(keys: readonly string[]): void;
}

export interface SecretStorage {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  onDidChange: (listener: (e: { key: string }) => void) => { dispose(): void };
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

export interface EnvironmentVariableCollection {
  persistent: boolean;
  description: string | { value: string; isMarkdown: boolean } | undefined;
  replace(variable: string, value: string, options?: { applyAtProcessCreation?: boolean; applyAtShellIntegration?: boolean }): void;
  append(variable: string, value: string, options?: { applyAtProcessCreation?: boolean; applyAtShellIntegration?: boolean }): void;
  prepend(variable: string, value: string, options?: { applyAtProcessCreation?: boolean; applyAtShellIntegration?: boolean }): void;
  get(variable: string): { value: string; type: number; options: any } | undefined;
  forEach(callback: (variable: string, mutator: any, collection: any) => void): void;
  delete(variable: string): void;
  clear(): void;
}

// ============================================================================
// EXTENSION
// ============================================================================

export interface Extension {
  readonly id: string;
  readonly extensionUri: string;
  readonly extensionPath: string;
  readonly isActive: boolean;
  readonly packageJSON: ExtensionManifest;
  readonly extensionKind: ExtensionKind;
  readonly exports: any;
  activate(): Promise<any>;
}

export enum ExtensionKind {
  UI = 1,
  Workspace = 2,
}

// ============================================================================
// EXTENSION HOST
// ============================================================================

export interface ExtensionAPI {
  activate(context: ExtensionContext): Promise<any> | any;
  deactivate?(): Promise<void> | void;
}

export interface LoadedExtension {
  manifest: ExtensionManifest;
  context: ExtensionContext;
  api: ExtensionAPI | null;
  status: 'inactive' | 'activating' | 'active' | 'error';
  error?: Error;
  activationTime?: number;
}

export class ExtensionHost extends EventEmitter {
  private extensions: Map<string, LoadedExtension> = new Map();
  private commandHandlers: Map<string, (...args: any[]) => any> = new Map();
  private configurationListeners: Map<string, Set<(e: any) => void>> = new Map();
  private disposables: Map<string, Set<{ dispose(): void }>> = new Map();
  
  constructor() {
    super();
  }
  
  // ==========================================================================
  // EXTENSION LIFECYCLE
  // ==========================================================================
  
  async loadExtension(manifest: ExtensionManifest, extensionPath: string): Promise<void> {
    const id = `${manifest.publisher}.${manifest.name}`;
    
    if (this.extensions.has(id)) {
      throw new Error(`Extension ${id} is already loaded`);
    }
    
    // Create extension context
    const context = this.createExtensionContext(id, manifest, extensionPath);
    
    const loadedExt: LoadedExtension = {
      manifest,
      context,
      api: null,
      status: 'inactive',
    };
    
    this.extensions.set(id, loadedExt);
    this.disposables.set(id, new Set());
    
    // Register contributions
    if (manifest.contributes) {
      this.registerContributions(id, manifest.contributes);
    }
    
    this.emit('extensionLoaded', { id, manifest });
    
    // Check for immediate activation
    if (this.shouldActivateOnStartup(manifest)) {
      await this.activateExtension(id);
    }
  }
  
  async activateExtension(id: string): Promise<any> {
    const ext = this.extensions.get(id);
    if (!ext) {
      throw new Error(`Extension ${id} not found`);
    }
    
    if (ext.status === 'active') {
      return ext.api?.activate(ext.context);
    }
    
    if (ext.status === 'activating') {
      // Wait for activation to complete
      return new Promise((resolve, reject) => {
        const handler = (event: any) => {
          if (event.id === id) {
            this.off('extensionActivated', handler);
            this.off('extensionActivationFailed', handler);
            if (event.error) {
              reject(event.error);
            } else {
              resolve(event.exports);
            }
          }
        };
        this.on('extensionActivated', handler);
        this.on('extensionActivationFailed', handler);
      });
    }
    
    ext.status = 'activating';
    const startTime = Date.now();
    
    try {
      // Activate dependencies first
      if (ext.manifest.extensionDependencies) {
        for (const depId of ext.manifest.extensionDependencies) {
          await this.activateExtension(depId);
        }
      }
      
      // Load extension module
      let api: ExtensionAPI;
      
      if (ext.manifest.browser) {
        // Browser extension
        const module = await import(/* webpackIgnore: true */ `${ext.context.extensionPath}/${ext.manifest.browser}`);
        api = module.default || module;
      } else if (ext.manifest.main) {
        // Node.js extension
        const module = await import(/* webpackIgnore: true */ `${ext.context.extensionPath}/${ext.manifest.main}`);
        api = module.default || module;
      } else {
        // No entry point - contribution-only extension
        ext.status = 'active';
        ext.activationTime = Date.now() - startTime;
        this.emit('extensionActivated', { id, exports: undefined });
        return undefined;
      }
      
      ext.api = api;
      
      // Call activate
      const exports = await api.activate(ext.context);
      
      ext.status = 'active';
      ext.activationTime = Date.now() - startTime;
      
      this.emit('extensionActivated', { id, exports, activationTime: ext.activationTime });
      
      return exports;
      
    } catch (error: any) {
      ext.status = 'error';
      ext.error = error;
      
      this.emit('extensionActivationFailed', { id, error });
      
      throw error;
    }
  }
  
  async deactivateExtension(id: string): Promise<void> {
    const ext = this.extensions.get(id);
    if (!ext || ext.status !== 'active') return;
    
    try {
      // Call deactivate if defined
      if (ext.api?.deactivate) {
        await ext.api.deactivate();
      }
      
      // Dispose all subscriptions
      for (const disposable of ext.context.subscriptions) {
        try {
          disposable.dispose();
        } catch (e) {
          console.error(`Error disposing subscription for ${id}:`, e);
        }
      }
      
      // Clear disposables
      const extDisposables = this.disposables.get(id);
      if (extDisposables) {
        for (const d of extDisposables) {
          try {
            d.dispose();
          } catch (e) {
            console.error(`Error disposing for ${id}:`, e);
          }
        }
        extDisposables.clear();
      }
      
      ext.status = 'inactive';
      
      this.emit('extensionDeactivated', { id });
      
    } catch (error) {
      console.error(`Error deactivating extension ${id}:`, error);
      throw error;
    }
  }
  
  async unloadExtension(id: string): Promise<void> {
    await this.deactivateExtension(id);
    
    // Unregister contributions
    const ext = this.extensions.get(id);
    if (ext?.manifest.contributes) {
      this.unregisterContributions(id, ext.manifest.contributes);
    }
    
    this.extensions.delete(id);
    this.disposables.delete(id);
    
    this.emit('extensionUnloaded', { id });
  }
  
  // ==========================================================================
  // COMMANDS
  // ==========================================================================
  
  registerCommand(command: string, handler: (...args: any[]) => any, extensionId?: string): { dispose(): void } {
    if (this.commandHandlers.has(command)) {
      throw new Error(`Command ${command} is already registered`);
    }
    
    this.commandHandlers.set(command, handler);
    
    const disposable = {
      dispose: () => {
        this.commandHandlers.delete(command);
      },
    };
    
    // Track for extension cleanup
    if (extensionId) {
      this.disposables.get(extensionId)?.add(disposable);
    }
    
    return disposable;
  }
  
  async executeCommand<T = any>(command: string, ...args: any[]): Promise<T> {
    const handler = this.commandHandlers.get(command);
    if (!handler) {
      throw new Error(`Command ${command} not found`);
    }
    
    return handler(...args);
  }
  
  getCommands(filterInternal: boolean = true): string[] {
    const commands = Array.from(this.commandHandlers.keys());
    if (filterInternal) {
      return commands.filter(c => !c.startsWith('_'));
    }
    return commands;
  }
  
  // ==========================================================================
  // ACTIVATION EVENTS
  // ==========================================================================
  
  async triggerActivationEvent(event: string): Promise<void> {
    for (const [id, ext] of this.extensions) {
      if (ext.status === 'inactive' && this.matchesActivationEvent(ext.manifest, event)) {
        try {
          await this.activateExtension(id);
        } catch (error) {
          console.error(`Failed to activate ${id} for event ${event}:`, error);
        }
      }
    }
  }
  
  private matchesActivationEvent(manifest: ExtensionManifest, event: string): boolean {
    if (!manifest.activationEvents) return false;
    
    for (const activationEvent of manifest.activationEvents) {
      if (activationEvent === '*') return true;
      if (activationEvent === event) return true;
      
      // Pattern matching
      if (activationEvent.startsWith('onLanguage:')) {
        const lang = activationEvent.slice('onLanguage:'.length);
        if (event === `onLanguage:${lang}`) return true;
      }
      
      if (activationEvent.startsWith('onCommand:')) {
        const cmd = activationEvent.slice('onCommand:'.length);
        if (event === `onCommand:${cmd}`) return true;
      }
      
      if (activationEvent.startsWith('workspaceContains:')) {
        const pattern = activationEvent.slice('workspaceContains:'.length);
        if (event.startsWith('workspaceContains:')) return true;
      }
      
      if (activationEvent === 'onStartupFinished' && event === 'onStartupFinished') {
        return true;
      }
    }
    
    return false;
  }
  
  private shouldActivateOnStartup(manifest: ExtensionManifest): boolean {
    return manifest.activationEvents?.includes('*') || false;
  }
  
  // ==========================================================================
  // CONTRIBUTIONS
  // ==========================================================================
  
  private registerContributions(extensionId: string, contributes: ExtensionContributions): void {
    // Register commands
    if (contributes.commands) {
      for (const cmd of contributes.commands) {
        this.emit('commandContributed', { extensionId, command: cmd });
      }
    }
    
    // Register keybindings
    if (contributes.keybindings) {
      for (const kb of contributes.keybindings) {
        this.emit('keybindingContributed', { extensionId, keybinding: kb });
      }
    }
    
    // Register languages
    if (contributes.languages) {
      for (const lang of contributes.languages) {
        this.emit('languageContributed', { extensionId, language: lang });
      }
    }
    
    // Register themes
    if (contributes.themes) {
      for (const theme of contributes.themes) {
        this.emit('themeContributed', { extensionId, theme });
      }
    }
    
    // Register snippets
    if (contributes.snippets) {
      for (const snippet of contributes.snippets) {
        this.emit('snippetContributed', { extensionId, snippet });
      }
    }
    
    // Register configuration
    if (contributes.configuration) {
      this.emit('configurationContributed', { extensionId, configuration: contributes.configuration });
    }
    
    // Register views
    if (contributes.views) {
      this.emit('viewsContributed', { extensionId, views: contributes.views });
    }
    
    // Register view containers
    if (contributes.viewsContainers) {
      this.emit('viewContainersContributed', { extensionId, viewsContainers: contributes.viewsContainers });
    }
    
    // Register debuggers
    if (contributes.debuggers) {
      for (const debugger_ of contributes.debuggers) {
        this.emit('debuggerContributed', { extensionId, debugger: debugger_ });
      }
    }
  }
  
  private unregisterContributions(extensionId: string, contributes: ExtensionContributions): void {
    this.emit('contributionsUnregistered', { extensionId });
  }
  
  // ==========================================================================
  // CONTEXT
  // ==========================================================================
  
  private createExtensionContext(id: string, manifest: ExtensionManifest, extensionPath: string): ExtensionContext {
    const globalStoragePath = `/extensions/${id}/globalStorage`;
    const storagePath = `/workspace/extensions/${id}/storage`;
    const logPath = `/extensions/${id}/logs`;
    
    const globalState = this.createMemento(`${id}:global`);
    const workspaceState = this.createMemento(`${id}:workspace`);
    const secrets = this.createSecretStorage(id);
    const subscriptions: { dispose(): void }[] = [];
    
    const context: ExtensionContext = {
      extensionId: id,
      extensionUri: extensionPath,
      extensionPath,
      globalStoragePath,
      storagePath,
      logPath,
      globalState,
      workspaceState,
      secrets,
      subscriptions,
      extensionMode: ExtensionMode.Production,
      environmentVariableCollection: this.createEnvVarCollection(),
      extension: {
        id,
        extensionUri: extensionPath,
        extensionPath,
        isActive: false,
        packageJSON: manifest,
        extensionKind: ExtensionKind.UI,
        exports: null,
        activate: () => this.activateExtension(id),
      },
      globalStorageUri: { fsPath: globalStoragePath, path: globalStoragePath },
      storageUri: { fsPath: storagePath, path: storagePath },
      logUri: { fsPath: logPath, path: logPath },
    };
    
    return context;
  }
  
  private createMemento(key: string): Memento {
    const storage = new Map<string, any>();
    const syncKeys = new Set<string>();
    
    return {
      keys: () => Array.from(storage.keys()),
      get: <T>(k: string, defaultValue?: T): T | undefined => {
        return storage.has(k) ? storage.get(k) : defaultValue;
      },
      update: async (k: string, value: any) => {
        if (value === undefined) {
          storage.delete(k);
        } else {
          storage.set(k, value);
        }
      },
      setKeysForSync: (keys: readonly string[]) => {
        syncKeys.clear();
        keys.forEach(k => syncKeys.add(k));
      },
    };
  }
  
  private createSecretStorage(extensionId: string): SecretStorage {
    const secrets = new Map<string, string>();
    const listeners = new Set<(e: { key: string }) => void>();
    
    return {
      get: async (key: string) => secrets.get(key),
      store: async (key: string, value: string) => {
        secrets.set(key, value);
        listeners.forEach(l => l({ key }));
      },
      delete: async (key: string) => {
        secrets.delete(key);
        listeners.forEach(l => l({ key }));
      },
      onDidChange: (listener) => {
        listeners.add(listener);
        return { dispose: () => listeners.delete(listener) };
      },
    };
  }
  
  private createEnvVarCollection(): EnvironmentVariableCollection {
    const vars = new Map<string, { value: string; type: number; options: any }>();
    
    return {
      persistent: true,
      description: undefined,
      replace: (variable, value, options) => vars.set(variable, { value, type: 1, options }),
      append: (variable, value, options) => vars.set(variable, { value, type: 2, options }),
      prepend: (variable, value, options) => vars.set(variable, { value, type: 3, options }),
      get: (variable) => vars.get(variable),
      forEach: (callback) => vars.forEach((v, k) => callback(k, v, vars)),
      delete: (variable) => { vars.delete(variable); },
      clear: () => vars.clear(),
    };
  }
  
  // ==========================================================================
  // QUERIES
  // ==========================================================================
  
  getExtension(id: string): LoadedExtension | undefined {
    return this.extensions.get(id);
  }
  
  getAllExtensions(): LoadedExtension[] {
    return Array.from(this.extensions.values());
  }
  
  getActiveExtensions(): LoadedExtension[] {
    return this.getAllExtensions().filter(e => e.status === 'active');
  }
  
  isExtensionActive(id: string): boolean {
    return this.extensions.get(id)?.status === 'active';
  }
}

// ============================================================================
// EXTENSION MARKETPLACE
// ============================================================================

export interface MarketplaceExtension {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  publisherDisplayName: string;
  version: string;
  description: string;
  icon?: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  lastUpdated: string;
  categories: string[];
  tags: string[];
  verified: boolean;
}

export interface SearchResult {
  extensions: MarketplaceExtension[];
  totalCount: number;
  pageSize: number;
  pageNumber: number;
}

export class ExtensionMarketplace extends EventEmitter {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'https://marketplace.aethel.dev/api') {
    super();
    this.baseUrl = baseUrl;
  }
  
  async search(query: string, options?: {
    category?: string;
    sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
    sortOrder?: 'asc' | 'desc';
    pageSize?: number;
    pageNumber?: number;
  }): Promise<SearchResult> {
    // Mock implementation - replace with real API call
    return {
      extensions: [],
      totalCount: 0,
      pageSize: options?.pageSize || 20,
      pageNumber: options?.pageNumber || 1,
    };
  }
  
  async getExtension(id: string): Promise<MarketplaceExtension | null> {
    // Mock implementation
    return null;
  }
  
  async getExtensionVersions(id: string): Promise<string[]> {
    return [];
  }
  
  async downloadExtension(id: string, version?: string): Promise<ArrayBuffer> {
    throw new Error('Not implemented');
  }
  
  async installExtension(id: string, version?: string): Promise<void> {
    const data = await this.downloadExtension(id, version);
    // Unpack and install
    this.emit('extensionInstalled', { id, version });
  }
  
  async getInstalled(): Promise<string[]> {
    return [];
  }
  
  async getOutdated(): Promise<{ id: string; currentVersion: string; latestVersion: string }[]> {
    return [];
  }
}

// ============================================================================
// SINGLETONS
// ============================================================================

export const extensionHost = new ExtensionHost();
export const extensionMarketplace = new ExtensionMarketplace();

export default extensionHost;
