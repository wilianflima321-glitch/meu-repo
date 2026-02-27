import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import type {
  AssetPerformance,
  DashboardStats,
  RevenueData,
} from './CreatorDashboard.types';

export const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const STATUS_CONFIG = {
    published: { label: 'Published', color: 'bg-green-500', icon: CheckCircle },
    draft: { label: 'Draft', color: 'bg-muted', icon: Clock },
    pending: { label: 'Pending Review', color: 'bg-yellow-500', icon: AlertCircle },
    rejected: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
};

export function isNotImplementedError(error: Error | null | undefined): boolean {
    return !!error && /^\[[A-Z0-9_]+\]/.test(error.message);
}

export function stripErrorCodePrefix(message: string): string {
    return message.replace(/^\[[^\]]+\]\s*/, '');
}

export async function buildApiError(response: Response, fallbackMessage: string): Promise<Error> {
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

export async function fetchCreatorStats(): Promise<DashboardStats> {
    const response = await fetch('/api/marketplace/creator/stats');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to fetch creator stats');
    }
    return response.json();
}

export async function fetchRevenueData(): Promise<RevenueData[]> {
    const response = await fetch('/api/marketplace/creator/revenue');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to fetch revenue data');
    }
    return response.json();
}

export async function fetchCreatorAssets(): Promise<AssetPerformance[]> {
    const response = await fetch('/api/marketplace/creator/assets');
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to fetch assets');
    }
    return response.json();
}
