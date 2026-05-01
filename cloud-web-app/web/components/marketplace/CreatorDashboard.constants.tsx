import {
    AlertCircle,
    BarChart3,
    CheckCircle,
    Clock,
    DollarSign,
    Download,
    Eye,
    MessageSquare,
    Package,
    Settings,
    Star,
    TrendingUp,
    Upload,
    XCircle,
} from 'lucide-react';
import type { AssetStatus, DashboardStats } from './CreatorDashboard.types';

type DashboardHeaderAction = {
    key: string;
    label: string;
    icon: typeof Settings;
    variant: 'outline' | 'primary';
};

type CreatorDashboardTab = {
    value: string;
    label: string;
    icon: typeof BarChart3;
    showPendingReviews?: boolean;
};

type PrimaryStatCard = {
    title: string;
    key: keyof DashboardStats;
    changeKey: keyof DashboardStats;
    icon: typeof DollarSign;
    prefix?: string;
};

export const COLORS = ['var(--aethel-primary)', 'var(--aethel-success)', 'var(--aethel-warning)', 'var(--aethel-error)', 'var(--aethel-accent)'];

export const STATUS_CONFIG: Record<AssetStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
    published: { label: 'Publicado', color: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]', icon: CheckCircle },
    draft: { label: 'Rascunho', color: 'bg-muted', icon: Clock },
    pending: { label: 'Revisao pendente', color: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]', icon: AlertCircle },
    rejected: { label: 'Rejeitado', color: 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]', icon: XCircle },
};

export const DEFAULT_DASHBOARD_STATS: DashboardStats = {
    totalRevenue: 0,
    revenueChange: 0,
    totalDownloads: 0,
    downloadsChange: 0,
    totalViews: 0,
    viewsChange: 0,
    averageRating: 0,
    ratingChange: 0,
    assetCount: 0,
    pendingReviews: 0,
};

export const REVENUE_PERIOD_OPTIONS = [
    { value: '7d', label: 'Ultimos 7 dias' },
    { value: '30d', label: 'Ultimos 30 dias' },
    { value: '90d', label: 'Ultimos 90 dias' },
    { value: '1y', label: 'Ultimo ano' },
] as const;

export const CREATOR_DASHBOARD_TABS: readonly CreatorDashboardTab[] = [
    { value: 'overview', label: 'Visao geral', icon: BarChart3 },
    { value: 'assets', label: 'Assets', icon: Package },
    { value: 'analytics', label: 'Analiticos', icon: TrendingUp },
    { value: 'reviews', label: 'Avaliacoes', icon: MessageSquare, showPendingReviews: true },
    { value: 'payouts', label: 'Pagamentos', icon: DollarSign },
] as const;

export const PRIMARY_STAT_CARDS: readonly PrimaryStatCard[] = [
    { title: 'Receita total', key: 'totalRevenue', changeKey: 'revenueChange', icon: DollarSign, prefix: '$' },
    { title: 'Downloads', key: 'totalDownloads', changeKey: 'downloadsChange', icon: Download },
    { title: 'Visualizacoes', key: 'totalViews', changeKey: 'viewsChange', icon: Eye },
    { title: 'Media de avaliacao', key: 'averageRating', changeKey: 'ratingChange', icon: Star },
] as const;

export const HEADER_ACTIONS: readonly DashboardHeaderAction[] = [
    { key: 'settings', label: 'Configuracoes', icon: Settings, variant: 'outline' },
    { key: 'upload', label: 'Enviar asset', icon: Upload, variant: 'primary' },
];
