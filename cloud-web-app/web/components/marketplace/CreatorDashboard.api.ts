import type { AssetPerformance, CategoryData, DashboardStats, RecentSale, RevenueData } from './CreatorDashboard.types';

export function isNotImplementedError(error: Error | null | undefined): boolean {
    return !!error && /^\[[A-Z0-9_]+\]/.test(error.message);
}

export function stripErrorCodePrefix(message: string): string {
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

export async function fetchCreatorStats(): Promise<DashboardStats> {
    const response = await fetch('/api/marketplace/creator/stats');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to load creator statistics');
    }
    return response.json();
}

export async function fetchRevenueData(): Promise<RevenueData[]> {
    const response = await fetch('/api/marketplace/creator/revenue');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to load revenue data');
    }
    return response.json();
}

export async function fetchCreatorAssets(): Promise<AssetPerformance[]> {
    const response = await fetch('/api/marketplace/creator/assets');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to load assets');
    }
    return response.json();
}

export async function fetchCategoryBreakdown(): Promise<CategoryData[]> {
    const response = await fetch('/api/marketplace/creator/categories');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to load category data');
    }
    return response.json();
}

export async function fetchRecentSales(): Promise<RecentSale[]> {
    const response = await fetch('/api/marketplace/creator/sales/recent');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to load recent sales');
    }
    return response.json();
}

export function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US');
}
