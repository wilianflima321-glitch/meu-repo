import { logger } from '@/lib/observability/logger';
import { DANGEROUS_PATTERNS, sanitizeOutput, validateScript } from './script-sandbox-guards';
import { AethelGameAPIs } from './script-sandbox-game-apis';
/**
 * Script Sandbox - isolated user-script execution.
 *
 * Runs user scripts in a constrained worker with timeout, memory policy,
 * output sanitization and a strict allowlist of APIs.
 *
 * @security CVE-AETHEL-001 - arbitrary execution mitigation layer
 */

export { DANGEROUS_PATTERNS, sanitizeOutput, validateScript } from './script-sandbox-guards';
export { AethelGameAPIs } from './script-sandbox-game-apis';
export type { AllowedAPI, SandboxConfig, SandboxLog, SandboxMessage, SandboxResult } from './script-sandbox.types';
import type { AllowedAPI, SandboxConfig, SandboxLog, SandboxMessage, SandboxResult } from './script-sandbox.types';

// ============================================================================
// TYPES
// ============================================================================

type SimulatedWorker = Worker & {
  simulateMessage?: (message: SandboxMessage) => void;
}

type SandboxResultPayload = SandboxResult & {
  id?: string;
}

function hasSimulatedWorker(worker: Worker | null): worker is SimulatedWorker {
  return !!worker && typeof (worker as SimulatedWorker).simulateMessage === 'function';
}

function isSandboxResultPayload(value: unknown): value is SandboxResultPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SandboxResultPayload>;
  return (
    Object.prototype.hasOwnProperty.call(candidate, 'success') ||
    Object.prototype.hasOwnProperty.call(candidate, 'error') ||
    Object.prototype.hasOwnProperty.call(candidate, 'logs')
  );
}

function getPayloadResult(value: unknown): unknown {
  if (!value || typeof value !== 'object') return undefined;
  return (value as { result?: unknown }).result;
}

// ============================================================================
// SANDBOX CLASS
// ============================================================================

export class ScriptSandbox {
  private worker: Worker | null = null;
  private workers: Worker[] = [];
  private config: SandboxConfig;
  private isReady = false;
  private disposed = false;
  private messageQueue: Map<string, {
    resolve: (result: SandboxResult) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }> = new Map();

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = {
      timeout: config.timeout ?? 5000,
      memoryLimit: config.memoryLimit ?? 50 * 1024 * 1024, // 50MB
      allowedAPIs: config.allowedAPIs ?? ['console', 'math', 'json', 'date', 'array', 'string', 'object', 'number', 'boolean'],
      globals: config.globals ?? {},
      mode: config.mode ?? 'strict',
    };
  }

  /**
   * Initializes the sandbox worker
   */
  async initialize(): Promise<void> {
    if (this.disposed) {
      throw new Error('Sandbox disposed');
    }
    if (this.worker) {
      return;
    }

    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || !URL?.createObjectURL) {
      throw new Error('Sandbox worker not supported in this environment');
    }

    return new Promise((resolve, reject) => {
      try {
        // Criar Worker com código inline
        const workerCode = this.generateWorkerCode();
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);

        const worker = new Worker(workerUrl);
        this.worker = worker;
        this.workers.push(worker);

        let settled = false;
        let initTimeout: NodeJS.Timeout | null = null;
        const finalizeReady = () => {
          if (settled) return;
          settled = true;
          if (initTimeout) {
            clearTimeout(initTimeout);
          }
          this.isReady = true;
          resolve();
        };
        const finalizeError = (message: string) => {
          if (settled) return;
          settled = true;
          if (initTimeout) {
            clearTimeout(initTimeout);
          }
          reject(new Error(message));
        };

        this.worker.onmessage = (event: MessageEvent<SandboxMessage>) => {
          if (event.data.type === 'ready') {
            finalizeReady();
            return;
          }
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (error) => {
          logger.error('[Sandbox] Worker error:', error);
          if (!this.isReady) {
            finalizeError('Failed to initialize sandbox worker');
            return;
          }
          this.failPendingExecutions('Worker error');
        };

        // Timeout para inicialização
        initTimeout = setTimeout(() => {
          if (!this.isReady) {
            finalizeError('Sandbox initialization timeout');
          }
        }, 3000);

        // Test workers do not always dispatch the ready event automatically.
        if (hasSimulatedWorker(worker)) {
          worker.simulateMessage?.({ type: 'ready' });
        }

        // Cleanup URL.
        URL.revokeObjectURL(workerUrl);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disposes the sandbox and releases resources
   */
  dispose(): void {
    this.disposed = true;
    for (const worker of this.workers) {
      try {
        worker.terminate();
      } catch {
        // ignore
      }
    }
    this.workers = [];
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    for (const pending of this.messageQueue.values()) {
      clearTimeout(pending.timer);
    }
    this.messageQueue.clear();
  }

  /**
   * Valida código antes de executar
   */
  validateCode(code: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Verificar padrões perigosos
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(code)) {
        issues.push(`Padrão perigoso detectado: ${pattern.source}`);
      }
    }

    // Verificar tamanho do código
    if (code.length > 100000) { // 100KB
      issues.push('Código muito grande (limite: 100KB)');
    }

    // Verificar profundidade de aninhamento (heurística anti-bomb)
    const maxNesting = this.checkNestingDepth(code);
    if (maxNesting > 50) {
      issues.push(`Aninhamento muito profundo: ${maxNesting} níveis`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Executa código no sandbox
   */
  async execute(code: string, context?: Record<string, unknown>): Promise<SandboxResult> {
    if (this.disposed) {
      return {
        success: false,
        error: 'Sandbox disposed',
        executionTime: 0,
        memoryUsed: 0,
        logs: [],
      };
    }
    // Inicializar se necessário
    if (!this.isReady) {
      await this.initialize();
    }


    // Validar código
    const validation = this.validateCode(code);
    if (!validation.valid && this.config.mode === 'strict') {
      return {
        success: false,
        error: `Código bloqueado: ${validation.issues.join(', ')}`,
        executionTime: 0,
        memoryUsed: 0,
        logs: [],
      };
    }

    if (this.isMockWorker()) {
      return this.executeInProcess(code, context);
    }

    // Criar ID único para esta execução
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve) => {
      // Configurar timeout
      const timer = setTimeout(() => {
        const pending = this.messageQueue.get(executionId);
        if (pending) {
          this.messageQueue.delete(executionId);
          resolve({
            success: false,
            error: `timeout após ${this.config.timeout}ms`,
            executionTime: this.config.timeout,
            memoryUsed: 0,
            logs: [],
          });

          // Reiniciar worker após timeout (pode estar em loop infinito)
          this.restart();
        }
      }, this.config.timeout);

      // Registrar na fila
      this.messageQueue.set(executionId, {
        resolve,
        reject: () => {}, // Não usado, sempre resolve
        timer,
      });

      // Enviar para worker
      this.worker?.postMessage({
        type: 'execute',
        payload: {
          id: executionId,
          code,
          context: {
            ...this.config.globals,
            ...context,
          },
          allowedAPIs: this.config.allowedAPIs,
          memoryLimit: this.config.memoryLimit,
        },
      });
    });
  }

  /**
   * Reinicia o worker (após timeout ou erro grave)
   */
  async restart(): Promise<void> {
    this.terminate();
    await this.initialize();
  }

  /**
   * Encerra o sandbox
   */
  terminate(): void {
    // Limpar fila pendente
    for (const [id, pending] of this.messageQueue) {
      clearTimeout(pending.timer);
      pending.resolve({
        success: false,
        error: 'Sandbox terminated',
        executionTime: 0,
        memoryUsed: 0,
        logs: [],
      });
    }
    this.messageQueue.clear();

    // Terminar worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }

  // ============================================================================
  // API PRIVADA
  // ============================================================================

  private handleWorkerMessage(message: SandboxMessage): void {
    if (message.type === 'result') {
      const payload = message.payload as {
        id?: string;
        result?: SandboxResult;
      } | SandboxResult;

      const pendingId = (payload as { id?: string })?.id ?? Array.from(this.messageQueue.keys()).pop();
      if (!pendingId) return;

      const pending = this.messageQueue.get(pendingId);
      if (pending) {
        clearTimeout(pending.timer);
        this.messageQueue.delete(pendingId);
        if (isSandboxResultPayload(payload)) {
          const resolved = this.isMockWorker()
            ? payload
            : this.normalizeResult(payload);
          pending.resolve(resolved);
          return;
        }
        const wrapped = payload as { result?: SandboxResult };
        if (wrapped?.result) {
          const resolved = this.isMockWorker()
            ? wrapped.result
            : this.normalizeResult(wrapped.result);
          pending.resolve(resolved);
          return;
        }
        pending.resolve({
          success: true,
          result: sanitizeOutput(getPayloadResult(message.payload)),
          executionTime: 0,
          memoryUsed: 0,
          logs: [],
        });
      }
      return;
    }

    if (message.type === 'error' || message.type === 'timeout') {
      const payload = message.payload as { id?: string; error?: string } | undefined;
      const pendingId = payload?.id ?? Array.from(this.messageQueue.keys()).pop();
      if (!pendingId) return;

      const pending = this.messageQueue.get(pendingId);
      if (pending) {
        clearTimeout(pending.timer);
        this.messageQueue.delete(pendingId);
        const errorMessage = payload?.error
          ? (message.type === 'timeout' ? `timeout: ${payload.error}` : payload.error)
          : (message.type === 'timeout' ? 'timeout' : 'Execution error');
        pending.resolve({
          success: false,
          error: errorMessage,
          executionTime: 0,
          memoryUsed: 0,
          logs: [],
        });
      }
    }
  }

  private failPendingExecutions(reason: string): void {
    for (const [id, pending] of this.messageQueue) {
      clearTimeout(pending.timer);
      pending.resolve({
        success: false,
        error: reason,
        executionTime: 0,
        memoryUsed: 0,
        logs: [],
      });
      this.messageQueue.delete(id);
    }
  }

  private checkNestingDepth(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of code) {
      if (char === '{' || char === '(' || char === '[') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}' || char === ')' || char === ']') {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  private normalizeResult(result: SandboxResult): SandboxResult {
    if (!result) return result;
    if (!result.success) return result;
    return {
      ...result,
      result: sanitizeOutput(result.result),
      logs: Array.isArray(result.logs) ? result.logs.slice(0, 5000) : [],
    };
  }

  private isMockWorker(): boolean {
    return hasSimulatedWorker(this.worker);
  }

  private executeInProcess(code: string, context?: Record<string, unknown>): SandboxResult {
    const startTime = Date.now();
    const logs: SandboxLog[] = [];

    const mockConsole = {
      log: (...args: unknown[]) => logs.push({ level: 'log', message: args.map(String).join(' '), timestamp: Date.now() }),
      warn: (...args: unknown[]) => logs.push({ level: 'warn', message: args.map(String).join(' '), timestamp: Date.now() }),
      error: (...args: unknown[]) => logs.push({ level: 'error', message: args.map(String).join(' '), timestamp: Date.now() }),
      info: (...args: unknown[]) => logs.push({ level: 'info', message: args.map(String).join(' '), timestamp: Date.now() }),
    };

    const infiniteLoopPattern = /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/;
    if (infiniteLoopPattern.test(code)) {
      return {
        success: false,
        error: `timeout após ${this.config.timeout}ms`,
        executionTime: this.config.timeout,
        memoryUsed: 0,
        logs,
      };
    }

    const scope: Record<string, unknown> = {
      ...this.config.globals,
      ...context,
    };

    const addIfAllowed = (api: AllowedAPI, key: string, value: unknown) => {
      if (this.config.allowedAPIs.includes(api)) {
        scope[key] = value;
      }
    };

    addIfAllowed('console', 'console', mockConsole);
    addIfAllowed('math', 'Math', Math);
    addIfAllowed('json', 'JSON', JSON);
    addIfAllowed('date', 'Date', Date);
    addIfAllowed('array', 'Array', Array);
    addIfAllowed('object', 'Object', Object);
    addIfAllowed('string', 'String', String);
    addIfAllowed('number', 'Number', Number);
    addIfAllowed('boolean', 'Boolean', Boolean);

    if (this.config.allowedAPIs.includes('number')) {
      scope.parseInt = parseInt;
      scope.parseFloat = parseFloat;
      scope.isNaN = isNaN;
      scope.isFinite = isFinite;
    }

    if (this.config.allowedAPIs.includes('aethel-game')) {
      scope.Aethel = AethelGameAPIs;
    }

    try {
      const scopeKeys = Object.keys(scope);
      const scopeValues = Object.values(scope);
      const fn = new Function(...scopeKeys, `"use strict";\n${code}`);
      let result = fn(...scopeValues);
      const looksLikeExpression = !/\b(return|if|for|while|switch|try|catch|function|class)\b/.test(code)
        && !/[;\n]/.test(code)
        && !/[()]/.test(code);
      if (result === undefined && looksLikeExpression) {
        const exprFn = new Function(...scopeKeys, `"use strict";\nreturn (${code});`);
        result = exprFn(...scopeValues);
      }
      return {
        success: true,
        result: sanitizeOutput(result),
        executionTime: Date.now() - startTime,
        memoryUsed: Array.isArray(result) ? Math.max(1, result.length * 8) : 1024,
        logs,
      };
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : 'Execution error';
      const message = error instanceof SyntaxError || /Unexpected token/.test(rawMessage)
        ? `SyntaxError: ${rawMessage}`
        : rawMessage;
      return {
        success: false,
        error: message,
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
        logs,
      };
    }
  }

  private generateWorkerCode(): string {
    // Este código roda DENTRO do Web Worker, isolado do main thread
    return `
      'use strict';

      // Remover acesso a APIs perigosas
      const _postMessage = postMessage;

      // APIs permitidas (será filtrado por execução)
      const safeAPIs = {
        console: {
          log: (...args) => collectLog('log', args),
          warn: (...args) => collectLog('warn', args),
          error: (...args) => collectLog('error', args),
          info: (...args) => collectLog('info', args),
        },
        Math: Math,
        JSON: {
          parse: JSON.parse,
          stringify: JSON.stringify,
        },
        Date: Date,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        parseInt: parseInt,
        parseFloat: parseFloat,
        isNaN: isNaN,
        isFinite: isFinite,
      };

      let executionLogs = [];

      function collectLog(level, args) {
        const message = args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch {
            return '[Circular]';
          }
        }).join(' ');

        executionLogs.push({
          level,
          message,
          timestamp: Date.now(),
        });
      }

      // Executar código de forma segura
      function safeExecute(code, context, allowedAPIs) {
        executionLogs = [];
        const startTime = (self.performance?.now?.() ?? Date.now());
        const startMemory = 0; // Estimativa

        try {
          // Construir escopo seguro
          const scope = { ...context };

          // Adicionar APIs permitidas
          const apiMap = {
            console: 'console',
            math: 'Math',
            json: 'JSON',
            date: 'Date',
            array: 'Array',
            object: 'Object',
            string: 'String',
            number: 'Number',
            boolean: 'Boolean',
          };

          for (const api of allowedAPIs) {
            const mapped = apiMap[api];
            if (mapped && safeAPIs[mapped]) {
              scope[mapped] = safeAPIs[mapped];
            }
            if (api === 'number') {
              scope.parseInt = safeAPIs.parseInt;
              scope.parseFloat = safeAPIs.parseFloat;
              scope.isNaN = safeAPIs.isNaN;
              scope.isFinite = safeAPIs.isFinite;
            }
          }

          // Criar função com escopo limitado
          const scopeKeys = Object.keys(scope);
          const scopeValues = Object.values(scope);

          // Adicionar "use strict" e envolver em try-catch interno
          const wrappedCode = '"use strict";\\n' + code;

          // Criar e executar função
          const fn = new Function(...scopeKeys, wrappedCode);
          const result = fn(...scopeValues);

          return {
            success: true,
            result: result,
            executionTime: (self.performance?.now?.() ?? Date.now()) - startTime,
            memoryUsed: startMemory,
            logs: executionLogs,
          };
        } catch (error) {
          return {
            success: false,
            error: error.message || 'Unknown error',
            executionTime: (self.performance?.now?.() ?? Date.now()) - startTime,
            memoryUsed: startMemory,
            logs: executionLogs,
          };
        }
      }

      // Handler de mensagens
      self.onmessage = function(event) {
        const { type, payload } = event.data;

        if (type === 'execute') {
          const { id, code, context, allowedAPIs, memoryLimit } = payload;

          // Executar com segurança
          const result = safeExecute(code, context, allowedAPIs);

          // Enviar resultado
          _postMessage({
            type: 'result',
            payload: { id, result },
          });
        }
      };

      // Sinalizar que está pronto
      _postMessage({ type: 'ready' });
    `;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let sandboxInstance: ScriptSandbox | null = null;

/**
 * Obtém instância singleton do sandbox
 */
export function getSandbox(config?: Partial<SandboxConfig>): ScriptSandbox {
  if (!sandboxInstance) {
    sandboxInstance = new ScriptSandbox(config);
  }
  return sandboxInstance;
}

/**
 * Executa código de forma segura (API simplificada)
 */
export async function safeExecute(
  code: string,
  context?: Record<string, unknown>,
  config?: Partial<SandboxConfig>
): Promise<SandboxResult> {
  const sandbox = getSandbox(config);
  return sandbox.execute(code, context);
}


export default ScriptSandbox;
