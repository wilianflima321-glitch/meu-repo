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
  | 'console'      // console APIs
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
