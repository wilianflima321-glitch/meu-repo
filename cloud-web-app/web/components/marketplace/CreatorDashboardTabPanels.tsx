'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { TabContent } from '@/components/ui/Tabs';
import { PRIMARY_STAT_CARDS } from './CreatorDashboard.constants';
import {
    AssetTableCard,
    RecentSalesCard,
    TopAssetsCard,
} from './CreatorDashboardAssetCards';
import {
    CategoryBreakdownCard,
    DownloadTrendChartCard,
    RevenueChartCard,
} from './CreatorDashboardAnalyticsCards';
import { ErrorState, LoadingCard, StatCard } from './CreatorDashboardPrimitives';
import type { CreatorDashboardController } from './useCreatorDashboardController';

function DashboardStatsGrid({ controller }: { controller: CreatorDashboardController }) {
    const { displayStats, statsQuery } = controller;

    if (statsQuery.isLoading) {
        return (
            <>
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
            </>
        );
    }

    if (statsQuery.error) {
        return (
            <Card className="col-span-4">
                <CardContent className="p-6">
                    <ErrorState
                        message="Falha ao carregar estatisticas do painel"
                        onRetry={() => void statsQuery.refetch()}
                    />
                </CardContent>
            </Card>
        );
    }

    return PRIMARY_STAT_CARDS.map((stat) => (
        <StatCard
            key={stat.title}
            title={stat.title}
            value={displayStats[stat.key]}
            change={displayStats[stat.changeKey]}
            icon={stat.icon}
            prefix={'prefix' in stat ? stat.prefix ?? '' : ''}
        />
    ));
}

function OverviewPanel({ controller }: { controller: CreatorDashboardController }) {
    const { revenueQuery, assetsQuery } = controller;
    const revenueError = (revenueQuery.error as Error | null) ?? null;
    const assetsError = (assetsQuery.error as Error | null) ?? null;

    return (
        <TabContent value="overview" className="m-0 p-6">
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <DashboardStatsGrid controller={controller} />
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
    );
}

function AssetsPanel({ controller }: { controller: CreatorDashboardController }) {
    const { assetsQuery } = controller;
    const assetsError = (assetsQuery.error as Error | null) ?? null;

    return (
        <TabContent value="assets" className="m-0 p-6">
            <AssetTableCard
                assets={assetsQuery.data ?? []}
                isLoading={assetsQuery.isLoading}
                error={assetsError}
                onRetry={() => void assetsQuery.refetch()}
            />
        </TabContent>
    );
}

function AnalyticsPanel({ controller }: { controller: CreatorDashboardController }) {
    const { revenueQuery } = controller;
    const revenueError = (revenueQuery.error as Error | null) ?? null;

    return (
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
    );
}

function ReviewsPanel() {
    return (
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
    );
}

function PayoutMetricCard({
    title,
    amount,
    description,
    badgeLabel,
    emphasized = false,
}: {
    title: string;
    amount: number;
    description: string;
    badgeLabel?: string;
    emphasized?: boolean;
}) {
    const amountClassName = emphasized ? 'mt-1 text-3xl font-bold' : 'mt-1 text-2xl font-bold';

    return (
        <Card>
            <CardContent className="p-6">
                <div className={badgeLabel ? 'flex items-center justify-between gap-4' : undefined}>
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className={amountClassName}>
                            $
                            {amount.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                    </div>
                    {badgeLabel ? (
                        <Badge variant="secondary" className="text-[10px]">
                            {badgeLabel}
                        </Badge>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}

function PayoutsPanel({ controller }: { controller: CreatorDashboardController }) {
    const {
        estimatedAvailableBalance,
        estimatedPendingBalance,
        estimatedTotalEarned,
    } = controller;

    return (
        <TabContent value="payouts" className="m-0 p-6">
            <div className="grid grid-cols-3 gap-6">
                <PayoutMetricCard
                    title="Saldo disponivel (estimado)"
                    amount={estimatedAvailableBalance}
                    description="Estimado a partir de metricas agregadas do marketplace."
                    badgeLabel="PAYOUT_LEDGER_PENDING"
                    emphasized
                />
                <PayoutMetricCard
                    title="Pendente"
                    amount={estimatedPendingBalance}
                    description="Pipeline de payouts indisponivel ate habilitar o ledger de transacoes."
                />
                <PayoutMetricCard
                    title="Total recebido"
                    amount={estimatedTotalEarned}
                    description="Total estimado com base no modelo atual de dados do marketplace."
                />
            </div>
        </TabContent>
    );
}

export function CreatorDashboardTabPanels({ controller }: { controller: CreatorDashboardController }) {
    return (
        <>
            <OverviewPanel controller={controller} />
            <AssetsPanel controller={controller} />
            <AnalyticsPanel controller={controller} />
            <ReviewsPanel />
            <PayoutsPanel controller={controller} />
        </>
    );
}
