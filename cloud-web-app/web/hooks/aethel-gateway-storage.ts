'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DiskUsage, DownloadProgress, HealthAlert } from './aethel-gateway-types';
import { getGatewayHttpUrl, logger, useGateway } from './aethel-gateway-core';

export function useDiskUsage(): {
    usage: DiskUsage[];
    total: { used: number; quota: number; percentage: number };
    alerts: HealthAlert[];
    cleanup: (category?: string) => Promise<number>;
    refresh: () => Promise<void>;
} {
    const { subscribe } = useGateway();
    const [usage, setUsage] = useState<DiskUsage[]>([]);
    const [alerts, setAlerts] = useState<HealthAlert[]>([]);

    useEffect(() => {
        // Fetch initial state
        const fetchUsage = async () => {
            const gatewayHttpUrl = getGatewayHttpUrl();
            if (!gatewayHttpUrl) return;

            try {
                const response = await fetch(`${gatewayHttpUrl}/api/system/disk`);
                const data = await response.json();
                if (data.success) {
                    setUsage(data.data.usage || []);
                    setAlerts(data.data.alerts || []);
                }
            } catch (err) {
                logger.error('Failed to fetch disk usage:', err);
            }
        };

        fetchUsage();

        // Subscribe to alerts
        const unsub = subscribe('disk:alert', (alert: HealthAlert) => {
            setAlerts(prev => [alert, ...prev.slice(0, 9)]);
        });

        // Poll every minute
        const pollInterval = setInterval(fetchUsage, 60000);

        return () => {
            unsub();
            clearInterval(pollInterval);
        };
    }, [subscribe]);

    const total = useMemo(() => {
        const used = usage.reduce((sum, u) => sum + u.used, 0);
        const quota = usage.reduce((sum, u) => sum + u.quota, 0);
        return {
            used,
            quota,
            percentage: quota > 0 ? (used / quota) * 100 : 0
        };
    }, [usage]);

    const cleanup = useCallback(async (category?: string) => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) return 0;

        const response = await fetch(`${gatewayHttpUrl}/api/system/disk/cleanup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category })
        });
        const data = await response.json();
        return data.data?.freedBytes || 0;
    }, []);

    const refresh = useCallback(async () => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) return;

        try {
            const response = await fetch(`${gatewayHttpUrl}/api/system/disk`);
            const data = await response.json();
            if (data.success) {
                setUsage(data.data.usage || []);
                setAlerts(data.data.alerts || []);
            }
        } catch (err) {
            logger.error('Failed to refresh disk usage:', err);
        }
    }, []);

    return { usage, total, alerts, cleanup, refresh };
}

// ============================================================================
// useAssetDownload

export function useAssetDownload(): {
    downloads: DownloadProgress[];
    startDownload: (url: string, options?: { filename?: string; sha256?: string }) => Promise<string>;
    cancelDownload: (id: string) => void;
} {
    const { subscribe, send } = useGateway();
    const [downloads, setDownloads] = useState<DownloadProgress[]>([]);

    useEffect(() => {
        const unsub1 = subscribe('download:progress', (progress: DownloadProgress) => {
            setDownloads(prev => {
                const idx = prev.findIndex(d => d.id === progress.id);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = progress;
                    return updated;
                }
                return [...prev, progress];
            });
        });

        const unsub2 = subscribe('download:complete', (result: DownloadProgress) => {
            setDownloads(prev => prev.map(d =>
                d.id === result.id ? { ...d, status: 'complete' as const, progress: 100 } : d
            ));
        });

        return () => {
            unsub1();
            unsub2();
        };
    }, [subscribe]);

    const startDownload = useCallback(async (url: string, options?: { filename?: string; sha256?: string }) => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) throw new Error('Gateway URL not configured');

        const response = await fetch(`${gatewayHttpUrl}/api/assets/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                destination: options?.filename,
                expectedSha256: options?.sha256
            })
        });
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        return data.data.id || url;
    }, []);

    const cancelDownload = useCallback((id: string) => {
        send({ type: 'download:cancel', payload: { id } });
        setDownloads(prev => prev.filter(d => d.id !== id));
    }, [send]);

    return { downloads, startDownload, cancelDownload };
}

// ============================================================================
// useBridge - Commands for Local Bridge (Blender/AI)
