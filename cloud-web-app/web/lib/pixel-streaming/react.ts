/**
 * AETHEL ENGINE - Pixel Streaming System
 *
 * WebRTC-based remote rendering for AAA graphics. Allows running heavy render
 * workloads on cloud GPU instances and streaming them to any browser.
 *
 * This package is intentionally split by responsibility:
 * - types: shared contracts
 * - codec: quality, SDP, stats, adaptive bitrate
 * - signaling: WebSocket signaling lifecycle
 * - session: WebRTC session and input transport
 * - cost: cloud-stream cost estimates
 * - react: client hook
 *
 * @module PixelStreaming
 * @version 2.1.0
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { getEventErrorMessage, isStreamingStats } from './codec';
import { PixelStreamingClient } from './session';
import type { PixelStreamingConfig, StreamingStats } from './types';

export interface UsePixelStreamingOptions {
    config?: Partial<PixelStreamingConfig>;
    autoConnect?: boolean;
}

export interface UsePixelStreamingResult {
    client: PixelStreamingClient | null;
    stats: StreamingStats | null;
    isConnected: boolean;
    isStreaming: boolean;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    containerRef: RefObject<HTMLDivElement | null>;
    error: string | null;
}

export function usePixelStreaming(options: UsePixelStreamingOptions = {}): UsePixelStreamingResult {
    const { config, autoConnect = false } = options;
    
    const clientRef = useRef<PixelStreamingClient | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [stats, setStats] = useState<StreamingStats | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const client = new PixelStreamingClient(config);
        clientRef.current = client;
        
        client.on('connected', () => setIsConnected(true));
        client.on('disconnected', () => {
            setIsConnected(false);
            setIsStreaming(false);
        });
        client.on('stream-started', () => setIsStreaming(true));
        client.on('stream-stopped', () => setIsStreaming(false));
        client.on('stats-update', (event) => {
            if (isStreamingStats(event.data)) {
                setStats(event.data);
            }
        });
        client.on('error', (event) => setError(getEventErrorMessage(event.data)));
        
        if (autoConnect) {
            client.connect().catch(err => {
                setError(err.message);
            });
        }
        
        return () => {
            client.disconnect();
        };
    }, [config, autoConnect]);
    
    useEffect(() => {
        if (containerRef.current && clientRef.current && isStreaming) {
            clientRef.current.attachTo(containerRef.current);
        }
    }, [isStreaming]);
    
    const connect = useCallback(async () => {
        if (clientRef.current) {
            setError(null);
            await clientRef.current.connect();
        }
    }, []);
    
    const disconnect = useCallback(async () => {
        if (clientRef.current) {
            await clientRef.current.disconnect();
        }
    }, []);
    
    return {
        client: clientRef.current,
        stats,
        isConnected,
        isStreaming,
        connect,
        disconnect,
        containerRef,
        error
    };
}

// ============================================================================
