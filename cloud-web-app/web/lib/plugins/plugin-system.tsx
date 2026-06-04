/**
 * Plugin & Mod System - Sistema de Plugins/Mods
 *
 * Sistema completo com:
 * - Plugin loading
 * - Sandboxed execution
 * - Hot reloading
 * - Dependency management
 * - API exposure
 * - Event hooks
 * - Config management
 * - Asset loading
 * - Mod compatibility
 *
 * @module lib/plugins/plugin-system
 */

import { EventEmitter } from 'events';

import {createComponentLogger, logger} from '@/lib/observability/logger'
import {
  PluginProvider,
  useCallHook,
  usePlugin,
  usePluginHook,
  usePluginLoader,
  usePlugins,
} from './plugin-system-react'
import type {
  HookCallback,
  ModPackage,
  Plugin,
  PluginAPI,
  PluginConfigSchema,
  PluginInstance,
  PluginLoaderConfig,
  PluginManifest,
  PluginPermission,
} from './plugin-system.types'

export type * from './plugin-system.types'

const log = createComponentLogger('plugins/plugin-system')

// ============================================================================
// PLUGIN SANDBOX
// ============================================================================

export class PluginSandbox {
  private allowedGlobals: Set<string>;
  private api: PluginAPI;

  constructor(api: PluginAPI, permissions: PluginPermission[]) {
    this.api = api;
    this.allowedGlobals = new Set([
      // Always allowed
      'console',
      'Math',
      'JSON',
      'Date',
      'Array',
      'Object',
      'String',
      'Number',
      'Boolean',
      'Map',
      'Set',
      'Promise',
      'Symbol',
      'RegExp',
      'Error',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
    ]);

    // Add permission-based globals
    if (permissions.includes('network')) {
      this.allowedGlobals.add('fetch');
      this.allowedGlobals.add('WebSocket');
    }

    if (permissions.includes('storage')) {
      this.allowedGlobals.add('localStorage');
      this.allowedGlobals.add('sessionStorage');
    }
  }

  createContext(): Record<string, unknown> {
    const context: Record<string, unknown> = {
      api: this.api,
    };

    // Copy allowed globals
    for (const name of this.allowedGlobals) {
      if (name in globalThis) {
        context[name] = (globalThis as Record<string, unknown>)[name];
      }
    }

    return context;
  }

  execute(code: string, context: Record<string, unknown>): unknown {
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    // Create sandboxed function
    const fn = new Function(...contextKeys, `"use strict"; return (${code});`);

    return fn(...contextValues);
  }

  async executeAsync(code: string, context: Record<string, unknown>): Promise<unknown> {
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    // Create async sandboxed function
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction(...contextKeys, `"use strict"; return (${code});`);

    return fn(...contextValues);
  }
}

// ============================================================================
// PLUGIN LOADER
// ============================================================================

export class PluginLoader extends EventEmitter {
  private config: PluginLoaderConfig;
  private plugins: Map<string, Plugin> = new Map();
  private hooks: Map<string, Set<HookCallback>> = new Map();
  private loadOrderCounter = 0;

  constructor(config: Partial<PluginLoaderConfig> = {}) {
    super();

    this.config = {
      pluginDirectory: '/plugins',
      enableHotReload: true,
      sandbox: true,
      maxLoadTime: 5000,
      allowedPermissions: ['storage', 'input', 'entities', 'ui'],
      ...config,
    };
  }

  // ============================================================================
  // PLUGIN LOADING
  // ============================================================================

  async loadPlugin(manifestOrPath: PluginManifest | string): Promise<Plugin> {
    let manifest: PluginManifest;

    if (typeof manifestOrPath === 'string') {
      manifest = await this.loadManifest(manifestOrPath);
    } else {
      manifest = manifestOrPath;
    }

    // Check if already loaded
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already loaded`);
    }

    // Validate permissions
    this.validatePermissions(manifest.permissions || []);

    // Check dependencies
    await this.checkDependencies(manifest);

    // Check conflicts
    this.checkConflicts(manifest);

    const plugin: Plugin = {
      manifest,
      state: 'loading',
      config: this.initializeConfig(manifest.config),
      loadOrder: this.loadOrderCounter++,
      errors: [],
    };

    this.plugins.set(manifest.id, plugin);

    try {
      const startTime = performance.now();

      // Load plugin code
      const instance = await this.loadPluginCode(manifest, plugin);
      plugin.instance = instance;
      plugin.loadTime = performance.now() - startTime;
      plugin.state = 'loaded';

      // Call onLoad
      if (instance.onLoad) {
        await Promise.race([
          instance.onLoad(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Plugin load timeout')), this.config.maxLoadTime)
          ),
        ]);
      }

      this.emit('pluginLoaded', plugin);
      return plugin;

    } catch (error) {
      plugin.state = 'error';
      plugin.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('pluginError', { plugin, error });
      throw error;
    }
  }

  private async loadManifest(path: string): Promise<PluginManifest> {
    const response = await fetch(`${this.config.pluginDirectory}/${path}/manifest.json`);
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.statusText}`);
    }
    return response.json();
  }

  private async loadPluginCode(manifest: PluginManifest, plugin: Plugin): Promise<PluginInstance> {
    const api = this.createPluginAPI(manifest.id);

    if (this.config.sandbox) {
      // Sandboxed loading
      const sandbox = new PluginSandbox(api, manifest.permissions || []);
      const response = await fetch(`${this.config.pluginDirectory}/${manifest.id}/${manifest.main}`);
      const code = await response.text();

      const context = sandbox.createContext();
      const exports: Record<string, unknown> = {};
      context.exports = exports;
      context.module = { exports };

      sandbox.execute(code, context);

      return (exports.default || exports) as PluginInstance;

    } else {
      // Direct loading (less secure but more flexible)
      const pluginModule = await import(`${this.config.pluginDirectory}/${manifest.id}/${manifest.main}`);
      const PluginClass = pluginModule.default;

      if (typeof PluginClass === 'function') {
        return new PluginClass(api);
      }

      return pluginModule as PluginInstance;
    }
  }

  // ============================================================================
  // PLUGIN LIFECYCLE
  // ============================================================================

  async enablePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    if (plugin.state !== 'loaded' && plugin.state !== 'disabled') {
      throw new Error(`Plugin ${id} cannot be enabled from state ${plugin.state}`);
    }

    try {
      if (plugin.instance?.onEnable) {
        await plugin.instance.onEnable();
      }

      plugin.state = 'enabled';
      this.emit('pluginEnabled', plugin);

    } catch (error) {
      plugin.state = 'error';
      plugin.errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async disablePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    if (plugin.state !== 'enabled') {
      throw new Error(`Plugin ${id} is not enabled`);
    }

    try {
      if (plugin.instance?.onDisable) {
        await plugin.instance.onDisable();
      }

      plugin.state = 'disabled';
      this.emit('pluginDisabled', plugin);

    } catch (error) {
      plugin.errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async unloadPlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    // Disable first if enabled
    if (plugin.state === 'enabled') {
      await this.disablePlugin(id);
    }

    try {
      if (plugin.instance?.onUnload) {
        await plugin.instance.onUnload();
      }

      // Remove hooks registered by this plugin
      this.removePluginHooks(id);

      plugin.state = 'unloaded';
      this.plugins.delete(id);
      this.emit('pluginUnloaded', id);

    } catch (error) {
      plugin.errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async reloadPlugin(id: string): Promise<Plugin> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    const wasEnabled = plugin.state === 'enabled';
    const config = { ...plugin.config };
    const manifest = plugin.manifest;

    await this.unloadPlugin(id);
    const newPlugin = await this.loadPlugin(manifest);

    // Restore config
    newPlugin.config = config;

    // Re-enable if was enabled
    if (wasEnabled) {
      await this.enablePlugin(id);
    }

    this.emit('pluginReloaded', newPlugin);
    return newPlugin;
  }

  // ============================================================================
  // PLUGIN API
  // ============================================================================

  private createPluginAPI(pluginId: string): PluginAPI {
    const loader = this;

    return {
      version: '1.0.0',

      registerHook(name: string, callback: HookCallback) {
        loader.registerHook(name, callback, pluginId);
      },

      unregisterHook(name: string, callback: HookCallback) {
        loader.unregisterHook(name, callback);
      },

      callHook(name: string, ...args: unknown[]) {
        return loader.callHook(name, ...args);
      },

      getPlugin(id: string) {
        return loader.plugins.get(id);
      },

      getConfig(key: string) {
        return loader.plugins.get(pluginId)?.config[key];
      },

      setConfig(key: string, value: unknown) {
        const plugin = loader.plugins.get(pluginId);
        if (plugin) {
          const oldValue = plugin.config[key];
          plugin.config[key] = value;
          plugin.instance?.onConfigChange?.(key, value);
          loader.emit('configChanged', { pluginId, key, value, oldValue });
        }
      },

      log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
        const prefix = `[${pluginId}]`;
        switch (level) {
          case 'warn':
            logger.warn(prefix, message);
            break;
          case 'error':
            logger.error(prefix, message);
            break;
          default:
            log.info(prefix, message);
        }
      },

      emit(event: string, data?: unknown) {
        loader.emit(`plugin:${pluginId}:${event}`, data);
      },

      on(event: string, callback: (...args: unknown[]) => void) {
        loader.on(`plugin:${pluginId}:${event}`, callback);
      },

      off(event: string, callback: (...args: unknown[]) => void) {
        loader.off(`plugin:${pluginId}:${event}`, callback);
      },
    };
  }

  // ============================================================================
  // HOOKS
  // ============================================================================

  private hookOwners: Map<HookCallback, string> = new Map();

  registerHook(name: string, callback: HookCallback, pluginId: string): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, new Set());
    }

    this.hooks.get(name)!.add(callback);
    this.hookOwners.set(callback, pluginId);
  }

  unregisterHook(name: string, callback: HookCallback): void {
    this.hooks.get(name)?.delete(callback);
    this.hookOwners.delete(callback);
  }

  private removePluginHooks(pluginId: string): void {
    for (const [callback, owner] of this.hookOwners) {
      if (owner === pluginId) {
        for (const [, callbacks] of this.hooks) {
          callbacks.delete(callback);
        }
        this.hookOwners.delete(callback);
      }
    }
  }

  callHook(name: string, ...args: unknown[]): unknown[] {
    const callbacks = this.hooks.get(name);
    if (!callbacks) return [];

    const results: unknown[] = [];

    for (const callback of callbacks) {
      try {
        results.push(callback(...args));
      } catch (error) {
        logger.error(`Hook ${name} error:`, error);
      }
    }

    return results;
  }

  // ============================================================================
  // DEPENDENCY MANAGEMENT
  // ============================================================================

  private async checkDependencies(manifest: PluginManifest): Promise<void> {
    const deps = manifest.dependencies || [];

    for (const dep of deps) {
      const plugin = this.plugins.get(dep.id);

      if (!plugin) {
        if (dep.optional) {
          logger.warn(`Optional dependency ${dep.id} not found for ${manifest.id}`);
          continue;
        }
        throw new Error(`Missing dependency: ${dep.id}`);
      }

      if (!this.checkVersion(plugin.manifest.version, dep.version)) {
        throw new Error(
          `Dependency version mismatch: ${dep.id} requires ${dep.version}, found ${plugin.manifest.version}`
        );
      }
    }
  }

  private checkConflicts(manifest: PluginManifest): void {
    const conflicts = manifest.conflicts || [];

    for (const conflictId of conflicts) {
      if (this.plugins.has(conflictId)) {
        throw new Error(`Plugin ${manifest.id} conflicts with ${conflictId}`);
      }
    }
  }

  private checkVersion(actual: string, required: string): boolean {
    // Simple semver check (major.minor.patch)
    const [aMajor, aMinor] = actual.split('.').map(Number);
    const [rMajor, rMinor] = required.replace(/[^0-9.]/g, '').split('.').map(Number);

    // Check if actual version is >= required
    if (required.startsWith('^')) {
      // Compatible with same major
      return aMajor === rMajor && aMinor >= rMinor;
    } else if (required.startsWith('~')) {
      // Compatible with same major.minor
      return aMajor === rMajor && aMinor === rMinor;
    } else {
      // Exact match
      return aMajor === rMajor && aMinor >= rMinor;
    }
  }

  // ============================================================================
  // PERMISSION VALIDATION
  // ============================================================================

  private validatePermissions(permissions: PluginPermission[]): void {
    for (const permission of permissions) {
      if (!this.config.allowedPermissions.includes(permission)) {
        throw new Error(`Permission not allowed: ${permission}`);
      }
    }
  }

  // ============================================================================
  // CONFIG MANAGEMENT
  // ============================================================================

  private initializeConfig(schema?: PluginConfigSchema): Record<string, unknown> {
    if (!schema) return {};

    const config: Record<string, unknown> = {};

    for (const [key, def] of Object.entries(schema)) {
      config[key] = def.default;
    }

    return config;
  }

  getPluginConfig(id: string): Record<string, unknown> | undefined {
    return this.plugins.get(id)?.config;
  }

  setPluginConfig(id: string, key: string, value: unknown): void {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    const oldValue = plugin.config[key];
    plugin.config[key] = value;

    plugin.instance?.onConfigChange?.(key, value);
    this.emit('configChanged', { pluginId: id, key, value, oldValue });
  }

  // ============================================================================
  // PLUGIN QUERIES
  // ============================================================================

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).sort((a, b) => a.loadOrder - b.loadOrder);
  }

  getEnabledPlugins(): Plugin[] {
    return this.getPlugins().filter(p => p.state === 'enabled');
  }

  isPluginEnabled(id: string): boolean {
    return this.plugins.get(id)?.state === 'enabled';
  }

  // ============================================================================
  // MOD PACKS
  // ============================================================================

  async loadModPack(pack: ModPackage): Promise<void> {
    const loadOrder = pack.loadOrder || pack.plugins;

    // Load plugins in order
    for (const pluginId of loadOrder) {
      if (!this.plugins.has(pluginId)) {
        await this.loadPlugin(pluginId);
      }

      // Apply pack config
      if (pack.config?.[pluginId]) {
        for (const [key, value] of Object.entries(pack.config[pluginId])) {
          this.setPluginConfig(pluginId, key, value);
        }
      }
    }

    // Enable all plugins
    for (const pluginId of loadOrder) {
      await this.enablePlugin(pluginId);
    }

    this.emit('modPackLoaded', pack);
  }

  async unloadModPack(pack: ModPackage): Promise<void> {
    // Unload in reverse order
    const unloadOrder = [...pack.plugins].reverse();

    for (const pluginId of unloadOrder) {
      if (this.plugins.has(pluginId)) {
        await this.unloadPlugin(pluginId);
      }
    }

    this.emit('modPackUnloaded', pack);
  }

  // ============================================================================
  // HOT RELOAD
  // ============================================================================

  private watchedPlugins: Set<string> = new Set();

  watchPlugin(id: string): void {
    if (!this.config.enableHotReload) return;

    this.watchedPlugins.add(id);
    // In a real implementation, this would set up file watchers
  }

  unwatchPlugin(id: string): void {
    this.watchedPlugins.delete(id);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async unloadAll(): Promise<void> {
    const plugins = this.getPlugins().reverse();

    for (const plugin of plugins) {
      await this.unloadPlugin(plugin.manifest.id);
    }
  }

  dispose(): void {
    this.unloadAll().catch((error) => logger.error(error));
    this.plugins.clear();
    this.hooks.clear();
    this.hookOwners.clear();
    this.watchedPlugins.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

export {
  PluginProvider,
  useCallHook,
  usePlugin,
  usePluginHook,
  usePluginLoader,
  usePlugins,
} from './plugin-system-react';

const __defaultExport = {
  PluginLoader,
  PluginSandbox,
  PluginProvider,
  usePluginLoader,
  usePlugins,
  usePlugin,
  usePluginHook,
  useCallHook,
};

export default __defaultExport;
