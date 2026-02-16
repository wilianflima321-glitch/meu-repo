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

'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
    OrbitControls, 
    Environment, 
    useGLTF, 
    PresentationControls,
    Stage,
    Html,
    useProgress
} from '@react-three/drei';
import { 
    Star, Download, Heart, ShoppingCart, Share2, Flag,
    ChevronLeft, ChevronRight, Check, ExternalLink, 
    User, Calendar, FileText, Box, Palette, Tag,
    MessageSquare, ThumbsUp, Shield, Loader2, Play, Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabContent, TabList, TabTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Textarea } from '@/components/ui/Textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

interface AssetDetail {
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
        favorites: number;
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

interface Review {
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

// ============================================================================
// 3D Preview Components
// ============================================================================

function Loader() {
    const { progress } = useProgress();
    return (
        <Html center>
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                    Loading {progress.toFixed(0)}%
                </span>
            </div>
        </Html>
    );
}

function Model({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    const ref = useRef<THREE.Group>(null);
    
    useEffect(() => {
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        scene.scale.setScalar(scale);
        
        const center = box.getCenter(new THREE.Vector3());
        scene.position.sub(center.multiplyScalar(scale));
    }, [scene]);

    return <primitive ref={ref} object={scene} />;
}

function ModelPreview({ modelUrl }: { modelUrl: string }) {
    const [autoRotate, setAutoRotate] = useState(true);

    return (
        <div className="relative w-full h-full min-h-[400px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg overflow-hidden">
            <Canvas 
                camera={{ position: [0, 0, 5], fov: 50 }}
                shadows
            >
                <Suspense fallback={<Loader />}>
                    <Stage environment="city" intensity={0.5}>
                        <Model url={modelUrl} />
                    </Stage>
                    <OrbitControls 
                        autoRotate={autoRotate}
                        autoRotateSpeed={2}
                        enablePan={false}
                        minDistance={2}
                        maxDistance={10}
                    />
                </Suspense>
            </Canvas>

            {/* Controls overlay */}
            <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setAutoRotate(!autoRotate)}
                >
                    {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
}

// ============================================================================
// Sub-Components
// ============================================================================

function ImageGallery({ images }: { images: string[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <div className="space-y-4">
            {/* Main image */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <Image
                    src={images[currentIndex]}
                    alt={`Preview ${currentIndex + 1}`}
                    fill
                    unoptimized
                    className="w-full h-full object-cover"
                />
                
                {/* Navigation arrows */}
                {images.length > 1 && (
                    <>
                        <Button
                            size="icon"
                            variant="secondary"
                            className="absolute left-2 top-1/2 -translate-y-1/2"
                            onClick={() => setCurrentIndex(i => 
                                i === 0 ? images.length - 1 : i - 1
                            )}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="secondary"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => setCurrentIndex(i => 
                                i === images.length - 1 ? 0 : i + 1
                            )}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((image, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={cn(
                                "flex-shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 transition-colors",
                                currentIndex === index 
                                    ? "border-primary" 
                                    : "border-transparent hover:border-muted-foreground/50"
                            )}
                        >
                            <Image
                                src={image}
                                alt={`Thumbnail ${index + 1}`}
                                width={80}
                                height={56}
                                unoptimized
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function RatingStars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
    const sizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={cn(
                        sizes[size],
                        star <= Math.round(rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                    )}
                />
            ))}
        </div>
    );
}

function ReviewCard({ review }: { review: Review }) {
    const [isHelpful, setIsHelpful] = useState(false);

    return (
        <div className="p-4 border rounded-lg">
            <div className="flex items-start gap-4">
                <Avatar>
                    <AvatarImage src={review.user.avatar} />
                    <AvatarFallback>
                        {review.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{review.user.name}</span>
                        {review.verified && (
                            <Badge variant="secondary" className="text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Verified Purchase
                            </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                        <RatingStars rating={review.rating} size="sm" />
                        <span className="font-medium">{review.title}</span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-2">
                        {review.content}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsHelpful(!isHelpful)}
                            className={cn(isHelpful && "text-primary")}
                        >
                            <ThumbsUp className="w-4 h-4 mr-1" />
                            Helpful ({review.helpful + (isHelpful ? 1 : 0)})
                        </Button>
                        <Button variant="ghost" size="sm">
                            <Flag className="w-4 h-4 mr-1" />
                            Report
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RatingBreakdown({ stats }: { stats: { [key: number]: number } }) {
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    
    return (
        <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
                const count = stats[star] || 0;
                const percentage = total > 0 ? (count / total) * 100 : 0;
                
                return (
                    <div key={star} className="flex items-center gap-2">
                        <span className="w-8 text-sm text-muted-foreground">
                            {star} ★
                        </span>
                        <Progress value={percentage} className="flex-1 h-2" />
                        <span className="w-12 text-sm text-muted-foreground text-right">
                            {count}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

interface AssetDetailPanelProps {
    assetId: string;
    onClose: () => void;
}

export default function AssetDetailPanel({ assetId, onClose }: AssetDetailPanelProps) {
    const queryClient = useQueryClient();
    const [isFavorited, setIsFavorited] = useState(false);
    const [reviewText, setReviewText] = useState('');
    const [userRating, setUserRating] = useState(0);

    // Fetch asset details
    const { data: asset, isLoading } = useQuery<AssetDetail>({
        queryKey: ['asset', assetId],
        queryFn: async () => {
            const res = await fetch(`/api/marketplace/assets/${assetId}`);
            if (!res.ok) throw new Error('Failed to fetch asset');
            return res.json();
        },
    });

    // Fetch reviews
    const { data: reviews } = useQuery<Review[]>({
        queryKey: ['asset-reviews', assetId],
        queryFn: async () => {
            const res = await fetch(`/api/marketplace/assets/${assetId}/reviews`);
            if (!res.ok) throw new Error('Failed to fetch reviews');
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
            toast.error('Failed to start checkout');
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
            toast.success('Download started');
        },
        onError: () => {
            toast.error('Download failed');
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
            toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
        },
    });

    // Format helpers
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    };

    const formatPrice = (price: number, currency: string) => {
        if (price === 0) return 'Free';
        return new Intl.NumberFormat('en-US', {
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
                <p className="text-muted-foreground">Asset not found</p>
                <Button variant="outline" className="mt-4" onClick={onClose}>
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b">
                <Button variant="ghost" onClick={onClose}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Marketplace
                </Button>
                
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => favoriteMutation.mutate()}
                    >
                        <Heart className={cn(
                            "w-4 h-4",
                            isFavorited && "fill-red-500 text-red-500"
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
                            {/* 3D Preview or Image Gallery */}
                            {asset.modelUrl ? (
                                <Tabs defaultValue="3d">
                                    <TabList>
                                        <TabTrigger value="3d">3D Preview</TabTrigger>
                                        <TabTrigger value="images">Images</TabTrigger>
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

                            {/* Technical Details */}
                            <div>
                                <h2 className="text-lg font-semibold mb-4">Technical Details</h2>
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
                                    <h3 className="font-medium mb-3">Included Files</h3>
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
                                        Reviews ({asset.stats.reviewCount})
                                    </h2>
                                    <Button variant="outline" size="sm">
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Write a Review
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
                                            {asset.stats.reviewCount} reviews
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
                                        <Button 
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
                                        <Button 
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
                                            Get for Free
                                        </Button>
                                    ) : (
                                        <div className="space-y-2">
                                            <Button 
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
                                                Buy Now
                                            </Button>
                                            <Button variant="outline" className="w-full" size="lg">
                                                <ShoppingCart className="w-4 h-4 mr-2" />
                                                Add to Cart
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
                                            <span>{asset.stats.favorites.toLocaleString()} favorites</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span>Updated {new Date(asset.updatedAt).toLocaleDateString()}</span>
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
                                                    <Check className="w-4 h-4 text-blue-500" />
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {asset.creator.assetCount} assets
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            View Profile
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

                                {/* Report */}
                                <Button variant="ghost" className="w-full text-muted-foreground">
                                    <Flag className="w-4 h-4 mr-2" />
                                    Report this asset
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
