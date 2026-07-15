'use client';

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  indicatorClassName?: string;
}

export function Progress({ value = 0, className, indicatorClassName, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn('h-2 w-full rounded-full bg-[var(--aethel-surface-secondary)]', className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full bg-[var(--aethel-info)] transition-all', indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export default Progress;
