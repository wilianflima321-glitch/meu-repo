'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GatewayRequestPayload, Job } from './aethel-gateway-types';
import { getGatewayHttpUrl, logger, useGateway } from './aethel-gateway-core';

export function useJobQueue(): {
    jobs: Job[];
    stats: { pending: number; running: number; completed: number; failed: number };
    createJob: (type: string, payload: GatewayRequestPayload, priority?: string) => Promise<string>;
    cancelJob: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
} {
    const { subscribe, request } = useGateway();
    const [jobs, setJobs] = useState<Job[]>([]);

    useEffect(() => {
        // Fetch initial jobs
        const fetchJobs = async () => {
            const gatewayHttpUrl = getGatewayHttpUrl();
            if (!gatewayHttpUrl) return;

            try {
                const response = await fetch(`${gatewayHttpUrl}/api/jobs`);
                const data = await response.json();
                if (data.success) {
                    setJobs(data.data);
                }
            } catch (err) {
                logger.error('Failed to fetch jobs:', err);
            }
        };

        fetchJobs();

        // Subscribe to updates
        const unsub1 = subscribe('job:started', (job: Job) => {
            setJobs(prev => prev.map(j => j.id === job.id ? job : j));
        });

        const unsub2 = subscribe('job:completed', (job: Job) => {
            setJobs(prev => prev.map(j => j.id === job.id ? job : j));
        });

        const unsub3 = subscribe('job:failed', (job: Job) => {
            setJobs(prev => prev.map(j => j.id === job.id ? job : j));
        });

        return () => {
            unsub1();
            unsub2();
            unsub3();
        };
    }, [subscribe]);

    const stats = useMemo(() => ({
        pending: jobs.filter(j => j.status === 'pending').length,
        running: jobs.filter(j => j.status === 'running').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length
    }), [jobs]);

    const createJob = useCallback(async (type: string, payload: GatewayRequestPayload, priority = 'normal') => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) throw new Error('Gateway URL not configured');

        const response = await fetch(`${gatewayHttpUrl}/api/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, payload, priority })
        });
        const data = await response.json();

        if (data.success) {
            // Job will be added via WebSocket event
            return data.data.jobId;
        }
        throw new Error(data.error);
    }, []);

    const cancelJob = useCallback(async (id: string) => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) throw new Error('Gateway URL not configured');

        await fetch(`${gatewayHttpUrl}/api/jobs/${id}`, {
            method: 'DELETE'
        });
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'cancelled' as const } : j));
    }, []);

    const refresh = useCallback(async () => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) return;

        try {
            const response = await fetch(`${gatewayHttpUrl}/api/jobs`);
            const data = await response.json();
            if (data.success) {
                setJobs(data.data);
            }
        } catch (err) {
            logger.error('Failed to refresh jobs:', err);
        }
    }, []);

    return { jobs, stats, createJob, cancelJob, refresh };
}

// ============================================================================
// useDiskUsage
