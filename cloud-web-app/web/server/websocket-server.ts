/**
 * Aethel WebSocket Server
 *
 * Compatibility entrypoint for the npm `ws` scripts.
 * The actual implementation now lives in `lib/server/websocket-server.ts`
 * so the script path stays stable while the runtime behavior stays aligned.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const wsRuntime = require('../lib/server/websocket-server.ts') as typeof import('../lib/server/websocket-server');

const {
  getWebSocketServer,
  startWebSocketServer,
  broadcastToRoom,
  broadcastAll,
  eventBus,
} = wsRuntime;

function resolvePort(): number {
  const rawPort =
    process.env.WS_PORT ||
    process.env.AETHEL_WS_PORT ||
    process.env.RUNTIME_PORT ||
    '3001';
  const parsed = Number.parseInt(rawPort, 10);
  return Number.isFinite(parsed) ? parsed : 3001;
}

async function startServer(): Promise<void> {
  await startWebSocketServer(resolvePort());
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startServer().catch((error) => {
    console.error('[WS] Failed to start server', error);
    process.exit(1);
  });
}

export {
  getWebSocketServer,
  startWebSocketServer,
  broadcastToRoom,
  broadcastAll,
  eventBus,
};

export default getWebSocketServer;
