'use client';

import React from 'react';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export function LoadingSpinner({ className }: { className?: string }) {
    return (
        <div className={cn('flex items-center justify-center', className)}>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    );
}

export function LoadingCard() {
    return (
        <Card>
            <CardContent className="p-6">
                <LoadingSpinner className="h-24" />
            </CardContent>
        </Card>
    );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="rounded-full bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] p-3 text-[var(--aethel-error-light)]">
                <TrendingDown className="h-4 w-4" />
            </div>
            <p className="max-w-sm text-center text-sm text-muted-foreground">{message}</p>
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                Tentar novamente
            </Button>
        </div>
    );
}

export function EmptyState({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{title}</h3>
            <p className="max-w-sm text-center text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

export function StatCard({
    title,
    value,
    change,
    icon: Icon,
    prefix = '',
    suffix = '',
}: {
    title: string;
    value: number | string;
    change: number;
    icon: React.ElementType;
    prefix?: string;
    suffix?: string;
}) {
    const isPositive = change >= 0;

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="mt-1 text-2xl font-bold">
                            {prefix}
                            {typeof value === 'number' ? value.toLocaleString() : value}
                            {suffix}
                        </p>
                        <div
                            className={cn(
                                'mt-2 flex items-center gap-1 text-sm',
                                isPositive ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-error-light)]',
                            )}
                        >
                            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            <span>{isPositive ? '+' : ''}{change}%</span>
                            <span className="text-muted-foreground">vs mes anterior</span>
                        </div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
