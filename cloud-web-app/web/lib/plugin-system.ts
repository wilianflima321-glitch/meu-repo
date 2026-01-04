/**
 * Plugin System - Sistema de Extensões
 * 
 * Permite estender o Aethel Engine com plugins customizados.
 * Inspirado no sistema de extensões do VSCode.
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  categories: PluginCategory[];
  activationEvents: string[];
  contributes?: PluginContributions;
  main?: string; // Entry point
  dependencies?: Record<string, string>;
}

export type PluginCategory =
  | 'editor'      // Extensões do editor
  | 'language'    // Suporte a linguagens
  | 'theme'       // Temas visuais
  | 'debugger'    // Debuggers
  | 'formatter'   // Formatadores de código
  | 'linter'      // Linters
  | 'snippet'     // Snippets
  | 'ai'          // Extensões de IA
  | 'game'        // Extensões de game engine
  | 'tool'        // Ferramentas gerais
  | 'other';

export interface PluginContributions {
  commands?: CommandContribution[];
  menus?: MenuContribution[];
  keybindings?: KeybindingContribution[];
  views?: ViewContribution[];
  languages?: LanguageContribution[];
  themes?: ThemeContribution[];
  configuration?: ConfigurationContribution;
  snippets?: SnippetContribution[];
  aiTools?: AIToolContribution[];
  gameComponents?: GameComponentContribution[];
}

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string;
}

export interface MenuContribution {
  menu: 'editor/context' | 'view/title' | 'commandPalette' | 'explorer/context';
  group?: string;
  command: string;
  when?: string;
}

export interface KeybindingContribution {
  command: string;
  key: string;
  mac?: string;
  when?: string;
}

export interface ViewContribution {
  id: string;
  name: string;
  icon?: string;
  location: 'sidebar' | 'panel' | 'toolbar';
}

export interface LanguageContribution {
  id: string;
  extensions: string[];
  aliases?: string[];
  firstLine?: string;
  configuration?: string;
}

export interface ThemeContribution {
  id: string;
  label: string;
  uiTheme: 'dark' | 'light' | 'highContrast';
  path: string;
}

export interface ConfigurationContribution {
  title: string;
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    default: unknown;
    description: string;
    enum?: unknown[];
  }>;
}

export interface SnippetContribution {
  language: string;
  path: string;
}

export interface AIToolContribution {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: string; // Function name to call
}

export interface GameComponentContribution {
  name: string;
  description: string;
  icon?: string;
  properties: Record<string, {
    type: string;
    default: unknown;
    description: string;
  }>;
}

// ============================================================================
// PLUGIN CONTEXT - API para plugins
// ============================================================================

export interface PluginContext {
  // Subscriptions - para cleanup
  subscriptions: { dispose: () => void }[];
  
  // Workspace
  workspaceRoot: string;
  workspaceState: StateStorage;
  globalState: StateStorage;
  
  // API
  extensionPath: string;
  extensionUri: string;
  
  // Logging
  log: (message: string) => void;
  logError: (message: string, error?: Error) => void;
}

export interface StateStorage {
  get<T>(key: string, defaultValue?: T): T | undefined;
  update(key: string, value: unknown): Promise<void>;
  keys(): string[];
}

// ============================================================================
// PLUGIN INSTANCE
// ============================================================================

export interface PluginInstance {
  plugin: Plugin;
  context: PluginContext;
  exports: Record<string, unknown>;
  isActive: boolean;
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
}

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
            console.log(`Plugin ${plugin.id} activated`);
          } catch (error) {
            console.error(`Failed to activate plugin ${plugin.id}:`, error);
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
        console.log(`Command executed: ${cmd.command}`);
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
        console.error(`Event listener error for ${event}:`, error);
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
      log: (message) => console.log(`[${plugin.id}] ${message}`),
      logError: (message, error) => console.error(`[${plugin.id}] ${message}`, error),
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
// BUILT-IN PLUGINS
// ============================================================================

export const BUILTIN_PLUGINS: Plugin[] = [
  {
    id: 'aethel.typescript',
    name: 'TypeScript Support',
    version: '1.0.0',
    description: 'Full TypeScript language support',
    author: 'Aethel Team',
    categories: ['language'],
    activationEvents: ['onLanguage:typescript', 'onLanguage:javascript'],
    contributes: {
      languages: [
        {
          id: 'typescript',
          extensions: ['.ts', '.tsx'],
          aliases: ['TypeScript', 'ts'],
        },
        {
          id: 'javascript',
          extensions: ['.js', '.jsx'],
          aliases: ['JavaScript', 'js'],
        },
      ],
    },
  },
  {
    id: 'aethel.ai-assistant',
    name: 'AI Assistant',
    version: '1.0.0',
    description: 'AI-powered coding assistant',
    author: 'Aethel Team',
    categories: ['ai'],
    activationEvents: ['*'],
    contributes: {
      commands: [
        {
          command: 'aethel.ai.generate',
          title: 'Generate with AI',
          category: 'AI',
        },
        {
          command: 'aethel.ai.explain',
          title: 'Explain Code',
          category: 'AI',
        },
        {
          command: 'aethel.ai.refactor',
          title: 'Refactor with AI',
          category: 'AI',
        },
      ],
      keybindings: [
        {
          command: 'aethel.ai.generate',
          key: 'ctrl+shift+g',
          mac: 'cmd+shift+g',
        },
      ],
    },
  },
  {
    id: 'aethel.game-tools',
    name: 'Game Development Tools',
    version: '1.0.0',
    description: 'Essential tools for game development',
    author: 'Aethel Team',
    categories: ['game', 'tool'],
    activationEvents: ['onView:sceneEditor', 'onCommand:aethel.game.*'],
    contributes: {
      commands: [
        {
          command: 'aethel.game.play',
          title: 'Play Game',
          category: 'Game',
          icon: '▶️',
        },
        {
          command: 'aethel.game.pause',
          title: 'Pause Game',
          category: 'Game',
          icon: '⏸️',
        },
        {
          command: 'aethel.game.stop',
          title: 'Stop Game',
          category: 'Game',
          icon: '⏹️',
        },
      ],
      views: [
        {
          id: 'sceneEditor',
          name: 'Scene Editor',
          icon: '🎬',
          location: 'sidebar',
        },
        {
          id: 'hierarchy',
          name: 'Hierarchy',
          icon: '📁',
          location: 'sidebar',
        },
        {
          id: 'inspector',
          name: 'Inspector',
          icon: '🔍',
          location: 'sidebar',
        },
      ],
      gameComponents: [
        {
          name: 'Sprite Renderer',
          description: 'Renders 2D sprites',
          icon: '🖼️',
          properties: {
            sprite: { type: 'asset:sprite', default: null, description: 'Sprite asset' },
            color: { type: 'color', default: '#ffffff', description: 'Tint color' },
            flipX: { type: 'boolean', default: false, description: 'Flip horizontally' },
            flipY: { type: 'boolean', default: false, description: 'Flip vertically' },
          },
        },
        {
          name: 'Rigidbody 2D',
          description: 'Physics body for 2D',
          icon: '⚡',
          properties: {
            mass: { type: 'number', default: 1, description: 'Mass of the body' },
            gravityScale: { type: 'number', default: 1, description: 'Gravity multiplier' },
            drag: { type: 'number', default: 0, description: 'Linear drag' },
          },
        },
        {
          name: 'Collider 2D',
          description: 'Collision detection for 2D',
          icon: '📦',
          properties: {
            shape: { type: 'enum:box,circle,polygon', default: 'box', description: 'Collision shape' },
            isTrigger: { type: 'boolean', default: false, description: 'Is trigger only' },
          },
        },
      ],
    },
  },
  {
    id: 'aethel.theme-dark',
    name: 'Aethel Dark Theme',
    version: '1.0.0',
    description: 'Official dark theme for Aethel Engine',
    author: 'Aethel Team',
    categories: ['theme'],
    activationEvents: ['*'],
    contributes: {
      themes: [
        {
          id: 'aethel-dark',
          label: 'Aethel Dark',
          uiTheme: 'dark',
          path: './themes/dark.json',
        },
        {
          id: 'aethel-dark-high-contrast',
          label: 'Aethel Dark (High Contrast)',
          uiTheme: 'highContrast',
          path: './themes/dark-hc.json',
        },
      ],
    },
  },
];

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
