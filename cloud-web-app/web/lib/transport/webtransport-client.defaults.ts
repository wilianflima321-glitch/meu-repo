import type { TransportConfig, TransportStats } from './webtransport-client.types';

export function resolveTransportConfig(config: TransportConfig): Required<TransportConfig> {
  return {
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

export function createInitialTransportStats(): TransportStats {
  return {
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
}
