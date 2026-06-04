'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Check, ChevronLeft, ChevronRight, Flag, Star, ThumbsUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Review } from './AssetDetailPanel.types';

export function ImageGallery({ images }: { images: string[] }) {
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
                        <Button type="button"
                            size="icon"
                            variant="secondary"
                            className="absolute left-2 top-1/2 -translate-y-1/2"
                            onClick={() => setCurrentIndex(i =>
                                i === 0 ? images.length - 1 : i - 1
                            )}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button type="button"
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
                        <button type="button" aria-label={`Select image ${index + 1} do asset`}
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

export function RatingStars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
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
                            ? "fill-yellow-400 text-[var(--aethel-warning-light)]"
                            : "text-muted-foreground"
                    )}
                />
            ))}
        </div>
    );
}

export function ReviewCard({ review }: { review: Review }) {
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
                                Compra verificada
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
                        <Button type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsHelpful(!isHelpful)}
                            className={cn(isHelpful && "text-primary")}
                        >
                            <ThumbsUp className="w-4 h-4 mr-1" />
                            Util ({review.helpful + (isHelpful ? 1 : 0)})
                        </Button>
                        <Button variant="ghost" size="sm">
                            <Flag className="w-4 h-4 mr-1" />
                            Denunciar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function RatingBreakdown({ stats }: { stats: { [key: number]: number } }) {
    const total = Object.values(stats).reduce((a, b) => a + b, 0);

    return (
        <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
                const count = stats[star] || 0;
                const percentage = total > 0 ? (count / total) * 100 : 0;

                return (
                    <div key={star} className="flex items-center gap-2">
                        <span className="w-8 text-sm text-muted-foreground">
                            {star} *
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
