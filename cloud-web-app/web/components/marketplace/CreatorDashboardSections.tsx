'use client';

import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { TabList, TabTrigger, Tabs } from '@/components/ui/Tabs';
import {
    CREATOR_DASHBOARD_TABS,
    HEADER_ACTIONS,
} from './CreatorDashboard.constants';
import { CreatorDashboardTabPanels } from './CreatorDashboardTabPanels';
import type { CreatorDashboardController } from './useCreatorDashboardController';

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
                        Refresh
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
