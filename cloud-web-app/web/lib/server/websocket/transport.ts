import { WebSocket } from 'ws';

import type { WsClient, WsMessage } from '../websocket-runtime-contracts.ts';

export function sendToClient(client: WsClient, message: WsMessage): void {
  if (client.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  client.ws.send(
    JSON.stringify({
      ...message,
      timestamp: message.timestamp || Date.now(),
    })
  );
}

export function sendRaw(ws: WebSocket, message: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  if (typeof message === 'string') {
    ws.send(message);
    return;
  }

  if (Array.isArray(message)) {
    if (message.every((item) => typeof item === 'number')) {
      ws.send(Buffer.from(message));
    } else {
      ws.send(JSON.stringify(message));
    }
    return;
  }

  if (Buffer.isBuffer(message)) {
    ws.send(message);
    return;
  }

  if (message instanceof ArrayBuffer) {
    ws.send(Buffer.from(message));
    return;
  }

  if (ArrayBuffer.isView(message)) {
    ws.send(Buffer.from(message.buffer, message.byteOffset, message.byteLength));
    return;
  }

  ws.send(JSON.stringify(message));
}

export function sendError(client: WsClient, error: string, errorType: string): void {
  sendToClient(client, {
    type: errorType,
    channel: 'system',
    payload: { error },
  });
}
