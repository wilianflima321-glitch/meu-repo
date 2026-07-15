// Contracts for the governed WebTransport/WebSocket runtime.

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
