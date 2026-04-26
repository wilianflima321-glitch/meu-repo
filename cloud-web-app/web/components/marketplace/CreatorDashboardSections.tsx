'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    BarChart3,
    ChevronRight,
    DollarSign,
    Download,
    Edit,
    Eye,
    FileX,
    Inbox,
    MoreVertical,
    Package,
    RefreshCw,
    Star,
    Trash2,
    Upload,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Select } from '@/components/ui/Select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { TabContent, TabList, TabTrigger, Tabs } from '@/components/ui/Tabs';
import {
    fetchCategoryBreakdown,
    fetchRecentSales,
    formatTimeAgo,
    isNotImplementedError,
    stripErrorCodePrefix,
} from './CreatorDashboard.api';
import {
    COLORS,
    CREATOR_DASHBOARD_TABS,
    HEADER_ACTIONS,
    PRIMARY_STAT_CARDS,
    REVENUE_PERIOD_OPTIONS,
    STATUS_CONFIG,
} from './CreatorDashboard.constants';
import { EmptyState, ErrorState, LoadingCard, LoadingSpinner, StatCard } from './CreatorDashboardPrimitives';
import type { AssetPerformance, CategoryData, RecentSale, RevenueData } from './CreatorDashboard.types';
import type { CreatorDashboardController } from './useCreatorDashboardController';

function AssetThumbnail({ asset, size }: { asset: AssetPerformance; size: 40 | 48 }) {
    return (
        <div className={cn('overflow-hidden rounded-md bg-muted', size === 48 ? 'h-12 w-12' : 'h-10 w-10')}>
            <Image
                src={asset.thumbnail}
                alt={asset.name}
                width={size}
                height={size}
                unoptimized
                className="h-full w-full object-cover"
            />
        </div>
    );
}

function AssetStatusBadge({ asset }: { asset: AssetPerformance }) {
    const StatusIcon = STATUS_CONFIG[asset.status].icon;

    return (
        <Badge
            variant="secondary"
            className={cn(
                'gap-1',
                asset.status === 'published' &&
                    'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
                asset.status === 'pending' &&
                    'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
                asset.status === 'rejected' &&
                    'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]',
            )}
        >
            <StatusIcon className="h-3 w-3" />
            {STATUS_CONFIG[asset.status].label}
        </Badge>
    );
}

function RevenueChartCard({
    data,
    isLoading,
    error,
    onRetry,
}: {
    data: RevenueData[];
    isLoading: boolean;
    error: Error | null;
    onRetry: () => void;
}) {
    const [period, setPeriod] = useState('30d');

    return (
        <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                    <CardTitle>Visao de receita</CardTitle>
                    <CardDescription>Seus ganhos ao longo do tempo</CardDescription>
                </div>
                <div className="w-32">
                    <Select
                        options={[...REVENUE_PERIOD_OPTIONS]}
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
                            title="Linha do tempo de receita indisponivel"
                            description={stripErrorCodePrefix(error.message)}
                        />
                    ) : (
                        <ErrorState message={error.message || 'Falha ao carregar dados de receita'} onRetry={onRetry} />
                    )
                ) : data.length === 0 ? (
                    <EmptyState
                        icon={DollarSign}
                        title="Sem dados de receita ainda"
                        description="Seu grafico de receita aparecera quando suas vendas iniciarem no marketplace."
                    />
                ) : (
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) =>
                                        new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
                                    }
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
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Receita']}
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

function CategoryBreakdownCard() {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['creator-category-breakdown'],
        queryFn: fetchCategoryBreakdown,
        staleTime: 1000 * 60 * 5,
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vendas por categoria</CardTitle>
                <CardDescription>Distribuicao de receita</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <LoadingSpinner className="h-48" />
                ) : error ? (
                    <ErrorState
                        message={(error as Error).message || 'Falha ao carregar dados de categorias'}
                        onRetry={() => void refetch()}
                    />
                ) : !data || data.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="Sem dados de categoria ainda"
                        description="A distribuicao por categoria aparecera quando seus assets tiverem vendas."
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
                                        {data.map((item: CategoryData, index: number) => (
                                            <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
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
                            {data.map((item: CategoryData, index: number) => (
                                <div key={item.name} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-3 w-3 rounded-full"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="text-sm">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-medium">$ {item.revenue.toLocaleString('pt-BR')}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function TopAssetsCard({
    assets,
    isLoading,
    error,
    onRetry,
}: {
    assets: AssetPerformance[];
    isLoading: boolean;
    error: Error | null;
    onRetry: () => void;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                    <CardTitle>Assets com melhor desempenho</CardTitle>
                    <CardDescription>Seus mais vendidos no mes</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                    Ver tudo
                    <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <LoadingSpinner className="h-48" />
                ) : error ? (
                    <ErrorState message={error.message || 'Falha ao carregar melhores assets'} onRetry={onRetry} />
                ) : assets.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="Nenhum asset ainda"
                        description="Seus assets com melhor desempenho aparecerao quando voce publicar o primeiro asset."
                    />
                ) : (
                    <div className="space-y-4">
                        {assets.slice(0, 5).map((asset, index) => (
                            <div key={asset.id} className="flex items-center gap-4">
                                <span className="w-6 text-lg font-bold text-muted-foreground">#{index + 1}</span>
                                <AssetThumbnail asset={asset} size={48} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{asset.name}</p>
                                    <p className="text-sm text-muted-foreground">{asset.category}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">${(asset.revenue / 100).toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">{asset.downloads} vendas</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function AssetTableCard({
    assets,
    isLoading,
    error,
    onRetry,
}: {
    assets: AssetPerformance[];
    isLoading: boolean;
    error: Error | null;
    onRetry: () => void;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                    <CardTitle>Todos os assets</CardTitle>
                    <CardDescription>Gerencie seus assets publicados</CardDescription>
                </div>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar novo
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <LoadingSpinner className="h-48" />
                ) : error ? (
                    <ErrorState message={error.message || 'Falha ao carregar seus assets'} onRetry={onRetry} />
                ) : assets.length === 0 ? (
                    <EmptyState
                        icon={FileX}
                        title="Nenhum asset publicado"
                        description="Envie seu primeiro asset para o marketplace. Seus assets aparecerao aqui para facilitar a gestao."
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Preco</TableHead>
                                <TableHead className="text-right">Receita</TableHead>
                                <TableHead className="text-right">Downloads</TableHead>
                                <TableHead className="text-right">Avaliacao</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.map((asset) => (
                                <TableRow key={asset.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <AssetThumbnail asset={asset} size={40} />
                                            <div>
                                                <p className="font-medium">{asset.name}</p>
                                                <p className="text-sm text-muted-foreground">{asset.category}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <AssetStatusBadge asset={asset} />
                                    </TableCell>
                                    <TableCell className="text-right">${asset.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium">${(asset.revenue / 100).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{asset.downloads.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Star className="h-4 w-4 fill-yellow-400 text-[var(--aethel-warning-light)]" />
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
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Ver
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <BarChart3 className="mr-2 h-4 w-4" />
                                                    Analiticos
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-[var(--aethel-error-light)]">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

function RecentSalesCard() {
    const { data: sales, isLoading, error, refetch } = useQuery({
        queryKey: ['creator-recent-sales'],
        queryFn: fetchRecentSales,
        staleTime: 1000 * 60 * 2,
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vendas recentes</CardTitle>
                <CardDescription>Ultimas transacoes</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <LoadingSpinner className="h-48" />
                ) : error ? (
                    isNotImplementedError(error as Error) ? (
                        <EmptyState
                            icon={AlertCircle}
                            title="Vendas recentes indisponiveis"
                            description={stripErrorCodePrefix((error as Error).message)}
                        />
                    ) : (
                        <ErrorState
                            message={(error as Error).message || 'Falha ao carregar vendas recentes'}
                            onRetry={() => void refetch()}
                        />
                    )
                ) : !sales || sales.length === 0 ? (
                    <EmptyState
                        icon={Inbox}
                        title="Sem vendas ainda"
                        description="As vendas recentes aparecerao quando seus assets comecarem a vender."
                    />
                ) : (
                    <div className="space-y-4">
                        {sales.map((sale: RecentSale) => (
                            <div key={sale.id} className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarFallback>{sale.buyerName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{sale.assetName}</p>
                                    <p className="text-sm text-muted-foreground">{sale.buyerName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-[var(--aethel-success-light)]">
                                        +$ {sale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
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

function DownloadTrendChartCard({
    data,
    isLoading,
    error,
    onRetry,
}: {
    data: RevenueData[];
    isLoading: boolean;
    error: Error | null;
    onRetry: () => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Tendencias de download</CardTitle>
                <CardDescription>Downloads diarios ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <LoadingSpinner className="h-80" />
                ) : error ? (
                    isNotImplementedError(error) ? (
                        <EmptyState
                            icon={AlertCircle}
                            title="Tendencias de download indisponiveis"
                            description={stripErrorCodePrefix(error.message)}
                        />
                    ) : (
                        <ErrorState message="Falha ao carregar tendencias de download" onRetry={onRetry} />
                    )
                ) : data.length === 0 ? (
                    <EmptyState
                        icon={Download}
                        title="Sem dados de download ainda"
                        description="As tendencias de download aparecerao quando seus assets ganharem tracao."
                    />
                ) : (
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.slice(-14)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' })}
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
    );
}

export function CreatorDashboardHeader({
    isRefreshing,
    onRefresh,
}: {
    isRefreshing: boolean;
    onRefresh: () => void;
}) {
    return (
        <header className="border-b px-6 py-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Painel do criador</h1>
                    <p className="text-muted-foreground">Gerencie seus assets e acompanhe desempenho</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={onRefresh} disabled={isRefreshing}>
                        <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
                        Atualizar
                    </Button>
                    {HEADER_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Button key={action.key} variant={action.variant === 'primary' ? 'primary' : 'outline'}>
                                <Icon className="mr-2 h-4 w-4" />
                                {action.label}
                            </Button>
                        );
                    })}
                </div>
            </div>
        </header>
    );
}

export function CreatorDashboardTabs({ controller }: { controller: CreatorDashboardController }) {
    const { activeTab, setActiveTab, displayStats } = controller;

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col">
            <div className="border-b px-6">
                <TabList className="h-12">
                    {CREATOR_DASHBOARD_TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <TabTrigger key={tab.value} value={tab.value} className="gap-2">
                                <Icon className="h-4 w-4" />
                                {tab.label}
                                {Boolean(tab.showPendingReviews) && displayStats.pendingReviews > 0 ? (
                                    <Badge variant="secondary" className="ml-1">
                                        {displayStats.pendingReviews}
                                    </Badge>
                                ) : null}
                            </TabTrigger>
                        );
                    })}
                </TabList>
            </div>

            <ScrollArea className="flex-1">
                <CreatorDashboardTabPanels controller={controller} />
            </ScrollArea>
        </Tabs>
    );
}

function CreatorDashboardTabPanels({ controller }: { controller: CreatorDashboardController }) {
    const {
        displayStats,
        estimatedAvailableBalance,
        estimatedPendingBalance,
        estimatedTotalEarned,
        statsQuery,
        revenueQuery,
        assetsQuery,
    } = controller;
    const revenueError = (revenueQuery.error as Error | null) ?? null;
    const assetsError = (assetsQuery.error as Error | null) ?? null;

    return (
        <>
            <TabContent value="overview" className="m-0 p-6">
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {statsQuery.isLoading ? (
                        <>
                            <LoadingCard />
                            <LoadingCard />
                            <LoadingCard />
                            <LoadingCard />
                        </>
                    ) : statsQuery.error ? (
                        <Card className="col-span-4">
                            <CardContent className="p-6">
                                <ErrorState
                                    message="Falha ao carregar estatisticas do painel"
                                    onRetry={() => void statsQuery.refetch()}
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        PRIMARY_STAT_CARDS.map((stat) => (
                            <StatCard
                                key={stat.title}
                                title={stat.title}
                                value={displayStats[stat.key]}
                                change={displayStats[stat.changeKey]}
                                icon={stat.icon}
                                prefix={'prefix' in stat ? stat.prefix ?? '' : ''}
                            />
                        ))
                    )}
                </div>

                <div className="mb-6 grid grid-cols-3 gap-6">
                    <RevenueChartCard
                        data={revenueQuery.data ?? []}
                        isLoading={revenueQuery.isLoading}
                        error={revenueError}
                        onRetry={() => void revenueQuery.refetch()}
                    />
                    <CategoryBreakdownCard />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <TopAssetsCard
                        assets={assetsQuery.data ?? []}
                        isLoading={assetsQuery.isLoading}
                        error={assetsError}
                        onRetry={() => void assetsQuery.refetch()}
                    />
                    <RecentSalesCard />
                </div>
            </TabContent>

            <TabContent value="assets" className="m-0 p-6">
                <AssetTableCard
                    assets={assetsQuery.data ?? []}
                    isLoading={assetsQuery.isLoading}
                    error={assetsError}
                    onRetry={() => void assetsQuery.refetch()}
                />
            </TabContent>

            <TabContent value="analytics" className="m-0 p-6">
                <div className="grid grid-cols-2 gap-6">
                    <RevenueChartCard
                        data={revenueQuery.data ?? []}
                        isLoading={revenueQuery.isLoading}
                        error={revenueError}
                        onRetry={() => void revenueQuery.refetch()}
                    />
                    <DownloadTrendChartCard
                        data={revenueQuery.data ?? []}
                        isLoading={revenueQuery.isLoading}
                        error={revenueError}
                        onRetry={() => void revenueQuery.refetch()}
                    />
                </div>
            </TabContent>

            <TabContent value="reviews" className="m-0 p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Avaliacoes pendentes</CardTitle>
                        <CardDescription>Avaliacoes aguardando sua resposta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="py-8 text-center text-muted-foreground">Sem avaliacoes pendentes no momento</p>
                    </CardContent>
                </Card>
            </TabContent>

            <TabContent value="payouts" className="m-0 p-6">
                <div className="grid grid-cols-3 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Saldo disponivel (estimado)</p>
                                    <p className="mt-1 text-3xl font-bold">
                                        $
                                        {estimatedAvailableBalance.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </p>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Estimado a partir de metricas agregadas do marketplace.
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
                            <p className="text-sm text-muted-foreground">Pendente</p>
                            <p className="mt-1 text-2xl font-bold">
                                $
                                {estimatedPendingBalance.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Pipeline de payouts indisponivel ate habilitar o ledger de transacoes.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <p className="text-sm text-muted-foreground">Total recebido</p>
                            <p className="mt-1 text-2xl font-bold">
                                $
                                {estimatedTotalEarned.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Total estimado com base no modelo atual de dados do marketplace.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </TabContent>
        </>
    );
}
