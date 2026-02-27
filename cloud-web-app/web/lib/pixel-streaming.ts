/**
 * AETHEL ENGINE - Pixel Streaming System
 * 
 * WebRTC-based remote rendering for AAA graphics.
 * Allows running Unreal Engine-level graphics on cloud GPU instances
 * and streaming to any device via browser.
 * 
 * Features:
 * - Adaptive bitrate streaming
 * - Ultra-low latency input handling (< 50ms RTT target)
 * - Multi-codec support (H.264, VP9, AV1)
 * - Dynamic resolution scaling
 * - Bandwidth estimation and adaptation
 * 
 * @module PixelStreaming
 * @version 2.0.0
 */

import {
    DEFAULT_PIXEL_STREAMING_CONFIG,
    type EventCallback,
    type InputMessage,
    type PixelStreamingConfig,
    type StreamingEvent,
    type StreamingEventType,
    type StreamingStats,
} from './pixel-streaming.types';
import { useEffect, useRef, useState, useCallback } from 'react';
export {
    DEFAULT_PIXEL_STREAMING_CONFIG,
    type EventCallback,
    type InputMessage,
    type PixelStreamingConfig,
    type StreamingEvent,
    type StreamingEventType,
    type StreamingStats,
} from './pixel-streaming.types';

// ============================================================================
// PIXEL STREAMING CLIENT
// ============================================================================

export class PixelStreamingClient {
    private config: PixelStreamingConfig;
    private ws: WebSocket | null = null;
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
    
    private qualityController: AdaptiveQualityController;
    private latencyEstimator: LatencyEstimator;
    private isStreaming = false;
    
    constructor(config: Partial<PixelStreamingConfig> = {}) {
        this.config = { ...DEFAULT_PIXEL_STREAMING_CONFIG, ...config };
        
        this.stats = {
            bitrate: this.config.initialBitrate,
            resolution: { width: this.config.width, height: this.config.height },
            fps: this.config.targetFps,
            rtt: 0,
            packetLoss: 0,
            jitter: 0,
            framesDecoded: 0,
            framesDropped: 0,
            qualityScore: 100,
            codec: this.config.codec,
            bytesReceived: 0,
            connectionState: 'new'
        };
        
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
            // Create WebSocket for signaling
            this.ws = new WebSocket(this.config.serverUrl);
            
            this.ws.onopen = () => this.onSignalingOpen();
            this.ws.onmessage = (event) => this.onSignalingMessage(event);
            this.ws.onerror = (error) => this.onSignalingError(error);
            this.ws.onclose = () => this.onSignalingClose();
            
            // Wait for WebSocket to open
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);
                
                this.ws!.addEventListener('open', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
                
                this.ws!.addEventListener('error', () => {
                    clearTimeout(timeout);
                    reject(new Error('Connection failed'));
                }, { once: true });
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
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.isStreaming = false;
        this.emitEvent('disconnected', {});
    }
    
    // ========================================================================
    // WEBRTC HANDLING
    // ========================================================================
    
    private async initializePeerConnection(): Promise<void> {
        const rtcConfig: RTCConfiguration = {
            iceServers: this.config.iceServers,
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        };
        
        this.pc = new RTCPeerConnection(rtcConfig);
        
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
            console.error('[PixelStreaming] Data channel error:', error);
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
        // Prioritize the configured codec
        const codecPriority: Record<string, string[]> = {
            'h264': ['H264', 'VP9', 'VP8', 'AV1'],
            'vp9': ['VP9', 'H264', 'VP8', 'AV1'],
            'av1': ['AV1', 'VP9', 'H264', 'VP8']
        };
        
        const priority = codecPriority[this.config.codec] || codecPriority['h264'];
        
        // Parse and reorder codec preferences in SDP
        const lines = sdp.split('\r\n');
        const mVideoIndex = lines.findIndex(line => line.startsWith('m=video'));
        
        if (mVideoIndex !== -1) {
            // Find payload types for each codec and reorder
            const rtpmapLines = lines.filter(line => line.startsWith('a=rtpmap:'));
            const codecPayloads: Map<string, number> = new Map();
            
            rtpmapLines.forEach(line => {
                const match = line.match(/a=rtpmap:(\d+) (\w+)\//);
                if (match) {
                    codecPayloads.set(match[2].toUpperCase(), parseInt(match[1]));
                }
            });
            
            // Build new payload order
            const orderedPayloads: number[] = [];
            priority.forEach(codec => {
                const payload = codecPayloads.get(codec);
                if (payload !== undefined) {
                    orderedPayloads.push(payload);
                }
            });
            
            // Update m=video line with new order
            const mLine = lines[mVideoIndex];
            const parts = mLine.split(' ');
            if (orderedPayloads.length > 0) {
                // Keep first 3 parts (m=video, port, protocol) and add ordered payloads
                const newMLine = parts.slice(0, 3).join(' ') + ' ' + orderedPayloads.join(' ');
                lines[mVideoIndex] = newMLine;
            }
        }
        
        return lines.join('\r\n');
    }
    
    private handleIncomingTrack(event: RTCTrackEvent): void {
        const track = event.track;
        const stream = event.streams[0];
        
        if (track.kind === 'video') {
            if (!this.videoElement) {
                this.videoElement = document.createElement('video');
                this.videoElement.autoplay = true;
                this.videoElement.playsInline = true;
                this.videoElement.muted = true; // Mute video element, audio comes separately
            }
            
            this.videoElement.srcObject = stream;
            
            // Start playback
            this.videoElement.play().catch(err => {
                console.error('[PixelStreaming] Video playback failed:', err);
            });
            
        } else if (track.kind === 'audio' && this.config.audioEnabled) {
            if (!this.audioElement) {
                this.audioElement = document.createElement('audio');
                this.audioElement.autoplay = true;
            }
            
            this.audioElement.srcObject = new MediaStream([track]);
            this.audioElement.play().catch(err => {
                console.error('[PixelStreaming] Audio playback failed:', err);
            });
        }
    }
    
    // ========================================================================
    // SIGNALING
    // ========================================================================
    
    private onSignalingOpen(): void {
        this.reconnectAttempts = 0;
        
        // Send client capabilities
        this.sendSignaling({
            type: 'client-hello',
            capabilities: {
                codecs: this.getSupportedCodecs(),
                maxResolution: { width: 3840, height: 2160 },
                maxFps: 120,
                lowLatency: this.config.lowLatencyMode,
                audio: this.config.audioEnabled
            },
            config: {
                width: this.config.width,
                height: this.config.height,
                fps: this.config.targetFps,
                bitrate: this.config.initialBitrate,
                codec: this.config.codec
            }
        });
    }
    
    private onSignalingMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'offer':
                    this.handleOffer(message.sdp);
                    break;
                    
                case 'ice-candidate':
                    if (this.pc && message.candidate) {
                        this.pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                    }
                    break;
                    
                case 'quality-change':
                    this.handleQualityChange(message);
                    break;
                    
                case 'server-stats':
                    this.handleServerStats(message);
                    break;
                    
                case 'error':
                    this.emitEvent('error', { message: message.message });
                    break;
            }
        } catch (error) {
            console.error('[PixelStreaming] Failed to parse signaling message:', error);
        }
    }
    
    private onSignalingError(error: Event): void {
        console.error('[PixelStreaming] Signaling error:', error);
        this.emitEvent('error', { message: 'Signaling connection error' });
    }
    
    private onSignalingClose(): void {
        if (this.isStreaming) {
            this.handleConnectionFailure();
        }
    }
    
    private sendSignaling(message: object): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
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
        if (!this.videoElement) return;
        
        const rect = this.videoElement.getBoundingClientRect();
        const scaleX = this.stats.resolution.width / rect.width;
        const scaleY = this.stats.resolution.height / rect.height;
        
        const input: InputMessage = {
            type: 'mouse',
            data: {
                event: type,
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY,
                button: event.button,
                deltaX: type === 'wheel' ? (event as WheelEvent).deltaX : undefined,
                deltaY: type === 'wheel' ? (event as WheelEvent).deltaY : undefined
            },
            timestamp: performance.now()
        };
        
        this.inputBuffer.push(input);
    }
    
    /**
     * Send keyboard input to the stream
     */
    sendKeyboardInput(event: KeyboardEvent, type: 'down' | 'up'): void {
        const input: InputMessage = {
            type: 'keyboard',
            data: {
                event: type,
                code: event.code,
                key: event.key,
                repeat: event.repeat,
                modifiers: {
                    ctrl: event.ctrlKey,
                    alt: event.altKey,
                    shift: event.shiftKey,
                    meta: event.metaKey
                }
            },
            timestamp: performance.now()
        };
        
        this.inputBuffer.push(input);
    }
    
    /**
     * Send touch input to the stream
     */
    sendTouchInput(event: TouchEvent, type: 'start' | 'move' | 'end' | 'cancel'): void {
        if (!this.videoElement) return;
        
        const rect = this.videoElement.getBoundingClientRect();
        const scaleX = this.stats.resolution.width / rect.width;
        const scaleY = this.stats.resolution.height / rect.height;
        
        const touches = Array.from(event.touches).map(touch => ({
            id: touch.identifier,
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY,
            force: touch.force
        }));
        
        const input: InputMessage = {
            type: 'touch',
            data: {
                event: type,
                touches
            },
            timestamp: performance.now()
        };
        
        this.inputBuffer.push(input);
    }
    
    /**
     * Send gamepad input to the stream
     */
    sendGamepadInput(gamepad: Gamepad): void {
        const input: InputMessage = {
            type: 'gamepad',
            data: {
                index: gamepad.index,
                buttons: gamepad.buttons.map(b => b.value),
                axes: Array.from(gamepad.axes)
            },
            timestamp: performance.now()
        };
        
        this.inputBuffer.push(input);
    }
    
    private flushInputBuffer(): void {
        if (this.inputBuffer.length === 0) return;
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
        
        try {
            // Send as binary for efficiency
            const data = this.encodeInputBatch(this.inputBuffer);
            this.dataChannel.send(data);
            
            // Track latency
            this.latencyEstimator.recordSend(performance.now());
            
        } catch (error) {
            console.error('[PixelStreaming] Failed to send input:', error);
        }
        
        this.inputBuffer = [];
    }
    
    private encodeInputBatch(inputs: InputMessage[]): ArrayBuffer {
        // Binary encoding for minimal latency
        // Format: [count:u16][type:u8][timestamp:f64][...data]
        
        const buffer = new ArrayBuffer(2 + inputs.length * 64); // Estimate
        const view = new DataView(buffer);
        let offset = 0;
        
        view.setUint16(offset, inputs.length, true);
        offset += 2;
        
        for (const input of inputs) {
            const typeCode = { mouse: 0, keyboard: 1, touch: 2, gamepad: 3 }[input.type];
            view.setUint8(offset, typeCode);
            offset += 1;
            
            view.setFloat64(offset, input.timestamp, true);
            offset += 8;
            
            // Encode data based on type (simplified)
            const dataStr = JSON.stringify(input.data);
            const dataBytes = new TextEncoder().encode(dataStr);
            view.setUint16(offset, dataBytes.length, true);
            offset += 2;
            
            new Uint8Array(buffer, offset, dataBytes.length).set(dataBytes);
            offset += dataBytes.length;
        }
        
        return buffer.slice(0, offset);
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
            const stats = await this.pc.getStats();
            let inboundRtp: any = null;
            let candidatePair: any = null;
            
            stats.forEach((report: any) => {
                if (report.type === 'inbound-rtp' && report.kind === 'video') {
                    inboundRtp = report;
                }
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    candidatePair = report;
                }
            });
            
            if (inboundRtp) {
                this.stats.framesDecoded = inboundRtp.framesDecoded || 0;
                this.stats.framesDropped = inboundRtp.framesDropped || 0;
                this.stats.bytesReceived = inboundRtp.bytesReceived || 0;
                this.stats.jitter = (inboundRtp.jitter || 0) * 1000;
                
                // Calculate FPS from decoded frames
                const fps = inboundRtp.framesPerSecond || this.config.targetFps;
                this.stats.fps = Math.round(fps);
                
                // Get codec info
                if (inboundRtp.codecId) {
                    stats.forEach((report: any) => {
                        if (report.id === inboundRtp.codecId && report.type === 'codec') {
                            this.stats.codec = report.mimeType?.split('/')[1] || this.config.codec;
                        }
                    });
                }
            }
            
            if (candidatePair) {
                this.stats.rtt = candidatePair.currentRoundTripTime ? 
                    candidatePair.currentRoundTripTime * 1000 : 0;
                
                // Calculate bitrate from bytes
                const bytesNow = candidatePair.bytesReceived || 0;
                this.stats.bitrate = Math.round((bytesNow / 1024) * 8); // kbps
            }
            
            // Calculate quality score
            this.stats.qualityScore = this.calculateQualityScore();
            
            // Update latency estimate
            this.latencyEstimator.update(this.stats.rtt);
            
            // Check for latency warnings
            if (this.stats.rtt > 100) {
                this.emitEvent('latency-warning', { rtt: this.stats.rtt });
            }
            
            // Apply adaptive quality
            if (this.config.adaptiveBitrate) {
                this.qualityController.adjust(this.stats);
            }
            
            this.emitEvent('stats-update', this.stats);
            
        } catch (error) {
            console.error('[PixelStreaming] Failed to collect stats:', error);
        }
    }
    
    private calculateQualityScore(): number {
        let score = 100;
        
        // Penalize high RTT
        if (this.stats.rtt > 50) score -= Math.min(30, (this.stats.rtt - 50) / 5);
        
        // Penalize packet loss
        score -= this.stats.packetLoss * 2;
        
        // Penalize frame drops
        const dropRate = this.stats.framesDropped / Math.max(1, this.stats.framesDecoded);
        score -= dropRate * 50;
        
        // Penalize low FPS
        if (this.stats.fps < this.config.targetFps * 0.9) {
            score -= (this.config.targetFps - this.stats.fps) / 2;
        }
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    
    private handleQualityChange(message: any): void {
        if (message.resolution) {
            this.stats.resolution = message.resolution;
        }
        if (message.bitrate) {
            this.stats.bitrate = message.bitrate;
        }
        
        this.emitEvent('quality-changed', {
            resolution: this.stats.resolution,
            bitrate: this.stats.bitrate
        });
    }
    
    private handleServerStats(message: any): void {
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
    
    private getSupportedCodecs(): string[] {
        const codecs: string[] = [];
        
        // Check for H.264 support
        if (RTCRtpReceiver.getCapabilities) {
            const caps = RTCRtpReceiver.getCapabilities('video');
            if (caps) {
                caps.codecs.forEach(codec => {
                    if (codec.mimeType.includes('H264')) codecs.push('h264');
                    if (codec.mimeType.includes('VP9')) codecs.push('vp9');
                    if (codec.mimeType.includes('VP8')) codecs.push('vp8');
                    if (codec.mimeType.includes('AV1')) codecs.push('av1');
                });
            }
        }
        
        return [...new Set(codecs)]; // Remove duplicates
    }
    
    private handleConnectionFailure(): void {
        this.isStreaming = false;
        this.emitEvent('stream-stopped', {});
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            setTimeout(() => {
                this.connect().catch(err => {
                    console.error('[PixelStreaming] Reconnect failed:', err);
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
            container.appendChild(this.videoElement);
            
            // Set up input event listeners
            container.addEventListener('mousemove', (e) => this.sendMouseInput(e, 'move'));
            container.addEventListener('mousedown', (e) => this.sendMouseInput(e, 'down'));
            container.addEventListener('mouseup', (e) => this.sendMouseInput(e, 'up'));
            container.addEventListener('wheel', (e) => this.sendMouseInput(e as MouseEvent, 'wheel'));
            
            container.addEventListener('keydown', (e) => this.sendKeyboardInput(e, 'down'));
            container.addEventListener('keyup', (e) => this.sendKeyboardInput(e, 'up'));
            
            container.addEventListener('touchstart', (e) => this.sendTouchInput(e, 'start'));
            container.addEventListener('touchmove', (e) => this.sendTouchInput(e, 'move'));
            container.addEventListener('touchend', (e) => this.sendTouchInput(e, 'end'));
            container.addEventListener('touchcancel', (e) => this.sendTouchInput(e, 'cancel'));
            
            // Make container focusable for keyboard events
            container.tabIndex = 0;
            
            // Handle cursor visibility
            if (this.config.cursorMode === 'hidden') {
                container.style.cursor = 'none';
            }
        }
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
    
    private emitEvent(type: StreamingEventType, data: any): void {
        const event: StreamingEvent = {
            type,
            data,
            timestamp: Date.now()
        };
        
        this.eventListeners.get(type)?.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('[PixelStreaming] Event handler error:', error);
            }
        });
    }
}

// ============================================================================
// ADAPTIVE QUALITY CONTROLLER
// ============================================================================

class AdaptiveQualityController {
    private config: PixelStreamingConfig;
    private history: StreamingStats[] = [];
    private readonly historySize = 10;
    
    constructor(config: PixelStreamingConfig) {
        this.config = config;
    }
    
    adjust(stats: StreamingStats): { bitrate?: number; resolution?: { width: number; height: number } } | null {
        this.history.push({ ...stats });
        if (this.history.length > this.historySize) {
            this.history.shift();
        }
        
        if (this.history.length < 5) return null;
        
        const avgQuality = this.history.reduce((sum, s) => sum + s.qualityScore, 0) / this.history.length;
        const avgRtt = this.history.reduce((sum, s) => sum + s.rtt, 0) / this.history.length;
        
        let newBitrate: number | undefined;
        let newResolution: { width: number; height: number } | undefined;
        
        // Increase quality if consistently good
        if (avgQuality > 90 && avgRtt < 30) {
            const currentBitrate = stats.bitrate;
            if (currentBitrate < this.config.maxBitrate) {
                newBitrate = Math.min(this.config.maxBitrate, currentBitrate * 1.2);
            }
        }
        // Decrease quality if struggling
        else if (avgQuality < 60 || avgRtt > 80) {
            const currentBitrate = stats.bitrate;
            if (currentBitrate > this.config.minBitrate) {
                newBitrate = Math.max(this.config.minBitrate, currentBitrate * 0.8);
            }
            
            // Also consider resolution reduction if dynamic resolution is enabled
            if (this.config.dynamicResolution && avgQuality < 40) {
                const currentWidth = stats.resolution.width;
                const currentHeight = stats.resolution.height;
                
                if (currentWidth > 1280) {
                    newResolution = {
                        width: Math.round(currentWidth * 0.75),
                        height: Math.round(currentHeight * 0.75)
                    };
                }
            }
        }
        
        if (newBitrate || newResolution) {
            return { bitrate: newBitrate, resolution: newResolution };
        }
        
        return null;
    }
}

// ============================================================================
// LATENCY ESTIMATOR
// ============================================================================

class LatencyEstimator {
    private samples: number[] = [];
    private readonly maxSamples = 60;
    private lastSendTime = 0;
    
    recordSend(timestamp: number): void {
        this.lastSendTime = timestamp;
    }
    
    update(rtt: number): void {
        this.samples.push(rtt);
        if (this.samples.length > this.maxSamples) {
            this.samples.shift();
        }
    }
    
    getEstimate(): { average: number; p95: number; jitter: number } {
        if (this.samples.length === 0) {
            return { average: 0, p95: 0, jitter: 0 };
        }
        
        const sorted = [...this.samples].sort((a, b) => a - b);
        const average = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
        const p95Index = Math.floor(sorted.length * 0.95);
        const p95 = sorted[p95Index] || sorted[sorted.length - 1];
        
        // Calculate jitter as average deviation
        const jitter = this.samples.reduce((sum, s) => sum + Math.abs(s - average), 0) / this.samples.length;
        
        return { average, p95, jitter };
    }
}

// ============================================================================
// REACT HOOK
// ============================================================================

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
    containerRef: React.RefObject<HTMLDivElement>;
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
        client.on('stats-update', (event) => setStats(event.data));
        client.on('error', (event) => setError(event.data?.message || 'Unknown error'));
        
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
// EXPORTS
// ============================================================================

export default PixelStreamingClient;
