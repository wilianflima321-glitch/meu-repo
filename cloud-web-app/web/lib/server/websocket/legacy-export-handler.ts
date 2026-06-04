import { WebSocket } from 'ws';
import { getQueueRedis } from '../../redis-queue';
import type { LegacyExportState } from '../websocket-runtime-contracts';
import { asWsRecord, readString } from '../websocket-runtime-codecs';

type LegacyExportHandlerParams = {
  ws: WebSocket;
  pathname: string;
  sendRaw: (ws: WebSocket, message: unknown) => void;
};

export async function handleLegacyExportConnection({
  ws,
  pathname,
  sendRaw,
}: LegacyExportHandlerParams): Promise<void> {
    const exportId = pathname.split('/').filter(Boolean)[1];
    if (!exportId) {
      sendRaw(ws, { type: 'error', error: 'Missing exportId in path (/export/:exportId)' });
      ws.close(1008, 'Missing exportId');
      return;
    }

    const pollMs = Number.parseInt(process.env.EXPORT_WS_POLL_MS || '1000', 10);
    let stopped = false;
    let timer: NodeJS.Timeout | null = null;
    const state: LegacyExportState = {
      raw: null,
      pollMs: Number.isFinite(pollMs) ? Math.max(250, pollMs) : 1000,
    };

    const stop = () => {
      stopped = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    ws.on('close', stop);
    ws.on('error', stop);

    sendRaw(ws, { type: 'ready', exportId, pollMs: state.pollMs });

    try {
      const redis = await getQueueRedis();
      const key = `export:${exportId}`;

      const sendState = (raw: string | null) => {
        if (stopped || ws.readyState !== WebSocket.OPEN) {
          return;
        }

        if (raw === state.raw) {
          return;
        }

        state.raw = raw;
        if (raw === null) {
          sendRaw(ws, { type: 'export-status', exportId, state: null });
          return;
        }

        try {
          const parsed = asWsRecord(JSON.parse(raw));
          sendRaw(ws, { type: 'export-status', exportId, state: parsed });
          if (['completed', 'failed', 'canceled'].includes(readString(parsed.status) || '')) {
            stop();
          }
        } catch {
          sendRaw(ws, { type: 'export-status', exportId, state: raw });
        }
      };

      sendState(await redis.get(key));
      timer = setInterval(async () => {
        if (stopped) {
          return;
        }
        try {
          sendState(await redis.get(key));
        } catch (error) {
          if (!stopped && ws.readyState === WebSocket.OPEN) {
            sendRaw(ws, {
              type: 'error',
              error: error instanceof Error ? error.message : 'Failed to read export state',
            });
          }
        }
      }, state.pollMs);
    } catch (error) {
      if (!stopped && ws.readyState === WebSocket.OPEN) {
        sendRaw(ws, {
          type: 'error',
          error: error instanceof Error ? error.message : 'Failed to init Redis for export status',
        });
        ws.close(1011, 'Export status unavailable');
      }
    }
}
