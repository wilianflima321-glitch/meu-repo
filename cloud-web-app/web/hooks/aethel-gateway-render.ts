'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RenderProgress } from './aethel-gateway-types';
import { useGateway } from './aethel-gateway-core';

export function useRenderProgress(jobId?: string): {
    renders: RenderProgress[];
    currentRender: RenderProgress | null;
    cancelRender: (id: string) => Promise<void>;
} {
    const { subscribe, request } = useGateway();
    const [renders, setRenders] = useState<RenderProgress[]>([]);

    useEffect(() => {
        // Fetch initial state
        request<{ active: RenderProgress[] }>('render:list')
            .then(data => {
                if (data?.active) {
                    setRenders(data.active);
                }
            })
            .catch(() => {});

        // Subscribe to updates
        const unsub1 = subscribe('render:progress', (progress: RenderProgress) => {
            setRenders(prev => {
                const idx = prev.findIndex(r => r.jobId === progress.jobId);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = progress;
                    return updated;
                }
                return [...prev, progress];
            });
        });

        const unsub2 = subscribe('render:complete', (result: { jobId: string; path: string }) => {
            setRenders(prev => prev.map(r =>
                r.jobId === result.jobId
                    ? { ...r, status: 'complete' as const, progress: 100, output: result.path }
                    : r
            ));
        });

        const unsub3 = subscribe('render:failed', (error: { jobId: string; error: string }) => {
            setRenders(prev => prev.map(r =>
                r.jobId === error.jobId
                    ? { ...r, status: 'failed' as const, error: error.error }
                    : r
            ));
        });

        return () => {
            unsub1();
            unsub2();
            unsub3();
        };
    }, [subscribe, request]);

    const currentRender = useMemo(() => {
        if (jobId) {
            return renders.find(r => r.jobId === jobId) || null;
        }
        return renders.find(r => r.status === 'rendering') || renders[renders.length - 1] || null;
    }, [renders, jobId]);

    const cancelRender = useCallback(async (id: string) => {
        await request('render:cancel', { jobId: id });
        setRenders(prev => prev.map(r =>
            r.jobId === id ? { ...r, status: 'cancelled' as const } : r
        ));
    }, [request]);

    return { renders, currentRender, cancelRender };
}

// ============================================================================
// useSystemHealth
