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

export interface PixelStreamingConfig {
    /** Streaming server URL (WebSocket signaling) */
    serverUrl: string;
    
    /** Target resolution width */
    width: number;
    
    /** Target resolution height */
    height: number;
    
    /** Target framerate (30, 60, 120) */
    targetFps: 30 | 60 | 120;
    
    /** Initial bitrate in kbps */
    initialBitrate: number;
    
    /** Minimum bitrate in kbps */
    minBitrate: number;
    
    /** Maximum bitrate in kbps */
    maxBitrate: number;
    
    /** Preferred codec */
    codec: 'h264' | 'vp9' | 'av1';
    
    /** Enable adaptive bitrate */
    adaptiveBitrate: boolean;
    
    /** Enable dynamic resolution scaling */
    dynamicResolution: boolean;
    
    /** Low latency mode (prioritizes latency over quality) */
    lowLatencyMode: boolean;
    
    /** TURN/STUN servers for NAT traversal */
    iceServers: RTCIceServer[];
    
    /** Audio streaming enabled */
    audioEnabled: boolean;
    
    /** Cursor mode */
    cursorMode: 'local' | 'remote' | 'hidden';
}

export interface StreamingStats {
    /** Current bitrate in kbps */
    bitrate: number;
    
    /** Current resolution */
    resolution: { width: number; height: number };
    
    /** Actual framerate */
    fps: number;
    
    /** Round-trip time in ms */
    rtt: number;
    
    /** Packet loss percentage */
    packetLoss: number;
    
    /** Jitter in ms */
    jitter: number;
    
    /** Frames decoded */
    framesDecoded: number;
    
    /** Frames dropped */
    framesDropped: number;
    
    /** Current quality score (0-100) */
    qualityScore: number;
    
    /** Current codec */
    codec: string;
    
    /** Data received in bytes */
    bytesReceived: number;
    
    /** Connection state */
    connectionState: RTCPeerConnectionState;
}

export interface InputMessage {
    type: 'mouse' | 'keyboard' | 'touch' | 'gamepad';
    data: MouseInput | KeyboardInput | TouchInput | GamepadInput;
    timestamp: number;
}

export interface MouseInput {
    event: 'move' | 'down' | 'up' | 'wheel';
    x: number;
    y: number;
    button?: number;
    deltaX?: number;
    deltaY?: number;
    deltaZ?: number;
}

export interface KeyboardInput {
    event: 'down' | 'up';
    code: string;
    key: string;
    repeat: boolean;
    modifiers: {
        ctrl: boolean;
        alt: boolean;
        shift: boolean;
        meta: boolean;
    };
}

export interface TouchInput {
    event: 'start' | 'move' | 'end' | 'cancel';
    touches: Array<{
        id: number;
        x: number;
        y: number;
        force?: number;
    }>;
}

export interface GamepadInput {
    index: number;
    buttons: number[];
    axes: number[];
}

export type StreamingEventType = 
    | 'connected'
    | 'disconnected'
    | 'stream-started'
    | 'stream-stopped'
    | 'stats-update'
    | 'quality-changed'
    | 'error'
    | 'latency-warning';

export interface StreamingEvent {
    type: StreamingEventType;
    data?: unknown;
    timestamp: number;
}

export type EventCallback = (event: StreamingEvent) => void;

export interface InboundVideoStats extends RTCStats {
    kind?: string;
    framesDecoded?: number;
    framesDropped?: number;
    bytesReceived?: number;
    jitter?: number;
    framesPerSecond?: number;
    codecId?: string;
}

export interface CandidatePairStats extends RTCStats {
    state?: string;
    currentRoundTripTime?: number;
    bytesReceived?: number;
}

export interface CodecStats extends RTCStats {
    mimeType?: string;
}

export interface QualityChangeMessage {
    resolution?: StreamingStats['resolution'];
    bitrate?: number;
}

export interface ServerStatsMessage {
    encoderFps?: number;
    serverRtt?: number;
}

