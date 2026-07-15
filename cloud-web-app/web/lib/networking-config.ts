import type { NetworkConfig, WebRTCConfig } from './networking-multiplayer';

export function createNetworkConfig(serverUrl: string, options: Partial<NetworkConfig> = {}): NetworkConfig {
  return {
    serverUrl,
    maxPlayers: 16,
    tickRate: 60,
    interpolationDelay: 100,
    predictionEnabled: true,
    rollbackFrames: 7,
    ...options,
  };
}
export function createWebRTCConfig(stunServers: string[] = []): WebRTCConfig {
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      ...stunServers.map(url => ({ urls: url })),
    ],
    dataChannelConfig: {
      ordered: false,
      maxRetransmits: 0,
    },
  };
}
