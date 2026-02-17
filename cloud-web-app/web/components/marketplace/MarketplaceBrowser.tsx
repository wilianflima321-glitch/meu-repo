/**
 * AETHEL ENGINE - Marketplace Browser Component
 * 
 * Full-featured asset marketplace browser with:
 * - Grid/List views
 * - Advanced filtering & search
 * - Category navigation
 * - Asset previews
 * - Purchase flow integration
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Filter, Grid, List, Heart, Star, Download, 
    ShoppingCart, ChevronDown, X, Check, Loader2, 
    Package, Palette, Box, Music, Code, FileImage,
    Zap, Crown, Clock, TrendingUp, Tag, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/Select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabContent, TabList, TabTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface Asset {
    id: string;
    name: string;
    description: string;
    shortDescription: string;
    price: number;
    currency: string;
    category: AssetCategory;
    subcategory: string;
    tags: string[];
    images: string[];
    thumbnailUrl: string;
    previewUrl?: string;
    fileSize: number;
    version: string;
    compatibility: string[];
    license: 'standard' | 'extended' | 'exclusive';
    creator: {
        id: string;
        name: string;
        avatar: string;
        verified: boolean;
    };
    stats: {
        downloads: number;
        rating: number;
        reviewCount: number;
        favorites: number;
    };
    isFeatured: boolean;
    isNew: boolean;
    isFree: boolean;
    createdAt: string;
    updatedAt: string;
}

type AssetCategory = 
    | '3d-models' 
    | 'textures' 
    | 'materials' 
    | 'audio' 
    | 'scripts' 
    | 'animations'
    | 'particles'
    | 'shaders'
    | 'prefabs'
    | 'complete-projects';

interface FilterState {
    query: string;
    categories: AssetCategory[];
    priceRange: [number, number];
    minRating: number;
    licenses: string[];
    sortBy: 'popular' | 'newest' | 'rating' | 'price-asc' | 'price-desc';
    freeOnly: boolean;
}

interface MarketplaceResponse {
    assets: Asset[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES: { id: AssetCategory; name: string; icon: React.ReactNode }[] = [
    { id: '3d-models', name: 'Modelos 3D', icon: <Box className="w-4 h-4" /> },
    { id: 'textures', name: 'Texturas', icon: <FileImage className="w-4 h-4" /> },
    { id: 'materials', name: 'Materiais', icon: <Palette className="w-4 h-4" /> },
    { id: 'audio', name: 'Áudio', icon: <Music className="w-4 h-4" /> },
    { id: 'scripts', name: 'Scripts', icon: <Code className="w-4 h-4" /> },
    { id: 'animations', name: 'Animações', icon: <Zap className="w-4 h-4" /> },
    { id: 'particles', name: 'Partículas', icon: <Zap className="w-4 h-4" /> },
    { id: 'shaders', name: 'Shaders', icon: <Code className="w-4 h-4" /> },
    { id: 'prefabs', name: 'Prefabs', icon: <Package className="w-4 h-4" /> },
    { id: 'complete-projects', name: 'Projetos', icon: <Crown className="w-4 h-4" /> },
];

const SORT_OPTIONS = [
    { value: 'popular', label: 'Mais Populares' },
    { value: 'newest', label: 'Mais Recentes' },
    { value: 'rating', label: 'Melhor Avaliados' },
    { value: 'price-asc', label: 'Preço: Menor para Maior' },
    { value: 'price-desc', label: 'Preço: Maior para Menor' },
];

const LICENSE_OPTIONS = [
    { value: 'standard', label: 'Licença Padrão' },
    { value: 'extended', label: 'Licença Estendida' },
    { value: 'exclusive', label: 'Licença Exclusiva' },
];

// ============================================================================
// API Functions
// ============================================================================

async function fetchAssets(
    filters: FilterState, 
    page: number = 1
): Promise<MarketplaceResponse> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '24');
    
    if (filters.query) params.set('q', filters.query);
    if (filters.categories.length) params.set('categories', filters.categories.join(','));
    if (filters.freeOnly) params.set('free', 'true');
    if (filters.minRating > 0) params.set('minRating', filters.minRating.toString());
    if (filters.priceRange[0] > 0) params.set('minPrice', filters.priceRange[0].toString());
    if (filters.priceRange[1] < 1000) params.set('maxPrice', filters.priceRange[1].toString());
    if (filters.licenses.length) params.set('licenses', filters.licenses.join(','));
    params.set('sort', filters.sortBy);
    
    const response = await fetch(`/api/marketplace/assets?${params}`);
    if (!response.ok) throw new Error('Failed to fetch assets');
    return response.json();
}

async function addToFavorites(assetId: string): Promise<void> {
    const response = await fetch(`/api/marketplace/favorites/${assetId}`, {
        method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to add to favorites');
}

async function removeFromFavorites(assetId: string): Promise<void> {
    const response = await fetch(`/api/marketplace/favorites/${assetId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove from favorites');
}

async function addToCart(assetId: string): Promise<void> {
    const response = await fetch('/api/marketplace/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
    });
    if (!response.ok) throw new Error('Failed to add to cart');
}

// ============================================================================
// Sub-Components
// ============================================================================

function AssetCard({ 
    asset, 
    viewMode,
    onFavorite,
    onAddToCart,
    onSelect
}: { 
    asset: Asset; 
    viewMode: 'grid' | 'list';
    onFavorite: (id: string) => void;
    onAddToCart: (id: string) => void;
    onSelect: (asset: Asset) => void;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    };

    const formatPrice = (price: number, currency: string) => {
        if (price === 0) return 'Grátis';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency || 'BRL',
        }).format(price / 100);
    };

    if (viewMode === 'list') {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                    "flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
                    "group"
                )}
                onClick={() => onSelect(asset)}
            >
                {/* Thumbnail */}
                <div className="w-32 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <Image
                        src={asset.thumbnailUrl}
                        alt={asset.name}
                        width={128}
                        height={96}
                        unoptimized
                        className="w-full h-full object-cover"
                    />
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h3 className="font-semibold truncate">{asset.name}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                by {asset.creator.name}
                                {asset.creator.verified && (
                                    <Check className="w-3 h-3 text-blue-500" />
                                )}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className={cn(
                                "font-bold",
                                asset.isFree ? "text-green-500" : "text-foreground"
                            )}>
                                {formatPrice(asset.price, asset.currency)}
                            </p>
                        </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {asset.shortDescription}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {asset.stats.rating.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {asset.stats.downloads.toLocaleString()}
                        </span>
                        <span>{formatFileSize(asset.fileSize)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsFavorited(!isFavorited);
                            onFavorite(asset.id);
                        }}
                    >
                        <Heart className={cn("w-4 h-4", isFavorited && "fill-red-500 text-red-500")} />
                    </Button>
                    {!asset.isFree && (
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(asset.id);
                            }}
                        >
                            <ShoppingCart className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </motion.div>
        );
    }

    // Grid view
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4 }}
            className={cn(
                "group relative rounded-xl border bg-card overflow-hidden cursor-pointer",
                "hover:shadow-lg hover:border-primary/50 transition-all duration-300"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect(asset)}
        >
            {/* Thumbnail */}
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <Image
                    src={asset.thumbnailUrl}
                    alt={asset.name}
                    fill
                    unoptimized
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                    {asset.isFeatured && (
                        <Badge variant="default" className="bg-amber-500">
                            <Crown className="w-3 h-3 mr-1" /> Destaque
                        </Badge>
                    )}
                    {asset.isNew && (
                        <Badge variant="default" className="bg-green-500">
                            Novo
                        </Badge>
                    )}
                </div>

                {/* Quick actions overlay */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2"
                        >
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsFavorited(!isFavorited);
                                    onFavorite(asset.id);
                                }}
                            >
                                <Heart className={cn(
                                    "w-4 h-4 mr-1",
                                    isFavorited && "fill-red-500 text-red-500"
                                )} />
                                {isFavorited ? 'Salvo' : 'Salvar'}
                            </Button>
                            {!asset.isFree && (
                                <Button
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddToCart(asset.id);
                                    }}
                                >
                                    <ShoppingCart className="w-4 h-4 mr-1" />
                                    Adicionar
                                </Button>
                            )}
                            {asset.isFree && (
                                <Button size="sm">
                                    <Download className="w-4 h-4 mr-1" />
                                    Baixar
                                </Button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold line-clamp-1 flex-1">{asset.name}</h3>
                    <span className={cn(
                        "font-bold text-sm whitespace-nowrap",
                        asset.isFree ? "text-green-500" : "text-foreground"
                    )}>
                        {formatPrice(asset.price, asset.currency)}
                    </span>
                </div>
                
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    {asset.creator.name}
                    {asset.creator.verified && (
                        <Check className="w-3 h-3 text-blue-500" />
                    )}
                </p>

                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {asset.stats.rating.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {asset.stats.downloads >= 1000 
                                ? `${(asset.stats.downloads / 1000).toFixed(1)}k`
                                : asset.stats.downloads
                            }
                        </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {CATEGORIES.find(c => c.id === asset.category)?.name || asset.category}
                    </Badge>
                </div>
            </div>
        </motion.div>
    );
}

function FilterSidebar({ 
    filters, 
    onChange 
}: { 
    filters: FilterState; 
    onChange: (filters: FilterState) => void;
}) {
    const toggleCategory = (category: AssetCategory) => {
        const newCategories = filters.categories.includes(category)
            ? filters.categories.filter(c => c !== category)
            : [...filters.categories, category];
        onChange({ ...filters, categories: newCategories });
    };

    const toggleLicense = (license: string) => {
        const newLicenses = filters.licenses.includes(license)
            ? filters.licenses.filter(l => l !== license)
            : [...filters.licenses, license];
        onChange({ ...filters, licenses: newLicenses });
    };

    return (
        <div className="w-64 flex-shrink-0 space-y-6">
            {/* Categories */}
            <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Categorias
                </h4>
                <div className="space-y-2">
                    {CATEGORIES.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => toggleCategory(category.id)}
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                "hover:bg-accent",
                                filters.categories.includes(category.id) 
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground"
                            )}
                        >
                            {category.icon}
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Faixa de Preço
                </h4>
                <div className="px-2">
                    <Slider
                        value={filters.priceRange}
                        min={0}
                        max={1000}
                        step={10}
                        onValueChange={(value) => 
                            onChange({ ...filters, priceRange: value as [number, number] })
                        }
                    />
                    <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                        <span>R$ {filters.priceRange[0]}</span>
                        <span>R$ {filters.priceRange[1]}+</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                    <Checkbox
                        id="free-only"
                        checked={filters.freeOnly}
                        onCheckedChange={(checked) => 
                            onChange({ ...filters, freeOnly: !!checked })
                        }
                    />
                    <label htmlFor="free-only" className="text-sm cursor-pointer">
                        Apenas assets grátis
                    </label>
                </div>
            </div>

            {/* Rating */}
            <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Avaliação Mínima
                </h4>
                <div className="flex gap-1">
                    {[0, 1, 2, 3, 4, 5].map((rating) => (
                        <button
                            key={rating}
                            onClick={() => onChange({ ...filters, minRating: rating })}
                            className={cn(
                                "p-2 rounded-md transition-colors",
                                filters.minRating === rating
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-accent"
                            )}
                        >
                            {rating === 0 ? 'Todas' : `${rating}+`}
                        </button>
                    ))}
                </div>
            </div>

            {/* License */}
            <div>
                <h4 className="font-semibold mb-3">Tipo de Licença</h4>
                <div className="space-y-2">
                    {LICENSE_OPTIONS.map((license) => (
                        <div key={license.value} className="flex items-center gap-2">
                            <Checkbox
                                id={license.value}
                                checked={filters.licenses.includes(license.value)}
                                onCheckedChange={() => toggleLicense(license.value)}
                            />
                            <label 
                                htmlFor={license.value} 
                                className="text-sm cursor-pointer"
                            >
                                {license.label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Clear Filters */}
            <Button
                variant="outline"
                className="w-full"
                onClick={() => onChange({
                    query: '',
                    categories: [],
                    priceRange: [0, 1000],
                    minRating: 0,
                    licenses: [],
                    sortBy: 'popular',
                    freeOnly: false,
                })}
            >
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
            </Button>
        </div>
    );
}

function AssetGridSkeleton({ count = 12 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card overflow-hidden">
                    <Skeleton className="aspect-[4/3]" />
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MarketplaceBrowser() {
    const queryClient = useQueryClient();
    
    const [filters, setFilters] = useState<FilterState>({
        query: '',
        categories: [],
        priceRange: [0, 1000],
        minRating: 0,
        licenses: [],
        sortBy: 'popular',
        freeOnly: false,
    });
    
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [showFilters, setShowFilters] = useState(true);
    const [page, setPage] = useState(1);

    // Queries
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['marketplace', filters, page],
        queryFn: () => fetchAssets(filters, page),
        staleTime: 60000, // 1 minute
    });

    // Mutations
    const favoriteMutation = useMutation({
        mutationFn: addToFavorites,
        onSuccess: () => {
            toast.success('Adicionado aos favoritos');
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
        onError: () => {
            toast.error('Falha ao adicionar aos favoritos');
        },
    });

    const cartMutation = useMutation({
        mutationFn: addToCart,
        onSuccess: () => {
            toast.success('Adicionado ao carrinho');
            queryClient.invalidateQueries({ queryKey: ['cart'] });
        },
        onError: () => {
            toast.error('Falha ao adicionar ao carrinho');
        },
    });

    // Handlers
    const handleSearch = useCallback((query: string) => {
        setFilters(prev => ({ ...prev, query }));
        setPage(1);
    }, []);

    const handleFilterChange = useCallback((newFilters: FilterState) => {
        setFilters(newFilters);
        setPage(1);
    }, []);

    const handleFavorite = useCallback((assetId: string) => {
        favoriteMutation.mutate(assetId);
    }, [favoriteMutation]);

    const handleAddToCart = useCallback((assetId: string) => {
        cartMutation.mutate(assetId);
    }, [cartMutation]);

    // Active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.query) count++;
        if (filters.categories.length) count++;
        if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) count++;
        if (filters.minRating > 0) count++;
        if (filters.licenses.length) count++;
        if (filters.freeOnly) count++;
        return count;
    }, [filters]);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <header className="border-b px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold">Marketplace</h1>
                    
                    {/* Search */}
                    <div className="flex-1 max-w-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar assets..."
                                className="pl-10"
                                value={filters.query}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* View controls */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filtros
                            {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>

                        <div className="w-44">
                            <Select
                                options={SORT_OPTIONS.map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                }))}
                                value={filters.sortBy}
                                onChange={(value) =>
                                    handleFilterChange({
                                        ...filters,
                                        sortBy: value as FilterState['sortBy'],
                                    })
                                }
                                placeholder="Ordenar por"
                                size="sm"
                                fullWidth
                            />
                        </div>

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

                {/* Quick filters */}
                <Tabs defaultValue="all" className="mt-4">
                    <TabList>
                        <TabTrigger value="all">Todos</TabTrigger>
                        <TabTrigger value="featured">
                            <Crown className="w-3 h-3 mr-1" />
                            Destaques
                        </TabTrigger>
                        <TabTrigger value="popular">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Populares
                        </TabTrigger>
                        <TabTrigger value="new">
                            <Clock className="w-3 h-3 mr-1" />
                            Novos
                        </TabTrigger>
                        <TabTrigger value="free">
                            <Download className="w-3 h-3 mr-1" />
                            Grátis
                        </TabTrigger>
                    </TabList>
                </Tabs>
            </header>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 256, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="border-r overflow-hidden"
                        >
                            <ScrollArea className="h-full p-4">
                                <FilterSidebar
                                    filters={filters}
                                    onChange={handleFilterChange}
                                />
                            </ScrollArea>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Asset grid */}
                <main className="flex-1 overflow-auto">
                    <ScrollArea className="h-full">
                        <div className="p-6">
                            {/* Results info */}
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-muted-foreground">
                                    {data?.total 
                                        ? `${data.total.toLocaleString()} assets encontrados`
                                        : 'Carregando...'}
                                </p>
                            </div>

                            {/* Loading state */}
                            {isLoading && <AssetGridSkeleton />}

                            {/* Error state */}
                            {isError && (
                                <div className="text-center py-12">
                                    <p className="text-muted-foreground mb-4">
                                        Falha ao carregar assets
                                    </p>
                                    <Button onClick={() => refetch()}>
                                        Tentar Novamente
                                    </Button>
                                </div>
                            )}

                            {/* Empty state */}
                            {!isLoading && !isError && data?.assets.length === 0 && (
                                <div className="text-center py-12">
                                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Nenhum asset encontrado</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Tente ajustar seus filtros ou termos de busca
                                    </p>
                                    <Button 
                                        variant="outline"
                                        onClick={() => handleFilterChange({
                                            query: '',
                                            categories: [],
                                            priceRange: [0, 1000],
                                            minRating: 0,
                                            licenses: [],
                                            sortBy: 'popular',
                                            freeOnly: false,
                                        })}
                                    >
                                        Limpar Filtros
                                    </Button>
                                </div>
                            )}

                            {/* Assets */}
                            {!isLoading && !isError && data && data.assets.length > 0 && (
                                <>
                                    <div className={cn(
                                        viewMode === 'grid'
                                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                            : "flex flex-col gap-3"
                                    )}>
                                        <AnimatePresence mode="popLayout">
                                            {data.assets.map((asset) => (
                                                <AssetCard
                                                    key={asset.id}
                                                    asset={asset}
                                                    viewMode={viewMode}
                                                    onFavorite={handleFavorite}
                                                    onAddToCart={handleAddToCart}
                                                    onSelect={setSelectedAsset}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    {/* Pagination */}
                                    {data.hasMore && (
                                        <div className="flex justify-center mt-8">
                                            <Button
                                                variant="outline"
                                                onClick={() => setPage(p => p + 1)}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : null}
                                                Carregar Mais
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </ScrollArea>
                </main>
            </div>
        </div>
    );
}
