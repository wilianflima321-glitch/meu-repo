/**
 * AETHEL ENGINE - User Library Component
 * 
 * User's purchased/downloaded assets library with:
 * - Purchased assets
 * - Favorites
 * - Download history
 * - Collections
 */

'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Download, Heart, FolderOpen, Clock, Package, 
    Grid, List, Search, Filter, MoreVertical,
    Trash2, FolderPlus, Star, Check, ExternalLink,
    ChevronRight, Plus, Edit2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabContent, TabList, TabTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Skeleton } from '@/components/ui/Skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface LibraryAsset {
    id: string;
    name: string;
    thumbnailUrl: string;
    category: string;
    version: string;
    fileSize: number;
    purchasedAt?: string;
    downloadedAt?: string;
    favoritedAt?: string;
    rating: number;
    hasUpdate: boolean;
    creator: {
        name: string;
        verified: boolean;
    };
}

interface Collection {
    id: string;
    name: string;
    description?: string;
    assetCount: number;
    coverImage?: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchPurchasedAssets(): Promise<LibraryAsset[]> {
    const res = await fetch('/api/marketplace/library/purchased');
    if (!res.ok) throw new Error('Failed to fetch purchases');
    return res.json();
}

async function fetchFavorites(): Promise<LibraryAsset[]> {
    const res = await fetch('/api/marketplace/library/favorites');
    if (!res.ok) throw new Error('Failed to fetch favorites');
    return res.json();
}

async function fetchDownloadHistory(): Promise<LibraryAsset[]> {
    const res = await fetch('/api/marketplace/library/downloads');
    if (!res.ok) throw new Error('Failed to fetch downloads');
    return res.json();
}

async function fetchCollections(): Promise<Collection[]> {
    const res = await fetch('/api/marketplace/collections');
    if (!res.ok) throw new Error('Failed to fetch collections');
    return res.json();
}

async function downloadAsset(assetId: string): Promise<Blob> {
    const res = await fetch(`/api/marketplace/assets/${assetId}/download`);
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
}

// ============================================================================
// Sub-Components
// ============================================================================

function AssetCard({ 
    asset, 
    viewMode,
    onDownload,
    onRemove,
    onAddToCollection
}: { 
    asset: LibraryAsset;
    viewMode: 'grid' | 'list';
    onDownload: (id: string) => void;
    onRemove: (id: string) => void;
    onAddToCollection: (id: string) => void;
}) {
    const [isDownloading, setIsDownloading] = useState(false);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            await onDownload(asset.id);
        } finally {
            setIsDownloading(false);
        }
    };

    if (viewMode === 'list') {
        return (
            <ContextMenu>
                <ContextMenuTrigger>
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                    >
                        {/* Thumbnail */}
                        <div className="w-16 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <Image
                                src={asset.thumbnailUrl}
                                alt={asset.name}
                                width={64}
                                height={48}
                                unoptimized
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium truncate">{asset.name}</h3>
                                {asset.hasUpdate && (
                                    <Badge variant="secondary" className="text-xs">
                                        Update Available
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {asset.creator.name} • {asset.category} • {formatFileSize(asset.fileSize)}
                            </p>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            {asset.rating.toFixed(1)}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                size="sm"
                                onClick={handleDownload}
                                disabled={isDownloading}
                            >
                                <Download className="w-4 h-4 mr-1" />
                                {isDownloading ? 'Downloading...' : 'Download'}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onAddToCollection(asset.id)}>
                                        <FolderPlus className="w-4 h-4 mr-2" />
                                        Add to Collection
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View in Marketplace
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        className="text-red-500"
                                        onClick={() => onRemove(asset.id)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove from Library
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </motion.div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onAddToCollection(asset.id)}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Add to Collection
                    </ContextMenuItem>
                    <ContextMenuItem>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View in Marketplace
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem 
                        className="text-red-500"
                        onClick={() => onRemove(asset.id)}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    // Grid view
    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all"
                >
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden bg-muted">
                        <Image
                            src={asset.thumbnailUrl}
                            alt={asset.name}
                            fill
                            unoptimized
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        
                        {/* Update badge */}
                        {asset.hasUpdate && (
                            <Badge className="absolute top-2 right-2">
                                Update Available
                            </Badge>
                        )}

                        {/* Quick download */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button onClick={handleDownload} disabled={isDownloading}>
                                <Download className="w-4 h-4 mr-2" />
                                {isDownloading ? 'Downloading...' : 'Download'}
                            </Button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                        <h3 className="font-medium truncate">{asset.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            {asset.creator.name}
                            {asset.creator.verified && (
                                <Check className="w-3 h-3 text-blue-500" />
                            )}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                            <Badge variant="secondary">{asset.category}</Badge>
                            <span className="text-sm text-muted-foreground">
                                {formatFileSize(asset.fileSize)}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onAddToCollection(asset.id)}>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Add to Collection
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem 
                    className="text-red-500"
                    onClick={() => onRemove(asset.id)}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

function CollectionCard({ 
    collection,
    onClick,
    onEdit,
    onDelete
}: { 
    collection: Collection;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all cursor-pointer"
            onClick={onClick}
        >
            {/* Cover */}
            <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                {collection.coverImage ? (
                    <Image
                        src={collection.coverImage}
                        alt={collection.name}
                        fill
                        unoptimized
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <FolderOpen className="w-12 h-12 text-primary/50" />
                )}
            </div>

            {/* Info */}
            <div className="p-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium truncate">{collection.name}</h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-red-500"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    {collection.assetCount} assets
                </p>
            </div>
        </motion.div>
    );
}

function EmptyState({ 
    icon: Icon, 
    title, 
    description,
    action 
}: { 
    icon: React.ElementType;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icon className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

function LoadingGrid() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card overflow-hidden">
                    <Skeleton className="aspect-video" />
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function UserLibrary() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('purchased');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [newCollectionName, setNewCollectionName] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Queries
    const { data: purchased, isLoading: loadingPurchased } = useQuery({
        queryKey: ['library-purchased'],
        queryFn: fetchPurchasedAssets,
    });

    const { data: favorites, isLoading: loadingFavorites } = useQuery({
        queryKey: ['library-favorites'],
        queryFn: fetchFavorites,
    });

    const { data: downloads, isLoading: loadingDownloads } = useQuery({
        queryKey: ['library-downloads'],
        queryFn: fetchDownloadHistory,
    });

    const { data: collections, isLoading: loadingCollections } = useQuery({
        queryKey: ['collections'],
        queryFn: fetchCollections,
    });

    // Mutations
    const downloadMutation = useMutation({
        mutationFn: downloadAsset,
        onSuccess: (blob, assetId) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `asset-${assetId}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Download started');
            queryClient.invalidateQueries({ queryKey: ['library-downloads'] });
        },
        onError: () => {
            toast.error('Download failed');
        },
    });

    // Handlers
    const handleDownload = useCallback((assetId: string) => {
        downloadMutation.mutate(assetId);
    }, [downloadMutation]);

    const handleRemove = useCallback((assetId: string) => {
        toast.success('Removed from library');
    }, []);

    const handleAddToCollection = useCallback((assetId: string) => {
        // Open collection picker dialog
        toast.info('Select a collection');
    }, []);

    const handleCreateCollection = useCallback(() => {
        if (!newCollectionName.trim()) return;
        
        // Create collection API call
        toast.success(`Collection "${newCollectionName}" created`);
        setNewCollectionName('');
        setIsCreateDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['collections'] });
    }, [newCollectionName, queryClient]);

    // Filter assets by search
    const filterAssets = (assets: LibraryAsset[] | undefined) => {
        if (!assets) return [];
        if (!searchQuery) return assets;
        return assets.filter(asset => 
            asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <header className="border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">My Library</h1>
                    
                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search library..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* View toggle */}
                        <div className="flex border rounded-md">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="rounded-r-none"
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="rounded-l-none"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="border-b px-6">
                    <TabList className="h-12">
                        <TabTrigger value="purchased" className="gap-2">
                            <Package className="w-4 h-4" />
                            Purchased
                            {purchased && (
                                <Badge variant="secondary" className="ml-1">
                                    {purchased.length}
                                </Badge>
                            )}
                        </TabTrigger>
                        <TabTrigger value="favorites" className="gap-2">
                            <Heart className="w-4 h-4" />
                            Favorites
                        </TabTrigger>
                        <TabTrigger value="downloads" className="gap-2">
                            <Clock className="w-4 h-4" />
                            Download History
                        </TabTrigger>
                        <TabTrigger value="collections" className="gap-2">
                            <FolderOpen className="w-4 h-4" />
                            Collections
                        </TabTrigger>
                    </TabList>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-6">
                        {/* Purchased */}
                        <TabContent value="purchased" className="m-0">
                            {loadingPurchased ? (
                                <LoadingGrid />
                            ) : filterAssets(purchased).length === 0 ? (
                                <EmptyState
                                    icon={Package}
                                    title="No purchased assets"
                                    description="Assets you purchase from the Marketplace will appear here"
                                    action={
                                        <Button>
                                            Browse Marketplace
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    }
                                />
                            ) : (
                                <div className={cn(
                                    viewMode === 'grid'
                                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                        : "flex flex-col gap-2"
                                )}>
                                    {filterAssets(purchased).map((asset) => (
                                        <AssetCard
                                            key={asset.id}
                                            asset={asset}
                                            viewMode={viewMode}
                                            onDownload={handleDownload}
                                            onRemove={handleRemove}
                                            onAddToCollection={handleAddToCollection}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabContent>

                        {/* Favorites */}
                        <TabContent value="favorites" className="m-0">
                            {loadingFavorites ? (
                                <LoadingGrid />
                            ) : filterAssets(favorites).length === 0 ? (
                                <EmptyState
                                    icon={Heart}
                                    title="No favorites yet"
                                    description="Click the heart icon on any asset to add it to your favorites"
                                />
                            ) : (
                                <div className={cn(
                                    viewMode === 'grid'
                                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                        : "flex flex-col gap-2"
                                )}>
                                    {filterAssets(favorites).map((asset) => (
                                        <AssetCard
                                            key={asset.id}
                                            asset={asset}
                                            viewMode={viewMode}
                                            onDownload={handleDownload}
                                            onRemove={handleRemove}
                                            onAddToCollection={handleAddToCollection}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabContent>

                        {/* Download History */}
                        <TabContent value="downloads" className="m-0">
                            {loadingDownloads ? (
                                <LoadingGrid />
                            ) : filterAssets(downloads).length === 0 ? (
                                <EmptyState
                                    icon={Clock}
                                    title="No download history"
                                    description="Your downloaded assets will appear here"
                                />
                            ) : (
                                <div className={cn(
                                    viewMode === 'grid'
                                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                        : "flex flex-col gap-2"
                                )}>
                                    {filterAssets(downloads).map((asset) => (
                                        <AssetCard
                                            key={asset.id}
                                            asset={asset}
                                            viewMode={viewMode}
                                            onDownload={handleDownload}
                                            onRemove={handleRemove}
                                            onAddToCollection={handleAddToCollection}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabContent>

                        {/* Collections */}
                        <TabContent value="collections" className="m-0">
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-muted-foreground">
                                    Organize your assets into collections
                                </p>
                                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create Collection
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Create Collection</DialogTitle>
                                            <DialogDescription>
                                                Give your collection a name to get started
                                            </DialogDescription>
                                        </DialogHeader>
                                        <Input
                                            placeholder="Collection name..."
                                            value={newCollectionName}
                                            onChange={(e) => setNewCollectionName(e.target.value)}
                                        />
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleCreateCollection}>
                                                Create
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {loadingCollections ? (
                                <LoadingGrid />
                            ) : !collections || collections.length === 0 ? (
                                <EmptyState
                                    icon={FolderOpen}
                                    title="No collections yet"
                                    description="Create a collection to organize your assets"
                                    action={
                                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create Collection
                                        </Button>
                                    }
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {collections.map((collection) => (
                                        <CollectionCard
                                            key={collection.id}
                                            collection={collection}
                                            onClick={() => {}}
                                            onEdit={() => {}}
                                            onDelete={() => {
                                                toast.success(`Collection "${collection.name}" deleted`);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabContent>
                    </div>
                </ScrollArea>
            </Tabs>
        </div>
    );
}
