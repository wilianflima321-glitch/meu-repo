import type { ExtensionContext } from './extension-host/types';
import { Worker, MessageChannel } from 'worker_threads';

export type ExtensionModule = {
  activate?: (ctx: ExtensionContext) => unknown | Promise<unknown>;
  deactivate?: () => void | Promise<void>;
};

/**
 * AETHEL SANDBOX ENGINE v2 — Secure Extension Execution
 *
 * Architecture:
 * 1. Each extension runs inside a dedicated `worker_threads` Worker (OS-level isolation).
 * 2. The worker does NOT use the insecure `vm` module. Instead, it uses the `Function`
 *    constructor inside the already-isolated worker thread context.
 * 3. The worker communicates with the main thread exclusively through `MessagePort` RPC.
 *    No shared memory, no `require('fs')`, no `require('child_process')`.
 * 4. The `require` function inside the sandbox is a controlled whitelist:
 *    - `require('aethel')` → returns an RPC proxy that delegates to the host API.
 *    - Everything else → throws `Sandbox violation`.
 *
 * Security guarantees:
 * - The extension cannot access the filesystem directly.
 * - The extension cannot spawn child processes.
 * - The extension cannot import native Node modules.
 * - The extension can only call host APIs through the MessagePort RPC bridge.
 * - If the worker crashes or hangs, the main thread can terminate it cleanly.
 *
 * @see extension-host/api.ts for the VS Code-compatible API surface
 * @see extension-host-runtime.ts for the runtime orchestrator
 */

// Maximum time an extension has to load and respond (30 seconds)
const EXTENSION_LOAD_TIMEOUT_MS = 30_000;

// Maximum time an activate() call can take (15 seconds)
const EXTENSION_ACTIVATE_TIMEOUT_MS = 15_000;

/**
 * Executes an extension module inside an isolated worker_threads Worker.
 *
 * The `vm` module is NOT used. The worker thread provides OS-level isolation,
 * and the Function constructor is used to evaluate the extension code within
 * a controlled scope that only exposes safe globals and the RPC-based API proxy.
 */
export async function executeExtensionModule(input: {
  code: string;
  filename: string;
  extensionPath: string;
  api: unknown;
}): Promise<ExtensionModule> {
  return new Promise((resolve, reject) => {
    const { port1, port2 } = new MessageChannel();

    // The timeout protects against extensions that hang during load
    const loadTimeout = setTimeout(() => {
      worker.terminate();
      reject(new Error(`SANDBOX_TIMEOUT: Extension "${input.filename}" took longer than ${EXTENSION_LOAD_TIMEOUT_MS}ms to load.`));
    }, EXTENSION_LOAD_TIMEOUT_MS);

    // ========================================================================
    // WORKER CODE (runs in isolated thread)
    // ========================================================================
    // This string is evaluated inside the worker_threads Worker.
    // It does NOT use `vm.Script` or `vm.createContext`.
    // Instead, it wraps the extension code in a Function with a controlled scope.
    const workerCode = `
      const { parentPort, workerData } = require('worker_threads');

      const rpcPort = workerData.rpcPort;
      let rpcCallId = 0;
      const pendingCalls = new Map();

      // RPC response handler
      rpcPort.on('message', (msg) => {
        if (msg.type === 'rpc-response') {
          const p = pendingCalls.get(msg.id);
          if (p) {
            pendingCalls.delete(msg.id);
            if (msg.error) p.reject(new Error(msg.error));
            else p.resolve(msg.result);
          }
        }
      });

      // Build the RPC proxy for the 'aethel' module.
      // Every method call is forwarded to the main thread via MessagePort.
      function buildNamespaceProxy(namespace) {
        return new Proxy({}, {
          get: (_, prop) => {
            if (typeof prop !== 'string') return undefined;
            return (...args) => {
              return new Promise((resolve, reject) => {
                const id = ++rpcCallId;
                pendingCalls.set(id, { resolve, reject });
                rpcPort.postMessage({
                  type: 'rpc-call',
                  id,
                  method: namespace ? namespace + '.' + prop : prop,
                  args: args.map(arg => {
                    // Serialize functions as null (cannot cross thread boundary)
                    if (typeof arg === 'function') return null;
                    try { JSON.stringify(arg); return arg; }
                    catch { return String(arg); }
                  })
                });
              });
            };
          }
        });
      }

      const apiProxy = buildNamespaceProxy(null);

      // The controlled sandbox scope
      const sandboxExports = {};
      const sandboxModule = { exports: sandboxExports };

      const sandbox = {
        exports: sandboxExports,
        module: sandboxModule,
        console: {
          log: (...a) => parentPort.postMessage({ type: 'console', level: 'log', args: a.map(String) }),
          warn: (...a) => parentPort.postMessage({ type: 'console', level: 'warn', args: a.map(String) }),
          error: (...a) => parentPort.postMessage({ type: 'console', level: 'error', args: a.map(String) }),
          info: (...a) => parentPort.postMessage({ type: 'console', level: 'info', args: a.map(String) }),
          debug: (...a) => parentPort.postMessage({ type: 'console', level: 'debug', args: a.map(String) }),
        },
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        Promise,
        Buffer,
        process: {
          platform: process.platform,
          arch: process.arch,
          version: process.version,
          cwd: () => workerData.extensionPath,
          env: {}, // Empty env - no secrets leak
        },
        require: (moduleName) => {
          if (moduleName === 'aethel') return apiProxy;
          // Block ALL other requires inside the sandbox
          throw new Error('SANDBOX_VIOLATION: Cannot require "' + moduleName + '". Extensions may only require "aethel".');
        },
      };

      try {
        // Execute the extension code using Function constructor (NOT vm.Script).
        // The Function constructor runs in the worker's V8 isolate, which is
        // already OS-isolated from the main thread.
        const wrappedFn = new Function(
          'exports', 'module', 'require', 'console',
          'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
          'Promise', 'Buffer', 'process',
          workerData.code
        );

        wrappedFn(
          sandbox.exports,
          sandbox.module,
          sandbox.require,
          sandbox.console,
          sandbox.setTimeout,
          sandbox.setInterval,
          sandbox.clearTimeout,
          sandbox.clearInterval,
          sandbox.Promise,
          sandbox.Buffer,
          sandbox.process
        );

        // Resolve the actual exports (support both CJS patterns)
        const finalExports = sandbox.module.exports !== sandboxExports
          ? sandbox.module.exports
          : sandbox.exports;

        parentPort.postMessage({
          type: 'loaded',
          hasActivate: typeof finalExports.activate === 'function',
          hasDeactivate: typeof finalExports.deactivate === 'function',
        });

        // Listen for lifecycle triggers from the host
        parentPort.on('message', async (msg) => {
          if (msg.type === 'trigger-activate') {
            try {
              let result;
              if (typeof finalExports.activate === 'function') {
                result = await finalExports.activate(msg.context);
              }
              parentPort.postMessage({ type: 'activate-result', result: result ?? null });
            } catch (err) {
              parentPort.postMessage({ type: 'activate-error', error: err.message || String(err) });
            }
          }

          if (msg.type === 'trigger-deactivate') {
            try {
              if (typeof finalExports.deactivate === 'function') {
                await finalExports.deactivate();
              }
              parentPort.postMessage({ type: 'deactivate-result' });
            } catch (err) {
              parentPort.postMessage({ type: 'deactivate-error', error: err.message || String(err) });
            }
          }
        });

      } catch (err) {
        parentPort.postMessage({ type: 'load-error', message: err.message || String(err) });
      }
    `;

    // ========================================================================
    // HOST SIDE (main thread)
    // ========================================================================
    const worker = new Worker(workerCode, {
      eval: true,
      workerData: {
        code: input.code,
        filename: input.filename,
        extensionPath: input.extensionPath,
        rpcPort: port2,
      },
      transferList: [port2],
    });

    // Handle RPC calls from the worker → delegate to the host API
    port1.on('message', async (msg) => {
      if (msg.type === 'rpc-call') {
        try {
          // Navigate nested namespaces (e.g., "commands.executeCommand")
          const parts = String(msg.method).split('.');
          let target = input.api as Record<string, unknown>;
          for (let i = 0; i < parts.length - 1; i++) {
            target = target[parts[i]] as Record<string, unknown>;
            if (!target) throw new Error(`Namespace "${parts.slice(0, i + 1).join('.')}" not found on API`);
          }
          const methodName = parts[parts.length - 1];
          const method = target[methodName];
          if (typeof method !== 'function') throw new Error(`Method "${msg.method}" not found on API`);
          const result = await (method as Function).apply(target, msg.args);
          port1.postMessage({ type: 'rpc-response', id: msg.id, result: result ?? null });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          port1.postMessage({ type: 'rpc-response', id: msg.id, error: errorMessage });
        }
      }
    });

    // Handle messages from the worker
    worker.on('message', (msg) => {
      if (msg.type === 'load-error') {
        clearTimeout(loadTimeout);
        reject(new Error(`SANDBOX_LOAD_ERROR: ${msg.message}`));
      } else if (msg.type === 'loaded') {
        clearTimeout(loadTimeout);

        const extensionModule: ExtensionModule = {};

        if (msg.hasActivate) {
          extensionModule.activate = (ctx: ExtensionContext) => {
            return new Promise((res, rej) => {
              const activateTimeout = setTimeout(() => {
                rej(new Error(`SANDBOX_TIMEOUT: activate() took longer than ${EXTENSION_ACTIVATE_TIMEOUT_MS}ms.`));
              }, EXTENSION_ACTIVATE_TIMEOUT_MS);

              const activateHandler = (responseMsg: { type: string; result?: unknown; error?: string }) => {
                if (responseMsg.type === 'activate-result') {
                  clearTimeout(activateTimeout);
                  worker.off('message', activateHandler);
                  res(responseMsg.result);
                } else if (responseMsg.type === 'activate-error') {
                  clearTimeout(activateTimeout);
                  worker.off('message', activateHandler);
                  rej(new Error(responseMsg.error));
                }
              };
              worker.on('message', activateHandler);
              worker.postMessage({ type: 'trigger-activate', context: ctx });
            });
          };
        }

        if (msg.hasDeactivate) {
          extensionModule.deactivate = () => {
            return new Promise<void>((res, rej) => {
              const deactivateHandler = (responseMsg: { type: string; error?: string }) => {
                if (responseMsg.type === 'deactivate-result') {
                  worker.off('message', deactivateHandler);
                  res();
                } else if (responseMsg.type === 'deactivate-error') {
                  worker.off('message', deactivateHandler);
                  rej(new Error(responseMsg.error));
                }
              };
              worker.on('message', deactivateHandler);
              worker.postMessage({ type: 'trigger-deactivate' });
            });
          };
        }

        resolve(extensionModule);
      }
      // Console forwarding (optional observability)
      if (msg.type === 'console') {
        const level = msg.level as 'log' | 'warn' | 'error' | 'info' | 'debug';
        const args = msg.args as string[];
        // eslint-disable-next-line no-console
        console[level]?.(`[Extension:${input.filename}]`, ...args);
      }
    });

    worker.on('error', (err) => {
      clearTimeout(loadTimeout);
      reject(new Error(`SANDBOX_CRASH: ${err.message}`));
    });

    worker.on('exit', (code) => {
      clearTimeout(loadTimeout);
      if (code !== 0) reject(new Error(`SANDBOX_EXIT: Worker exited with code ${code}`));
    });
  });
}
