import {createComponentLogger, logger} from '@/lib/observability/logger'
import { BUILTIN_PLUGINS } from './plugin-system-builtins';
import type { Plugin, PluginCategory, PluginContext, PluginInstance, StateStorage, ThemeContribution } from './plugin-system-types';

export type {
  AIToolContribution,
  CommandContribution,
  ConfigurationContribution,
  GameComponentContribution,
  KeybindingContribution,
  LanguageContribution,
  MenuContribution,
  Plugin,
  PluginCategory,
  PluginContext,
  PluginContributions,
  PluginInstance,
  SnippetContribution,
  StateStorage,
  ThemeContribution,
  ViewContribution,
} from './plugin-system-types';
export { BUILTIN_PLUGINS } from './plugin-system-builtins';

const log = createComponentLogger('plugin-system')


/**
 * Plugin System - Sistema de Extensões
 * 
 * Permite estender o Aethel Engine com plugins customizados.
 * Inspirado no sistema de extensões do VSCode.
 */

// ============================================================================
// PLUGIN MANAGER
// ============================================================================

class PluginManager {
  private plugins: Map<string, PluginInstance> = new Map();
  private commands: Map<string, (...args: unknown[]) => unknown> = new Map();
  private views: Map<string, React.ComponentType> = new Map();
  private themes: Map<string, unknown> = new Map();
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  // ============================================================================
  // PLUGIN LIFECYCLE
  // ============================================================================

  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    const context = this.createContext(plugin);
    
    const instance: PluginInstance = {
      plugin,
      context,
      exports: {},
      isActive: false,
      activate: async () => {
        if (instance.isActive) return;
        
        // Load main module if specified
        if (plugin.main) {
          try {
            // Em produção, isso carregaria o módulo do plugin
            // const module = await import(plugin.main);
            // if (module.activate) {
            //   instance.exports = await module.activate(context);
            // }
            log.info(`Plugin ${plugin.id} activated`);
          } catch (error) {
            logger.error(`Failed to activate plugin ${plugin.id}:`, error);
            throw error;
          }
        }
        
        instance.isActive = true;
        this.emit('plugin:activated', plugin.id);
      },
      deactivate: async () => {
        if (!instance.isActive) return;
        
        // Cleanup subscriptions
        context.subscriptions.forEach(sub => sub.dispose());
        context.subscriptions.length = 0;
        
        instance.isActive = false;
        this.emit('plugin:deactivated', plugin.id);
      },
    };

    this.plugins.set(plugin.id, instance);
    
    // Register contributions
    this.registerContributions(plugin);
    
    this.emit('plugin:registered', plugin.id);
  }

  async unregister(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) return;

    await instance.deactivate();
    
    // Unregister contributions
    this.unregisterContributions(instance.plugin);
    
    this.plugins.delete(pluginId);
    this.emit('plugin:unregistered', pluginId);
  }

  async activate(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    await instance.activate();
  }

  async deactivate(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) return;

    await instance.deactivate();
  }

  async activateByEvent(event: string): Promise<void> {
    for (const [, instance] of this.plugins) {
      if (instance.plugin.activationEvents.includes(event) && !instance.isActive) {
        await instance.activate();
      }
    }
  }

  // ============================================================================
  // CONTRIBUTIONS
  // ============================================================================

  private registerContributions(plugin: Plugin): void {
    const contributions = plugin.contributes;
    if (!contributions) return;

    // Register commands
    contributions.commands?.forEach(cmd => {
      this.registerCommand(cmd.command, async () => {
        // Command implementation will be provided by plugin
        log.info(`Command executed: ${cmd.command}`);
      });
    });

    // Register themes
    contributions.themes?.forEach(theme => {
      this.themes.set(`${plugin.id}.${theme.id}`, theme);
    });

    // Other contributions would be registered here...
  }

  private unregisterContributions(plugin: Plugin): void {
    const contributions = plugin.contributes;
    if (!contributions) return;

    contributions.commands?.forEach(cmd => {
      this.commands.delete(cmd.command);
    });

    contributions.themes?.forEach(theme => {
      this.themes.delete(`${plugin.id}.${theme.id}`);
    });
  }

  // ============================================================================
  // COMMANDS
  // ============================================================================

  registerCommand(command: string, handler: (...args: unknown[]) => unknown): { dispose: () => void } {
    this.commands.set(command, handler);
    return {
      dispose: () => this.commands.delete(command),
    };
  }

  async executeCommand(command: string, ...args: unknown[]): Promise<unknown> {
    const handler = this.commands.get(command);
    if (!handler) {
      throw new Error(`Command ${command} not found`);
    }

    // Activate plugins that listen for this command
    await this.activateByEvent(`onCommand:${command}`);
    
    return handler(...args);
  }

  getCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  // ============================================================================
  // VIEWS
  // ============================================================================

  registerView(id: string, component: React.ComponentType): { dispose: () => void } {
    this.views.set(id, component);
    return {
      dispose: () => this.views.delete(id),
    };
  }

  getView(id: string): React.ComponentType | undefined {
    return this.views.get(id);
  }

  // ============================================================================
  // EVENTS
  // ============================================================================

  on(event: string, listener: (...args: unknown[]) => void): { dispose: () => void } {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
    
    return {
      dispose: () => {
        this.eventListeners.get(event)?.delete(listener);
      },
    };
  }

  private emit(event: string, ...args: unknown[]): void {
    this.eventListeners.get(event)?.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        logger.error(`Event listener error for ${event}:`, error);
      }
    });
  }

  // ============================================================================
  // CONTEXT CREATION
  // ============================================================================

  private createContext(plugin: Plugin): PluginContext {
    const workspaceState = this.createStateStorage(`workspace.${plugin.id}`);
    const globalState = this.createStateStorage(`global.${plugin.id}`);

    return {
      subscriptions: [],
      workspaceRoot: process.cwd(),
      workspaceState,
      globalState,
      extensionPath: `/plugins/${plugin.id}`,
      extensionUri: `aethel://plugins/${plugin.id}`,
      log: (message) => log.info(`[${plugin.id}] ${message}`),
      logError: (message, error) => logger.error(`[${plugin.id}] ${message}`, error),
    };
  }

  private createStateStorage(prefix: string): StateStorage {
    const storage = new Map<string, unknown>();

    return {
      get<T>(key: string, defaultValue?: T): T | undefined {
        const fullKey = `${prefix}.${key}`;
        if (storage.has(fullKey)) {
          return storage.get(fullKey) as T;
        }
        return defaultValue;
      },
      async update(key: string, value: unknown): Promise<void> {
        storage.set(`${prefix}.${key}`, value);
      },
      keys(): string[] {
        return Array.from(storage.keys())
          .filter(k => k.startsWith(prefix))
          .map(k => k.slice(prefix.length + 1));
      },
    };
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  getPlugin(id: string): PluginInstance | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): PluginInstance[] {
    return this.getAllPlugins().filter(p => p.isActive);
  }

  getPluginsByCategory(category: PluginCategory): PluginInstance[] {
    return this.getAllPlugins().filter(p => 
      p.plugin.categories.includes(category)
    );
  }

  getThemes(): { id: string; label: string; type: string }[] {
    return Array.from(this.themes.entries()).map(([id, theme]) => ({
      id,
      label: (theme as ThemeContribution).label,
      type: (theme as ThemeContribution).uiTheme,
    }));
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let pluginManagerInstance: PluginManager | null = null;

export function getPluginManager(): PluginManager {
  if (!pluginManagerInstance) {
    pluginManagerInstance = new PluginManager();
    
    // Register built-in plugins
    BUILTIN_PLUGINS.forEach(plugin => {
      pluginManagerInstance!.register(plugin);
    });
  }
  return pluginManagerInstance;
}

export default PluginManager;
