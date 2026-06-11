'use client';

import { useCallback, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import type { ArrowKeyDirection } from './accessibility.types';

export function handleArrowNavigation(
  e: ReactKeyboardEvent | KeyboardEvent,
  currentIndex: number,
  totalItems: number,
  direction: ArrowKeyDirection = 'vertical',
  columnsInGrid?: number,
  onNavigate?: (newIndex: number) => void
): number {
  let newIndex = currentIndex;

  const isVertical = direction === 'vertical' || direction === 'both' || direction === 'grid';
  const isHorizontal = direction === 'horizontal' || direction === 'both' || direction === 'grid';
  const isGrid = direction === 'grid' && columnsInGrid;

  switch (e.key) {
    case 'ArrowUp':
      if (isVertical) {
        e.preventDefault();
        if (isGrid) {
          newIndex = currentIndex - columnsInGrid;
          if (newIndex < 0) {
            // Wrap to last row
            const col = currentIndex % columnsInGrid;
            const lastRowStart = Math.floor((totalItems - 1) / columnsInGrid) * columnsInGrid;
            newIndex = Math.min(lastRowStart + col, totalItems - 1);
          }
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
        }
      }
      break;

    case 'ArrowDown':
      if (isVertical) {
        e.preventDefault();
        if (isGrid) {
          newIndex = currentIndex + columnsInGrid;
          if (newIndex >= totalItems) {
            // Wrap to first row
            newIndex = currentIndex % columnsInGrid;
          }
        } else {
          newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
        }
      }
      break;

    case 'ArrowLeft':
      if (isHorizontal) {
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
      }
      break;

    case 'ArrowRight':
      if (isHorizontal) {
        e.preventDefault();
        newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
      }
      break;

    case 'Home':
      e.preventDefault();
      newIndex = 0;
      break;

    case 'End':
      e.preventDefault();
      newIndex = totalItems - 1;
      break;
  }

  if (newIndex !== currentIndex) {
    onNavigate?.(newIndex);
  }

  return newIndex;
}

/**
 * Handle type-ahead search in a list
 */
export function useTypeAheadSearch(
  items: Array<{ label: string }>,
  onSelect: (index: number) => void,
  timeout: number = 500
): (char: string) => void {
  const searchBuffer = useRef('');
  const searchTimeout = useRef<NodeJS.Timeout>();

  return useCallback(
    (char: string) => {
      // Only handle single printable characters
      if (char.length !== 1 || !/[\w\s]/.test(char)) return;

      // Add to search buffer
      searchBuffer.current += char.toLowerCase();

      // Clear previous timeout
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      // Set new timeout to clear buffer
      searchTimeout.current = setTimeout(() => {
        searchBuffer.current = '';
      }, timeout);

      // Find matching item
      const search = searchBuffer.current;
      const index = items.findIndex((item) =>
        item.label.toLowerCase().startsWith(search)
      );

      if (index !== -1) {
        onSelect(index);
      }
    },
    [items, onSelect, timeout]
  );
}

// ============================================================================
// Screen Reader Announcements
// ============================================================================

/**
 * Create live region for announcements
 */
