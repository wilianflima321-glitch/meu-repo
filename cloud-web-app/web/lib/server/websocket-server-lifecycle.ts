import { createServer, type IncomingMessage, type Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { handleRuntimeHttpRequest } from './websocket/http-routes.ts';

export async function startWebSocketRuntime(input: {
  port: number;
  host: string;
  health: () => unknown;
  stats: () => unknown;
  metrics: () => string;
  onConnection: (ws: WebSocket, request: IncomingMessage) => void;
  onError: (error: Error) => void;
  onListening: () => void;
}): Promise<{ httpServer: HttpServer; wss: WebSocketServer }> {
  return new Promise((resolve, reject) => {
    const httpServer = createServer((req, res) =>
      handleRuntimeHttpRequest(req, res, {
        health: input.health,
        stats: input.stats,
        metrics: input.metrics,
      })
    );

    const wss = new WebSocketServer({ server: httpServer });
    wss.on('connection', input.onConnection);
    wss.on('error', input.onError);

    httpServer.on('error', reject);
    httpServer.listen(input.port, input.host, () => {
      input.onListening();
      resolve({ httpServer, wss });
    });
  });
}

export async function stopWebSocketRuntime(input: {
  connections: Map<WebSocket, unknown>;
  clients: Map<string, unknown>;
  channels: Map<string, unknown>;
  legacyRooms: Map<string, unknown>;
  collaborationDocs: Map<string, unknown>;
  wss: WebSocketServer | null;
  httpServer: HttpServer | null;
}): Promise<void> {
  for (const ws of input.connections.keys()) {
    try {
      ws.close(1001, 'Server shutting down');
    } catch {
    }
  }

  input.clients.clear();
  input.channels.clear();
  input.connections.clear();
  input.legacyRooms.clear();
  input.collaborationDocs.clear();

  if (input.wss) {
    await new Promise<void>((resolve) => {
      input.wss!.close(() => resolve());
    });
  }

  if (input.httpServer) {
    await new Promise<void>((resolve) => {
      input.httpServer!.close(() => resolve());
    });
  }
}
