/**
 * Extension Loader
 * Loads and manages VS Code compatible extensions
 */

export interface ExtensionManifest {
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  description: string;
  main?: string;
  browser?: string;
  contributes?: ExtensionContributions;
  activationEvents?: string[];
  engines: {
    vscode: string;
  };
  categories?: string[];
  keywords?: string[];
  icon?: string;
  repository?: {
    type: string;
    url: string;
  };
  license?: string;
}

export interface ExtensionContributions {
  commands?: CommandContribution[];
  languages?: LanguageContribution[];
  grammars?: GrammarContribution[];
  themes?: ThemeContribution[];
  keybindings?: KeybindingContribution[];
  menus?: MenuContribution[];
  views?: ViewContribution[];
  viewsContainers?: ViewsContainerContribution[];
  configuration?: ConfigurationContribution;
  debuggers?: DebuggerContribution[];
  taskDefinitions?: TaskDefinitionContribution[];
}

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string;
}

export interface LanguageContribution {
  id: string;
  aliases?: string[];
  extensions?: string[];
  filenames?: string[];
  configuration?: string;
}

export interface GrammarContribution {
  language: string;
  scopeName: string;
  path: string;
}

export interface ThemeContribution {
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black';
  path: string;
}

export interface KeybindingContribution {
  command: string;
  key: string;
  when?: string;
  mac?: string;
  linux?: string;
  win?: string;
}

export interface MenuContribution {
  [key: string]: Array<{
    command: string;
    when?: string;
    group?: string;
  }>;
}

export interface ViewContribution {
  [key: string]: Array<{
    id: string;
    name: string;
    when?: string;
  }>;
}

export interface ViewsContainerContribution {
  [key: string]: Array<{
    id: string;
    title: string;
    icon: string;
  }>;
}

export interface ConfigurationContribution {
  title?: string;
  properties: {
    [key: string]: {
      type: string;
      default?: any;
      description?: string;
      enum?: any[];
      enumDescriptions?: string[];
    };
  };
}

export interface DebuggerContribution {
  type: string;
  label: string;
  program?: string;
  runtime?: string;
  configurationAttributes?: any;
}

export interface TaskDefinitionContribution {
  type: string;
  required?: string[];
  properties?: {
    [key: string]: {
      type: string;
      description?: string;
    };
  };
}

export interface LoadedExtension {
  id: string;
  manifest: ExtensionManifest;
  extensionPath: string;
  isActive: boolean;
  exports?: any;
  module?: any;
  activationPromise?: Promise<void>;
}

export class ExtensionLoader {
  private extensions: Map<string, LoadedExtension> = new Map();
  private activationEvents: Map<string, Set<string>> = new Map();

  private commands: Map<string, { extensionId: string; command: CommandContribution }> = new Map();
  private languages: Map<string, { extensionId: string; language: LanguageContribution }> = new Map();
  private themes: Map<string, { extensionId: string; theme: ThemeContribution }> = new Map();
  private keybindings: Array<{ extensionId: string; keybinding: KeybindingContribution }> = [];
  private debuggers: Map<string, { extensionId: string; debugger: DebuggerContribution }> = new Map();

  private static readonly GLOBAL_STATE_PREFIX = 'aethel.extensions.globalState.';
  private static readonly WORKSPACE_STATE_PREFIX = 'aethel.extensions.workspaceState.';

  private ensureBrowserOnly(): void {
    if (typeof window === 'undefined' || typeof window.location === 'undefined') {
      throw new Error('Extension loading is only supported in the browser runtime.');
    }
  }

  private resolveExtensionBaseUrl(extensionPath: string): { baseUrl: URL; baseHref: string } {
    this.ensureBrowserOnly();

    const raw = String(extensionPath || '').trim();
    if (!raw) throw new Error('Invalid extensionPath');
    if (raw.includes('..')) throw new Error('Invalid extensionPath (path traversal not allowed)');

    const baseUrl = new URL(raw, window.location.origin);

    if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
      throw new Error('Invalid extensionPath protocol');
    }

    if (baseUrl.origin !== window.location.origin) {
      throw new Error('Cross-origin extensions are not allowed');
    }

    // Normaliza para evitar duplas barras e trailing slash
    const normalized = new URL(baseUrl.href);
    normalized.hash = '';
    normalized.search = '';
    normalized.pathname = normalized.pathname.replace(/\/+$/, '');

    const baseHref = normalized.href.endsWith('/') ? normalized.href : `${normalized.href}/`;
    return { baseUrl: normalized, baseHref };
  }

  private resolveExtensionResource(baseHref: string, relativePath: string): string {
    const res = new URL(relativePath, baseHref);

    // Fail-closed: só permite acessar recursos dentro da base da extensão
    if (!res.href.startsWith(baseHref)) {
      throw new Error('Extension resource must stay within extensionPath');
    }

    return res.href;
  }

  private async importExtensionModule(moduleUrl: string): Promise<any> {
    // webpackIgnore evita que o bundler tente resolver paths arbitrários em build-time.
    return await import(/* webpackIgnore: true */ moduleUrl);
  }

  private getStorage(): Storage | null {
    try {
      if (typeof window === 'undefined') return null;
      if (!window.localStorage) return null;
      return window.localStorage;
    } catch {
      return null;
    }
  }

  async loadExtension(extensionPath: string): Promise<LoadedExtension> {
    try {
      const { baseHref } = this.resolveExtensionBaseUrl(extensionPath);

      // Load package.json
      const manifestUrl = this.resolveExtensionResource(baseHref, 'package.json');
      const manifestResponse = await fetch(manifestUrl);
      const manifest: ExtensionManifest = await manifestResponse.json();

      if (!manifest?.publisher || !manifest?.name || !manifest?.version) {
        throw new Error('Invalid extension manifest');
      }

      const extensionId = `${manifest.publisher}.${manifest.name}`;

      // Check if already loaded
      if (this.extensions.has(extensionId)) {
        return this.extensions.get(extensionId)!;
      }

      const extension: LoadedExtension = {
        id: extensionId,
        manifest,
        extensionPath: baseHref.replace(/\/+$/, ''),
        isActive: false
      };

      // Register activation events
      if (manifest.activationEvents) {
        for (const event of manifest.activationEvents) {
          if (!this.activationEvents.has(event)) {
            this.activationEvents.set(event, new Set());
          }
          this.activationEvents.get(event)!.add(extensionId);
        }
      }

      // Register contributions
      if (manifest.contributes) {
        await this.registerContributions(extensionId, manifest.contributes);
      }

      this.extensions.set(extensionId, extension);

      // Auto-activate if needed
      if (manifest.activationEvents?.includes('*')) {
        await this.activateExtension(extensionId);
      }

      return extension;
    } catch (error) {
      console.error(`Failed to load extension from ${extensionPath}:`, error);
      throw error;
    }
  }

  async activateExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension not found: ${extensionId}`);
    }

    if (extension.isActive) {
      return;
    }

    if (extension.activationPromise) {
      return extension.activationPromise;
    }

    extension.activationPromise = this.doActivateExtension(extension);
    await extension.activationPromise;
  }

  private async doActivateExtension(extension: LoadedExtension): Promise<void> {
    try {
      const entryPoint = extension.manifest.browser || extension.manifest.main;
      if (!entryPoint) {
        extension.isActive = true;
        return;
      }

      // Load extension code
      const { baseHref } = this.resolveExtensionBaseUrl(extension.extensionPath);
      const modulePath = this.resolveExtensionResource(baseHref, entryPoint);
      const extModule = await this.importExtensionModule(modulePath);
      extension.module = extModule;

      // Call activate function
      if (extModule.activate) {
        const context = this.createExtensionContext(extension);
        extension.exports = await extModule.activate(context);
      }

      extension.isActive = true;
      console.log(`Extension activated: ${extension.id}`);
    } catch (error) {
      console.error(`Failed to activate extension ${extension.id}:`, error);
      throw error;
    }
  }

  async deactivateExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension || !extension.isActive) {
      return;
    }

    try {
      const entryPoint = extension.manifest.browser || extension.manifest.main;
      if (entryPoint) {
        const extModule = extension.module
          ? extension.module
          : await this.importExtensionModule(
              this.resolveExtensionResource(
                this.resolveExtensionBaseUrl(extension.extensionPath).baseHref,
                entryPoint
              )
            );

        if (extModule.deactivate) {
          await extModule.deactivate();
        }
      }

      extension.isActive = false;
      extension.activationPromise = undefined;
      console.log(`Extension deactivated: ${extension.id}`);
    } catch (error) {
      console.error(`Failed to deactivate extension ${extension.id}:`, error);
    }
  }

  async unloadExtension(extensionId: string): Promise<void> {
    await this.deactivateExtension(extensionId);
    
    const extension = this.extensions.get(extensionId);
    if (extension) {
      // Unregister contributions
      if (extension.manifest.contributes) {
        await this.unregisterContributions(extensionId, extension.manifest.contributes);
      }

      // Remove activation events
      if (extension.manifest.activationEvents) {
        for (const event of extension.manifest.activationEvents) {
          const extensions = this.activationEvents.get(event);
          if (extensions) {
            extensions.delete(extensionId);
          }
        }
      }

      this.extensions.delete(extensionId);
    }
  }

  async handleActivationEvent(event: string): Promise<void> {
    const extensionIds = this.activationEvents.get(event);
    if (!extensionIds) {
      return;
    }

    const activationPromises = Array.from(extensionIds).map(id =>
      this.activateExtension(id).catch(error =>
        console.error(`Failed to activate extension ${id} for event ${event}:`, error)
      )
    );

    await Promise.all(activationPromises);
  }

  getExtension(extensionId: string): LoadedExtension | undefined {
    return this.extensions.get(extensionId);
  }

  getAllExtensions(): LoadedExtension[] {
    return Array.from(this.extensions.values());
  }

  getActiveExtensions(): LoadedExtension[] {
    return Array.from(this.extensions.values()).filter(ext => ext.isActive);
  }

  private createExtensionContext(extension: LoadedExtension): any {
    const baseHref = this.resolveExtensionBaseUrl(extension.extensionPath).baseHref;

    return {
      subscriptions: [],
      extensionPath: extension.extensionPath,
      extensionUri: extension.extensionPath,
      globalState: {
        get: (key: string) => this.getGlobalState(extension.id, key),
        update: (key: string, value: any) => this.updateGlobalState(extension.id, key, value)
      },
      workspaceState: {
        get: (key: string) => this.getWorkspaceState(extension.id, key),
        update: (key: string, value: any) => this.updateWorkspaceState(extension.id, key, value)
      },
      asAbsolutePath: (relativePath: string) => this.resolveExtensionResource(baseHref, relativePath)
    };
  }

  private async registerContributions(
    extensionId: string,
    contributions: ExtensionContributions
  ): Promise<void> {
    // Register commands
    if (contributions.commands) {
      for (const command of contributions.commands) {
        await this.registerCommand(extensionId, command);
      }
    }

    // Register languages
    if (contributions.languages) {
      for (const language of contributions.languages) {
        await this.registerLanguage(extensionId, language);
      }
    }

    // Register themes
    if (contributions.themes) {
      for (const theme of contributions.themes) {
        await this.registerTheme(extensionId, theme);
      }
    }

    // Register keybindings
    if (contributions.keybindings) {
      for (const keybinding of contributions.keybindings) {
        await this.registerKeybinding(extensionId, keybinding);
      }
    }

    // Register debuggers
    if (contributions.debuggers) {
      for (const debuggerContribution of contributions.debuggers) {
        await this.registerDebugger(extensionId, debuggerContribution);
      }
    }
  }

  private async unregisterContributions(
    extensionId: string,
    contributions: ExtensionContributions
  ): Promise<void> {
    if (contributions.commands) {
      for (const command of contributions.commands) {
        const existing = this.commands.get(command.command);
        if (existing?.extensionId === extensionId) this.commands.delete(command.command);
      }
    }

    if (contributions.languages) {
      for (const language of contributions.languages) {
        const existing = this.languages.get(language.id);
        if (existing?.extensionId === extensionId) this.languages.delete(language.id);
      }
    }

    if (contributions.themes) {
      for (const theme of contributions.themes) {
        const existing = this.themes.get(theme.label);
        if (existing?.extensionId === extensionId) this.themes.delete(theme.label);
      }
    }

    if (contributions.keybindings) {
      this.keybindings = this.keybindings.filter(kb => kb.extensionId !== extensionId);
    }

    if (contributions.debuggers) {
      for (const dbg of contributions.debuggers) {
        const existing = this.debuggers.get(dbg.type);
        if (existing?.extensionId === extensionId) this.debuggers.delete(dbg.type);
      }
    }
  }

  private async registerCommand(extensionId: string, command: CommandContribution): Promise<void> {
    this.commands.set(command.command, { extensionId, command });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Registered command: ${command.command} from ${extensionId}`);
    }
  }

  private async registerLanguage(extensionId: string, language: LanguageContribution): Promise<void> {
    this.languages.set(language.id, { extensionId, language });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Registered language: ${language.id} from ${extensionId}`);
    }
  }

  private async registerTheme(extensionId: string, theme: ThemeContribution): Promise<void> {
    this.themes.set(theme.label, { extensionId, theme });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Registered theme: ${theme.label} from ${extensionId}`);
    }
  }

  private async registerKeybinding(extensionId: string, keybinding: KeybindingContribution): Promise<void> {
    this.keybindings.push({ extensionId, keybinding });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Registered keybinding: ${keybinding.key} -> ${keybinding.command} from ${extensionId}`);
    }
  }

  private async registerDebugger(extensionId: string, debuggerContribution: DebuggerContribution): Promise<void> {
    this.debuggers.set(debuggerContribution.type, { extensionId, debugger: debuggerContribution });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Registered debugger: ${debuggerContribution.type} from ${extensionId}`);
    }
  }

  private getGlobalState(extensionId: string, key: string): any {
    const storage = this.getStorage();
    if (!storage) return undefined;

    const raw = storage.getItem(`${ExtensionLoader.GLOBAL_STATE_PREFIX}${extensionId}`);
    if (!raw) return undefined;
    try {
      const data = JSON.parse(raw) as Record<string, any>;
      return data[key];
    } catch {
      return undefined;
    }
  }

  private updateGlobalState(extensionId: string, key: string, value: any): void {
    const storage = this.getStorage();
    if (!storage) return;

    const storageKey = `${ExtensionLoader.GLOBAL_STATE_PREFIX}${extensionId}`;
    const raw = storage.getItem(storageKey);
    let data: Record<string, any> = {};

    if (raw) {
      try {
        data = JSON.parse(raw) as Record<string, any>;
      } catch {
        data = {};
      }
    }

    data[key] = value;
    try {
      storage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // ignore quota / serialization issues
    }
  }

  private getWorkspaceState(extensionId: string, key: string): any {
    const storage = this.getStorage();
    if (!storage) return undefined;

    const raw = storage.getItem(`${ExtensionLoader.WORKSPACE_STATE_PREFIX}${extensionId}`);
    if (!raw) return undefined;
    try {
      const data = JSON.parse(raw) as Record<string, any>;
      return data[key];
    } catch {
      return undefined;
    }
  }

  private updateWorkspaceState(extensionId: string, key: string, value: any): void {
    const storage = this.getStorage();
    if (!storage) return;

    const storageKey = `${ExtensionLoader.WORKSPACE_STATE_PREFIX}${extensionId}`;
    const raw = storage.getItem(storageKey);
    let data: Record<string, any> = {};

    if (raw) {
      try {
        data = JSON.parse(raw) as Record<string, any>;
      } catch {
        data = {};
      }
    }

    data[key] = value;
    try {
      storage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // ignore quota / serialization issues
    }
  }

  // Getters utilitários (para UI/diagnóstico)
  getRegisteredCommands(): Array<{ extensionId: string; command: CommandContribution }> {
    return Array.from(this.commands.values());
  }

  getRegisteredLanguages(): Array<{ extensionId: string; language: LanguageContribution }> {
    return Array.from(this.languages.values());
  }

  getRegisteredThemes(): Array<{ extensionId: string; theme: ThemeContribution }> {
    return Array.from(this.themes.values());
  }

  getRegisteredKeybindings(): Array<{ extensionId: string; keybinding: KeybindingContribution }> {
    return [...this.keybindings];
  }

  getRegisteredDebuggers(): Array<{ extensionId: string; debugger: DebuggerContribution }> {
    return Array.from(this.debuggers.values());
  }
}

// Singleton instance
let extensionLoaderInstance: ExtensionLoader | null = null;

export function getExtensionLoader(): ExtensionLoader {
  if (!extensionLoaderInstance) {
    extensionLoaderInstance = new ExtensionLoader();
  }
  return extensionLoaderInstance;
}

export function resetExtensionLoader(): void {
  extensionLoaderInstance = null;
}
