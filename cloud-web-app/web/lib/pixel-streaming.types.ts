export interface PixelStreamingConfig {
  serverUrl: string;
  width: number;
  height: number;
  targetFps: 30 | 60 | 120;
  initialBitrate: number;
  minBitrate: number;
  maxBitrate: number;
  codec: 'h264' | 'vp9' | 'av1';
  adaptiveBitrate: boolean;
  dynamicResolution: boolean;
  lowLatencyMode: boolean;
  iceServers: RTCIceServer[];
  audioEnabled: boolean;
  cursorMode: 'local' | 'remote' | 'hidden';
}

export interface StreamingStats {
  bitrate: number;
  resolution: { width: number; height: number };
  fps: number;
  rtt: number;
  packetLoss: number;
  jitter: number;
  framesDecoded: number;
  framesDropped: number;
  qualityScore: number;
  codec: string;
  bytesReceived: number;
  connectionState: RTCPeerConnectionState;
}

export interface InputMessage {
  type: 'mouse' | 'keyboard' | 'touch' | 'gamepad';
  data: MouseInput | KeyboardInput | TouchInput | GamepadInput;
  timestamp: number;
}

interface MouseInput {
  event: 'move' | 'down' | 'up' | 'wheel';
  x: number;
  y: number;
  button?: number;
  deltaX?: number;
  deltaY?: number;
  deltaZ?: number;
}

interface KeyboardInput {
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

interface TouchInput {
  event: 'start' | 'move' | 'end' | 'cancel';
  touches: Array<{
    id: number;
    x: number;
    y: number;
    force?: number;
  }>;
}

interface GamepadInput {
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
  data?: any;
  timestamp: number;
}

export type EventCallback = (event: StreamingEvent) => void;

export const DEFAULT_PIXEL_STREAMING_CONFIG: PixelStreamingConfig = {
  serverUrl: 'wss://stream.aethel.engine/signal',
  width: 1920,
  height: 1080,
  targetFps: 60,
  initialBitrate: 10000,
  minBitrate: 2000,
  maxBitrate: 50000,
  codec: 'h264',
  adaptiveBitrate: true,
  dynamicResolution: true,
  lowLatencyMode: true,
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  audioEnabled: true,
  cursorMode: 'local',
};
