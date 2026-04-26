'use client';

import { CreatorDashboardHeader, CreatorDashboardTabs } from './CreatorDashboardSections';
import { useCreatorDashboardController } from './useCreatorDashboardController';

export default function CreatorDashboard() {
    const controller = useCreatorDashboardController();

    return (
        <div className="flex h-full flex-col bg-background">
            <CreatorDashboardHeader
                isRefreshing={controller.isRefreshing}
                onRefresh={controller.handleRefetchAll}
            />
            <CreatorDashboardTabs controller={controller} />
        </div>
    );
}
