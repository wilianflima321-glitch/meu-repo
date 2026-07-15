/**
 * DAP (Debug Adapter Protocol) Module
 * 
 * IMPORTANTE: Use DAPClient para debug real.
 * Os adapters em ./adapters/ são DEPRECATED e retornam dados mock.
 * 
 * Uso correto:
 * ```typescript
 * import { DAPClient } from '@/lib/dap';
 * 
 * const client = new DAPClient({
 *   type: 'node',  // ou 'python', 'go', etc.
 *   request: 'launch',
 *   program: '/path/to/file.js',
 *   cwd: '/path/to/workspace'
 * });
 * 
 * await client.initialize();
 * await client.launch();
 * ```
 */

// ✅ REAL CLIENT - Use isto
export { DAPClient, DAP_CONFIGS } from './dap-client';
export type { 
  DAPClientConfig,
  Breakpoint,
  StackFrame,
  Variable,
  Scope,
  Thread,
  DebugEvent,
} from './dap-client';

// ⚠️ DEPRECATED - Base class para adapters
// Não use diretamente - use DAPClient
export { DAPAdapterBase } from './dap-adapter-base';
export type {
  DAPAdapterConfig,
  LaunchRequestArguments,
  AttachRequestArguments,
  SetBreakpointsArguments,
  Capabilities,
} from './dap-adapter-base';

/**
 * @deprecated Use DAPClient instead
 * Os adapters individuais retornam dados MOCK.
 * Para debug real, use DAPClient com o tipo apropriado.
 */
export const DEPRECATED_ADAPTERS = {
  nodejs: '@/lib/dap/adapters/nodejs-dap',
  python: '@/lib/dap/adapters/python-dap',
  go: '@/lib/dap/adapters/go-dap',
  java: '@/lib/dap/adapters/java-dap',
} as const;

// Factory para criar cliente correto
export function createDebugClient(config: {
  type: string;
  request?: 'launch' | 'attach';
  program?: string;
  cwd?: string;
  env?: Record<string, string>;
  args?: string[];
  port?: number;
  host?: string;
}) {
  const { DAPClient } = require('./dap-client');
  return new DAPClient({
    type: config.type,
    request: config.request || 'launch',
    name: `Debug ${config.type}`,
    program: config.program,
    cwd: config.cwd,
    env: config.env,
    args: config.args,
    port: config.port,
    host: config.host,
  });
}
