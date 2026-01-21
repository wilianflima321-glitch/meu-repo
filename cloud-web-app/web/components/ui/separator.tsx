'use client';

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Separator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('my-2 h-px w-full bg-slate-700', className)} {...props} />;
}

export default Separator;
