/**
 * Aethel Gateway feature hooks.
 *
 * Public barrel for gateway hooks. Domain-specific runtime hooks live in
 * smaller files so connection, render, health, jobs, storage, bridge and
 * collaboration can evolve without a gateway monolith.
 */

'use client';

export type {
    ConnectionState,
    DiskUsage,
    DownloadProgress,
    HealthAlert,
    HealthDashboardState,
    Job,
    RenderProgress,
    ServiceHealth,
    SystemMetrics,
} from './aethel-gateway-types';

export { GatewayContext, GatewayProvider, useGateway } from './aethel-gateway-core';
export { useAethelConnection } from './aethel-gateway-connection';
export { useRenderProgress } from './aethel-gateway-render';
export { useSystemHealth } from './aethel-gateway-health';
export { useJobQueue } from './aethel-gateway-jobs';
export { useDiskUsage, useAssetDownload } from './aethel-gateway-storage';
export { useBridge } from './aethel-gateway-bridge';
export { useCollaboration } from './aethel-gateway-collaboration';
