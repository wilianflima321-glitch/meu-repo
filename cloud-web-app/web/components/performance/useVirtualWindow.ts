'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject, UIEventHandler } from 'react';

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

  const totalSize = Math.max(0, itemCount * itemSize);

  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    if (itemCount <= 0 || itemSize <= 0) {
      return { startIndex: 0, endIndex: 0, virtualItems: [] as VirtualItem[] };
    }

    const firstVisible = Math.floor(scrollTop / itemSize);
    const visibleCount = Math.ceil(viewportSize / itemSize);
    const nextStart = Math.max(0, firstVisible - overscan);
    const nextEnd = Math.min(itemCount, firstVisible + visibleCount + overscan);
    const nextItems: VirtualItem[] = [];

    for (let index = nextStart; index < nextEnd; index += 1) {
      nextItems.push({ index, offset: index * itemSize });
    }

    return {
      startIndex: nextStart,
      endIndex: nextEnd,
      virtualItems: nextItems,
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
