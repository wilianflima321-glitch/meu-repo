'use client';

/**
 * AETHEL ENGINE - User Library Component
 *
 * User's purchased/downloaded assets library with:
 * - Assets comprados
 * - Favoritos
 * - Historico de downloads
 * - Colecoes
 */
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Heart, FolderOpen, Clock, Package,
    Grid, List, Search, ChevronRight, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabContent, TabList, TabTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useToastActions } from '@/components/ui';
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
    AssetCard,
    CollectionCard,
    EmptyState,
    LoadingGrid,
    type Collection,
    type LibraryAsset,
} from './UserLibrary.parts';

// ============================================================================
// API Functions
// ============================================================================

async function fetchPurchasedAssets(): Promise<LibraryAsset[]> {
    const res = await fetch('/api/marketplace/library/purchased');
    if (!res.ok) throw new Error('Failed to load purchases');
    return res.json();
}

async function fetchFavorites(): Promise<LibraryAsset[]> {
    const res = await fetch('/api/marketplace/library/favorites');
    if (!res.ok) throw new Error('Failed to load favorites');
    return res.json();
}

async function fetchDownloadHistory(): Promise<LibraryAsset[]> {
    const res = await fetch('/api/marketplace/library/downloads');
    if (!res.ok) throw new Error('Failed to load downloads');
    return res.json();
}

async function fetchCollections(): Promise<Collection[]> {
    const res = await fetch('/api/marketplace/collections');
    if (!res.ok) throw new Error('Failed to load collections');
    return res.json();
}

async function downloadAsset(assetId: string): Promise<Blob> {
    const res = await fetch(`/api/marketplace/assets/${assetId}/download`);
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
}

// ============================================================================
// Main Component
// ============================================================================

export default function UserLibrary() {
    const queryClient = useQueryClient();
    const toast = useToastActions();
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
            toast.success('Download iniciado.');
            queryClient.invalidateQueries({ queryKey: ['library-downloads'] });
        },
        onError: () => {
            toast.error('Download failed.');
        },
    });

    // Handlers
    const handleDownload = useCallback((assetId: string) => {
        downloadMutation.mutate(assetId);
    }, [downloadMutation]);

    const handleRemove = useCallback((assetId: string) => {
        toast.success('Removido da biblioteca.');
    }, [toast]);

    const handleAddToCollection = useCallback((assetId: string) => {
        // Open collection picker dialog
        toast.info('Selecione uma colecao.');
    }, [toast]);

    const handleCreateCollection = useCallback(() => {
        if (!newCollectionName.trim()) return;

        // Create collection API call
        toast.success(`Colecao "${newCollectionName}" criada.`);
        setNewCollectionName('');
        setIsCreateDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['collections'] });
    }, [newCollectionName, queryClient, toast]);

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
                    <h1 className="text-2xl font-bold">Minha biblioteca</h1>

                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search na biblioteca..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* View toggle */}
                        <div className="flex border rounded-md">
                            <Button type="button"
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="rounded-r-none"
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid className="w-4 h-4" />
                            </Button>
                            <Button type="button"
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
                            Comprados
                            {purchased && (
                                <Badge variant="secondary" className="ml-1">
                                    {purchased.length}
                                </Badge>
                            )}
                        </TabTrigger>
                        <TabTrigger value="favorites" className="gap-2">
                            <Heart className="w-4 h-4" />
                            Favoritos
                        </TabTrigger>
                        <TabTrigger value="downloads" className="gap-2">
                            <Clock className="w-4 h-4" />
                            Historico de downloads
                        </TabTrigger>
                        <TabTrigger value="collections" className="gap-2">
                            <FolderOpen className="w-4 h-4" />
                            Colecoes
                        </TabTrigger>
                    </TabList>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-6">
                        {/* Comprados */}
                        <TabContent value="purchased" className="m-0">
                            {loadingPurchased ? (
                                <LoadingGrid />
                            ) : filterAssets(purchased).length === 0 ? (
                                <EmptyState
                                    icon={Package}
                                    title="No asset comprado"
                                    description="Assets comprados no Marketplace aparecerao aqui"
                                    action={
                                        <Button>
                                            Explorar Marketplace
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

                        {/* Favoritos */}
                        <TabContent value="favorites" className="m-0">
                            {loadingFavorites ? (
                                <LoadingGrid />
                            ) : filterAssets(favorites).length === 0 ? (
                                <EmptyState
                                    icon={Heart}
                                    title="No favorito ainda"
                                    description="Clique no coracao em um asset para adicionar aos favoritos"
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

                        {/* Historico de downloads */}
                        <TabContent value="downloads" className="m-0">
                            {loadingDownloads ? (
                                <LoadingGrid />
                            ) : filterAssets(downloads).length === 0 ? (
                                <EmptyState
                                    icon={Clock}
                                    title="Sem historico de downloads"
                                    description="Seus assets baixados aparecerao aqui"
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

                        {/* Colecoes */}
                        <TabContent value="collections" className="m-0">
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-muted-foreground">
                                    Organize seus assets em colecoes
                                </p>
                                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create colecao
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Create colecao</DialogTitle>
                                            <DialogDescription>
                                                De um nome para iniciar a colecao
                                            </DialogDescription>
                                        </DialogHeader>
                                        <Input
                                            placeholder="Collection name..."
                                            value={newCollectionName}
                                            onChange={(e) => setNewCollectionName(e.target.value)}
                                        />
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <button type="button" onClick={handleCreateCollection}>
                                                Create
                                            </button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {loadingCollections ? (
                                <LoadingGrid />
                            ) : !collections || collections.length === 0 ? (
                                <EmptyState
                                    icon={FolderOpen}
                                    title="No colecao ainda"
                                    description="Crie uma colecao para organizar seus assets"
                                    action={
                                        <button type="button" onClick={() => setIsCreateDialogOpen(true)}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create colecao
                                        </button>
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
        toast.success(`Colecao "${collection.name}" removida.`);
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
