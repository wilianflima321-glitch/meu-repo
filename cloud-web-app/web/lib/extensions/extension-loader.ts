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
  activationPromise?: Promise<void>;
}

export class ExtensionLoader {
  private extensions: Map<string, LoadedExtension> = new Map();
  private activationEvents: Map<string, Set<string>> = new Map();

  async loadExtension(extensionPath: string): Promise<LoadedExtension> {
    try {
      // Load package.json
      const manifestResponse = await fetch(`${extensionPath}/package.json`);
      const manifest: ExtensionManifest = await manifestResponse.json();

      const extensionId = `${manifest.publisher}.${manifest.name}`;

      // Check if already loaded
      if (this.extensions.has(extensionId)) {
        return this.extensions.get(extensionId)!;
      }

      const extension: LoadedExtension = {
        id: extensionId,
        manifest,
        extensionPath,
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
      const modulePath = `${extension.extensionPath}/${entryPoint}`;
      const module = await import(modulePath);

      // Call activate function
      if (module.activate) {
        const context = this.createExtensionContext(extension);
        extension.exports = await module.activate(context);
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
        const modulePath = `${extension.extensionPath}/${entryPoint}`;
        const module = await import(modulePath);

        if (module.deactivate) {
          await module.deactivate();
        }
      }

      extension.isActive = false;
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
      asAbsolutePath: (relativePath: string) => `${extension.extensionPath}/${relativePath}`
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
      for (const debugger of contributions.debuggers) {
        await this.registerDebugger(extensionId, debugger);
      }
    }
  }

  private async unregisterContributions(
    extensionId: string,
    contributions: ExtensionContributions
  ): Promise<void> {
    // Unregister all contributions
    // Implementation would remove registered items
  }

  private async registerCommand(extensionId: string, command: CommandContribution): Promise<void> {
    // Register command with command registry
    console.log(`Registered command: ${command.command} from ${extensionId}`);
  }

  private async registerLanguage(extensionId: string, language: LanguageContribution): Promise<void> {
    // Register language with language registry
    console.log(`Registered language: ${language.id} from ${extensionId}`);
  }

  private async registerTheme(extensionId: string, theme: ThemeContribution): Promise<void> {
    // Register theme with theme registry
    console.log(`Registered theme: ${theme.label} from ${extensionId}`);
  }

  private async registerKeybinding(extensionId: string, keybinding: KeybindingContribution): Promise<void> {
    // Register keybinding with keyboard manager
    console.log(`Registered keybinding: ${keybinding.key} -> ${keybinding.command} from ${extensionId}`);
  }

  private async registerDebugger(extensionId: string, debugger: DebuggerContribution): Promise<void> {
    // Register debugger with debug manager
    console.log(`Registered debugger: ${debugger.type} from ${extensionId}`);
  }

  private getGlobalState(extensionId: string, key: string): any {
    // Get from storage
    return undefined;
  }

  private updateGlobalState(extensionId: string, key: string, value: any): void {
    // Save to storage
  }

  private getWorkspaceState(extensionId: string, key: string): any {
    // Get from workspace storage
    return undefined;
  }

  private updateWorkspaceState(extensionId: string, key: string, value: any): void {
    // Save to workspace storage
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
