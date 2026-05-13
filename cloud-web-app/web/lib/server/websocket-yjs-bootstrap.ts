import type { IncomingMessage } from 'http';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { pathToFileURL } from 'url';
import type { WebSocket } from 'ws';

import type { WsRecord } from './websocket-runtime-contracts';

const require = createRequire(import.meta.url);
const { createComponentLogger } = require('../observability/logger.ts') as typeof import('../observability/logger');
const log = createComponentLogger('server/websocket-yjs-bootstrap');

type SetupWSConnection = (conn: WebSocket, req: IncomingMessage, options?: WsRecord) => void;

let setupWSConnection: SetupWSConnection | null = null;
let yWebsocketInitPromise: Promise<void> | null = null;

async function importNodeModuleRuntimeOnly<T>(specifier: string): Promise<T> {
  const importer = new Function('resolvedSpecifier', 'return import(resolvedSpecifier)') as (
    resolvedSpecifier: string
  ) => Promise<T>;
  return importer(specifier);
}

export async function initYWebsocket(): Promise<void> {
  if (yWebsocketInitPromise) {
    await yWebsocketInitPromise;
    return;
  }

  yWebsocketInitPromise = (async () => {
    try {
      const utilsPath = join(dirname(require.resolve('y-websocket/package.json')), 'bin', 'utils.cjs');
      const utils = await importNodeModuleRuntimeOnly<{
        setupWSConnection?: SetupWSConnection;
        default?: { setupWSConnection?: SetupWSConnection };
      }>(pathToFileURL(utilsPath).href).catch(() => null);
      const setup = utils?.setupWSConnection || utils?.default?.setupWSConnection;
      if (setup) {
        setupWSConnection = setup;
        log.info('[Y-WebSocket] Loaded y-websocket/bin/utils.cjs');
        return;
      }

      const yWebsocketModule = await import('y-websocket').catch(() => null);
      if (yWebsocketModule) {
        log.info('[Y-WebSocket] Loaded y-websocket module without direct setup helper');
        return;
      }

      log.warn('[Y-WebSocket] Unable to load y-websocket helpers, using fallback sync');
    } catch (error) {
      log.warn('[Y-WebSocket] Init error', error);
    }
  })();

  await yWebsocketInitPromise;
}

export function getYWebsocketSetup(): SetupWSConnection | null {
  return setupWSConnection;
}
