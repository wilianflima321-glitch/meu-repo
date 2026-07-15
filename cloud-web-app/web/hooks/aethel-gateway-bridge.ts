'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BridgeData, BridgeResult } from './aethel-gateway-types';
import { GATEWAY_URL, logger, useGateway } from './aethel-gateway-core';

export function useBridge(): {
    connected: boolean;
    tools: { blender: boolean; ffmpeg: boolean; unreal: boolean };
    checkTools: () => Promise<void>;
    generateDNA: (genre: string, style: string, description?: string) => Promise<BridgeResult>;
    renderBlender: (request: string, output: string) => Promise<string>;
    getBible: () => Promise<BridgeResult | BridgeData | undefined>;
    addFact: (category: string, fact: string) => Promise<void>;
} {
    const { connected, request, send, subscribe } = useGateway();
    const [tools, setTools] = useState({ blender: false, ffmpeg: false, unreal: false });
    const bridgeWsRef = useRef<WebSocket | null>(null);

    // Connect to bridge endpoint
    useEffect(() => {
        const connectBridge = () => {
            if (!GATEWAY_URL) return;

            try {
                const ws = new WebSocket(`${GATEWAY_URL}/bridge`);
                bridgeWsRef.current = ws;

                ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data) as BridgeResult;
                        if (msg.type === 'tools_status') {
                            setTools({
                                blender: msg.data?.blender?.available || false,
                                ffmpeg: msg.data?.ffmpeg?.available || false,
                                unreal: msg.data?.unreal?.available || false
                            });
                        }
                    } catch {}
                };

                ws.onopen = () => {
                    // Check tools on connect
                    ws.send(JSON.stringify({ command: 'check_tools' }));
                };
            } catch (err) {
                logger.error('Failed to connect to bridge:', err);
            }
        };

        if (connected) {
            connectBridge();
        }

        return () => {
            bridgeWsRef.current?.close();
        };
    }, [connected]);

    const sendBridgeCommand = useCallback((command: string, data?: Record<string, unknown>): Promise<BridgeResult> => {
        return new Promise((resolve, reject) => {
            const ws = bridgeWsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                reject(new Error('Bridge not connected'));
                return;
            }

            const handler = (event: MessageEvent) => {
                try {
                    const msg = JSON.parse(event.data) as BridgeResult;
                    if (msg.type?.includes('complete') || msg.type?.includes('created') || msg.type?.includes('data')) {
                        ws.removeEventListener('message', handler);
                        resolve(msg.data || msg);
                    } else if (msg.type === 'error') {
                        ws.removeEventListener('message', handler);
                        reject(new Error(msg.message));
                    }
                } catch {}
            };

            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ command, ...data }));

            // Timeout
            setTimeout(() => {
                ws.removeEventListener('message', handler);
                reject(new Error('Command timeout'));
            }, 120000);
        });
    }, []);

    const checkTools = useCallback(async () => {
        const result = await sendBridgeCommand('check_tools');
        if (result?.data) {
            setTools({
                blender: result.data.blender?.available || false,
                ffmpeg: result.data.ffmpeg?.available || false,
                unreal: result.data.unreal?.available || false
            });
        }
    }, [sendBridgeCommand]);

    const generateDNA = useCallback(async (genre: string, style: string, description = '') => {
        return sendBridgeCommand('generate_dna', {
            payload: { genre, style, description }
        });
    }, [sendBridgeCommand]);

    const renderBlender = useCallback(async (request: string, output: string) => {
        const result = await sendBridgeCommand('render_blender_script', {
            request,
            output
        });
        return result?.path || '';
    }, [sendBridgeCommand]);

    const getBible = useCallback(async () => {
        const result = await sendBridgeCommand('get_bible');
        return result?.data || result;
    }, [sendBridgeCommand]);

    const addFact = useCallback(async (category: string, fact: string) => {
        await sendBridgeCommand('add_fact', { category, fact });
    }, [sendBridgeCommand]);

    return {
        connected,
        tools,
        checkTools,
        generateDNA,
        renderBlender,
        getBible,
        addFact
    };
}

// ============================================================================
// useCollaboration - Yjs Real-time Collaboration
