'use client';

import { useCallback, useEffect, useState } from 'react';
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
                        message="Failed to load dashboard stats"
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

type CreatorConnectStatus = {
    configured: boolean;
    connected: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    stripeAccountId: string | null;
    defaultCurrency: string | null;
    country: string | null;
    onboardingUrl?: string;
};

function CreatorPayoutConnectCard() {
    const [status, setStatus] = useState<CreatorConnectStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadStatus = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/marketplace/creator/connect', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Status ${response.status}`);
            setStatus((await response.json()) as CreatorConnectStatus);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load creator payout status');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadStatus();
    }, [loadStatus]);

    const startOnboarding = useCallback(async () => {
        setIsStarting(true);
        setError(null);
        try {
            const response = await fetch('/api/marketplace/creator/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ country: status?.country || 'US' }),
            });
            const payload = (await response.json().catch(() => ({}))) as CreatorConnectStatus;
            if (!response.ok || !payload.onboardingUrl) {
                throw new Error('Stripe Connect onboarding is not ready yet.');
            }
            window.location.href = payload.onboardingUrl;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start Stripe Connect onboarding');
        } finally {
            setIsStarting(false);
        }
    }, [status?.country]);

    const statusLabel = isLoading
        ? 'Loading'
        : status?.payoutsEnabled
            ? 'Payouts active'
            : status?.detailsSubmitted
                ? 'Under Stripe review'
                : status?.connected
                    ? 'Onboarding pending'
                    : 'Not connected';

    return (
        <Card className="col-span-3">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle>Stripe Connect creator payouts</CardTitle>
                    <CardDescription>
                        Enables the real creator-to-sale-to-balance-to-payout path without promising revenue before onboarding.
                    </CardDescription>
                </div>
                <Badge variant={status?.payoutsEnabled ? 'success' : 'secondary'} className="whitespace-nowrap text-[10px]">
                    {statusLabel}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">Account</p>
                        <p className="mt-1 truncate font-mono text-xs">{status?.stripeAccountId || 'not connected'}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">Charges</p>
                        <p className="mt-1 text-sm font-semibold">{status?.chargesEnabled ? 'Enabled' : 'Pending'}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">Payouts</p>
                        <p className="mt-1 text-sm font-semibold">{status?.payoutsEnabled ? 'Enabled' : 'Pending'}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">Currency</p>
                        <p className="mt-1 text-sm font-semibold">{status?.defaultCurrency?.toUpperCase() || 'USD'}</p>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}

                {!status?.configured ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                        Configure STRIPE_SECRET_KEY antes de liberar onboarding de creators.
                    </div>
                ) : null}

                <button
                    type="button"
                    onClick={startOnboarding}
                    disabled={!status?.configured || isStarting}
                    className="rounded-lg border border-border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {status?.connected ? 'Continuar onboarding Stripe' : 'Conectar Stripe Express'}
                </button>
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
                <CreatorPayoutConnectCard />
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
