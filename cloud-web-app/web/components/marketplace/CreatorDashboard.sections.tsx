'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BarChart3, ChevronRight, Edit, Eye, FileX, Inbox, MoreVertical, Package, Star, Trash2, TrendingUp, Upload } from 'lucide-react';
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
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import {
    buildApiError,
    COLORS,
    isNotImplementedError,
    STATUS_CONFIG,
    stripErrorCodePrefix,
} from './CreatorDashboard.api';
import type {
    AssetPerformance,
    RevenueData,
    RecentSale,
} from './CreatorDashboard.types';
import { EmptyState, ErrorState, LoadingSpinner } from './CreatorDashboard.shared';

export function RevenueChart({ data, isLoading, error, onRetry }: { 
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

export function CategoryBreakdown() {
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
                                            className="h-3 w-3 rounded-full"
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

export function TopAssets({ assets, isLoading, error, onRetry }: { 
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
                    <ChevronRight className="ml-1 h-4 w-4" />
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
                                <span className="w-6 text-lg font-bold text-muted-foreground">
                                    #{index + 1}
                                </span>
                                <div className="h-12 w-12 overflow-hidden rounded-md bg-muted">
                                    <Image
                                        src={asset.thumbnail}
                                        alt={asset.name}
                                        width={48}
                                        height={48}
                                        unoptimized
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{asset.name}</p>
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

export function AssetTable({ assets, isLoading, error, onRetry }: { 
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
                    <Upload className="mr-2 h-4 w-4" />
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
                                                <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                                                    <Image
                                                        src={asset.thumbnail}
                                                        alt={asset.name}
                                                        width={40}
                                                        height={40}
                                                        unoptimized
                                                        className="h-full w-full object-cover"
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
                                                className={
                                                    asset.status === 'published'
                                                        ? 'gap-1 bg-green-100 text-green-800'
                                                        : asset.status === 'pending'
                                                            ? 'gap-1 bg-yellow-100 text-yellow-800'
                                                            : asset.status === 'rejected'
                                                                ? 'gap-1 bg-red-100 text-red-800'
                                                                : 'gap-1'
                                                }
                                            >
                                                <StatusIcon className="h-3 w-3" />
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
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                {asset.rating.toFixed(1)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <BarChart3 className="mr-2 h-4 w-4" />
                                                        Analytics
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-500">
                                                        <Trash2 className="mr-2 h-4 w-4" />
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

export function RecentSales() {
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
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{sale.assetName}</p>
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
