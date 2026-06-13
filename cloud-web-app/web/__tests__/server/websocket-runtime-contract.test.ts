import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get as httpGet } from 'http';
import { WebSocket as NodeWebSocket } from 'ws';

const terminalManager = vi.hoisted(() => ({
  on: vi.fn(),
  createSession: vi.fn(),
  write: vi.fn(() => true),
  resize: vi.fn(() => true),
  killSession: vi.fn(async () => undefined),
}));

const logger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(() => logger),
  timed: vi.fn(() => vi.fn()),
};

const redisQueueMock = vi.hoisted(() => ({
  getQueueRedis: vi.fn(async () => ({
    get: vi.fn(async () => null),
  })),
}));

vi.mock('@/lib/server/terminal-pty-runtime', () => ({
  getTerminalPtyManager: vi.fn(() => terminalManager),
}));

vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => logger),
}));

vi.mock('@/lib/redis-queue', () => redisQueueMock);
vi.mock('../../lib/redis-queue.ts', () => redisQueueMock);

function request(path: string, port: number): Promise<{ statusCode: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpGet(
      {
        host: '127.0.0.1',
        port,
        path,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    req.on('error', reject);
  });
}

describe('shared websocket runtime contract', () => {
  const startedServers: Array<{ stop: () => Promise<void> }> = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    while (startedServers.length > 0) {
      const server = startedServers.pop();
      await server?.stop().catch(() => undefined);
    }
  });

  it('keeps the compatibility entrypoint wired to the shared runtime exports', async () => {
    const compat = await import('@/server/websocket-server');

    expect(compat.default).toBe(compat.getWebSocketServer);
    expect(typeof compat.getWebSocketServer).toBe('function');
    expect(typeof compat.startWebSocketServer).toBe('function');
    expect(typeof compat.broadcastToRoom).toBe('function');
    expect(typeof compat.broadcastAll).toBe('function');
    expect(typeof compat.eventBus.on).toBe('function');
    expect(typeof compat.eventBus.emit).toBe('function');
  });

  it('serves the HTTP helper routes for health, stats, metrics, and 404s', async () => {
    const runtime = await import('@/lib/server/websocket-server');
    const server = new runtime.AethelWebSocketServer(0);
    startedServers.push(server);

    await server.start();

    const address = (server as any).httpServer?.address();
    expect(address).toBeTruthy();
    expect(typeof address.port).toBe('number');

    const [rootResponse, healthResponse, statsResponse, metricsResponse, missingResponse] = await Promise.all([
      request('/', address.port),
      request('/health', address.port),
      request('/stats', address.port),
      request('/metrics', address.port),
      request('/missing', address.port),
    ]);

    expect(rootResponse.statusCode).toBe(200);
    expect(rootResponse.headers['content-type']).toContain('application/json');
    expect(JSON.parse(rootResponse.body)).toEqual(expect.any(Object));

    expect(healthResponse.statusCode).toBe(200);
    expect(JSON.parse(healthResponse.body)).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'aethel-websocket-server',
        connections: 0,
        modernClients: 0,
        channels: 0,
        rooms: 0,
        uptime: expect.any(Number),
      })
    );

    expect(statsResponse.statusCode).toBe(200);
    expect(JSON.parse(statsResponse.body)).toEqual(
      expect.objectContaining({
        totalConnections: 0,
        modernClients: 0,
        channels: [],
        legacyRooms: [],
        connectionsByType: {
          collaboration: 0,
          terminal: 0,
          lsp: 0,
          ai: 0,
          dap: 0,
          export: 0,
          general: 0,
        },
        memory: expect.any(Object),
      })
    );

    expect(metricsResponse.statusCode).toBe(200);
    expect(metricsResponse.body).toContain('aethel_ws_connections 0');

    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.body).toBe('Not Found');
  });

  it('rejects websocket upgrades on HTTP-only helper paths', async () => {
    const runtime = await import('@/lib/server/websocket-server');
    const server = new runtime.AethelWebSocketServer(0);
    startedServers.push(server);

    await server.start();

    const address = (server as any).httpServer?.address();
    const closeDetails = await new Promise<{ code: number; reason: string }>((resolve, reject) => {
      const socket = new NodeWebSocket(`ws://127.0.0.1:${address.port}/health`);

      socket.once('error', reject);
      socket.once('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    expect(closeDetails.code).toBe(1008);
    expect(closeDetails.reason).toBe('Unsupported WebSocket path');
  });
});
