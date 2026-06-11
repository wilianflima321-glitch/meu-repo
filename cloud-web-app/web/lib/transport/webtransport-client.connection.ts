import type { TransportConfig, TransportMessage } from './webtransport-client.types';

type RequiredTransportConfig = Required<TransportConfig>;

export interface TransportConnectionHandlers {
  decodeMessage: (data: Uint8Array) => TransportMessage;
  handleMessage: (message: TransportMessage) => void;
  onBytesReceived: (byteLength: number) => void;
  onMessageReceived: () => void;
  onStream: (stream: WebTransportBidirectionalStream) => void;
  onDisconnect: (reason: string) => void;
  log: (...args: unknown[]) => void;
}

export async function createWebTransportConnection(config: RequiredTransportConfig): Promise<WebTransport> {
  const WebTransportClass = (globalThis as typeof globalThis & {
    WebTransport?: typeof WebTransport;
  }).WebTransport;

  if (!WebTransportClass) {
    throw new Error('WebTransport is not available in this runtime');
  }

  const transport = new WebTransportClass(config.url, {
    congestionControl: config.congestionControl,
    serverCertificateHashes: [],
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Connection timeout')), config.connectionTimeout);
  });

  await Promise.race([transport.ready, timeoutPromise]);
  return transport;
}

export async function readTransportDatagrams(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: TransportConnectionHandlers,
): Promise<void> {
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      handlers.onBytesReceived(value.byteLength);
      handlers.onMessageReceived();

      try {
        handlers.handleMessage(handlers.decodeMessage(value));
      } catch (error) {
        handlers.log('Failed to decode datagram:', error);
      }
    }
  } catch (error) {
    handlers.log('Datagram reader error:', error);
  }
}

export function acceptTransportStreams(
  transport: WebTransport,
  handlers: TransportConnectionHandlers,
): void {
  const bidiReader = transport.incomingBidirectionalStreams.getReader();
  (async () => {
    try {
      while (true) {
        const { value: stream, done } = await bidiReader.read();
        if (done) break;
        handlers.onStream(stream);
      }
    } catch (error) {
      handlers.log('Incoming stream error:', error);
    }
  })();

  const uniReader = transport.incomingUnidirectionalStreams.getReader();
  (async () => {
    try {
      while (true) {
        const { value: stream, done } = await uniReader.read();
        if (done) break;
        await readIncomingStream(stream, handlers);
      }
    } catch (error) {
      handlers.log('Incoming uni stream error:', error);
    }
  })();
}

async function readIncomingStream(
  stream: WebTransportReceiveStream,
  handlers: TransportConnectionHandlers,
): Promise<void> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      handlers.onBytesReceived(value.byteLength);

      try {
        handlers.handleMessage(handlers.decodeMessage(value));
      } catch (error) {
        handlers.log('Failed to decode stream message:', error);
      }
    }
  } catch (error) {
    handlers.log('Stream read error:', error);
  } finally {
    reader.releaseLock();
  }
}

export interface WebSocketConnectionHandlers {
  onOpen: (ws: WebSocket) => void;
  onClose: (event: CloseEvent) => void;
  onBinaryMessage: (data: ArrayBuffer) => void;
  onTextMessage: (data: string) => void;
}

export function createWebSocketConnection(
  config: RequiredTransportConfig,
  handlers: WebSocketConnectionHandlers,
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(config.fallbackUrl);
    ws.binaryType = 'arraybuffer';

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, config.connectionTimeout);

    ws.onopen = () => {
      clearTimeout(timeout);
      handlers.onOpen(ws);
      resolve(ws);
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      reject(error);
    };

    ws.onclose = handlers.onClose;

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        handlers.onBinaryMessage(event.data);
      } else if (typeof event.data === 'string') {
        handlers.onTextMessage(event.data);
      }
    };
  });
}
