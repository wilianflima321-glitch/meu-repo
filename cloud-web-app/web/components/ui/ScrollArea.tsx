'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
  scrollbarSize?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = 'vertical', scrollbarSize = 'sm', children, ...props }, ref) => {
    const scrollbarSizeClasses = {
      sm: 'scrollbar-thin',
      md: 'scrollbar',
      lg: 'scrollbar-thick',
    };

    const orientationClasses = {
      vertical: 'overflow-y-auto overflow-x-hidden',
      horizontal: 'overflow-x-auto overflow-y-hidden',
      both: 'overflow-auto',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          orientationClasses[orientation],
          scrollbarSizeClasses[scrollbarSize],
          'scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

export default ScrollArea;
