'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, DollarSign, Download, Package } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import {
    fetchCategoryBreakdown,
    isNotImplementedError,
    stripErrorCodePrefix,
} from './CreatorDashboard.api';
import { COLORS, REVENUE_PERIOD_OPTIONS } from './CreatorDashboard.constants';
import { EmptyState, ErrorState, LoadingSpinner } from './CreatorDashboardPrimitives';
import type { CategoryData, RevenueData } from './CreatorDashboard.types';

const chartTooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
};

export function RevenueChartCard({
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
                        <ErrorState message={error.message || 'Failed to load revenue data'} onRetry={onRetry} />
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
                                        new Date(date).toLocaleDateString('pt-BR', {
                                            month: 'short',
                                            day: 'numeric',
                                        })
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
                                    contentStyle={chartTooltipStyle}
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

export function CategoryBreakdownCard() {
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
                        message={(error as Error).message || 'Failed to load category data'}
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
                                    <Tooltip contentStyle={chartTooltipStyle} />
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

export function DownloadTrendChartCard({
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
                        <ErrorState message="Failed to load download trends" onRetry={onRetry} />
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
                                    tickFormatter={(date) =>
                                        new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' })
                                    }
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <Tooltip contentStyle={chartTooltipStyle} />
                                <Bar dataKey="downloads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
