import type {
  PixelStreamingConfig,
  QualityChangeMessage,
  ServerStatsMessage,
} from './types';

export interface PixelStreamingSignalingHandlers {
  addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> | void;
  emitError(message: string): void;
  handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> | void;
  handleQualityChange(message: QualityChangeMessage): void;
  handleServerStats(message: ServerStatsMessage): void;
}

export function createClientHelloMessage(config: PixelStreamingConfig, codecs: string[]): object {
  return {
    type: 'client-hello',
    capabilities: {
      codecs,
      maxResolution: { width: 3840, height: 2160 },
      maxFps: 120,
      lowLatency: config.lowLatencyMode,
      audio: config.audioEnabled,
    },
    config: {
      width: config.width,
      height: config.height,
      fps: config.targetFps,
      bitrate: config.initialBitrate,
      codec: config.codec,
    },
  };
}

export async function routePixelStreamingSignalingMessage(
  data: string,
  handlers: PixelStreamingSignalingHandlers,
  onParseError: (error: unknown) => void
): Promise<void> {
  try {
    const message = JSON.parse(data);

    switch (message.type) {
      case 'offer':
        await handlers.handleOffer(message.sdp);
        break;
      case 'ice-candidate':
        if (message.candidate) await handlers.addIceCandidate(message.candidate);
        break;
      case 'quality-change':
        handlers.handleQualityChange(message);
        break;
      case 'server-stats':
        handlers.handleServerStats(message);
        break;
      case 'error':
        handlers.emitError(message.message);
        break;
      default:
        break;
    }
  } catch (error) {
    onParseError(error);
  }
}
