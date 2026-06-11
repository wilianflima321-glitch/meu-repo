import { EventEmitter } from 'events';

import { createComponentLogger } from '@/lib/observability/logger'
import {
  acceptTransportStreams,
  createWebSocketConnection,
  createWebTransportConnection,
  readTransportDatagrams,
} from './webtransport-client.connection'
import { createInitialTransportStats, resolveTransportConfig } from './webtransport-client.defaults'
import type {
  StreamOptions,
  TransportConfig,
  TransportMessage,
  TransportState,
  TransportStats,
  TransportType,
} from './webtransport-client.types'

export type * from './webtransport-client.types'

const log = createComponentLogger('transport/webtransport-client')

export function isWebTransportSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'WebTransport' in window;
}

export class UnifiedTransportClient extends EventEmitter {
  private config: Required<TransportConfig>;
  private transport: WebTransport | null = null;
  private websocket: WebSocket | null = null;
  private transportType: TransportType = 'websocket';
  private state: TransportState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionStartTime = 0;
  private sequence = 0;

  private stats: TransportStats = createInitialTransportStats();

  private rttSamples: number[] = [];
  private pendingPings = new Map<number, number>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  private streams = new Map<string, {
    readable: ReadableStream;
    writable: WritableStream;
    writer?: WritableStreamDefaultWriter;
    reader?: ReadableStreamDefaultReader;
  }>();

  private datagramWriter: WritableStreamDefaultWriter | null = null;
  private datagramReader: ReadableStreamDefaultReader | null = null;

  constructor(config: TransportConfig) {
    super();
    this.config = resolveTransportConfig(config);
  }

  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.setState('connecting');
    this.connectionStartTime = Date.now();

    if (!this.config.forceWebSocket && isWebTransportSupported()) {
      try {
        await this.connectWebTransport();
        return;
      } catch (error) {
        this.log('WebTransport failed, falling back to WebSocket:', error);
      }
    }

    await this.connectWebSocket();
  }

  async disconnect(): Promise<void> {
    this.setState('closed');
    this.clearTimers();

    for (const [id, stream] of this.streams) {
      try {
        await stream.writer?.close();
      } catch {}
      this.streams.delete(id);
    }

    if (this.datagramWriter) {
      try { await this.datagramWriter.close(); } catch {}
      this.datagramWriter = null;
    }

    if (this.transport) {
      try { this.transport.close(); } catch {}
      this.transport = null;
    }

    if (this.websocket) {
      try { this.websocket.close(1000, 'Client disconnecting'); } catch {}
      this.websocket = null;
    }

    this.emit('disconnected');
  }

  async send(type: string, payload: unknown, channel = 'default'): Promise<void> {
    const message: TransportMessage = {
      type,
      channel,
      payload,
      timestamp: Date.now(),
      sequence: this.sequence++,
      reliable: true,
    };

    await this.sendMessage(message, true);
  }

  async sendDatagram(type: string, payload: unknown): Promise<void> {
    if (this.transportType !== 'webtransport' || !this.datagramWriter) {
      await this.send(type, payload, 'datagram');
      return;
    }

    const message: TransportMessage = {
      type,
      channel: 'datagram',
      payload,
      timestamp: Date.now(),
      sequence: this.sequence++,
      reliable: false,
    };

    try {
      const data = this.encodeMessage(message);
      await this.datagramWriter.write(data);
      this.stats.bytesSent += data.byteLength;
      this.stats.messagesSent++;
    } catch (error) {
      this.stats.datagramsLost++;
      this.log('Datagram dropped:', error);
    }
  }

  async createStream(options: StreamOptions): Promise<{
    send: (data: ArrayBuffer | string) => Promise<void>;
    receive: () => AsyncGenerator<ArrayBuffer>;
    close: () => Promise<void>;
  }> {
    if (this.transportType !== 'webtransport' || !this.transport) {
      throw new Error('Streams are only supported with WebTransport');
    }

    const stream = options.direction === 'bidirectional'
      ? await this.transport.createBidirectionalStream()
      : await this.transport.createUnidirectionalStream();

    const writer = 'writable' in stream ? stream.writable.getWriter() : null;
    const reader = 'readable' in stream ? stream.readable.getReader() : null;

    this.streams.set(options.id, {
      readable: 'readable' in stream ? stream.readable : new ReadableStream(),
      writable: 'writable' in stream ? stream.writable : new WritableStream(),
      writer: writer ?? undefined,
      reader: reader ?? undefined,
    });

    return {
      send: async (data: ArrayBuffer | string) => {
        if (!writer) throw new Error('Stream is not writable');
        const buffer = typeof data === 'string'
          ? new TextEncoder().encode(data)
          : new Uint8Array(data);
        await writer.write(buffer);
        this.stats.bytesSent += buffer.byteLength;
      },
      receive: async function* () {
        if (!reader) return;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            yield value as ArrayBuffer;
          }
        } finally {
          reader.releaseLock();
        }
      },
      close: async () => {
        try {
          await writer?.close();
        } catch {}
        this.streams.delete(options.id);
      },
    };
  }

  getStats(): TransportStats {
    return {
      ...this.stats,
      transport: this.transportType,
      state: this.state,
      uptime: this.state === 'connected' ? Date.now() - this.connectionStartTime : 0,
    };
  }

  getTransportType(): TransportType {
    return this.transportType;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  private async connectWebTransport(): Promise<void> {
    this.log('Connecting via WebTransport...');

    const transport = await createWebTransportConnection(this.config);
    this.transport = transport;
    this.transportType = 'webtransport';
    this.setState('connected');
    this.reconnectAttempts = 0;

    this.log('WebTransport connected');

    const handlers = this.createConnectionHandlers();
    if (this.config.useDatagrams && transport.datagrams) {
      this.datagramWriter = transport.datagrams.writable.getWriter();
      this.datagramReader = transport.datagrams.readable.getReader();
      readTransportDatagrams(this.datagramReader, handlers);
    }

    acceptTransportStreams(transport, handlers);

    transport.closed.then(() => {
      this.handleDisconnect('WebTransport closed');
    }).catch((error: Error) => {
      this.handleDisconnect(`WebTransport error: ${error.message}`);
    });

    this.startPingPong();
    this.emit('connected', { transport: 'webtransport' });
  }

  private async connectWebSocket(): Promise<void> {
    this.log('Connecting via WebSocket...');

    await createWebSocketConnection(this.config, {
      onOpen: (ws) => {
        this.websocket = ws;
        this.transportType = 'websocket';
        this.setState('connected');
        this.reconnectAttempts = 0;

        this.log('WebSocket connected');
        this.startPingPong();
        this.emit('connected', { transport: 'websocket' });
      },
      onClose: (event) => {
        this.handleDisconnect(`WebSocket closed: ${event.code} ${event.reason}`);
      },
      onBinaryMessage: (data) => {
        this.stats.bytesReceived += data.byteLength;
        this.stats.messagesReceived++;

        try {
          this.handleMessage(this.decodeMessage(new Uint8Array(data)));
        } catch (error) {
          this.log('Failed to decode WebSocket message:', error);
        }
      },
      onTextMessage: (data) => {
        this.stats.bytesReceived += data.length;
        this.stats.messagesReceived++;

        try {
          this.handleMessage(JSON.parse(data) as TransportMessage);
        } catch (error) {
          this.log('Failed to parse WebSocket message:', error);
        }
      },
    });
  }

  private createConnectionHandlers() {
    return {
      decodeMessage: (data: Uint8Array) => this.decodeMessage(data),
      handleMessage: (message: TransportMessage) => this.handleMessage(message),
      onBytesReceived: (byteLength: number) => {
        this.stats.bytesReceived += byteLength;
      },
      onMessageReceived: () => {
        this.stats.messagesReceived++;
      },
      onStream: (stream: WebTransportBidirectionalStream) => {
        this.emit('stream', stream);
      },
      onDisconnect: (reason: string) => this.handleDisconnect(reason),
      log: (...args: unknown[]) => this.log(...args),
    };
  }

  private async sendMessage(message: TransportMessage, reliable: boolean): Promise<void> {
    const data = this.encodeMessage(message);

    if (this.transportType === 'webtransport' && this.transport) {
      if (reliable) {
        const stream = await this.transport.createUnidirectionalStream();
        const writer = stream.getWriter();
        await writer.write(data);
        await writer.close();
      } else if (this.datagramWriter) {
        await this.datagramWriter.write(data);
      }
    } else if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(data);
    } else {
      throw new Error('Not connected');
    }

    this.stats.bytesSent += data.byteLength;
    this.stats.messagesSent++;
  }

  private handleMessage(message: TransportMessage): void {
    if (message.type === 'pong') {
      const sentTime = this.pendingPings.get(message.sequence);
      if (sentTime) {
        const rtt = Date.now() - sentTime;
        this.updateRTT(rtt);
        this.pendingPings.delete(message.sequence);
      }
      return;
    }

    if (message.type === 'ping') {
      this.send('pong', { serverTime: message.timestamp }, 'system').catch(() => {});
      return;
    }

    this.emit('message', message);
    this.emit(`message:${message.type}`, message.payload);
    this.emit(`channel:${message.channel}`, message);
  }

  private encodeMessage(message: TransportMessage): Uint8Array {
    const json = JSON.stringify(message);
    return new TextEncoder().encode(json);
  }

  private decodeMessage(data: Uint8Array): TransportMessage {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
  }

  private startPingPong(): void {
    this.pingInterval = setInterval(() => {
      if (this.state !== 'connected') return;

      const seq = this.sequence++;
      this.pendingPings.set(seq, Date.now());

      this.send('ping', { clientTime: Date.now() }, 'system').catch(() => {});

      const now = Date.now();
      for (const [s, time] of this.pendingPings) {
        if (now - time > 5000) {
          this.pendingPings.delete(s);
        }
      }
    }, 1000);
  }

  private updateRTT(sample: number): void {
    this.rttSamples.push(sample);
    if (this.rttSamples.length > 20) {
      this.rttSamples.shift();
    }

    const sum = this.rttSamples.reduce((a, b) => a + b, 0);
    this.stats.rtt = Math.round(sum / this.rttSamples.length);
    this.stats.avgLatency = this.stats.rtt / 2;

    if (this.rttSamples.length >= 2) {
      let jitterSum = 0;
      for (let i = 1; i < this.rttSamples.length; i++) {
        jitterSum += Math.abs(this.rttSamples[i] - this.rttSamples[i - 1]);
      }
      this.stats.jitter = Math.round(jitterSum / (this.rttSamples.length - 1));
    }

    this.emit('rtt', this.stats.rtt);
  }

  private handleDisconnect(reason: string): void {
    if (this.state === 'closed') return;

    this.log('Disconnected:', reason);
    this.setState('disconnected');
    this.emit('disconnected', { reason });

    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    this.setState('reconnecting');
    this.reconnectAttempts++;

    const delay = this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.log('Reconnection failed:', error);
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.emit('reconnectFailed');
        }
      }
    }, delay);
  }

  private setState(state: TransportState): void {
    const oldState = this.state;
    this.state = state;
    this.stats.state = state;
    if (oldState !== state) {
      this.emit('stateChange', { from: oldState, to: state });
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      log.info('[UnifiedTransport]', ...args);
    }
  }
}

let defaultTransport: UnifiedTransportClient | null = null;

export function getTransport(): UnifiedTransportClient {
  if (!defaultTransport) {
    throw new Error('Transport not initialized. Call initTransport() first.');
  }
  return defaultTransport;
}

export function initTransport(config: TransportConfig): UnifiedTransportClient {
  if (defaultTransport) {
    defaultTransport.disconnect();
  }
  defaultTransport = new UnifiedTransportClient(config);
  return defaultTransport;
}

export function createTransport(config: TransportConfig): UnifiedTransportClient {
  return new UnifiedTransportClient(config);
}

export interface UseTransportOptions extends TransportConfig {
  autoConnect?: boolean;
}

export interface UseTransportResult {
  transport: UnifiedTransportClient | null;
  state: TransportState;
  type: TransportType;
  stats: TransportStats;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  send: (type: string, payload: unknown, channel?: string) => Promise<void>;
  sendDatagram: (type: string, payload: unknown) => Promise<void>;
}
