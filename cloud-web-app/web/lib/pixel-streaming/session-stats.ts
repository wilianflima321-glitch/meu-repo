import {
  calculateQualityScore,
  findStats,
  isCandidatePairStats,
  isCodecStats,
  isInboundVideoStats,
} from './codec';
import type { PixelStreamingConfig, QualityChangeMessage, StreamingStats } from './types';

export async function collectPeerConnectionStats(
  pc: RTCPeerConnection,
  stats: StreamingStats,
  config: PixelStreamingConfig
): Promise<void> {
  const statsReport = await pc.getStats();
  const inboundRtp = findStats(statsReport, isInboundVideoStats);
  const candidatePair = findStats(statsReport, isCandidatePairStats);

  if (inboundRtp) {
    stats.framesDecoded = inboundRtp.framesDecoded || 0;
    stats.framesDropped = inboundRtp.framesDropped || 0;
    stats.bytesReceived = inboundRtp.bytesReceived || 0;
    stats.jitter = (inboundRtp.jitter || 0) * 1000;
    stats.fps = Math.round(inboundRtp.framesPerSecond || config.targetFps);

    if (inboundRtp.codecId) {
      statsReport.forEach((report: RTCStats) => {
        if (report.id === inboundRtp.codecId && isCodecStats(report)) {
          stats.codec = report.mimeType?.split('/')[1] || config.codec;
        }
      });
    }
  }

  if (candidatePair) {
    stats.rtt = candidatePair.currentRoundTripTime ? candidatePair.currentRoundTripTime * 1000 : 0;
    const bytesNow = candidatePair.bytesReceived || 0;
    stats.bitrate = Math.round((bytesNow / 1024) * 8);
  }

  stats.qualityScore = calculateQualityScore(stats, config.targetFps);
}

export function applyQualityChangeMessage(
  stats: StreamingStats,
  message: QualityChangeMessage
): Pick<StreamingStats, 'resolution' | 'bitrate'> {
  if (message.resolution) stats.resolution = message.resolution;
  if (message.bitrate) stats.bitrate = message.bitrate;
  return {
    resolution: stats.resolution,
    bitrate: stats.bitrate,
  };
}
