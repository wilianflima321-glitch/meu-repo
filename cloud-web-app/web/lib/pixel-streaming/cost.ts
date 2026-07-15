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

import type { StreamingStats } from './types';

export type PixelStreamingExecutionTarget = 'browser' | 'local' | 'cloud-stream';

export interface PixelStreamingCostEstimate {
    target: PixelStreamingExecutionTarget;
    billableMinutes: number;
    costPerMinuteUsd: number;
    currentSessionUsd: number;
    projectedHourlyUsd: number;
    qualityScore: number;
    source: 'estimated' | 'metered';
}

export interface PixelStreamingCostOptions {
    target?: PixelStreamingExecutionTarget;
    elapsedMs?: number;
    costPerMinuteUsd?: number;
    source?: PixelStreamingCostEstimate['source'];
}

const DEFAULT_COST_PER_MINUTE_USD: Record<PixelStreamingExecutionTarget, number> = {
    browser: 0,
    local: 0,
    'cloud-stream': 0.03,
};

export function estimatePixelStreamingCost(
    stats: Pick<StreamingStats, 'qualityScore'> & Partial<StreamingStats>,
    options: PixelStreamingCostOptions = {}
): PixelStreamingCostEstimate {
    const target = options.target ?? 'cloud-stream';
    const elapsedMs = Math.max(0, options.elapsedMs ?? 0);
    const billableMinutes = elapsedMs / 60_000;
    const costPerMinuteUsd = options.costPerMinuteUsd ?? DEFAULT_COST_PER_MINUTE_USD[target];

    return {
        target,
        billableMinutes,
        costPerMinuteUsd,
        currentSessionUsd: billableMinutes * costPerMinuteUsd,
        projectedHourlyUsd: costPerMinuteUsd * 60,
        qualityScore: stats.qualityScore,
        source: options.source ?? 'estimated',
    };
}

export function formatPixelStreamingCost(estimate: PixelStreamingCostEstimate): string {
    if (estimate.currentSessionUsd <= 0) return '$0.00';
    return `$${estimate.currentSessionUsd.toFixed(2)}`;
}
