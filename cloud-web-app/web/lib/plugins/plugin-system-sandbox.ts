import type { PluginAPI, PluginPermission } from './plugin-system.types'
import { logger } from '@/lib/observability/logger'

export class PluginSandbox {
  private allowedGlobals: Set<string>;
  private api: PluginAPI;
  private permissions: PluginPermission[];
  private worker: Worker | null = null;
  private callIdCounter = 0;
  private pendingCalls = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

  constructor(api: PluginAPI, permissions: PluginPermission[]) {
    this.api = api;
    this.permissions = permissions;
    this.allowedGlobals = new Set([
      'console', 'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number',
      'Boolean', 'Map', 'Set', 'Promise', 'Symbol', 'RegExp', 'Error',
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'
    ]);

    if (permissions.includes('network')) {
      this.allowedGlobals.add('fetch');
    }
  }

  private initWorker(): void {
    if (this.worker) return;

    // Constrói o script do worker injetando medidas de segurança extremas.
    // Omitimos acesso a IndexedDB, XMLHttpRequest, importScripts, etc., a menos que explicitamente permitidos.
    const workerScript = `
      // --- SECURE SANDBOX ENFORCEMENT ---
      const allowed = new Set(${JSON.stringify(Array.from(this.allowedGlobals))});
      
      // Delete dangerous globals
      const dangerous = ['indexedDB', 'caches', 'importScripts', 'Worker', 'SharedWorker', 'XMLHttpRequest'];
      ${this.permissions.includes('network') ? '' : `
      const netDangerous = ['fetch', 'Request', 'Headers', 'Response'];
      for (const n of netDangerous) {
        try { delete self[n]; } catch(e) {}
      }
      `}
      for (const d of dangerous) {
        try { delete self[d]; } catch(e) {}
      }

      // Interceptar console logs para enviar ao host
      const originalConsole = { log: console.log, error: console.error, warn: console.warn };
      console.log = (...args) => self.postMessage({ type: 'console', level: 'log', args });
      console.error = (...args) => self.postMessage({ type: 'console', level: 'error', args });
      console.warn = (...args) => self.postMessage({ type: 'console', level: 'warn', args });

      // Host API Proxy
      const api = new Proxy({}, {
        get: (target, prop) => {
          return async (...args) => {
            return new Promise((resolve, reject) => {
              const callId = Math.random();
              self._apiResolvers = self._apiResolvers || new Map();
              self._apiResolvers.set(callId, { resolve, reject });
              self.postMessage({ type: 'api_call', callId, method: prop, args });
            });
          };
        }
      });

      self.onmessage = async (e) => {
        const msg = e.data;
        
        if (msg.type === 'execute') {
          try {
            // Executa no contexto fechado do worker
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const fn = new AsyncFunction('api', '"use strict";\\n' + msg.code);
            const result = await fn(api);
            self.postMessage({ type: 'execute_result', executeId: msg.executeId, success: true, result });
          } catch (err) {
            self.postMessage({ type: 'execute_result', executeId: msg.executeId, success: false, error: err.message });
          }
        } 
        else if (msg.type === 'api_response') {
          const resolver = self._apiResolvers?.get(msg.callId);
          if (resolver) {
            if (msg.success) resolver.resolve(msg.result);
            else resolver.reject(new Error(msg.error));
            self._apiResolvers.delete(msg.callId);
          }
        }
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url);
    URL.revokeObjectURL(url);

    this.worker.onmessage = async (e) => {
      const msg = e.data;
      if (msg.type === 'console') {
        if (msg.level === 'error') logger.error('[Plugin Worker]', ...msg.args);
        else if (msg.level === 'warn') logger.warn('[Plugin Worker]', ...msg.args);
        else logger.info('[Plugin Worker]', ...msg.args);
      } 
      else if (msg.type === 'api_call') {
        try {
          const method = this.api[msg.method as keyof PluginAPI];
          if (typeof method === 'function') {
            const result = await (method as Function).apply(this.api, msg.args);
            this.worker?.postMessage({ type: 'api_response', callId: msg.callId, success: true, result });
          } else {
            throw new Error(`API method ${msg.method} not found or not a function`);
          }
        } catch (err: any) {
          this.worker?.postMessage({ type: 'api_response', callId: msg.callId, success: false, error: err.message });
        }
      }
      else if (msg.type === 'execute_result') {
        const call = this.pendingCalls.get(msg.executeId);
        if (call) {
          if (msg.success) call.resolve(msg.result);
          else call.reject(new Error(msg.error));
          this.pendingCalls.delete(msg.executeId);
        }
      }
    };
  }

  createContext(): Record<string, unknown> {
    return { api: this.api };
  }

  execute(code: string, context?: Record<string, unknown>): unknown {
    throw new Error('Sync execution is not supported in the Secure Worker Sandbox. Use executeAsync.');
  }

  async executeAsync(code: string, context?: Record<string, unknown>): Promise<unknown> {
    this.initWorker();
    return new Promise((resolve, reject) => {
      const executeId = ++this.callIdCounter;
      
      const timeoutId = setTimeout(() => {
        if (this.pendingCalls.has(executeId)) {
          this.pendingCalls.delete(executeId);
          this.dispose();
          reject(new Error('Plugin execution timeout: plugin execution exceeded 5 seconds.'));
        }
      }, 5000);

      this.pendingCalls.set(executeId, {
        resolve: (val) => { clearTimeout(timeoutId); resolve(val); },
        reject:  (err) => { clearTimeout(timeoutId); reject(err); },
      });

      this.worker!.postMessage({ type: 'execute', executeId, code });
    });
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const call of this.pendingCalls.values()) {
      call.reject(new Error('Plugin execution terminated: sandbox was disposed.'));
    }
    this.pendingCalls.clear();
  }
}

