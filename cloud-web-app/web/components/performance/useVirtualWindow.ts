'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject, UIEventHandler } from 'react';
import { computeVirtualWindow } from '@/lib/ui/virtual-window';

interface UseVirtualWindowOptions {
  itemCount: number;
  itemSize: number;
  overscan?: number;
  estimatedViewportSize?: number;
}

interface VirtualItem {
  index: number;
  offset: number;
}

export interface UseVirtualWindowResult {
  containerRef: RefObject<HTMLDivElement>;
  onScroll: UIEventHandler<HTMLDivElement>;
  virtualItems: VirtualItem[];
  startIndex: number;
  endIndex: number;
  totalSize: number;
  viewportSize: number;
  viewportWidth: number;
}

export function useVirtualWindow({
  itemCount,
  itemSize,
  overscan = 8,
  estimatedViewportSize = 480,
}: UseVirtualWindowOptions): UseVirtualWindowResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportSize, setViewportSize] = useState(estimatedViewportSize);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateViewport = () => {
      setViewportSize(element.clientHeight || estimatedViewportSize);
      setViewportWidth(element.clientWidth);
    };

    updateViewport();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateViewport);
      return () => window.removeEventListener('resize', updateViewport);
    }

    const observer = new ResizeObserver(updateViewport);
    observer.observe(element);
    return () => observer.disconnect();
  }, [estimatedViewportSize]);

  const onScroll = useCallback<UIEventHandler<HTMLDivElement>>((event) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const { startIndex, endIndex, virtualItems, totalSize } = useMemo(() => {
    // Block 7A.1 — shared pure window math (inclusive endIndex → exclusive for row loop).
    const windowed = computeVirtualWindow({
      itemCount,
      itemHeight: itemSize,
      scrollTop,
      viewportHeight: viewportSize,
      overscan,
    });
    const exclusiveEnd = windowed.endIndex < 0 ? 0 : windowed.endIndex + 1;
    const nextItems: VirtualItem[] = [];
    for (let index = windowed.startIndex; index < exclusiveEnd; index += 1) {
      nextItems.push({ index, offset: index * Math.max(1, itemSize) });
    }
    return {
      startIndex: windowed.startIndex,
      endIndex: exclusiveEnd,
      virtualItems: nextItems,
      totalSize: windowed.totalHeight,
    };
  }, [itemCount, itemSize, overscan, scrollTop, viewportSize]);

  return {
    containerRef,
    onScroll,
    virtualItems,
    startIndex,
    endIndex,
    totalSize,
    viewportSize,
    viewportWidth,
  };
}

