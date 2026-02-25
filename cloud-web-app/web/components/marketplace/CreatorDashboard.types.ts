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
    status: 'published' | 'draft' | 'pending' | 'rejected';
    createdAt: string;
}

export interface RecentSale {
    id: string;
    assetName: string;
    buyerName: string;
    amount: number;
    date: string;
}
