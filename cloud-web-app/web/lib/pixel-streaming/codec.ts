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

import type {
    CandidatePairStats,
    CodecStats,
    InboundVideoStats,
    PixelStreamingConfig,
    StreamingStats,
} from './types';

export function isInboundVideoStats(report: RTCStats): report is InboundVideoStats {
    const candidate = report as InboundVideoStats;
    return report.type === 'inbound-rtp' && candidate.kind === 'video';
}

export function isCandidatePairStats(report: RTCStats): report is CandidatePairStats {
    const candidate = report as CandidatePairStats;
    return report.type === 'candidate-pair' && candidate.state === 'succeeded';
}

export function isCodecStats(report: RTCStats): report is CodecStats {
    return report.type === 'codec';
}

export function findStats<T extends RTCStats>(
    stats: RTCStatsReport,
    predicate: (report: RTCStats) => report is T
): T | null {
    let matched: T | null = null;
    stats.forEach((report: RTCStats) => {
        if (!matched && predicate(report)) {
            matched = report;
        }
    });
    return matched;
}

export function isStreamingStats(value: unknown): value is StreamingStats {
    return typeof value === 'object' && value !== null && 'qualityScore' in value;
}

export function getEventErrorMessage(value: unknown): string {
    if (typeof value === 'object' && value !== null && 'message' in value) {
        const message = (value as { message?: unknown }).message;
        if (typeof message === 'string') return message;
    }
    return 'Unknown error';
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_CONFIG: PixelStreamingConfig = {
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
        { urls: 'stun:stun1.l.google.com:19302' }
    ],
    audioEnabled: true,
    cursorMode: 'local'
};

// ============================================================================
// SDP, CODEC, AND QUALITY POLICY
// ============================================================================

export function prioritizeSdpCodec(sdp: string, codec: PixelStreamingConfig['codec']): string {
    const codecPriority: Record<PixelStreamingConfig['codec'], string[]> = {
        h264: ['H264', 'VP9', 'VP8', 'AV1'],
        vp9: ['VP9', 'H264', 'VP8', 'AV1'],
        av1: ['AV1', 'VP9', 'H264', 'VP8'],
    };

    const priority = codecPriority[codec] || codecPriority.h264;
    const lines = sdp.split('\r\n');
    const mVideoIndex = lines.findIndex(line => line.startsWith('m=video'));

    if (mVideoIndex !== -1) {
        const rtpmapLines = lines.filter(line => line.startsWith('a=rtpmap:'));
        const codecPayloads: Map<string, number> = new Map();

        rtpmapLines.forEach(line => {
            const match = line.match(/a=rtpmap:(\d+) (\w+)\//);
            if (match) {
                codecPayloads.set(match[2].toUpperCase(), parseInt(match[1]));
            }
        });

        const orderedPayloads: number[] = [];
        priority.forEach(candidateCodec => {
            const payload = codecPayloads.get(candidateCodec);
            if (payload !== undefined) {
                orderedPayloads.push(payload);
            }
        });

        const mLine = lines[mVideoIndex];
        const parts = mLine.split(' ');
        if (orderedPayloads.length > 0) {
            lines[mVideoIndex] = parts.slice(0, 3).join(' ') + ' ' + orderedPayloads.join(' ');
        }
    }

    return lines.join('\r\n');
}

export function getSupportedCodecs(): string[] {
    const codecs: string[] = [];

    if (typeof RTCRtpReceiver !== 'undefined' && RTCRtpReceiver.getCapabilities) {
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

    return [...new Set(codecs)];
}

export function calculateQualityScore(stats: StreamingStats, targetFps: PixelStreamingConfig['targetFps']): number {
    let score = 100;

    if (stats.rtt > 50) score -= Math.min(30, (stats.rtt - 50) / 5);
    score -= stats.packetLoss * 2;

    const dropRate = stats.framesDropped / Math.max(1, stats.framesDecoded);
    score -= dropRate * 50;

    if (stats.fps < targetFps * 0.9) {
        score -= (targetFps - stats.fps) / 2;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

export class AdaptiveQualityController {
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

export class LatencyEstimator {
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

