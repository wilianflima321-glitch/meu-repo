/**
 * AETHEL ENGINE - WebTransport React Hook
 * ========================================
 * 
 * React hook for using WebTransport with automatic state management.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UnifiedTransportClient,
  TransportConfig,
  TransportState,
  TransportType,
  TransportStats,
  TransportMessage,
} from './webtransport-client';

export interface UseTransportOptions extends Partial<TransportConfig> {
  /** Server URL (required) */
  url: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Message handlers by type */
  onMessage?: Record<string, (payload: unknown) => void>;
  /** Connection handler */
  onConnect?: (info: { transport: TransportType }) => void;
  /** Disconnection handler */
  onDisconnect?: (info: { reason: string }) => void;
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
  /** Is connected */
  isConnected: boolean;
  /** Current RTT in ms */
  rtt: number;
  /** Connect to server */
  connect: () => Promise<void>;
  /** Disconnect from server */
  disconnect: () => Promise<void>;
  /** Send reliable message */
  send: (type: string, payload: unknown, channel?: string) => Promise<void>;
  /** Send unreliable datagram */
  sendDatagram: (type: string, payload: unknown) => Promise<void>;
}

const defaultStats: TransportStats = {
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

/**
 * React hook for WebTransport/WebSocket connection
 */
export function useTransport(options: UseTransportOptions): UseTransportResult {
  const [transport, setTransport] = useState<UnifiedTransportClient | null>(null);
  const [state, setState] = useState<TransportState>('disconnected');
  const [type, setType] = useState<TransportType>('websocket');
  const [stats, setStats] = useState<TransportStats>(defaultStats);
  const [rtt, setRtt] = useState(0);
  
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  // Initialize transport
  useEffect(() => {
    const currentOptions = optionsRef.current;
    const client = new UnifiedTransportClient({
      url: currentOptions.url,
      fallbackUrl: currentOptions.fallbackUrl,
      forceWebSocket: currentOptions.forceWebSocket,
      autoReconnect: currentOptions.autoReconnect ?? true,
      reconnectInterval: currentOptions.reconnectInterval,
      maxReconnectAttempts: currentOptions.maxReconnectAttempts,
      connectionTimeout: currentOptions.connectionTimeout,
      debug: currentOptions.debug,
      useDatagrams: currentOptions.useDatagrams,
      congestionControl: currentOptions.congestionControl,
    });
    
    // Event handlers
    client.on('connected', (info: { transport: TransportType }) => {
      setState('connected');
      setType(info.transport);
      optionsRef.current.onConnect?.(info);
    });
    
    client.on('disconnected', (info: { reason: string }) => {
      setState('disconnected');
      optionsRef.current.onDisconnect?.(info);
    });
    
    client.on('stateChange', ({ to }: { from: TransportState; to: TransportState }) => {
      setState(to);
    });
    
    client.on('rtt', (value: number) => {
      setRtt(value);
    });
    
    client.on('message', (message: TransportMessage) => {
      const handler = optionsRef.current.onMessage?.[message.type];
      if (handler) {
        handler(message.payload);
      }
    });
    
    setTransport(client);
    
    // Auto-connect if enabled
    if (currentOptions.autoConnect !== false) {
      client.connect().catch(console.error);
    }
    
    // Stats polling
    const statsInterval = setInterval(() => {
      if (client.isConnected()) {
        setStats(client.getStats());
      }
    }, 1000);
    
    // Cleanup
    return () => {
      clearInterval(statsInterval);
      client.disconnect();
    };
  }, [options.url]); // Only recreate if URL changes
  
  // Connection methods
  const connect = useCallback(async () => {
    if (transport) {
      await transport.connect();
    }
  }, [transport]);
  
  const disconnect = useCallback(async () => {
    if (transport) {
      await transport.disconnect();
    }
  }, [transport]);
  
  const send = useCallback(async (msgType: string, payload: unknown, channel = 'default') => {
    if (transport) {
      await transport.send(msgType, payload, channel);
    }
  }, [transport]);
  
  const sendDatagram = useCallback(async (msgType: string, payload: unknown) => {
    if (transport) {
      await transport.sendDatagram(msgType, payload);
    }
  }, [transport]);
  
  return {
    transport,
    state,
    type,
    stats,
    isConnected: state === 'connected',
    rtt,
    connect,
    disconnect,
    send,
    sendDatagram,
  };
}

export default useTransport;
