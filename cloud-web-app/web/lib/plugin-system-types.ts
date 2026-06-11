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

