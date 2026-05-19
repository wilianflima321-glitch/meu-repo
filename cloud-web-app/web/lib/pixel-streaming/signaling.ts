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

import { logger } from '@/lib/observability/logger';

export interface PixelStreamingSignalingHandlers {
    onOpen: () => void;
    onMessage: (event: MessageEvent) => void;
    onError: (event: Event) => void;
    onClose: () => void;
}

export class PixelStreamingSignalingClient {
    private socket: WebSocket | null = null;

    async connect(
        serverUrl: string,
        handlers: PixelStreamingSignalingHandlers,
        timeoutMs = 10_000
    ): Promise<void> {
        this.socket = new WebSocket(serverUrl);

        this.socket.onopen = handlers.onOpen;
        this.socket.onmessage = handlers.onMessage;
        this.socket.onerror = handlers.onError;
        this.socket.onclose = handlers.onClose;

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, timeoutMs);

            this.socket!.addEventListener('open', () => {
                clearTimeout(timeout);
                resolve();
            }, { once: true });

            this.socket!.addEventListener('error', () => {
                clearTimeout(timeout);
                reject(new Error('Connection failed'));
            }, { once: true });
        });
    }

    send(message: object): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }

    close(): void {
        if (!this.socket) return;

        try {
            this.socket.close();
        } catch (error) {
            logger.error('[PixelStreaming] Failed to close signaling socket:', error);
        } finally {
            this.socket = null;
        }
    }

    get readyState(): number | null {
        return this.socket?.readyState ?? null;
    }
}
