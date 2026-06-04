'use client';

import { useCallback, useEffect, useState } from 'react';
import type { HealthAlert, HealthDashboardState, ServiceHealth, SystemMetrics } from './aethel-gateway-types';
import { getGatewayHttpUrl, logger, useGateway } from './aethel-gateway-core';

export function useSystemHealth(): {
    state: HealthDashboardState | null;
    services: Record<string, ServiceHealth>;
    metrics: SystemMetrics | null;
    alerts: HealthAlert[];
    refresh: () => Promise<void>;
} {
    const { subscribe, request } = useGateway();
    const [state, setState] = useState<HealthDashboardState | null>(null);

    useEffect(() => {
        // Fetch initial state
        const fetchHealth = async () => {
            const gatewayHttpUrl = getGatewayHttpUrl();
            if (!gatewayHttpUrl) return;

            try {
                const response = await fetch(`${gatewayHttpUrl}/api/health/dashboard`);
                const data = await response.json();
                if (data.success) {
                    setState(data.data);
                }
            } catch (err) {
                logger.error('Failed to fetch health:', err);
            }
        };

        fetchHealth();

        // Subscribe to updates
        const unsub1 = subscribe('health:update', (update: Partial<HealthDashboardState>) => {
            setState(prev => prev ? { ...prev, ...update } : null);
        });

        const unsub2 = subscribe('health:alert', (alert: HealthAlert) => {
            setState(prev => prev ? {
                ...prev,
                alerts: [alert, ...prev.alerts.slice(0, 49)]
            } : null);
        });

        // Poll every 30 seconds as backup
        const pollInterval = setInterval(fetchHealth, 30000);

        return () => {
            unsub1();
            unsub2();
            clearInterval(pollInterval);
        };
    }, [subscribe]);

    const refresh = useCallback(async () => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) return;

        try {
            const response = await fetch(`${gatewayHttpUrl}/api/health/dashboard`);
            const data = await response.json();
            if (data.success) {
                setState(data.data);
            }
        } catch (err) {
            logger.error('Failed to refresh health:', err);
        }
    }, []);

    return {
        state,
        services: state?.services || {},
        metrics: state?.system || null,
        alerts: state?.alerts || [],
        refresh
    };
}

// ============================================================================
// useJobQueue
