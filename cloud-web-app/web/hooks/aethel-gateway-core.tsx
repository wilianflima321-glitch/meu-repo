/**
 * Aethel Gateway runtime context.
 *
 * This file owns the WebSocket provider and request/response plumbing. Feature
 * hooks live in useAethelGateway.ts so product surfaces can import the stable
 * provider without pulling every realtime hook into the same module.
 */

'use client';

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createComponentLogger } from '@/lib/observability/logger';

import type {
  GatewayEventCallback,
  GatewayMessage,
  GatewayPayload,
  GatewayRequestPayload,
  PendingGatewayRequest,
} from './aethel-gateway-types';

// ============================================================================
// GATEWAY CONNECTION CONTEXT
// ============================================================================

export const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL?.trim() || null;
export const logger = createComponentLogger('aethel-gateway');

export function getGatewayHttpUrl(): string | null {
    return GATEWAY_URL ? GATEWAY_URL.replace(/^ws/, 'http') : null;
}

export function getGatewayWsBaseUrl(): string | null {
    return GATEWAY_URL ? GATEWAY_URL.replace(/\/events$/, '') : null;
}

export interface GatewayContextValue {
    ws: WebSocket | null;
    connected: boolean;
    send: (data: GatewayPayload) => void;
    subscribe: <T = GatewayPayload>(event: string, callback: (data: T) => void) => () => void;
    request: <T>(type: string, payload?: GatewayRequestPayload) => Promise<T>;
}

export const GatewayContext = createContext<GatewayContextValue | null>(null);

export function GatewayProvider({ children }: { children: ReactNode }) {
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const listenersRef = useRef<Map<string, Set<GatewayEventCallback>>>(new Map());
    const pendingRequestsRef = useRef<Map<string, PendingGatewayRequest>>(new Map());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);

    const connect = useCallback(() => {
        if (!GATEWAY_URL) {
            logger.info('Gateway URL not configured; realtime bridge remains held');
            return;
        }

        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(`${GATEWAY_URL}/events?subscribe=*`);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                reconnectAttemptsRef.current = 0;
                logger.info('Connected to Aethel Gateway');
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data) as GatewayMessage;

                    // Handle request response
                    if (msg.requestId && pendingRequestsRef.current.has(msg.requestId)) {
                        const { resolve, timeout } = pendingRequestsRef.current.get(msg.requestId)!;
                        clearTimeout(timeout);
                        pendingRequestsRef.current.delete(msg.requestId);
                        resolve(msg.payload || msg.data);
                        return;
                    }

                    // Handle event
                    const eventType = msg.event || msg.type;
                    if (eventType) {
                        listenersRef.current.get(eventType)?.forEach(cb => cb(msg.data || msg.payload || msg));
                        listenersRef.current.get('*')?.forEach(cb => cb({ event: eventType, data: msg.data || msg.payload }));
                    }
                } catch (err) {
                    logger.error('Gateway message parse error', err);
                }
            };

            ws.onclose = () => {
                setConnected(false);
                wsRef.current = null;

                // Schedule reconnect
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                reconnectAttemptsRef.current++;

                if (reconnectAttemptsRef.current < 10) {
                    logger.warn(`Reconnecting in ${delay}ms...`);
                    reconnectTimeoutRef.current = setTimeout(connect, delay);
                }
            };

            ws.onerror = (err) => {
                logger.error('Gateway WebSocket error', err);
            };
        } catch (err) {
            logger.error('Failed to connect to Gateway', err);
        }
    }, []);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            wsRef.current?.close();
        };
    }, [connect]);

    const send = useCallback((data: GatewayPayload) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    const subscribe = useCallback(<T,>(event: string, callback: (data: T) => void) => {
        if (!listenersRef.current.has(event)) {
            listenersRef.current.set(event, new Set());
        }
        const wrapped: GatewayEventCallback = (data) => callback(data as T);
        listenersRef.current.get(event)!.add(wrapped);

        return () => {
            listenersRef.current.get(event)?.delete(wrapped);
        };
    }, []);

    const request = useCallback(<T,>(type: string, payload?: GatewayRequestPayload): Promise<T> => {
        return new Promise((resolve, reject) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                reject(new Error(GATEWAY_URL ? 'Not connected' : 'Gateway URL not configured'));
                return;
            }

            const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

            const timeout = setTimeout(() => {
                pendingRequestsRef.current.delete(requestId);
                reject(new Error('Request timeout'));
            }, 30000);

            pendingRequestsRef.current.set(requestId, { resolve: resolve as (value: unknown) => void, reject, timeout });

            wsRef.current.send(JSON.stringify({ type, payload, requestId }));
        });
    }, []);

    const value = useMemo(() => ({
        ws: wsRef.current,
        connected,
        send,
        subscribe,
        request
    }), [connected, send, subscribe, request]);

    return createElement(GatewayContext.Provider, { value }, children);
}

export function useGateway(): GatewayContextValue {
    const context = useContext(GatewayContext);
    if (!context) {
        throw new Error('useGateway must be used within GatewayProvider');
    }
    return context;
}
