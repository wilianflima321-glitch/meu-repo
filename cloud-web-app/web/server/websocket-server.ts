/**
 * Aethel WebSocket Server
 * 
 * Servidor WebSocket unificado para:
 * - Colaboração em tempo real (Yjs/y-websocket)
 * - Terminal PTY streaming
 * - LSP comunicação
 * - AI streaming responses
 * - Debug Adapter Protocol
 * 
 * @usage
 *   npx ts-node server/websocket-server.ts
 *   ou
 *   node dist/server/websocket-server.js
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import * as Y from 'yjs';
import { EventEmitter } from 'events';

// y-websocket setup - dynamic import for compatibility
let setupWSConnection: ((conn: any, req: http.IncomingMessage, options?: any) => void) | null = null;

async function initYWebsocket() {
  try {
    // Try CommonJS require first (works in Node.js)
    // @ts-expect-error - dynamic import may not exist at compile time
    const utils = await import('y-websocket/bin/utils.cjs').catch(() => null);
    if (utils?.setupWSConnection) {
      setupWSConnection = utils.setupWSConnection;
      console.log('[Y-Websocket] Loaded from y-websocket/bin/utils.cjs');
      return;
    }
    
    // Fallback to ESM
    const utilsEsm = await import('y-websocket').catch(() => null);
    if (utilsEsm) {
      // y-websocket may export WSSharedDoc or similar
      console.log('[Y-Websocket] Loaded y-websocket module');
      return;
    }
    
    console.warn('[Y-Websocket] Could not load y-websocket utilities, collaboration will use fallback');
  } catch (error) {
    console.warn('[Y-Websocket] Init error:', error);
  }
}

// Custom event bus for inter-process communication (replaces process.emit abuse)
class ServiceEventBus extends EventEmitter {
  private static instance: ServiceEventBus;
  
  private constructor() {
    super();
    this.setMaxListeners(100);
  }
  
  static getInstance(): ServiceEventBus {
    if (!ServiceEventBus.instance) {
      ServiceEventBus.instance = new ServiceEventBus();
    }
    return ServiceEventBus.instance;
  }
}

const eventBus = ServiceEventBus.getInstance();

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.WS_PORT || '3001', 10);
const HOST = process.env.WS_HOST || '0.0.0.0';

// ============================================================================
// TYPES
// ============================================================================

interface ConnectionInfo {
  id: string;
  type: 'collaboration' | 'terminal' | 'lsp' | 'ai' | 'dap' | 'general';
  userId?: string;
  sessionId?: string;
  createdAt: number;
}

// ============================================================================
// STATE
// ============================================================================

const connections = new Map<WebSocket, ConnectionInfo>();
const rooms = new Map<string, Set<WebSocket>>();
const collaborationDocs = new Map<string, Y.Doc>(); // Fallback Yjs docs

// ============================================================================
// HTTP SERVER
// ============================================================================

const httpServer = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'aethel-websocket-server',
      connections: connections.size,
      rooms: rooms.size,
      uptime: process.uptime(),
    }));
    return;
  }

  // Stats endpoint
  if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalConnections: connections.size,
      connectionsByType: getConnectionStats(),
      rooms: Array.from(rooms.entries()).map(([name, clients]) => ({
        name,
        clients: clients.size,
      })),
      memory: process.memoryUsage(),
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

function getConnectionStats() {
  const stats: Record<string, number> = {};
  for (const info of connections.values()) {
    stats[info.type] = (stats[info.type] || 0) + 1;
  }
  return stats;
}

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;
  
  // Generate connection ID
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine connection type from path
  let connectionType: ConnectionInfo['type'] = 'general';
  if (path.startsWith('/collaboration')) {
    connectionType = 'collaboration';
  } else if (path.startsWith('/terminal')) {
    connectionType = 'terminal';
  } else if (path.startsWith('/lsp')) {
    connectionType = 'lsp';
  } else if (path.startsWith('/ai')) {
    connectionType = 'ai';
  } else if (path.startsWith('/dap')) {
    connectionType = 'dap';
  }

  // Store connection info
  const connectionInfo: ConnectionInfo = {
    id: connectionId,
    type: connectionType,
    userId: url.searchParams.get('userId') || undefined,
    sessionId: url.searchParams.get('sessionId') || undefined,
    createdAt: Date.now(),
  };
  connections.set(ws, connectionInfo);

  console.log(`[WS] New ${connectionType} connection: ${connectionId}`);

  // Handle different connection types
  switch (connectionType) {
    case 'collaboration':
      handleCollaborationConnection(ws, req, url);
      break;
    case 'terminal':
      handleTerminalConnection(ws, connectionInfo);
      break;
    case 'lsp':
      handleLSPConnection(ws, connectionInfo);
      break;
    case 'ai':
      handleAIConnection(ws, connectionInfo);
      break;
    case 'dap':
      handleDAPConnection(ws, connectionInfo);
      break;
    default:
      handleGeneralConnection(ws, connectionInfo);
  }

  // Cleanup on close
  ws.on('close', () => {
    console.log(`[WS] Connection closed: ${connectionId}`);
    connections.delete(ws);
    
    // Remove from rooms
    for (const [roomName, clients] of rooms.entries()) {
      clients.delete(ws);
      if (clients.size === 0) {
        rooms.delete(roomName);
      }
    }
  });

  ws.on('error', (error) => {
    console.error(`[WS] Connection error: ${connectionId}`, error.message);
  });
});

// ============================================================================
// COLLABORATION HANDLER (Yjs/y-websocket)
// ============================================================================

function handleCollaborationConnection(ws: WebSocket, req: http.IncomingMessage, url: URL) {
  // Extract room name from path: /collaboration/:roomName
  const pathParts = url.pathname.split('/').filter(Boolean);
  const roomName = pathParts[1] || 'default';

  console.log(`[Collaboration] Client joining room: ${roomName}`);

  // Use y-websocket's built-in handler if available
  if (setupWSConnection) {
    setupWSConnection(ws as any, req, {
      docName: roomName,
      gc: true, // Enable garbage collection
    });
  } else {
    // Fallback: manual Yjs document management
    console.log('[Collaboration] Using fallback Yjs handler (y-websocket not available)');
    
    // Create or get shared document
    if (!collaborationDocs.has(roomName)) {
      collaborationDocs.set(roomName, new Y.Doc());
    }
    const doc = collaborationDocs.get(roomName)!;
    
    // Handle Yjs sync messages manually
    ws.on('message', (data) => {
      try {
        const message = new Uint8Array(data as ArrayBuffer);
        // Broadcast to all clients in room
        broadcastToRoom(roomName, message, ws);
      } catch (error) {
        console.error('[Collaboration] Sync error:', error);
      }
    });
    
    // Send initial state
    const state = Y.encodeStateAsUpdate(doc);
    ws.send(state);
  }

  // Track room membership
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }
  rooms.get(roomName)!.add(ws);

  // Notify others in room
  broadcastToRoom(roomName, {
    type: 'user-joined',
    roomName,
    userCount: rooms.get(roomName)!.size,
  }, ws);
}

// ============================================================================
// TERMINAL HANDLER
// ============================================================================

function handleTerminalConnection(ws: WebSocket, info: ConnectionInfo) {
  const terminalId = info.sessionId || `term_${Date.now()}`;
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'input':
          // Forward input to PTY via event bus
          eventBus.emit('terminal:input', { terminalId, data: message.data });
          break;
        case 'resize':
          eventBus.emit('terminal:resize', { terminalId, cols: message.cols, rows: message.rows });
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    } catch (error) {
      console.error('[Terminal] Message parse error:', error);
    }
  });

  // Send ready signal
  ws.send(JSON.stringify({ type: 'ready', terminalId }));
}

// ============================================================================
// LSP HANDLER
// ============================================================================

function handleLSPConnection(ws: WebSocket, info: ConnectionInfo) {
  const language = info.sessionId || 'typescript';
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Forward LSP messages to language server via event bus
      eventBus.emit('lsp:message', { language, message, respond: (response: any) => {
        ws.send(JSON.stringify(response));
      }});
    } catch (error) {
      console.error('[LSP] Message parse error:', error);
    }
  });

  ws.send(JSON.stringify({ type: 'ready', language }));
}

// ============================================================================
// AI STREAMING HANDLER
// ============================================================================

function handleAIConnection(ws: WebSocket, info: ConnectionInfo) {
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Forward to AI service for streaming response via event bus
      eventBus.emit('ai:stream', { 
        ...message, 
        stream: (chunk: string) => {
          ws.send(JSON.stringify({ type: 'chunk', content: chunk }));
        },
        done: () => {
          ws.send(JSON.stringify({ type: 'done' }));
        },
        error: (err: string) => {
          ws.send(JSON.stringify({ type: 'error', error: err }));
        }
      });
    } catch (error) {
      console.error('[AI] Message parse error:', error);
    }
  });

  ws.send(JSON.stringify({ type: 'ready' }));
}

// ============================================================================
// DAP (Debug Adapter Protocol) HANDLER
// ============================================================================

function handleDAPConnection(ws: WebSocket, info: ConnectionInfo) {
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Forward DAP messages via event bus
      eventBus.emit('dap:message', { 
        message, 
        respond: (response: any) => {
          ws.send(JSON.stringify(response));
        }
      });
    } catch (error) {
      console.error('[DAP] Message parse error:', error);
    }
  });

  ws.send(JSON.stringify({ type: 'ready' }));
}

// ============================================================================
// GENERAL HANDLER
// ============================================================================

function handleGeneralConnection(ws: WebSocket, info: ConnectionInfo) {
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle room join/leave
      if (message.type === 'join-room') {
        const roomName = message.room;
        if (!rooms.has(roomName)) {
          rooms.set(roomName, new Set());
        }
        rooms.get(roomName)!.add(ws);
        ws.send(JSON.stringify({ type: 'room-joined', room: roomName }));
      } else if (message.type === 'leave-room') {
        const room = rooms.get(message.room);
        if (room) {
          room.delete(ws);
        }
      } else if (message.type === 'broadcast') {
        broadcastToRoom(message.room, message.data, ws);
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (error) {
      console.error('[General] Message parse error:', error);
    }
  });

  ws.send(JSON.stringify({ type: 'connected', connectionId: info.id }));
}

// ============================================================================
// UTILITIES
// ============================================================================

function broadcastToRoom(roomName: string, message: any, exclude?: WebSocket) {
  const room = rooms.get(roomName);
  if (!room) return;

  const data = typeof message === 'string' ? message : JSON.stringify(message);
  
  for (const client of room) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function broadcastAll(message: any, exclude?: WebSocket) {
  const data = typeof message === 'string' ? message : JSON.stringify(message);
  
  for (const client of connections.keys()) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

function shutdown() {
  console.log('\n[WS] Shutting down...');
  
  // Close all connections
  for (const ws of connections.keys()) {
    ws.close(1000, 'Server shutting down');
  }
  
  wss.close(() => {
    httpServer.close(() => {
      console.log('[WS] Server stopped');
      process.exit(0);
    });
  });
  
  // Force exit after timeout
  setTimeout(() => {
    console.log('[WS] Forcing exit...');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {
  // Initialize y-websocket before starting
  await initYWebsocket();
  
  httpServer.listen(PORT, HOST, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 Aethel WebSocket Server                                  ║
║                                                               ║
║   Listening on: ws://${HOST}:${PORT}                            ║
║                                                               ║
║   Endpoints:                                                  ║
║   • /collaboration/:room - Real-time collaboration (Yjs)      ║
║   • /terminal/:id        - Terminal PTY streaming             ║
║   • /lsp/:language       - LSP communication                  ║
║   • /ai                  - AI response streaming              ║
║   • /dap                 - Debug Adapter Protocol             ║
║   • /                    - General WebSocket                  ║
║                                                               ║
║   HTTP:                                                       ║
║   • GET /health          - Health check                       ║
║   • GET /stats           - Server statistics                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });
}

// Start the server
startServer().catch((error) => {
  console.error('[WS] Failed to start server:', error);
  process.exit(1);
});

// Export for programmatic usage
export { wss, httpServer, broadcastToRoom, broadcastAll, eventBus };
