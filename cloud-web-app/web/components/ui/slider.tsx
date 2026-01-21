'use client';

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps extends HTMLAttributes<HTMLInputElement> {
  value?: number | number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  orientation?: 'horizontal' | 'vertical';
}

export function Slider({
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  className,
  ...props
}: SliderProps) {
  const numericValue = Array.isArray(value) ? (value[0] ?? 0) : value;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={numericValue}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={cn('w-full accent-indigo-500', className)}
      {...props}
    />
  );
}

export default Slider;
