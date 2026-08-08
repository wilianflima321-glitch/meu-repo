import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolveWorkspaceRoot } from '@/lib/server/workspace-path';

import {createComponentLogger, logger} from '@/lib/observability/logger'

const log = createComponentLogger('server/lsp-runtime')

type JsonRpc = {
  jsonrpc?: '2.0';
  id?: number | string | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { message?: string; data?: unknown };
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type ErrorWithData = Error & { data?: unknown };
type LspGlobal = typeof globalThis & {
  __AETHEL_LSP_SESSIONS__?: Map<LspSessionKey, LspSession>;
};

class JsonRpcStdioClient {
  private child: ChildProcessWithoutNullStreams;
  private buffer: Buffer = Buffer.alloc(0);
  private pending = new Map<number | string, Pending>();

  constructor(child: ChildProcessWithoutNullStreams) {
    this.child = child;

    child.stdout.on('data', (chunk: Buffer) => this.onData(chunk));
    child.on('exit', (code, signal) => {
      const message = `LSP process exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`;
      for (const [, p] of this.pending) p.reject(new Error(message));
      this.pending.clear();
    });
  }

  private onData(chunk: Buffer) {
    const next = Buffer.allocUnsafe(this.buffer.length + chunk.length);
    next.set(this.buffer, 0);
    next.set(chunk, this.buffer.length);
    this.buffer = next;

    // Parse: Content-Length: <n>\r\n...\r\n\r\n<json>
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;

      const header = this.buffer.slice(0, headerEnd).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        // Fail-safe: drop until after header separator
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = Number(match[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;
      if (this.buffer.length < bodyEnd) return;

      const body = this.buffer.slice(bodyStart, bodyEnd).toString('utf8');
      this.buffer = this.buffer.slice(bodyEnd);

      let msg: JsonRpc | null = null;
      try {
        msg = JSON.parse(body);
      } catch {
        continue;
      }

      if (!msg) continue;
      if (msg.id !== undefined && msg.id !== null && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) {
          const e: ErrorWithData = new Error(String(msg.error.message || 'LSP error'));
          e.data = msg.error.data;
          p.reject(e);
        } else {
          p.resolve(msg.result);
        }
      }
      // notifications/events are ignored here (client-side already handles diagnostics separately)
    }
  }

  sendRequest<T = unknown>(id: number | string, method: string, params: unknown): Promise<T> {
    const payload: JsonRpc = { jsonrpc: '2.0', id, method, params };
    const json = JSON.stringify(payload);
    const frame = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (value: unknown) => resolve(value as T), reject });
      this.child.stdin.write(frame, 'utf8', (err) => {
        if (err) {
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  sendNotification(method: string, params: unknown): void {
    const payload: JsonRpc = { jsonrpc: '2.0', method, params };
    const json = JSON.stringify(payload);
    const frame = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
    this.child.stdin.write(frame, 'utf8');
  }

  stop(): void {
    try {
      this.sendNotification('exit', {});
    } catch {
      // ignore
    }
    this.child.kill();
  }
}

export type LspSessionKey = string;

type LspSession = {
  key: LspSessionKey;
  language: string;
  workspaceRoot: string;
  createdAt: number;
  lastUsedAt: number;
  rpc: JsonRpcStdioClient;
  stop: () => void;
};

function getGlobalSessions(): Map<LspSessionKey, LspSession> {
  const g = globalThis as LspGlobal;
  if (!g.__AETHEL_LSP_SESSIONS__) {
    g.__AETHEL_LSP_SESSIONS__ = new Map();
  }
  return g.__AETHEL_LSP_SESSIONS__;
}

async function resolveTsLsEntry(workspaceRoot: string): Promise<string | null> {
  const candidate = path.join(workspaceRoot, 'node_modules', 'typescript-language-server', 'lib', 'cli.js');
  return await fs
    .stat(candidate)
    .then(() => candidate)
    .catch(() => null);
}

function normalizeLanguage(language: string): string {
  const l = String(language || '').toLowerCase();
  if (l === 'javascript' || l === 'javascriptreact') return 'typescript';
  if (l === 'typescript' || l === 'typescriptreact') return 'typescript';
  if (l === 'python' || l === 'py') return 'python';
  if (l === 'go' || l === 'golang') return 'go';
  if (l === 'rust' || l === 'rs') return 'rust';
  if (l === 'c' || l === 'cpp' || l === 'c++') return 'cpp';
  if (l === 'java') return 'java';
  if (l === 'csharp' || l === 'c#' || l === 'cs') return 'csharp';
  return l;
}

// LSP Server configurations per language
interface LspServerConfig {
  command: string;
  args: string[];
  localPath?: (workspaceRoot: string) => Promise<string | null>;
}

const LSP_CONFIGS: Record<string, LspServerConfig> = {
  typescript: {
    command: 'typescript-language-server',
    args: ['--stdio'],
    localPath: async (workspaceRoot) => {
      const candidate = path.join(workspaceRoot, 'node_modules', 'typescript-language-server', 'lib', 'cli.js');
      return await fs.stat(candidate).then(() => candidate).catch(() => null);
    },
  },
  python: {
    command: 'pyright-langserver',
    args: ['--stdio'],
    localPath: async (workspaceRoot) => {
      const candidates = [
        path.join(workspaceRoot, 'node_modules', 'pyright', 'langserver.index.js'),
        path.join(workspaceRoot, 'node_modules', 'basedpyright', 'langserver.index.js'),
      ];
      for (const candidate of candidates) {
        const hit = await fs.stat(candidate).then(() => candidate).catch(() => null);
        if (hit) return hit;
      }
      return null;
    },
  },
  go: {
    command: 'gopls',
    args: ['serve'],
  },
  rust: {
    command: 'rust-analyzer',
    args: [],
  },
  cpp: {
    command: 'clangd',
    args: ['--background-index'],
  },
  java: {
    command: 'jdtls',
    args: [],
  },
  csharp: {
    command: 'OmniSharp',
    args: ['-lsp'],
  },
};

const SUPPORTED_LANGUAGES = Object.keys(LSP_CONFIGS);

async function findExecutable(command: string): Promise<string | null> {
  const { execSync } = require('child_process');
  try {
    const isWindows = process.platform === 'win32';
    const result = execSync(isWindows ? `where ${command}` : `which ${command}`, { 
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.trim().split('\n')[0] || null;
  } catch {
    return null;
  }
}

export async function getOrCreateLspSession(opts: {
  userId: string;
  language: string;
  workspaceRoot: string;
}): Promise<LspSession> {
  const language = normalizeLanguage(opts.language);
  
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw Object.assign(
      new Error(`UNSUPPORTED_LSP_LANGUAGE: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`), 
      { code: 'UNSUPPORTED_LSP_LANGUAGE' }
    );
  }

  const workspaceRootAbs = resolveWorkspaceRoot(opts.workspaceRoot);
  const key = `${opts.userId}:${language}:${workspaceRootAbs}`;

  const sessions = getGlobalSessions();
  const existing = sessions.get(key);
  if (existing) {
    existing.lastUsedAt = Date.now();
    return existing;
  }

  const config = LSP_CONFIGS[language];
  let execPath: string | null = null;
  let execArgs: string[] = config.args;

  // Env override (Windows: AETHEL_LSP_PYTHON when PATH discovery fails).
  const envKeys =
    language === 'python'
      ? ['AETHEL_LSP_PYTHON', 'AETHEL_LSP_PYRIGHT']
      : language === 'typescript'
        ? ['AETHEL_LSP_TYPESCRIPT', 'AETHEL_LSP_TSSERVER']
        : language === 'rust'
          ? ['AETHEL_LSP_RUST_ANALYZER', 'AETHEL_LSP_RUST']
          : [];
  for (const key of envKeys) {
    const override = process.env[key]?.trim();
    if (!override) continue;
    const hit = await fs.stat(override).then(() => override).catch(() => null);
    if (hit) {
      execPath = hit;
      if (language === 'python' && /pylsp/i.test(path.basename(hit))) {
        execArgs = [];
      }
      break;
    }
    throw Object.assign(
      new Error(`LSP_BINARY_HELD: env ${key}=${override} is set but not an executable file`),
      { code: `${language.toUpperCase()}_LANGUAGE_SERVER_NOT_INSTALLED` }
    );
  }

  // Try local installation first (for Node-based LSPs)
  if (!execPath && config.localPath) {
    const localEntry = await config.localPath(workspaceRootAbs);
    if (localEntry) {
      execPath = process.execPath; // node
      execArgs = [localEntry, ...config.args];
    }
  }

  // Fall back to global installation (+ python secondary binaries).
  if (!execPath) {
    const candidates =
      language === 'python'
        ? [config.command, 'basedpyright-langserver', 'pylsp']
        : [config.command];
    for (const command of candidates) {
      const globalPath = await findExecutable(command);
      if (globalPath) {
        execPath = globalPath;
        if (language === 'python' && /pylsp/i.test(command)) {
          execArgs = [];
        }
        break;
      }
    }
  }

  if (!execPath) {
    const hint =
      language === 'python'
        ? `${config.command} (or pylsp); on Windows set AETHEL_LSP_PYTHON`
        : config.command;
    throw Object.assign(
      new Error(`${language.toUpperCase()}_LANGUAGE_SERVER_NOT_INSTALLED: Install ${hint}`),
      { code: `${language.toUpperCase()}_LANGUAGE_SERVER_NOT_INSTALLED` }
    );
  }

  log.info(`[LSP] Starting ${language} server: ${execPath} ${execArgs.join(' ')}`);

  const child = spawn(execPath, execArgs, {
    cwd: workspaceRootAbs,
    env: {
      ...process.env,
      // Specific env vars for some LSPs
      ...(language === 'rust' ? { RUST_ANALYZER_SERVER: 'true' } : {}),
    },
    stdio: 'pipe',
  });

  child.on('error', (err) => {
    logger.error(`[LSP] ${language} server error:`, err);
  });

  child.stderr?.on('data', (data: Buffer) => {
    log.info(`[LSP ${language}] stderr:`, data.toString());
  });

  const rpc = new JsonRpcStdioClient(child);
  const session: LspSession = {
    key,
    language,
    workspaceRoot: workspaceRootAbs,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
    rpc,
    stop: () => {
      try {
        rpc.stop();
      } finally {
        sessions.delete(key);
      }
    },
  };

  sessions.set(key, session);
  return session;
}
