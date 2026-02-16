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

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { 
    BarChart3, DollarSign, Download, Eye, Star, 
    TrendingUp, TrendingDown, Package, MessageSquare,
    Settings, Upload, Edit, Trash2, MoreVertical,
    ChevronRight,
    Clock, CheckCircle, XCircle, AlertCircle,
    RefreshCw, Loader2, Inbox, FileX
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabContent, TabList, TabTrigger } from '@/components/ui/Tabs';
import { Select } from '@/components/ui/Select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';

// ============================================================================
// Types
// ============================================================================

interface DashboardStats {
    totalRevenue: number;
    revenueChange: number;
    totalDownloads: number;
    downloadsChange: number;
    totalViews: number;
    viewsChange: number;
    averageRating: number;
    ratingChange: number;
    assetCount: number;
    pendingReviews: number;
}

interface RevenueData {
    date: string;
    revenue: number;
    downloads: number;
}

interface AssetPerformance {
    id: string;
    name: string;
    thumbnail: string;
    category: string;
    price: number;
    revenue: number;
    downloads: number;
    views: number;
    rating: number;
    status: 'published' | 'draft' | 'pending' | 'rejected';
    createdAt: string;
}

interface RecentSale {
    id: string;
    assetName: string;
    buyerName: string;
    amount: number;
    date: string;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const STATUS_CONFIG = {
    published: { label: 'Published', color: 'bg-green-500', icon: CheckCircle },
    draft: { label: 'Draft', color: 'bg-muted', icon: Clock },
    pending: { label: 'Pending Review', color: 'bg-yellow-500', icon: AlertCircle },
    rejected: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
};

function isNotImplementedError(error: Error | null | undefined): boolean {
    return !!error && /^\[[A-Z0-9_]+\]/.test(error.message);
}

function stripErrorCodePrefix(message: string): string {
    return message.replace(/^\[[^\]]+\]\s*/, '');
}

async function buildApiError(response: Response, fallbackMessage: string): Promise<Error> {
    let message = fallbackMessage;
    let code: string | null = null;
    try {
        const payload = await response.json();
        if (typeof payload?.message === 'string' && payload.message.trim()) {
            message = payload.message;
        } else if (typeof payload?.error === 'string' && payload.error.trim()) {
            message = payload.error;
        }
        if (typeof payload?.code === 'string' && payload.code.trim()) {
            code = payload.code.trim();
        }
    } catch {
        // keep fallback
    }

    return new Error(code ? `[${code}] ${message}` : message);
}

// ============================================================================
// API Fetchers
// ============================================================================

async function fetchCreatorStats(): Promise<DashboardStats> {
    const response = await fetch('/api/marketplace/creator/stats');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to fetch creator stats');
    }
    return response.json();
}

async function fetchRevenueData(): Promise<RevenueData[]> {
    const response = await fetch('/api/marketplace/creator/revenue');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to fetch revenue data');
    }
    return response.json();
}

async function fetchCreatorAssets(): Promise<AssetPerformance[]> {
    const response = await fetch('/api/marketplace/creator/assets');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to fetch assets');
    }
    return response.json();
}

// ============================================================================
// Shared Components
// ============================================================================

function LoadingSpinner({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center justify-center", className)}>
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
    );
}

function LoadingCard() {
    return (
        <Card>
            <CardContent className="p-6">
                <LoadingSpinner className="h-24" />
            </CardContent>
        </Card>
    );
}

function ErrorState({ 
    message, 
    onRetry 
}: { 
    message: string; 
    onRetry: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-sm text-muted-foreground text-center">{message}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
            </Button>
        </div>
    );
}

function EmptyState({ 
    icon: Icon, 
    title, 
    description 
}: { 
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
                {description}
            </p>
        </div>
    );
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatCard({ 
    title, 
    value, 
    change, 
    icon: Icon,
    prefix = '',
    suffix = '' 
}: { 
    title: string;
    value: number | string;
    change: number;
    icon: React.ElementType;
    prefix?: string;
    suffix?: string;
}) {
    const isPositive = change >= 0;
    
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold mt-1">
                            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
                        </p>
                        <div className={cn(
                            "flex items-center gap-1 text-sm mt-2",
                            isPositive ? "text-green-500" : "text-red-500"
                        )}>
                            {isPositive ? (
                                <TrendingUp className="w-4 h-4" />
                            ) : (
                                <TrendingDown className="w-4 h-4" />
                            )}
                            <span>{isPositive ? '+' : ''}{change}%</span>
                            <span className="text-muted-foreground">vs last month</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function RevenueChart({ data, isLoading, error, onRetry }: { 
    data: RevenueData[];
    isLoading: boolean;
    error: Error | null;
    onRetry: () => void;
}) {
    const [period, setPeriod] = useState('30d');

    return (
        <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Revenue Overview</CardTitle>
                    <CardDescription>Your earnings over time</CardDescription>
                </div>
                <div className="w-32">
                    <Select
                        options={[
                            { value: '7d', label: 'Last 7 days' },
                            { value: '30d', label: 'Last 30 days' },
                            { value: '90d', label: 'Last 90 days' },
                            { value: '1y', label: 'Last year' },
                        ]}
                        value={period}
                        onChange={setPeriod}
                        fullWidth
                        size="sm"
                    />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <LoadingSpinner className="h-80" />
                ) : error ? (
                    isNotImplementedError(error) ? (
                        <EmptyState
                            icon={AlertCircle}
                            title="Revenue timeline unavailable"
                            description={stripErrorCodePrefix(error.message)}
                        />
                    ) : (
                        <ErrorState message={error.message || 'Unable to load revenue data'} onRetry={onRetry} />
                    )
                ) : data.length === 0 ? (
                    <EmptyState 
                        icon={TrendingUp}
                        title="No revenue data yet"
                        description="Your revenue chart will populate as you start making sales on the marketplace."
                    />
                ) : (
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                />
                                <YAxis 
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                    }}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface CategoryData {
    name: string;
    value: number;
    revenue: number;
}

async function fetchCategoryBreakdown(): Promise<CategoryData[]> {
    const response = await fetch('/api/marketplace/creator/categories');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to load category data');
    }
    return response.json();
}

function CategoryBreakdown() {
    const { 
        data, 
        isLoading, 
        error, 
        refetch 
    } = useQuery({
        queryKey: ['creator-category-breakdown'],
        queryFn: fetchCategoryBreakdown,
        staleTime: 1000 * 60 * 5,
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>Revenue distribution</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <LoadingSpinner className="h-48" />
                ) : error ? (
                    <ErrorState 
                        message={error.message || 'Unable to load category data'} 
                        onRetry={() => refetch()} 
                    />
                ) : !data || data.length === 0 ? (
                    <EmptyState 
                        icon={Package}
                        title="No category data yet"
                        description="Category distribution will appear here once your assets record sales."
                    />
                ) : (
                    <>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {data.map((_, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 space-y-2">
                            {data.map((item, index) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[index] }}
                                        />
                                        <span className="text-sm">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-medium">$ {item.revenue.toLocaleString('en-US')}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function TopAssets({ assets, isLoading, error, onRetry }: { 
    assets: AssetPerformance[];
    isLoading: boolean;
    error: Error | null;
    onRetry: () => void;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Top Performing Assets</CardTitle>
                    <CardDescription>Your best sellers this month</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <LoadingSpinner className="h-48" />
                ) : error ? (
                    <ErrorState message={error.message || 'Unable to load top assets'} onRetry={onRetry} />
                ) : assets.length === 0 ? (
                    <EmptyState 
                        icon={Package}
                        title="No assets yet"
                        description="Your top performing assets will appear here once you publish your first asset."
                    />
                ) : (
                    <div className="space-y-4">
                        {assets.slice(0, 5).map((asset, index) => (
                            <div key={asset.id} className="flex items-center gap-4">
                                <span className="text-lg font-bold text-muted-foreground w-6">
                                    #{index + 1}
                                </span>
                                <div className="w-12 h-12 rounded-md bg-muted overflow-hidden">
                                    <Image
                                        src={asset.thumbnail}
                                        alt={asset.name}
                                        width={48}
                                        height={48}
                                        unoptimized
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{asset.name}</p>
                                    <p className="text-sm text-muted-foreground">{asset.category}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">${(asset.revenue / 100).toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {asset.downloads} sales
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function AssetTable({ assets, isLoading, error, onRetry }: { 
    assets: AssetPerformance[];
    isLoading: boolean;
    error: Error | null;
    onRetry: () => void;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>All Assets</CardTitle>
                    <CardDescription>Manage your published assets</CardDescription>
                </div>
                <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <LoadingSpinner className="h-48" />
                ) : error ? (
                    <ErrorState message={error.message || 'Unable to load your assets'} onRetry={onRetry} />
                ) : assets.length === 0 ? (
                    <EmptyState 
                        icon={FileX}
                        title="No assets published"
                        description="Start by uploading your first asset to the marketplace. Your assets will appear here for easy management."
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Downloads</TableHead>
                                <TableHead className="text-right">Rating</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.map((asset) => {
                                const StatusIcon = STATUS_CONFIG[asset.status].icon;
                                return (
                                    <TableRow key={asset.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                                                    <Image
                                                        src={asset.thumbnail}
                                                        alt={asset.name}
                                                        width={40}
                                                        height={40}
                                                        unoptimized
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{asset.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {asset.category}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary"
                                                className={cn(
                                                    "gap-1",
                                                    asset.status === 'published' && "bg-green-100 text-green-800",
                                                    asset.status === 'pending' && "bg-yellow-100 text-yellow-800",
                                                    asset.status === 'rejected' && "bg-red-100 text-red-800"
                                                )}
                                            >
                                                <StatusIcon className="w-3 h-3" />
                                                {STATUS_CONFIG[asset.status].label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            ${asset.price.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ${(asset.revenue / 100).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {asset.downloads.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                {asset.rating.toFixed(1)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <BarChart3 className="w-4 h-4 mr-2" />
                                                        Analytics
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-500">
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

async function fetchRecentSales(): Promise<RecentSale[]> {
    const response = await fetch('/api/marketplace/creator/sales/recent');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to load recent sales');
    }
    return response.json();
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US');
}

function RecentSales() {
    const { 
        data: sales, 
        isLoading, 
        error, 
        refetch 
    } = useQuery({
        queryKey: ['creator-recent-sales'],
        queryFn: fetchRecentSales,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>Latest transactions</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <LoadingSpinner className="h-48" />
                ) : error ? (
                    isNotImplementedError(error) ? (
                        <EmptyState
                            icon={AlertCircle}
                            title="Recent sales unavailable"
                            description={stripErrorCodePrefix(error.message)}
                        />
                    ) : (
                        <ErrorState 
                            message={error.message || 'Unable to load recent sales'} 
                            onRetry={() => refetch()} 
                        />
                    )
                ) : !sales || sales.length === 0 ? (
                    <EmptyState 
                        icon={Inbox}
                        title="No sales yet"
                        description="Recent sales will appear here when your assets start selling."
                    />
                ) : (
                    <div className="space-y-4">
                        {sales.map((sale) => (
                            <div key={sale.id} className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarFallback>{sale.buyerName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{sale.assetName}</p>
                                    <p className="text-sm text-muted-foreground">{sale.buyerName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-green-500">+$ {sale.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                    <p className="text-sm text-muted-foreground">{formatTimeAgo(sale.date)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

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

