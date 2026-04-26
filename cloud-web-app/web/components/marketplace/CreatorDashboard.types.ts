export interface DashboardStats {
    totalRevenue: number;
    revenueChange: number;
    totalDownloads: number;
    downloadsChange: number;
    totalViews: number;
    viewsChange: number;
    averageRating: number;
    ratingChange: number;
    assetCount: number;
    pendingReviews: number;
}

export interface RevenueData {
    date: string;
    revenue: number;
    downloads: number;
}

export type AssetStatus = 'published' | 'draft' | 'pending' | 'rejected';

export interface AssetPerformance {
    id: string;
    name: string;
    thumbnail: string;
    category: string;
    price: number;
    revenue: number;
    downloads: number;
    views: number;
    rating: number;
    status: AssetStatus;
    createdAt: string;
}

export interface RecentSale {
    id: string;
    assetName: string;
    buyerName: string;
    amount: number;
    date: string;
}

export interface CategoryData {
    name: string;
    value: number;
    revenue: number;
}
