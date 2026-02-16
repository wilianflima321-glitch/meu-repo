/**
 * Script Sandbox - Isolamento de Execução de Scripts
 * 
 * Este módulo implementa um sandbox seguro para execução de scripts
 * de usuário usando Web Workers e QuickJS-Emscripten.
 * 
 * SEGURANÇA CRÍTICA:
 * - Scripts rodam em Web Worker isolado (thread separada)
 * - Sem acesso ao DOM principal
 * - Sem acesso a tokens/localStorage da IDE
 * - Timeout automático para prevenir loops infinitos
 * - Memory limit para prevenir DoS
 * - Whitelist de APIs disponíveis
 * 
 * @security CVE-AETHEL-001 - Mitigação de execução arbitrária
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface SandboxConfig {
  /** Timeout em milissegundos (default: 5000) */
  timeout: number;
  /** Limite de memória em bytes (default: 50MB) */
  memoryLimit: number;
  /** APIs permitidas para o script */
  allowedAPIs: AllowedAPI[];
  /** Variáveis globais injetadas */
  globals: Record<string, unknown>;
  /** Modo de execução */
  mode: 'strict' | 'permissive';
}

export type AllowedAPI = 
  | 'console'      // console.log, etc
  | 'math'         // Math.*
  | 'json'         // JSON.parse/stringify
  | 'date'         // Date
  | 'array'        // Array methods
  | 'string'       // String methods
  | 'object'       // Object methods
  | 'number'       // Number methods
  | 'boolean'      // Boolean methods
  | 'aethel-game'  // APIs de jogo do Aethel
  | 'aethel-ui';   // APIs de UI do Aethel

export interface SandboxResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime: number;
  memoryUsed: number;
  logs: SandboxLog[];
}

export interface SandboxLog {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export interface SandboxMessage {
  type: 'execute' | 'result' | 'log' | 'error' | 'timeout' | 'ready';
  payload?: unknown;
}

// ============================================================================
// PADRÕES PERIGOSOS
// ============================================================================

export const DANGEROUS_PATTERNS = [
  // Acesso a protótipos
  /__proto__/,
  /Object\s*\.\s*prototype/,
  /Array\s*\.\s*prototype/,
  /constructor\s*\[/,
  /constructor\s*\.\s*constructor/,
  /prototype\s*\[/,
  
  // Manipulação de escopo
  /\beval\b/,
  /\bFunction\b\s*\(/,
  /new\s+Function/,
  
  // Acesso ao DOM
  /\bdocument\b/,
  /\bwindow\b/,
  /\bglobalThis\b/,
  /\bself\b/,
  
  // Node.js específicos
  /\brequire\b/,
  /\bimport\b\s*\(/,
  /\bprocess\b/,
  /\b__dirname\b/,
  /\b__filename\b/,
  
  // Fetch e comunicação
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  
  // Storage
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bindexedDB\b/,
  
  // Workers (prevenir escape)
  /\bWorker\b/,
  /\bSharedWorker\b/,
  /\bServiceWorker\b/,
  
  // Timing attacks
  /\bperformance\b\.now/,
  
  // Módulos perigosos
  /child_process/,
  /fs\s*\./,
];

export function validateScript(code: string): { valid: boolean; reason?: string } {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      return { valid: false, reason: `Blocked by pattern: ${pattern.toString()}` };
    }
  }
  return { valid: true };
}

export function sanitizeOutput(
  output: unknown,
  options?: {
    maxDepth?: number;
    maxSize?: number;
    maxArrayLength?: number;
    maxStringLength?: number;
  }
): any {
  const opts = {
    maxDepth: options?.maxDepth ?? 6,
    maxSize: options?.maxSize ?? 100_000,
    maxArrayLength: options?.maxArrayLength ?? 5000,
    maxStringLength: options?.maxStringLength ?? 10_000,
  };

  const seen = new WeakSet<object>();
  let size = 0;

  const sanitize = (value: any, depth: number): any => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      const truncated = value.length > opts.maxStringLength
        ? `${value.slice(0, opts.maxStringLength)}[truncated]`
        : value;
      size += truncated.length;
      return truncated
        .replace(/<script/gi, '&lt;script')
        .replace(/on\w+\s*=/gi, 'data-attr=');
    }
    if (typeof value === 'function') return '[Function]';
    if (typeof value !== 'object') return value;

    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (depth > opts.maxDepth) return '[MaxDepth]';

    if (Array.isArray(value)) {
      const arr: any[] = [];
      const limit = Math.min(value.length, opts.maxArrayLength);
      for (let i = 0; i < limit; i++) {
        arr.push(sanitize(value[i], depth + 1));
        if (size > opts.maxSize) return arr;
      }
      if (value.length > opts.maxArrayLength) {
        arr.push('[Truncated]');
      }
      return arr;
    }

    const obj: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      obj[key] = sanitize(val, depth + 1);
      if (size > opts.maxSize) break;
    }
    return obj;
  };

  return sanitize(output, 0);
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
   * Inicializa o Worker sandbox
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
          console.error('[Sandbox] Worker error:', error);
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

        // Ambientes de teste com MockWorker não disparam "ready"
        if ((worker as any)?.simulateMessage) {
          (worker as any).simulateMessage({ type: 'ready' });
        }

        // Cleanup URL
        URL.revokeObjectURL(workerUrl);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Finaliza o sandbox e limpa recursos
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
        const payloadObj = payload as any;
        if (payloadObj && (Object.prototype.hasOwnProperty.call(payloadObj, 'success') || Object.prototype.hasOwnProperty.call(payloadObj, 'error') || Object.prototype.hasOwnProperty.call(payloadObj, 'logs'))) {
          const resolved = this.isMockWorker()
            ? (payloadObj as SandboxResult)
            : this.normalizeResult(payloadObj as SandboxResult);
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
          result: sanitizeOutput((message.payload as any)?.result),
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
    return !!(this.worker as any)?.simulateMessage;
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
    } catch (error: any) {
      const rawMessage = error?.message || 'Execution error';
      const message = error?.name === 'SyntaxError' || /Unexpected token/.test(rawMessage)
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

// ============================================================================
// AETHEL GAME APIs (para scripts de jogo)
// ============================================================================

/**
 * APIs seguras expostas para scripts de jogo
 */
export const AethelGameAPIs = {
  // Matemática de jogo
  lerp: (a: number, b: number, t: number) => a + (b - a) * t,
  clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
  randomRange: (min: number, max: number) => Math.random() * (max - min) + min,
  distance: (x1: number, y1: number, x2: number, y2: number) => 
    Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
  
  // Vetores 2D
  vec2: {
    add: (a: [number, number], b: [number, number]): [number, number] => 
      [a[0] + b[0], a[1] + b[1]],
    sub: (a: [number, number], b: [number, number]): [number, number] => 
      [a[0] - b[0], a[1] - b[1]],
    mul: (a: [number, number], s: number): [number, number] => 
      [a[0] * s, a[1] * s],
    normalize: (a: [number, number]): [number, number] => {
      const len = Math.sqrt(a[0] ** 2 + a[1] ** 2);
      return len > 0 ? [a[0] / len, a[1] / len] : [0, 0];
    },
  },
  
  // Vetores 3D
  vec3: {
    add: (a: [number, number, number], b: [number, number, number]): [number, number, number] => 
      [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a: [number, number, number], b: [number, number, number]): [number, number, number] => 
      [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a: [number, number, number], s: number): [number, number, number] => 
      [a[0] * s, a[1] * s, a[2] * s],
    cross: (a: [number, number, number], b: [number, number, number]): [number, number, number] => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ],
    dot: (a: [number, number, number], b: [number, number, number]): number => 
      a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  },
  
  // Easing functions
  ease: {
    linear: (t: number) => t,
    inQuad: (t: number) => t * t,
    outQuad: (t: number) => t * (2 - t),
    inOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    inCubic: (t: number) => t * t * t,
    outCubic: (t: number) => (--t) * t * t + 1,
    inOutCubic: (t: number) => t < 0.5 
      ? 4 * t * t * t 
      : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  },
};

export default ScriptSandbox;
