'use client';

import { useEffect, useRef, useState } from 'react';
import type { AwarenessState } from './aethel-gateway-types';
import { getGatewayWsBaseUrl, logger, useGateway } from './aethel-gateway-core';

export function useCollaboration(docName: string): {
    connected: boolean;
    awareness: unknown;
    doc: unknown;
    users: { id: string; name: string; color: string }[];
} {
    const { connected } = useGateway();
    const [collabConnected, setCollabConnected] = useState(false);
    const [users, setUsers] = useState<{ id: string; name: string; color: string }[]>([]);
    const docRef = useRef<unknown>(null);
    const awarenessRef = useRef<unknown>(null);

    useEffect(() => {
        if (!connected || !docName) return;
        const gatewayWsBaseUrl = getGatewayWsBaseUrl();
        if (!gatewayWsBaseUrl) return;

        let cleanup: (() => void) | undefined;
        let cancelled = false;

        const setupCollab = async () => {
            try {
                // Dynamic import Yjs (it's heavy)
                const Y = await import('yjs');
                const { WebsocketProvider } = await import('y-websocket');

                const doc = new Y.Doc();
                docRef.current = doc;

                const provider = new WebsocketProvider(
                    gatewayWsBaseUrl,
                    docName,
                    doc
                );

                awarenessRef.current = provider.awareness;

                provider.on('status', (event: { status: string }) => {
                    setCollabConnected(event.status === 'connected');
                });

                provider.awareness.on('change', () => {
                    const states = Array.from(provider.awareness.getStates().values()) as AwarenessState[];
                    setUsers(states.map((state, idx) => ({
                        id: String(idx),
                        name: state.user?.name || 'Anonymous',
                        color: state.user?.color || '#666'
                    })));
                });

                return () => {
                    provider.destroy();
                    doc.destroy();
                };
            } catch (err) {
                logger.error('Failed to setup collaboration:', err);
            }
        };

        setupCollab().then((teardown) => {
            if (!teardown) return;
            if (cancelled) teardown();
            else cleanup = teardown;
        });

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [connected, docName]);

    return {
        connected: collabConnected,
        awareness: awarenessRef.current,
        doc: docRef.current,
        users
    };
}
