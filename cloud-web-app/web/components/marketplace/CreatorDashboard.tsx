/**
 * AETHEL ENGINE - Creator Dashboard
 * 
 * Full creator dashboard for asset sellers with:
 * - Analytics overview
 * - Revenue tracking
 * - Asset management
 * - Review management
 * - Payout settings
 */

'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    AlertCircle,
    BarChart3,
    DollarSign,
    Download,
    Eye,
    MessageSquare,
    Package,
    RefreshCw,
    Settings,
    Star,
    TrendingUp,
    Upload
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabContent, TabList, TabTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';

// ============================================================================
// Types
// ============================================================================

import {
    fetchCreatorAssets,
    fetchCreatorStats,
    fetchRevenueData,
    isNotImplementedError,
    stripErrorCodePrefix,
} from './CreatorDashboard.api';
import type {
    DashboardStats,
    RevenueData,
} from './CreatorDashboard.types';
import {
    ErrorState,
    LoadingCard,
    LoadingSpinner,
    StatCard,
} from './CreatorDashboard.shared';
import {
    AssetTable,
    CategoryBreakdown,
    RecentSales,
    RevenueChart,
    TopAssets,
} from './CreatorDashboard.sections';

// ============================================================================
// Main Component
// ============================================================================

export default function CreatorDashboard() {
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch stats
    const { 
        data: stats, 
        isLoading: statsLoading, 
        error: statsError,
        refetch: refetchStats 
    } = useQuery({
        queryKey: ['creator-stats'],
        queryFn: fetchCreatorStats,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Fetch revenue data
    const { 
        data: revenueData, 
        isLoading: revenueLoading, 
        error: revenueError,
        refetch: refetchRevenue 
    } = useQuery({
        queryKey: ['creator-revenue'],
        queryFn: fetchRevenueData,
        staleTime: 1000 * 60 * 5,
    });

    // Fetch assets
    const { 
        data: assets, 
        isLoading: assetsLoading, 
        error: assetsError,
        refetch: refetchAssets 
    } = useQuery({
        queryKey: ['creator-assets'],
        queryFn: fetchCreatorAssets,
        staleTime: 1000 * 60 * 5,
    });

    const handleRefetchAll = useCallback(() => {
        refetchStats();
        refetchRevenue();
        refetchAssets();
    }, [refetchStats, refetchRevenue, refetchAssets]);

    // Default stats when loading or no data
    const displayStats: DashboardStats = stats ?? {
        totalRevenue: 0,
        revenueChange: 0,
        totalDownloads: 0,
        downloadsChange: 0,
        totalViews: 0,
        viewsChange: 0,
        averageRating: 0,
        ratingChange: 0,
        assetCount: 0,
        pendingReviews: 0,
    };

    const isRefreshing = statsLoading || revenueLoading || assetsLoading;
    const estimatedAvailableBalance = Number(displayStats.totalRevenue || 0);
    const estimatedPendingBalance = 0;
    const estimatedTotalEarned = Number(displayStats.totalRevenue || 0);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <header className="border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Creator Dashboard</h1>
                        <p className="text-muted-foreground">
                            Manage your assets and track performance
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleRefetchAll} disabled={isRefreshing}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button variant="outline">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>
                        <Button>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Asset
                        </Button>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="border-b px-6">
                    <TabList className="h-12">
                        <TabTrigger value="overview" className="gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Overview
                        </TabTrigger>
                        <TabTrigger value="assets" className="gap-2">
                            <Package className="w-4 h-4" />
                            Assets
                        </TabTrigger>
                        <TabTrigger value="analytics" className="gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Analytics
                        </TabTrigger>
                        <TabTrigger value="reviews" className="gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Reviews
                            {displayStats.pendingReviews > 0 && (
                                <Badge variant="secondary" className="ml-1">
                                    {displayStats.pendingReviews}
                                </Badge>
                            )}
                        </TabTrigger>
                        <TabTrigger value="payouts" className="gap-2">
                            <DollarSign className="w-4 h-4" />
                            Payouts
                        </TabTrigger>
                    </TabList>
                </div>

                <ScrollArea className="flex-1">
                    {/* Overview Tab */}
                    <TabContent value="overview" className="p-6 m-0">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {statsLoading ? (
                                <>
                                    <LoadingCard />
                                    <LoadingCard />
                                    <LoadingCard />
                                    <LoadingCard />
                                </>
                            ) : statsError ? (
                                <Card className="col-span-4">
                                    <CardContent className="p-6">
                                        <ErrorState 
                                            message="Unable to load dashboard statistics" 
                                            onRetry={() => refetchStats()} 
                                        />
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    <StatCard
                                        title="Total Revenue"
                                        value={displayStats.totalRevenue}
                                        change={displayStats.revenueChange}
                                        icon={DollarSign}
                                        prefix="$"
                                    />
                                    <StatCard
                                        title="Downloads"
                                        value={displayStats.totalDownloads}
                                        change={displayStats.downloadsChange}
                                        icon={Download}
                                    />
                                    <StatCard
                                        title="Views"
                                        value={displayStats.totalViews}
                                        change={displayStats.viewsChange}
                                        icon={Eye}
                                    />
                                    <StatCard
                                        title="Average Rating"
                                        value={displayStats.averageRating}
                                        change={displayStats.ratingChange}
                                        icon={Star}
                                    />
                                </>
                            )}
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-3 gap-6 mb-6">
                            <RevenueChart 
                                data={revenueData ?? []} 
                                isLoading={revenueLoading}
                                error={revenueError as Error | null}
                                onRetry={() => refetchRevenue()}
                            />
                            <CategoryBreakdown />
                        </div>

                        {/* Bottom Grid */}
                        <div className="grid grid-cols-2 gap-6">
                            <TopAssets 
                                assets={assets ?? []} 
                                isLoading={assetsLoading}
                                error={assetsError as Error | null}
                                onRetry={() => refetchAssets()}
                            />
                            <RecentSales />
                        </div>
                    </TabContent>

                    {/* Assets Tab */}
                    <TabContent value="assets" className="p-6 m-0">
                        <AssetTable 
                            assets={assets ?? []} 
                            isLoading={assetsLoading}
                            error={assetsError as Error | null}
                            onRetry={() => refetchAssets()}
                        />
                    </TabContent>

                    {/* Analytics Tab */}
                    <TabContent value="analytics" className="p-6 m-0">
                        <div className="grid grid-cols-2 gap-6">
                            <RevenueChart 
                                data={revenueData ?? []} 
                                isLoading={revenueLoading}
                                error={revenueError as Error | null}
                                onRetry={() => refetchRevenue()}
                            />
                            <Card>
                                <CardHeader>
                                    <CardTitle>Download Trends</CardTitle>
                                    <CardDescription>Daily downloads over time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {revenueLoading ? (
                                        <LoadingSpinner className="h-80" />
                                    ) : revenueError ? (
                                        isNotImplementedError(revenueError as Error) ? (
                                            <EmptyState
                                                icon={AlertCircle}
                                                title="Download trends unavailable"
                                                description={stripErrorCodePrefix((revenueError as Error).message)}
                                            />
                                        ) : (
                                            <ErrorState 
                                                message="Unable to load download trends" 
                                                onRetry={() => refetchRevenue()} 
                                            />
                                        )
                                    ) : !revenueData || revenueData.length === 0 ? (
                                        <EmptyState 
                                            icon={Download}
                                            title="No download data yet"
                                            description="Download trends will appear here once your assets start getting traction."
                                        />
                                    ) : (
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={revenueData.slice(-14)}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                                    <XAxis 
                                                        dataKey="date" 
                                                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                        stroke="hsl(var(--muted-foreground))"
                                                        fontSize={12}
                                                    />
                                                    <YAxis 
                                                        stroke="hsl(var(--muted-foreground))"
                                                        fontSize={12}
                                                    />
                                                    <Tooltip 
                                                        contentStyle={{ 
                                                            backgroundColor: 'hsl(var(--card))',
                                                            border: '1px solid hsl(var(--border))',
                                                            borderRadius: '8px',
                                                        }}
                                                    />
                                                    <Bar dataKey="downloads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabContent>

                    {/* Reviews Tab */}
                    <TabContent value="reviews" className="p-6 m-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Reviews</CardTitle>
                                <CardDescription>Reviews awaiting your response</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-center py-8">
                                    No pending reviews at this time
                                </p>
                            </CardContent>
                        </Card>
                    </TabContent>

                    {/* Payouts Tab */}
                    <TabContent value="payouts" className="p-6 m-0">
                        <div className="grid grid-cols-3 gap-6">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Available Balance (Estimated)</p>
                                    <p className="text-3xl font-bold mt-1">
                                        ${estimatedAvailableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Estimated from marketplace aggregate metrics.
                                    </p>
                                </div>
                                <Badge variant="secondary" className="text-[10px]">
                                    PAYOUT_LEDGER_PENDING
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                    <p className="text-2xl font-bold mt-1">
                                        ${estimatedPendingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Payout pipeline is unavailable until transaction ledger is enabled.
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <p className="text-sm text-muted-foreground">Total Earned</p>
                                    <p className="text-2xl font-bold mt-1">
                                        ${estimatedTotalEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Estimated total based on current marketplace data model.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabContent>
                </ScrollArea>
            </Tabs>
        </div>
    );
}

