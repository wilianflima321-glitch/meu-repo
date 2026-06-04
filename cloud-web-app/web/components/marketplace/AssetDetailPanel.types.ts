// Shared contracts for AssetDetailPanel. Keep data shape separate from the heavy marketplace UI.

// ============================================================================
// Types
// ============================================================================

export interface AssetDetail {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    subcategory: string;
    tags: string[];
    images: string[];
    thumbnailUrl: string;
    previewUrl?: string;
    modelUrl?: string;
    fileSize: number;
    version: string;
    compatibility: string[];
    license: 'standard' | 'extended' | 'exclusive';
    creator: {
        id: string;
        name: string;
        avatar: string;
        verified: boolean;
        assetCount: number;
        joinedAt: string;
    };
    stats: {
        downloads: number;
        rating: number;
        reviewCount: number;
        favoritos: number;
    };
    files: {
        name: string;
        size: number;
        format: string;
    }[];
    changelog: {
        version: string;
        date: string;
        changes: string[];
    }[];
    isFeatured: boolean;
    isOwned: boolean;
    isFavorited: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Review {
    id: string;
    user: {
        id: string;
        name: string;
        avatar: string;
    };
    rating: number;
    title: string;
    content: string;
    helpful: number;
    createdAt: string;
    verified: boolean;
}

export interface AssetDetailPanelProps {
    assetId: string;
    onClose: () => void;
}
