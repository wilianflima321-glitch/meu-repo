import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolveWorkspaceRoot } from '@/lib/server/workspace-path';

export type DapSessionId = string;

type DapMessage =
  | { type: 'request'; seq: number; command: string; arguments?: any }
  | { type: 'response'; seq: number; request_seq: number; success: boolean; command: string; message?: string; body?: any }
  | { type: 'event'; seq: number; event: string; body?: any };

type Pending = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  command: string;
};

function getGlobalSessions(): Map<DapSessionId, DapSession> {
  const g = globalThis as any;
  if (!g.__AETHEL_DAP_SESSIONS__) {
    g.__AETHEL_DAP_SESSIONS__ = new Map();
  }
  return g.__AETHEL_DAP_SESSIONS__ as Map<DapSessionId, DapSession>;
}

function makeSessionId(): string {
  // Evita depender de crypto em edge; esse módulo roda no Node runtime
  return `dap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

class DapStdioClient {
  private child: ChildProcessWithoutNullStreams;
  private buffer: Buffer = Buffer.alloc(0);
  private pending = new Map<number, Pending>();
  private onEvent: (evt: { event: string; body?: any }) => void;

  constructor(child: ChildProcessWithoutNullStreams, onEvent: (evt: { event: string; body?: any }) => void) {
    this.child = child;
    this.onEvent = onEvent;

    child.stdout.on('data', (chunk: Buffer) => this.onData(chunk));
    child.on('exit', (code, signal) => {
      const message = `DAP process exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`;
      for (const [, p] of this.pending) p.reject(new Error(message));
      this.pending.clear();
    });
  }

  private onData(chunk: Buffer) {
    // Append (casts locais por causa de tipagem Buffer/Uint8Array em TS)
    const next = Buffer.allocUnsafe(this.buffer.length + chunk.length);
    (this.buffer as any).copy(next as any, 0);
    (chunk as any).copy(next as any, this.buffer.length);
    this.buffer = next;

    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;

      const header = this.buffer.slice(0, headerEnd).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = Number(match[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;
      if (this.buffer.length < bodyEnd) return;

      const bodyText = this.buffer.slice(bodyStart, bodyEnd).toString('utf8');
      this.buffer = this.buffer.slice(bodyEnd);

      let msg: DapMessage | null = null;
      try {
        msg = JSON.parse(bodyText);
      } catch {
        continue;
      }

      if (!msg) continue;

      if ((msg as any).type === 'event') {
        const e = msg as any;
        this.onEvent({ event: e.event, body: e.body });
        continue;
      }

      if ((msg as any).type === 'response') {
        const r = msg as any;
        const pending = this.pending.get(r.request_seq);
        if (!pending) continue;
        this.pending.delete(r.request_seq);

        if (!r.success) {
          pending.reject(new Error(String(r.message || `DAP request failed: ${pending.command}`)));
        } else {
          pending.resolve(r.body ?? {});
        }
      }
    }
  }

  sendRequest(seq: number, command: string, args: any): Promise<any> {
    const payload: DapMessage = { type: 'request', seq, command, arguments: args };
    const json = JSON.stringify(payload);
    const frame = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;

    return new Promise((resolve, reject) => {
      this.pending.set(seq, { resolve, reject, command });
      this.child.stdin.write(frame, 'utf8', (err) => {
        if (err) {
          this.pending.delete(seq);
          reject(err);
        }
      });
    });
  }

  stop(): void {
    try {
      // Tentativa best-effort de encerrar de forma limpa
      const json = JSON.stringify({ type: 'request', seq: 1, command: 'disconnect', arguments: { terminateDebuggee: true } });
      const frame = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
      this.child.stdin.write(frame, 'utf8');
    } catch {
      // ignore
    }

    this.child.kill();
  }
}

export type DapSession = {
  sessionId: DapSessionId;
  userId: string;
  type: string;
  pid?: number | null;
  adapterCommand?: string;
  adapterArgs?: string[];
  workspaceRoot: string;
  createdAt: number;
  lastUsedAt: number;
  rpc: DapStdioClient;
  events: Array<{ event: string; body?: any; ts: number }>;
  stop: () => void;
};

async function fileExists(p: string): Promise<boolean> {
  return await fs
    .stat(p)
    .then(() => true)
    .catch(() => false);
}

function resolveAdapterForType(type: string): { command: string; args: string[] } | null {
  const t = String(type || '').toLowerCase();

  if (t === 'python') {
    const cmd = String(process.env.AETHEL_DAP_PYTHON_CMD || 'python');
    // debugpy.adapter fala DAP via stdio
    const args = ['-m', 'debugpy.adapter'];
    return { command: cmd, args };
  }

  // Node/JS precisa de um debug adapter DAP real (ex.: vsdbg/js-debug). Exigimos configuração explícita.
  if (t === 'node' || t === 'nodejs' || t === 'javascript' || t === 'typescript') {
    const cmd = String(process.env.AETHEL_DAP_NODE_CMD || '').trim();
    const argsRaw = String(process.env.AETHEL_DAP_NODE_ARGS || '').trim();
    if (!cmd) return null;
    const args = argsRaw ? argsRaw.split(' ').filter(Boolean) : [];
    return { command: cmd, args };
  }

  return null;
}

export async function startDapSession(opts: {
  userId: string;
  type: string;
  workspaceRoot?: string;
  cwd?: string;
  env?: Record<string, string>;
  adapter?: { command: string; args?: string[] };
}): Promise<DapSession> {
  const sessions = getGlobalSessions();

  const workspaceRootRaw = String(opts.workspaceRoot || opts.cwd || '').trim();
  const workspaceRootAbs = workspaceRootRaw ? resolveWorkspaceRoot(workspaceRootRaw) : resolveWorkspaceRoot(process.cwd());

  const adapter = opts.adapter?.command
    ? { command: String(opts.adapter.command), args: Array.isArray(opts.adapter.args) ? opts.adapter.args.map(String) : [] }
    : resolveAdapterForType(opts.type);

  if (!adapter) {
    const e = Object.assign(new Error(`DAP_UNSUPPORTED_TYPE: ${opts.type}`), { code: 'DAP_UNSUPPORTED_TYPE' });
    throw e;
  }

  // Heurística: se for um caminho relativo, tenta resolver dentro do workspace
  const commandPath = adapter.command;
  const maybeLocal = !path.isAbsolute(commandPath) ? path.join(workspaceRootAbs, commandPath) : commandPath;
  const hasLocal = !path.isAbsolute(commandPath) && (await fileExists(maybeLocal));

  const command = hasLocal ? maybeLocal : commandPath;
  const child = spawn(command, adapter.args, {
    cwd: workspaceRootAbs,
    env: {
      ...process.env,
      ...(opts.env || {}),
    },
    stdio: 'pipe',
  });

  const sessionId = makeSessionId();
  const events: Array<{ event: string; body?: any; ts: number }> = [];

  const rpc = new DapStdioClient(child, (evt) => {
    events.push({ event: evt.event, body: evt.body, ts: Date.now() });
    // proteção simples contra crescimento infinito
    if (events.length > 500) events.splice(0, events.length - 500);
  });

  const session: DapSession = {
    sessionId,
    userId: opts.userId,
    type: String(opts.type || ''),
    pid: child.pid ?? null,
    adapterCommand: command,
    adapterArgs: adapter.args,
    workspaceRoot: workspaceRootAbs,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
    rpc,
    events,
    stop: () => {
      try {
        rpc.stop();
      } finally {
        sessions.delete(sessionId);
      }
    },
  };

  sessions.set(sessionId, session);
  return session;
}

export function getDapSession(sessionId: string): DapSession | null {
  const sessions = getGlobalSessions();
  return sessions.get(sessionId) ?? null;
}

export function listDapSessions(userId?: string): DapSession[] {
  const sessions = getGlobalSessions();
  const all = Array.from(sessions.values());
  if (!userId) return all;
  return all.filter((s) => s.userId === userId);
}

export function stopDapSession(sessionId: string): boolean {
  const s = getDapSession(sessionId);
  if (!s) return false;
  s.stop();
  return true;
}

export function drainDapEvents(sessionId: string): Array<{ event: string; body?: any; ts: number }> {
  const s = getDapSession(sessionId);
  if (!s) return [];
  s.lastUsedAt = Date.now();
  const out = s.events.splice(0, s.events.length);
  return out;
}

export async function dapRequest(sessionId: string, seq: number, command: string, args: any): Promise<any> {
  const s = getDapSession(sessionId);
  if (!s) {
    throw Object.assign(new Error('DAP_SESSION_NOT_FOUND'), { code: 'DAP_SESSION_NOT_FOUND' });
  }
  s.lastUsedAt = Date.now();
  return await s.rpc.sendRequest(seq, command, args);
}
