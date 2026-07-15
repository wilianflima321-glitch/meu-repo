// Contracts for the governed plugin runtime. Keep this file free of React/runtime imports.

// ============================================================================
// TYPES
// ============================================================================

export type PluginState = 'unloaded' | 'loading' | 'loaded' | 'enabled' | 'disabled' | 'error';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  license?: string;
  main: string;
  dependencies?: PluginDependency[];
  optionalDependencies?: PluginDependency[];
  conflicts?: string[];
  permissions?: PluginPermission[];
  hooks?: string[];
  config?: PluginConfigSchema;
  assets?: PluginAsset[];
}

export interface PluginDependency {
  id: string;
  version: string;
  optional?: boolean;
}

export type PluginPermission =
  | 'filesystem'
  | 'network'
  | 'storage'
  | 'input'
  | 'audio'
  | 'graphics'
  | 'system'
  | 'entities'
  | 'ui';

export interface PluginConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    default?: unknown;
    description?: string;
    min?: number;
    max?: number;
    options?: unknown[];
  };
}

export interface PluginAsset {
  path: string;
  type: 'texture' | 'model' | 'sound' | 'script' | 'data';
}

export interface Plugin {
  manifest: PluginManifest;
  state: PluginState;
  instance?: PluginInstance;
  config: Record<string, unknown>;
  loadOrder: number;
  errors: string[];
  loadTime?: number;
}

export interface PluginInstance {
  onLoad?(): void | Promise<void>;
  onEnable?(): void | Promise<void>;
  onDisable?(): void | Promise<void>;
  onUnload?(): void | Promise<void>;
  onConfigChange?(key: string, value: unknown): void;
  [key: string]: unknown;
}

export interface PluginAPI {
  version: string;
  registerHook(name: string, callback: HookCallback): void;
  unregisterHook(name: string, callback: HookCallback): void;
  callHook(name: string, ...args: unknown[]): unknown[];
  getPlugin(id: string): Plugin | undefined;
  getConfig(key: string): unknown;
  setConfig(key: string, value: unknown): void;
  log(message: string, level?: 'info' | 'warn' | 'error'): void;
  emit(event: string, data?: unknown): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
}

export type HookCallback = (...args: unknown[]) => unknown;

export interface PluginLoaderConfig {
  pluginDirectory: string;
  enableHotReload: boolean;
  sandbox: boolean;
  maxLoadTime: number;
  allowedPermissions: PluginPermission[];
}

export interface ModPackage {
  id: string;
  name: string;
  version: string;
  plugins: string[];
  loadOrder?: string[];
  config?: Record<string, Record<string, unknown>>;
}
