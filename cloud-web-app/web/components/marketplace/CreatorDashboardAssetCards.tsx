'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    BarChart3,
    ChevronRight,
    Edit,
    Eye,
    FileX,
    Inbox,
    MoreVertical,
    Package,
    Star,
    Trash2,
    Upload,
} from 'lucide-react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    fetchRecentSales,
    formatTimeAgo,
    isNotImplementedError,
    stripErrorCodePrefix,
} from './CreatorDashboard.api';
import { STATUS_CONFIG } from './CreatorDashboard.constants';
import { EmptyState, ErrorState, LoadingSpinner } from './CreatorDashboardPrimitives';
import type { AssetPerformance, AssetStatus, RecentSale } from './CreatorDashboard.types';

const assetStatusStyles: Record<AssetStatus, string> = {
    published: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
    draft: 'bg-muted text-muted-foreground',
    pending: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
    rejected: 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]',
};

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
        <Badge variant="secondary" className={cn('gap-1', assetStatusStyles[asset.status])}>
            <StatusIcon className="h-3 w-3" />
            {STATUS_CONFIG[asset.status].label}
        </Badge>
    );
}

export function TopAssetsCard({
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
                    <ErrorState message={error.message || 'Failed to load top assets'} onRetry={onRetry} />
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

export function AssetTableCard({
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
                    <ErrorState message={error.message || 'Failed to load your assets'} onRetry={onRetry} />
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
                                    <TableCell className="text-right font-medium">
                                        ${(asset.revenue / 100).toFixed(2)}
                                    </TableCell>
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

export function RecentSalesCard() {
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
                            message={(error as Error).message || 'Failed to load recent sales'}
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
