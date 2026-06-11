/**
 * Aethel Extension System
 *
 * Sistema completo de extensões similar ao VS Code.
 * Permite desenvolvedores criar e distribuir extensões.
 */

import { EventEmitter } from 'events';
import { createComponentLogger } from '@/lib/observability/logger';
import { ExtensionKind, ExtensionMode } from './extension-contracts';
import { ExtensionMarketplace } from './extension-marketplace';
import { createExtensionContext } from './extension-context-factory';
import type {
  EnvironmentVariableCollection,
  EnvironmentVariableMutator,
  Extension,
  ExtensionAPI,
  ExtensionContributions,
  ExtensionContext,
  ExtensionManifest,
  LoadedExtension,
  Memento,
  SearchResult,
  SecretStorage,
} from './extension-contracts';
export { ExtensionKind, ExtensionMode } from './extension-contracts';
export type {
  ContributedBreakpoint,
  ContributedColor,
  ContributedCommand,
  ContributedConfiguration,
  ContributedCustomEditor,
  ContributedDebugger,
  ContributedGrammar,
  ContributedIconTheme,
  ContributedKeybinding,
  ContributedLanguage,
  ContributedMenus,
  ContributedProblemMatcher,
  ContributedProblemPattern,
  ContributedSnippet,
  ContributedTaskDefinition,
  ContributedTerminal,
  ContributedTerminalProfile,
  ContributedTheme,
  ContributedViews,
  ContributedViewsContainers,
  ContributedViewsWelcome,
  ContributedWalkthrough,
  ConfigurationProperty,
  EnvironmentVariableCollection,
  EnvironmentVariableMutator,
  Extension,
  ExtensionAPI,
  ExtensionCategory,
  ExtensionContributions,
  ExtensionContext,
  ExtensionManifest,
  LoadedExtension,
  MarketplaceExtension,
  Memento,
  MenuItem,
  SearchResult,
  SecretStorage,
  ViewContainerDescriptor,
  ViewDescriptor,
  WalkthroughStep,
} from './extension-contracts';

const log = createComponentLogger('extensions/extension-system');

// ============================================================================
// EXTENSION HOST
// ============================================================================

export class ExtensionHost extends EventEmitter {
  private extensions: Map<string, LoadedExtension> = new Map();
  private commandHandlers: Map<string, (...args: unknown[]) => unknown> = new Map();
  private configurationListeners: Map<string, Set<(e: unknown) => void>> = new Map();
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

  async activateExtension(id: string): Promise<unknown> {
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
        const handler = (event: { id?: string; error?: unknown; exports?: unknown }) => {
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
        const extModule = await import(/* webpackIgnore: true */ `${ext.context.extensionPath}/${ext.manifest.browser}`);
        api = extModule.default || extModule;
      } else if (ext.manifest.main) {
        // Node.js extension
        const extModule = await import(/* webpackIgnore: true */ `${ext.context.extensionPath}/${ext.manifest.main}`);
        api = extModule.default || extModule;
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

    } catch (error) {
      ext.status = 'error';
      ext.error = error instanceof Error ? error : new Error(String(error));

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
          log.error(`Error disposing subscription for ${id}:`, e);
        }
      }

      // Clear disposables
      const extDisposables = this.disposables.get(id);
      if (extDisposables) {
        for (const d of extDisposables) {
          try {
            d.dispose();
          } catch (e) {
            log.error(`Error disposing for ${id}:`, e);
          }
        }
        extDisposables.clear();
      }

      ext.status = 'inactive';

      this.emit('extensionDeactivated', { id });

    } catch (error) {
      log.error(`Error deactivating extension ${id}:`, error);
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

  registerCommand(command: string, handler: (...args: unknown[]) => unknown, extensionId?: string): { dispose(): void } {
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

  async executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T> {
    const handler = this.commandHandlers.get(command);
    if (!handler) {
      throw new Error(`Command ${command} not found`);
    }

    return await Promise.resolve(handler(...args)) as T;
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
          log.error(`Failed to activate ${id} for event ${event}:`, error);
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
    return createExtensionContext({
      id,
      manifest,
      extensionPath,
      activateExtension: (extensionId) => this.activateExtension(extensionId),
    });
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

export { ExtensionMarketplace } from './extension-marketplace';

// ============================================================================
// SINGLETONS
// ============================================================================

export const extensionHost = new ExtensionHost();
export const extensionMarketplace = new ExtensionMarketplace();

export default extensionHost;
