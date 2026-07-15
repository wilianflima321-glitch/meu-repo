import type { PixelStreamingConfig, StreamingStats } from './types';

export function createInitialStreamingStats(config: PixelStreamingConfig): StreamingStats {
  return {
    bitrate: config.initialBitrate,
    resolution: { width: config.width, height: config.height },
    fps: config.targetFps,
    rtt: 0,
    packetLoss: 0,
    jitter: 0,
    framesDecoded: 0,
    framesDropped: 0,
    qualityScore: 100,
    codec: config.codec,
    bytesReceived: 0,
    connectionState: 'new',
  };
}

export function createRtcPeerConfig(config: PixelStreamingConfig): RTCConfiguration {
  return {
    iceServers: config.iceServers,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}
