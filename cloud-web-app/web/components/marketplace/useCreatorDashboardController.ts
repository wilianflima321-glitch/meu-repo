'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_DASHBOARD_STATS } from './CreatorDashboard.constants';
import { fetchCreatorAssets, fetchCreatorStats, fetchRevenueData } from './CreatorDashboard.api';

export function useCreatorDashboardController() {
    const [activeTab, setActiveTab] = useState('overview');

    const statsQuery = useQuery({
        queryKey: ['creator-stats'],
        queryFn: fetchCreatorStats,
        staleTime: 1000 * 60 * 5,
    });

    const revenueQuery = useQuery({
        queryKey: ['creator-revenue'],
        queryFn: fetchRevenueData,
        staleTime: 1000 * 60 * 5,
    });

    const assetsQuery = useQuery({
        queryKey: ['creator-assets'],
        queryFn: fetchCreatorAssets,
        staleTime: 1000 * 60 * 5,
    });

    const handleRefetchAll = useCallback(() => {
        void statsQuery.refetch();
        void revenueQuery.refetch();
        void assetsQuery.refetch();
    }, [assetsQuery, revenueQuery, statsQuery]);

    const displayStats = statsQuery.data ?? DEFAULT_DASHBOARD_STATS;
    const isRefreshing = statsQuery.isLoading || revenueQuery.isLoading || assetsQuery.isLoading;
    const estimatedAvailableBalance = Number(displayStats.totalRevenue || 0);
    const estimatedPendingBalance = 0;
    const estimatedTotalEarned = Number(displayStats.totalRevenue || 0);

    return {
        activeTab,
        setActiveTab,
        displayStats,
        isRefreshing,
        estimatedAvailableBalance,
        estimatedPendingBalance,
        estimatedTotalEarned,
        handleRefetchAll,
        statsQuery,
        revenueQuery,
        assetsQuery,
    };
}

export type CreatorDashboardController = ReturnType<typeof useCreatorDashboardController>;
