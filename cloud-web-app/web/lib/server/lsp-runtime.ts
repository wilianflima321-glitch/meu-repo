import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolveWorkspaceRoot } from '@/lib/server/workspace-path';

type JsonRpc = {
  jsonrpc?: '2.0';
  id?: number | string | null;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
};

type Pending = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
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
    // Evita problemas de tipagem com Buffer.concat (Uint8Array<ArrayBufferLike> vs ArrayBuffer)
    const next = Buffer.allocUnsafe(this.buffer.length + chunk.length);
    (this.buffer as any).copy(next as any, 0);
    (chunk as any).copy(next as any, this.buffer.length);
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
          const e = new Error(String(msg.error?.message || 'LSP error'));
          (e as any).data = msg.error;
          p.reject(e);
        } else {
          p.resolve(msg.result);
        }
      }
      // notifications/events are ignored here (client-side already handles diagnostics separately)
    }
  }

  sendRequest(id: number | string, method: string, params: any): Promise<any> {
    const payload: JsonRpc = { jsonrpc: '2.0', id, method, params };
    const json = JSON.stringify(payload);
    const frame = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(frame, 'utf8', (err) => {
        if (err) {
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  sendNotification(method: string, params: any): void {
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
  const g = globalThis as any;
  if (!g.__AETHEL_LSP_SESSIONS__) {
    g.__AETHEL_LSP_SESSIONS__ = new Map();
  }
  return g.__AETHEL_LSP_SESSIONS__ as Map<LspSessionKey, LspSession>;
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
  if (l === 'javascript') return 'typescript';
  if (l === 'typescript') return 'typescript';
  return l;
}

export async function getOrCreateLspSession(opts: {
  userId: string;
  language: string;
  workspaceRoot: string;
}): Promise<LspSession> {
  const language = normalizeLanguage(opts.language);
  if (language !== 'typescript') {
    throw Object.assign(new Error(`UNSUPPORTED_LSP_LANGUAGE: ${language}`), { code: 'UNSUPPORTED_LSP_LANGUAGE' });
  }

  const workspaceRootAbs = resolveWorkspaceRoot(opts.workspaceRoot);
  const key = `${opts.userId}:${language}:${workspaceRootAbs}`;

  const sessions = getGlobalSessions();
  const existing = sessions.get(key);
  if (existing) {
    existing.lastUsedAt = Date.now();
    return existing;
  }

  const entry = await resolveTsLsEntry(workspaceRootAbs);
  if (!entry) {
    throw Object.assign(
      new Error('TYPESCRIPT_LANGUAGE_SERVER_NOT_INSTALLED'),
      { code: 'TYPESCRIPT_LANGUAGE_SERVER_NOT_INSTALLED' }
    );
  }

  const child = spawn(process.execPath, [entry, '--stdio'], {
    cwd: workspaceRootAbs,
    env: process.env,
    stdio: 'pipe',
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
