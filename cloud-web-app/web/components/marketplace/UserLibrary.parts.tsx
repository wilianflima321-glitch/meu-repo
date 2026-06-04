'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
    Download, FolderOpen, MoreVertical,
    Trash2, FolderPlus, Star, Check, ExternalLink, Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from '@/components/ui/context-menu';

// ============================================================================
// Types
// ============================================================================

export interface LibraryAsset {
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

export interface Collection {
    id: string;
    name: string;
    description?: string;
    assetCount: number;
    coverImage?: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

export function AssetCard({
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
                    <div
                        className="group flex animate-in fade-in slide-in-from-bottom-2 items-center gap-4 rounded-lg border bg-card p-4 transition-colors duration-150 hover:bg-accent/50"
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
                                        Atualizacao disponivel
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {asset.creator.name} - {asset.category} - {formatFileSize(asset.fileSize)}
                            </p>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 fill-yellow-400 text-[var(--aethel-warning-light)]" />
                            {asset.rating.toFixed(1)}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button type="button"
                                size="sm"
                                onClick={handleDownload}
                                disabled={isDownloading}
                            >
                                <Download className="w-4 h-4 mr-1" />
                                {isDownloading ? 'Baixando...' : 'Download'}
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
                                        Add a colecao
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Ver no Marketplace
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-[var(--aethel-error-light)]"
                                        onClick={() => onRemove(asset.id)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove da biblioteca
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => onAddToCollection(asset.id)}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Add a colecao
                    </ContextMenuItem>
                    <ContextMenuItem>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver no Marketplace
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        className="text-[var(--aethel-error-light)]"
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
                <div
                    className="group relative animate-in fade-in zoom-in-95 overflow-hidden rounded-xl border bg-card transition-all duration-150 hover:shadow-lg"
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
                                Atualizacao disponivel
                            </Badge>
                        )}

                        {/* Quick download */}
                        <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button type="button" onClick={handleDownload} disabled={isDownloading}>
                                <Download className="w-4 h-4 mr-2" />
                                {isDownloading ? 'Baixando...' : 'Download'}
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                        <h3 className="font-medium truncate">{asset.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            {asset.creator.name}
                            {asset.creator.verified && (
                                <Check className="w-3 h-3 text-[var(--aethel-info-light)]" />
                            )}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                            <Badge variant="secondary">{asset.category}</Badge>
                            <span className="text-sm text-muted-foreground">
                                {formatFileSize(asset.fileSize)}
                            </span>
                        </div>
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onAddToCollection(asset.id)}>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Add a colecao
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                    className="text-[var(--aethel-error-light)]"
                    onClick={() => onRemove(asset.id)}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export function CollectionCard({
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
        <div
            className="group relative cursor-pointer animate-in fade-in zoom-in-95 overflow-hidden rounded-xl border bg-card transition-all duration-150 hover:shadow-lg"
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
                                className="text-[var(--aethel-error-light)]"
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
        </div>
    );
}

export function EmptyState({
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

export function LoadingGrid() {
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
