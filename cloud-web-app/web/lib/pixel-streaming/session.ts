import { logger } from '@/lib/observability/logger';
import {
    AdaptiveQualityController,
    DEFAULT_CONFIG,
    getSupportedCodecs,
    LatencyEstimator,
    prioritizeSdpCodec,
} from './codec';
import { PixelStreamingSignalingClient } from './signaling';
import {
    attachPixelStreamingInputHandlers,
    createGamepadInput,
    createKeyboardInput,
    createMouseInput,
    createTouchInput,
    encodeInputBatch,
} from './session-input';
import { attachIncomingPixelStreamTrack } from './session-media';
import {
    createClientHelloMessage,
    routePixelStreamingSignalingMessage,
} from './session-signaling';
import { createInitialStreamingStats, createRtcPeerConfig } from './session-state';
import { applyQualityChangeMessage, collectPeerConnectionStats } from './session-stats';
import type {
    EventCallback,
    InputMessage,
    PixelStreamingConfig,
    QualityChangeMessage,
    ServerStatsMessage,
    StreamingEvent,
    StreamingEventType,
    StreamingStats,
} from './types';

export class PixelStreamingClient {
    private config: PixelStreamingConfig;
    private signaling: PixelStreamingSignalingClient | null = null;
    private pc: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private audioElement: HTMLAudioElement | null = null;

    private stats: StreamingStats;
    private statsInterval: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    private eventListeners: Map<StreamingEventType, Set<EventCallback>> = new Map();
    private inputBuffer: InputMessage[] = [];
    private inputFlushInterval: NodeJS.Timeout | null = null;
    private inputDetach: (() => void) | null = null;

    private qualityController: AdaptiveQualityController;
    private latencyEstimator: LatencyEstimator;
    private isStreaming = false;

    constructor(config: Partial<PixelStreamingConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        this.stats = createInitialStreamingStats(this.config);

        this.qualityController = new AdaptiveQualityController(this.config);
        this.latencyEstimator = new LatencyEstimator();
    }

    // ========================================================================
    // CONNECTION MANAGEMENT
    // ========================================================================

    /**
     * Connect to the streaming server
     */
    async connect(): Promise<void> {
        try {
            this.signaling = new PixelStreamingSignalingClient();
            await this.signaling.connect(this.config.serverUrl, {
                onOpen: () => this.onSignalingOpen(),
                onMessage: (event) => this.onSignalingMessage(event),
                onError: (error) => this.onSignalingError(error),
                onClose: () => this.onSignalingClose(),
            });
        } catch (error) {
            this.emitEvent('error', { message: 'Failed to connect', error });
            throw error;
        }
    }

    /**
     * Disconnect from the streaming server
     */
    async disconnect(): Promise<void> {
        this.detachInputHandlers();
        this.stopInputCapture();
        this.stopStatsCollection();

        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }

        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }

        if (this.signaling) {
            this.signaling.close();
            this.signaling = null;
        }

        this.isStreaming = false;
        this.emitEvent('disconnected', {});
    }

    // ========================================================================
    // WEBRTC HANDLING
    // ========================================================================

    private async initializePeerConnection(): Promise<void> {
        this.pc = new RTCPeerConnection(createRtcPeerConfig(this.config));

        // Handle ICE candidates
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignaling({
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };

        // Handle connection state changes
        this.pc.onconnectionstatechange = () => {
            this.stats.connectionState = this.pc!.connectionState;

            if (this.pc!.connectionState === 'connected') {
                this.emitEvent('connected', {});
                this.startStatsCollection();
            } else if (this.pc!.connectionState === 'failed') {
                this.handleConnectionFailure();
            }
        };

        // Handle incoming tracks (video/audio)
        this.pc.ontrack = (event) => {
            this.handleIncomingTrack(event);
        };

        // Create data channel for input
        this.dataChannel = this.pc.createDataChannel('input', {
            ordered: false, // Prioritize latency over ordering
            maxRetransmits: 0 // Don't retransmit - old input is stale
        });

        this.dataChannel.onopen = () => {
            this.startInputCapture();
            this.emitEvent('stream-started', {});
            this.isStreaming = true;
        };

        this.dataChannel.onerror = (error) => {
            logger.error('[PixelStreaming] Data channel error:', error);
        };
    }

    private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.pc) {
            await this.initializePeerConnection();
        }

        await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await this.pc!.createAnswer({
            offerToReceiveAudio: this.config.audioEnabled,
            offerToReceiveVideo: true
        });

        // Apply codec preferences
        const modifiedSdp = this.modifySdpForCodec(answer.sdp!);
        answer.sdp = modifiedSdp;

        await this.pc!.setLocalDescription(answer);

        this.sendSignaling({
            type: 'answer',
            sdp: answer
        });
    }

    private modifySdpForCodec(sdp: string): string {
        return prioritizeSdpCodec(sdp, this.config.codec);
    }

    private handleIncomingTrack(event: RTCTrackEvent): void {
        const media = attachIncomingPixelStreamTrack({
            audioElement: this.audioElement,
            audioEnabled: this.config.audioEnabled,
            event,
            onAudioPlaybackError: (error) => logger.error('[PixelStreaming] Audio playback failed:', error),
            onVideoPlaybackError: (error) => logger.error('[PixelStreaming] Video playback failed:', error),
            videoElement: this.videoElement,
        });
        this.audioElement = media.audioElement;
        this.videoElement = media.videoElement;
    }

    // ========================================================================
    // SIGNALING
    // ========================================================================

    private onSignalingOpen(): void {
        this.reconnectAttempts = 0;
        this.sendSignaling(createClientHelloMessage(this.config, getSupportedCodecs()));
    }

    private onSignalingMessage(event: MessageEvent): void {
        void routePixelStreamingSignalingMessage(
            event.data,
            {
                addIceCandidate: (candidate) => this.pc?.addIceCandidate(new RTCIceCandidate(candidate)),
                emitError: (message) => this.emitEvent('error', { message }),
                handleOffer: (sdp) => this.handleOffer(sdp),
                handleQualityChange: (message) => this.handleQualityChange(message),
                handleServerStats: (message) => this.handleServerStats(message),
            },
            (error) => logger.error('[PixelStreaming] Failed to parse signaling message:', error)
        );
    }

    private onSignalingError(error: Event): void {
        logger.error('[PixelStreaming] Signaling error:', error);
        this.emitEvent('error', { message: 'Signaling connection error' });
    }

    private onSignalingClose(): void {
        if (this.isStreaming) {
            this.handleConnectionFailure();
        }
    }

    private sendSignaling(message: object): void {
        this.signaling?.send(message);
    }

    // ========================================================================
    // INPUT HANDLING
    // ========================================================================

    private startInputCapture(): void {
        // Flush input buffer at 120Hz for low latency
        this.inputFlushInterval = setInterval(() => {
            this.flushInputBuffer();
        }, 8); // ~120Hz
    }

    private stopInputCapture(): void {
        if (this.inputFlushInterval) {
            clearInterval(this.inputFlushInterval);
            this.inputFlushInterval = null;
        }
    }

    /**
     * Send mouse input to the stream
     */
    sendMouseInput(event: MouseEvent, type: 'move' | 'down' | 'up' | 'wheel'): void {
        const input = createMouseInput(event, type, this.videoElement, this.stats);
        if (input) this.inputBuffer.push(input);
    }

    /**
     * Send keyboard input to the stream
     */
    sendKeyboardInput(event: KeyboardEvent, type: 'down' | 'up'): void {
        this.inputBuffer.push(createKeyboardInput(event, type));
    }

    /**
     * Send touch input to the stream
     */
    sendTouchInput(event: TouchEvent, type: 'start' | 'move' | 'end' | 'cancel'): void {
        const input = createTouchInput(event, type, this.videoElement, this.stats);
        if (input) this.inputBuffer.push(input);
    }

    /**
     * Send gamepad input to the stream
     */
    sendGamepadInput(gamepad: Gamepad): void {
        this.inputBuffer.push(createGamepadInput(gamepad));
    }

    private flushInputBuffer(): void {
        if (this.inputBuffer.length === 0) return;
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;

        try {
            // Send as binary for efficiency
            const data = encodeInputBatch(this.inputBuffer);
            this.dataChannel.send(data);

            // Track latency
            this.latencyEstimator.recordSend(performance.now());

        } catch (error) {
            logger.error('[PixelStreaming] Failed to send input:', error);
        }

        this.inputBuffer = [];
    }

    // ========================================================================
    // STATS & QUALITY
    // ========================================================================

    private startStatsCollection(): void {
        this.statsInterval = setInterval(async () => {
            await this.collectStats();
        }, 1000);
    }

    private stopStatsCollection(): void {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }

    private async collectStats(): Promise<void> {
        if (!this.pc) return;

        try {
            await collectPeerConnectionStats(this.pc, this.stats, this.config);
            this.latencyEstimator.update(this.stats.rtt);

            if (this.stats.rtt > 100) {
                this.emitEvent('latency-warning', { rtt: this.stats.rtt });
            }

            if (this.config.adaptiveBitrate) {
                this.qualityController.adjust(this.stats);
            }

            this.emitEvent('stats-update', this.stats);

        } catch (error) {
            logger.error('[PixelStreaming] Failed to collect stats:', error);
        }
    }

    private handleQualityChange(message: QualityChangeMessage): void {
        this.emitEvent('quality-changed', applyQualityChangeMessage(this.stats, message));
    }

    private handleServerStats(message: ServerStatsMessage): void {
        // Merge server-side stats
        if (message.encoderFps) {
            // Server's actual encoding FPS
        }
        if (message.serverRtt) {
            // Latency from server perspective
        }
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private handleConnectionFailure(): void {
        this.isStreaming = false;
        this.emitEvent('stream-stopped', {});

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            setTimeout(() => {
                this.connect().catch(err => {
                    logger.error('[PixelStreaming] Reconnect failed:', err);
                });
            }, delay);
        } else {
            this.emitEvent('error', { message: 'Max reconnection attempts reached' });
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Attach the video stream to a container element
     */
    attachTo(container: HTMLElement): void {
        if (this.videoElement) {
            this.detachInputHandlers();
            container.appendChild(this.videoElement);
            this.inputDetach = attachPixelStreamingInputHandlers(container, this.config, {
                keyboard: (event, type) => this.sendKeyboardInput(event, type),
                mouse: (event, type) => this.sendMouseInput(event, type),
                touch: (event, type) => this.sendTouchInput(event, type),
            });
        }
    }

    private detachInputHandlers(): void {
        this.inputDetach?.();
        this.inputDetach = null;
    }

    /**
     * Get the video element
     */
    getVideoElement(): HTMLVideoElement | null {
        return this.videoElement;
    }

    /**
     * Get current streaming stats
     */
    getStats(): StreamingStats {
        return { ...this.stats };
    }

    /**
     * Check if currently streaming
     */
    isActive(): boolean {
        return this.isStreaming;
    }

    /**
     * Request quality change
     */
    requestQualityChange(params: {
        width?: number;
        height?: number;
        fps?: number;
        bitrate?: number;
    }): void {
        this.sendSignaling({
            type: 'quality-request',
            ...params
        });
    }

    /**
     * Add event listener
     */
    on(event: StreamingEventType, callback: EventCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback);
    }

    /**
     * Remove event listener
     */
    off(event: StreamingEventType, callback: EventCallback): void {
        this.eventListeners.get(event)?.delete(callback);
    }

    private emitEvent(type: StreamingEventType, data: unknown): void {
        const event: StreamingEvent = {
            type,
            data,
            timestamp: Date.now()
        };

        this.eventListeners.get(type)?.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                logger.error('[PixelStreaming] Event handler error:', error);
            }
        });
    }
}

// ============================================================================
// ADAPTIVE QUALITY CONTROLLER
// ============================================================================

export default PixelStreamingClient;
