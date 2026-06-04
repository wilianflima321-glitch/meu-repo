'use client';

/**
 * AETHEL ENGINE - Asset Detail Panel
 *
 * Full asset detail view with:
 * - 3D preview
 * - Image gallery
 * - Purchase flow
 * - Reviews section
 * - Related assets
 */
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Download, Heart, ShoppingCart, Share2, Flag,
    ChevronLeft, Check, ExternalLink,
    Calendar, FileText, Box, Tag,
    MessageSquare, Shield, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabContent, TabList, TabTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { useToastActions } from '@/components/ui';
import type { AssetDetail, AssetDetailPanelProps, Review } from './AssetDetailPanel.types';
import { ImageGallery, RatingBreakdown, RatingStars, ReviewCard } from './AssetDetailPanel.parts';
export type { AssetDetail, AssetDetailPanelProps, Review } from './AssetDetailPanel.types';

// ============================================================================
// Async 3D Preview Boundary
// ============================================================================

const ModelPreview = dynamic(() => import('./AssetModelPreview'), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-muted">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    ),
});

// ============================================================================
// Main Component
// ============================================================================

export default function AssetDetailPanel({ assetId, onClose }: AssetDetailPanelProps) {
    const queryClient = useQueryClient();
    const [isFavorited, setIsFavorited] = useState(false);
    const toast = useToastActions();

    // Fetch asset details
    const { data: asset, isLoading } = useQuery<AssetDetail>({
        queryKey: ['asset', assetId],
        queryFn: async () => {
            const res = await fetch(`/api/marketplace/assets/${assetId}`);
            if (!res.ok) throw new Error('Failed to load asset');
            return res.json();
        },
    });

    // Fetch avaliacoes
    const { data: reviews } = useQuery<Review[]>({
        queryKey: ['asset-reviews', assetId],
        queryFn: async () => {
            const res = await fetch(`/api/marketplace/assets/${assetId}/reviews`);
            if (!res.ok) throw new Error('Failed to load reviews');
            return res.json();
        },
    });

    // Purchase mutation
    const purchaseMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/marketplace/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId }),
            });
            if (!res.ok) throw new Error('Checkout failed');
            return res.json();
        },
        onSuccess: (data) => {
            // Redirect to Stripe checkout
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
        },
        onError: () => {
            toast.error('Failed to start checkout.');
        },
    });

    // Download mutation
    const downloadMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/marketplace/assets/${assetId}/download`);
            if (!res.ok) throw new Error('Download failed');
            return res.blob();
        },
        onSuccess: (blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${asset?.name || 'asset'}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Download iniciado.');
        },
        onError: () => {
            toast.error('Download failed.');
        },
    });

    // Favorite mutation
    const favoriteMutation = useMutation({
        mutationFn: async () => {
            const method = isFavorited ? 'DELETE' : 'POST';
            const res = await fetch(`/api/marketplace/favorites/${assetId}`, { method });
            if (!res.ok) throw new Error('Failed to update favorites');
        },
        onSuccess: () => {
            setIsFavorited(!isFavorited);
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
            toast.success(isFavorited ? 'Removido dos favoritos.' : 'Adicionado aos favoritos.');
        },
    });

    // Format helpers
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    };

    const formatPrice = (price: number, currency: string) => {
        if (price === 0) return 'Gratis';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency || 'USD',
        }).format(price / 100);
    };

    useEffect(() => {
        if (asset) {
            setIsFavorited(asset.isFavorited);
        }
    }, [asset]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-muted-foreground">Asset nao encontrado</p>
                <Button type="button" variant="outline" className="mt-4" onClick={onClose}>
                    Back
                </Button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b">
                <Button type="button" variant="ghost" onClick={onClose}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back ao Marketplace
                </Button>

                <div className="flex items-center gap-2">
                    <Button type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => favoriteMutation.mutate()}
                    >
                        <Heart className={cn(
                            "w-4 h-4",
                            isFavorited && "fill-red-500 text-[var(--aethel-error-light)]"
                        )} />
                    </Button>
                    <Button variant="outline" size="icon">
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            <ScrollArea className="flex-1">
                <div className="p-6 max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-5 gap-8">
                        {/* Left column - Preview */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Preview 3D or Image Gallery */}
                            {asset.modelUrl ? (
                                <Tabs defaultValue="3d">
                                    <TabList>
                                        <TabTrigger value="3d">Preview 3D</TabTrigger>
                                        <TabTrigger value="images">Imagens</TabTrigger>
                                    </TabList>
                                    <TabContent value="3d" className="mt-4">
                                        <ModelPreview modelUrl={asset.modelUrl} />
                                    </TabContent>
                                    <TabContent value="images" className="mt-4">
                                        <ImageGallery images={asset.images} />
                                    </TabContent>
                                </Tabs>
                            ) : (
                                <ImageGallery images={asset.images} />
                            )}

                            {/* Description */}
                            <div>
                                <h2 className="text-lg font-semibold mb-4">Description</h2>
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: asset.description }}
                                />
                            </div>

                            {/* Technical details */}
                            <div>
                                <h2 className="text-lg font-semibold mb-4">Technical details</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <Box className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            <span className="text-muted-foreground">Category:</span>{' '}
                                            {asset.category}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            <span className="text-muted-foreground">Size:</span>{' '}
                                            {formatFileSize(asset.fileSize)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            <span className="text-muted-foreground">Version:</span>{' '}
                                            {asset.version}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            <span className="text-muted-foreground">License:</span>{' '}
                                            {asset.license.charAt(0).toUpperCase() + asset.license.slice(1)}
                                        </span>
                                    </div>
                                </div>

                                {/* Included files */}
                                <div className="mt-6">
                                    <h3 className="font-medium mb-3">Included files</h3>
                                    <div className="space-y-2">
                                        {asset.files.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between px-3 py-2 bg-muted rounded-md text-sm"
                                            >
                                                <span>{file.name}</span>
                                                <span className="text-muted-foreground">
                                                    {formatFileSize(file.size)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Compatibility */}
                                <div className="mt-6">
                                    <h3 className="font-medium mb-3">Compatibility</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {asset.compatibility.map((item) => (
                                            <Badge key={item} variant="secondary">
                                                {item}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Reviews */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold">
                                        Avaliacoes ({asset.stats.reviewCount})
                                    </h2>
                                    <Button variant="outline" size="sm">
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Escrever avaliacao
                                    </Button>
                                </div>

                                {/* Rating summary */}
                                <div className="flex gap-8 p-4 bg-muted rounded-lg mb-6">
                                    <div className="text-center">
                                        <div className="text-4xl font-bold">
                                            {asset.stats.rating.toFixed(1)}
                                        </div>
                                        <RatingStars rating={asset.stats.rating} />
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {asset.stats.reviewCount} avaliacoes
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <RatingBreakdown
                                            stats={{ 5: 45, 4: 20, 3: 8, 2: 3, 1: 2 }}
                                        />
                                    </div>
                                </div>

                                {/* Review list */}
                                <div className="space-y-4">
                                    {reviews?.map((review) => (
                                        <ReviewCard key={review.id} review={review} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right column - Purchase */}
                        <div className="lg:col-span-2">
                            <div className="sticky top-6 space-y-6">
                                {/* Main info card */}
                                <div className="p-6 border rounded-lg bg-card">
                                    <h1 className="text-2xl font-bold mb-2">{asset.name}</h1>

                                    <div className="flex items-center gap-2 mb-4">
                                        <RatingStars rating={asset.stats.rating} />
                                        <span className="text-sm text-muted-foreground">
                                            ({asset.stats.reviewCount})
                                        </span>
                                    </div>

                                    {/* Price */}
                                    <div className="text-3xl font-bold mb-6">
                                        {formatPrice(asset.price, asset.currency)}
                                    </div>

                                    {/* Action buttons */}
                                    {asset.isOwned ? (
                                        <Button type="button"
                                            className="w-full"
                                            size="lg"
                                            onClick={() => downloadMutation.mutate()}
                                            disabled={downloadMutation.isPending}
                                        >
                                            {downloadMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4 mr-2" />
                                            )}
                                            Download
                                        </Button>
                                    ) : asset.price === 0 ? (
                                        <Button type="button"
                                            className="w-full"
                                            size="lg"
                                            onClick={() => downloadMutation.mutate()}
                                            disabled={downloadMutation.isPending}
                                        >
                                            {downloadMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4 mr-2" />
                                            )}
                                            Download gratis
                                        </Button>
                                    ) : (
                                        <div className="space-y-2">
                                            <Button type="button"
                                                className="w-full"
                                                size="lg"
                                                onClick={() => purchaseMutation.mutate()}
                                                disabled={purchaseMutation.isPending}
                                            >
                                                {purchaseMutation.isPending ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                                )}
                                                Buy now
                                            </Button>
                                            <Button variant="outline" className="w-full" size="lg">
                                                <ShoppingCart className="w-4 h-4 mr-2" />
                                                Add ao carrinho
                                            </Button>
                                        </div>
                                    )}

                                    <Separator className="my-6" />

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Download className="w-4 h-4 text-muted-foreground" />
                                            <span>{asset.stats.downloads.toLocaleString()} downloads</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Heart className="w-4 h-4 text-muted-foreground" />
                                            <span>{asset.stats.favoritos.toLocaleString()} favoritos</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span>Atualizado em {new Date(asset.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Creator card */}
                                <div className="p-4 border rounded-lg bg-card">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={asset.creator.avatar} />
                                            <AvatarFallback>
                                                {asset.creator.name.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{asset.creator.name}</span>
                                                {asset.creator.verified && (
                                                    <Check className="w-4 h-4 text-[var(--aethel-info-light)]" />
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {asset.creator.assetCount} assets
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Ver perfil
                                        </Button>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="p-4 border rounded-lg bg-card">
                                    <h3 className="font-medium mb-3">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {asset.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Denunciar */}
                                <Button variant="ghost" className="w-full text-muted-foreground">
                                    <Flag className="w-4 h-4 mr-2" />
                                    Denunciar este asset
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}

