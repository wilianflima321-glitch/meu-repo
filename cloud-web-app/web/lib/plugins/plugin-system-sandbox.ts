import type { PluginAPI, PluginPermission } from './plugin-system.types'

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

