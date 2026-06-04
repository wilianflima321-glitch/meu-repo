'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ConnectionState } from './aethel-gateway-types';
import { getGatewayHttpUrl, useGateway } from './aethel-gateway-core';

export function useAethelConnection(): ConnectionState & {
    reconnect: () => void;
} {
    const { connected, ws } = useGateway();
    const [latency, setLatency] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [reconnecting, setReconnecting] = useState(false);

    useEffect(() => {
        // Ping to measure latency
        const pingInterval = setInterval(async () => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            const gatewayHttpUrl = getGatewayHttpUrl();
            if (!gatewayHttpUrl) return;

            const start = Date.now();
            try {
                await fetch(`${gatewayHttpUrl}/api/health`);
                setLatency(Date.now() - start);
                setError(null);
            } catch {
                setError('Connection error');
            }
        }, 5000);

        return () => clearInterval(pingInterval);
    }, [ws]);

    const reconnect = useCallback(() => {
        setReconnecting(true);
        ws?.close();
        // Will auto-reconnect via the provider
        setTimeout(() => setReconnecting(false), 2000);
    }, [ws]);

    return {
        connected,
        reconnecting,
        error,
        latency,
        reconnect
    };
}

// ============================================================================
// useRenderProgress
