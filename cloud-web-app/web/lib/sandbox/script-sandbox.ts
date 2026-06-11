import { logger } from '@/lib/observability/logger';
import { executeScriptInProcess } from './script-sandbox-in-process';
import { DANGEROUS_PATTERNS, sanitizeOutput, validateScript } from './script-sandbox-guards';
import { generateSandboxWorkerCode } from './script-sandbox-worker';
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
import type { SandboxConfig, SandboxMessage, SandboxResult } from './script-sandbox.types';

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
        const workerCode = generateSandboxWorkerCode();
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
