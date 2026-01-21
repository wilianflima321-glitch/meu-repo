/**
 * AETHEL ENGINE - WebTransport Layer
 * ===================================
 * 
 * Camada de transporte de última geração para substituir WebSocket.
 * WebTransport oferece:
 * - Baixa latência (baseado em QUIC/HTTP3)
 * - Streams bidirecionais multiplexados
 * - Datagramas não confiáveis (ideal para jogos)
 * - Melhor performance que WebSocket
 * 
 * Fallback automático para WebSocket em navegadores sem suporte.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebTransport
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type TransportState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'closed';
export type TransportType = 'webtransport' | 'websocket';

export interface TransportConfig {
  /** Primary WebTransport URL (https:// or wss://) */
  url: string;
  /** Fallback WebSocket URL */
  fallbackUrl?: string;
  /** Force WebSocket mode (for testing) */
  forceWebSocket?: boolean;
  /** Enable automatic reconnection */
  autoReconnect?: boolean;
  /** Reconnection interval in ms */
  reconnectInterval?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Connection timeout in ms */
  connectionTimeout?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Use unreliable datagrams for game state */
  useDatagrams?: boolean;
  /** QUIC congestion control algorithm */
  congestionControl?: 'default' | 'throughput' | 'low-latency';
}

export interface TransportMessage {
  type: string;
  channel: string;
  payload: unknown;
  timestamp: number;
  sequence: number;
  reliable: boolean;
}

export interface StreamOptions {
  /** Stream identifier */
  id: string;
  /** Stream direction */
  direction: 'unidirectional' | 'bidirectional';
  /** Priority (0-7, lower is higher priority) */
  priority?: number;
}

export interface TransportStats {
  /** Current transport type */
  transport: TransportType;
  /** Connection state */
  state: TransportState;
  /** Round trip time in ms */
  rtt: number;
  /** Bytes sent */
  bytesSent: number;
  /** Bytes received */
  bytesReceived: number;
  /** Messages sent */
  messagesSent: number;
  /** Messages received */
  messagesReceived: number;
  /** Datagrams lost */
  datagramsLost: number;
  /** Average latency */
  avgLatency: number;
  /** Jitter */
  jitter: number;
  /** Connection uptime in ms */
  uptime: number;
}

// ============================================================================
// WEBTRANSPORT SUPPORT DETECTION
// ============================================================================

export function isWebTransportSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'WebTransport' in window;
}

// ============================================================================
// UNIFIED TRANSPORT CLIENT
// ============================================================================

/**
 * UnifiedTransportClient - Abstração sobre WebTransport/WebSocket
 * 
 * Usa WebTransport quando disponível, com fallback automático para WebSocket.
 * API unificada para ambos os protocolos.
 */
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
  
  // Stats tracking
  private stats: TransportStats = {
    transport: 'websocket',
    state: 'disconnected',
    rtt: 0,
    bytesSent: 0,
    bytesReceived: 0,
    messagesSent: 0,
    messagesReceived: 0,
    datagramsLost: 0,
    avgLatency: 0,
    jitter: 0,
    uptime: 0,
  };
  
  // RTT calculation
  private rttSamples: number[] = [];
  private pendingPings = new Map<number, number>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  
  // Streams (WebTransport only)
  private streams = new Map<string, {
    readable: ReadableStream;
    writable: WritableStream;
    writer?: WritableStreamDefaultWriter;
    reader?: ReadableStreamDefaultReader;
  }>();
  
  // Datagram support (WebTransport only)
  private datagramWriter: WritableStreamDefaultWriter | null = null;
  private datagramReader: ReadableStreamDefaultReader | null = null;
  
  constructor(config: TransportConfig) {
    super();
    
    this.config = {
      url: config.url,
      fallbackUrl: config.fallbackUrl ?? config.url.replace('https://', 'wss://').replace('http://', 'ws://'),
      forceWebSocket: config.forceWebSocket ?? false,
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 2000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      connectionTimeout: config.connectionTimeout ?? 10000,
      debug: config.debug ?? false,
      useDatagrams: config.useDatagrams ?? true,
      congestionControl: config.congestionControl ?? 'low-latency',
    };
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Connect to server using best available transport
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }
    
    this.setState('connecting');
    this.connectionStartTime = Date.now();
    
    // Try WebTransport first (unless forced to WebSocket)
    if (!this.config.forceWebSocket && isWebTransportSupported()) {
      try {
        await this.connectWebTransport();
        return;
      } catch (error) {
        this.log('WebTransport failed, falling back to WebSocket:', error);
      }
    }
    
    // Fallback to WebSocket
    await this.connectWebSocket();
  }
  
  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    this.setState('closed');
    this.clearTimers();
    
    // Close streams
    for (const [id, stream] of this.streams) {
      try {
        await stream.writer?.close();
      } catch { /* ignore */ }
      this.streams.delete(id);
    }
    
    // Close datagram handlers
    if (this.datagramWriter) {
      try { await this.datagramWriter.close(); } catch { /* ignore */ }
      this.datagramWriter = null;
    }
    
    // Close transport
    if (this.transport) {
      try { this.transport.close(); } catch { /* ignore */ }
      this.transport = null;
    }
    
    // Close websocket
    if (this.websocket) {
      try { this.websocket.close(1000, 'Client disconnecting'); } catch { /* ignore */ }
      this.websocket = null;
    }
    
    this.emit('disconnected');
  }
  
  /**
   * Send a reliable message (ordered, guaranteed delivery)
   */
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
  
  /**
   * Send an unreliable datagram (unordered, may be dropped)
   * Ideal for frequent game state updates where latest data is preferred
   */
  async sendDatagram(type: string, payload: unknown): Promise<void> {
    if (this.transportType !== 'webtransport' || !this.datagramWriter) {
      // Fallback to reliable send for WebSocket
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
      // Datagrams are unreliable, don't throw
      this.log('Datagram dropped:', error);
    }
  }
  
  /**
   * Create a bidirectional stream for high-bandwidth data
   */
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
        } catch { /* ignore */ }
        this.streams.delete(options.id);
      },
    };
  }
  
  /**
   * Get current connection statistics
   */
  getStats(): TransportStats {
    return {
      ...this.stats,
      transport: this.transportType,
      state: this.state,
      uptime: this.state === 'connected' ? Date.now() - this.connectionStartTime : 0,
    };
  }
  
  /**
   * Get current transport type
   */
  getTransportType(): TransportType {
    return this.transportType;
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }
  
  // ============================================================================
  // WEBTRANSPORT CONNECTION
  // ============================================================================
  
  private async connectWebTransport(): Promise<void> {
    this.log('Connecting via WebTransport...');
    
    // Use global WebTransport API (available in modern browsers)
    const WebTransportClass = (globalThis as any).WebTransport;
    const transport = new WebTransportClass(this.config.url, {
      congestionControl: this.config.congestionControl,
      serverCertificateHashes: [], // For development, would need proper certs in prod
    });
    
    // Wait for connection with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), this.config.connectionTimeout);
    });
    
    await Promise.race([transport.ready, timeoutPromise]);
    
    this.transport = transport;
    this.transportType = 'webtransport';
    this.setState('connected');
    this.reconnectAttempts = 0;
    
    this.log('WebTransport connected');
    
    // Setup datagram handlers
    if (this.config.useDatagrams && transport.datagrams) {
      this.datagramWriter = transport.datagrams.writable.getWriter();
      this.datagramReader = transport.datagrams.readable.getReader();
      this.readDatagrams();
    }
    
    // Setup incoming streams
    this.acceptIncomingStreams(transport);
    
    // Handle connection close
    transport.closed.then(() => {
      this.handleDisconnect('WebTransport closed');
    }).catch((error: Error) => {
      this.handleDisconnect(`WebTransport error: ${error.message}`);
    });
    
    // Start ping/pong for RTT measurement
    this.startPingPong();
    
    this.emit('connected', { transport: 'webtransport' });
  }
  
  private async readDatagrams(): Promise<void> {
    if (!this.datagramReader) return;
    
    try {
      while (true) {
        const { value, done } = await this.datagramReader.read();
        if (done) break;
        
        this.stats.bytesReceived += value.byteLength;
        this.stats.messagesReceived++;
        
        try {
          const message = this.decodeMessage(value);
          this.handleMessage(message);
        } catch (error) {
          this.log('Failed to decode datagram:', error);
        }
      }
    } catch (error) {
      this.log('Datagram reader error:', error);
    }
  }
  
  private async acceptIncomingStreams(transport: WebTransport): Promise<void> {
    // Handle incoming bidirectional streams
    const bidiReader = transport.incomingBidirectionalStreams.getReader();
    (async () => {
      try {
        while (true) {
          const { value: stream, done } = await bidiReader.read();
          if (done) break;
          this.emit('stream', stream);
        }
      } catch (error) {
        this.log('Incoming stream error:', error);
      }
    })();
    
    // Handle incoming unidirectional streams
    const uniReader = transport.incomingUnidirectionalStreams.getReader();
    (async () => {
      try {
        while (true) {
          const { value: stream, done } = await uniReader.read();
          if (done) break;
          this.handleIncomingStream(stream);
        }
      } catch (error) {
        this.log('Incoming uni stream error:', error);
      }
    })();
  }
  
  private async handleIncomingStream(stream: ReadableStream): Promise<void> {
    const reader = stream.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        this.stats.bytesReceived += value.byteLength;
        
        try {
          const message = this.decodeMessage(value);
          this.handleMessage(message);
        } catch (error) {
          this.log('Failed to decode stream message:', error);
        }
      }
    } catch (error) {
      this.log('Stream read error:', error);
    } finally {
      reader.releaseLock();
    }
  }
  
  // ============================================================================
  // WEBSOCKET CONNECTION (FALLBACK)
  // ============================================================================
  
  private async connectWebSocket(): Promise<void> {
    this.log('Connecting via WebSocket...');
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.config.fallbackUrl);
      ws.binaryType = 'arraybuffer';
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        this.websocket = ws;
        this.transportType = 'websocket';
        this.setState('connected');
        this.reconnectAttempts = 0;
        
        this.log('WebSocket connected');
        this.startPingPong();
        
        this.emit('connected', { transport: 'websocket' });
        resolve();
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
      
      ws.onclose = (event) => {
        this.handleDisconnect(`WebSocket closed: ${event.code} ${event.reason}`);
      };
      
      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          this.stats.bytesReceived += event.data.byteLength;
          this.stats.messagesReceived++;
          
          try {
            const message = this.decodeMessage(new Uint8Array(event.data));
            this.handleMessage(message);
          } catch (error) {
            this.log('Failed to decode WebSocket message:', error);
          }
        } else if (typeof event.data === 'string') {
          this.stats.bytesReceived += event.data.length;
          this.stats.messagesReceived++;
          
          try {
            const message = JSON.parse(event.data) as TransportMessage;
            this.handleMessage(message);
          } catch (error) {
            this.log('Failed to parse WebSocket message:', error);
          }
        }
      };
    });
  }
  
  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================
  
  private async sendMessage(message: TransportMessage, reliable: boolean): Promise<void> {
    const data = this.encodeMessage(message);
    
    if (this.transportType === 'webtransport' && this.transport) {
      if (reliable) {
        // Use a stream for reliable delivery
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
    // Handle internal messages
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
    
    // Emit message to listeners
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
  
  // ============================================================================
  // RTT & LATENCY
  // ============================================================================
  
  private startPingPong(): void {
    this.pingInterval = setInterval(() => {
      if (this.state !== 'connected') return;
      
      const seq = this.sequence++;
      this.pendingPings.set(seq, Date.now());
      
      this.send('ping', { clientTime: Date.now() }, 'system').catch(() => {});
      
      // Clean old pending pings (timeout)
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
    
    // Calculate average RTT
    const sum = this.rttSamples.reduce((a, b) => a + b, 0);
    this.stats.rtt = Math.round(sum / this.rttSamples.length);
    this.stats.avgLatency = this.stats.rtt / 2;
    
    // Calculate jitter (variation in latency)
    if (this.rttSamples.length >= 2) {
      let jitterSum = 0;
      for (let i = 1; i < this.rttSamples.length; i++) {
        jitterSum += Math.abs(this.rttSamples[i] - this.rttSamples[i - 1]);
      }
      this.stats.jitter = Math.round(jitterSum / (this.rttSamples.length - 1));
    }
    
    this.emit('rtt', this.stats.rtt);
  }
  
  // ============================================================================
  // RECONNECTION
  // ============================================================================
  
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
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
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
      console.log('[UnifiedTransport]', ...args);
    }
  }
}

// ============================================================================
// SINGLETON & FACTORY
// ============================================================================

let defaultTransport: UnifiedTransportClient | null = null;

/**
 * Get the default transport client instance
 */
export function getTransport(): UnifiedTransportClient {
  if (!defaultTransport) {
    throw new Error('Transport not initialized. Call initTransport() first.');
  }
  return defaultTransport;
}

/**
 * Initialize the default transport client
 */
export function initTransport(config: TransportConfig): UnifiedTransportClient {
  if (defaultTransport) {
    defaultTransport.disconnect();
  }
  defaultTransport = new UnifiedTransportClient(config);
  return defaultTransport;
}

/**
 * Create a new transport client (for multiple connections)
 */
export function createTransport(config: TransportConfig): UnifiedTransportClient {
  return new UnifiedTransportClient(config);
}

// ============================================================================
// REACT HOOK
// ============================================================================

export interface UseTransportOptions extends TransportConfig {
  /** Auto-connect on mount */
  autoConnect?: boolean;
}

export interface UseTransportResult {
  /** Transport client instance */
  transport: UnifiedTransportClient | null;
  /** Connection state */
  state: TransportState;
  /** Transport type in use */
  type: TransportType;
  /** Connection statistics */
  stats: TransportStats;
  /** Connect to server */
  connect: () => Promise<void>;
  /** Disconnect from server */
  disconnect: () => Promise<void>;
  /** Send reliable message */
  send: (type: string, payload: unknown, channel?: string) => Promise<void>;
  /** Send unreliable datagram */
  sendDatagram: (type: string, payload: unknown) => Promise<void>;
}

// UseTransportOptions and UseTransportResult are defined above as interfaces
// and can be imported directly from this module
