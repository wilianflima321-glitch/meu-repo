'use client';

/**
 * Aethel IDE - Virtualized List Component
 *
 * Lista virtualizada de alta performance para renderizar
 * thousands of items without performance degradation.
 * Similar ao que VS Code usa para file explorer e search results.
 */
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle
} from 'react';
import { ChevronDown, ChevronRight, FileText, Folder } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface VirtualListItem {
  id: string;
  height?: number;
}

export interface VirtualListProps<T extends VirtualListItem> {
  /** Array of items to render */
  items: T[];
  /** Default height for items (used for estimation) */
  itemHeight: number;
  /** Render function for each item */
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  /** Container height (required for calculation) */
  height: number;
  /** Container width */
  width?: number | string;
  /** Number of items to render above/below visible area */
  overscan?: number;
  /** Callback when scrolling */
  onScroll?: (scrollTop: number) => void;
  /** Callback when reaching end of list */
  onEndReached?: () => void;
  /** Threshold for triggering onEndReached (in pixels) */
  endReachedThreshold?: number;
  /** Custom class name */
  className?: string;
  /** Enable keyboard navigation */
  enableKeyboard?: boolean;
  /** Currently selected item id */
  selectedId?: string | null;
  /** Callback when item is selected */
  onSelect?: (id: string) => void;
}

export interface VirtualListRef {
  scrollTo: (offset: number) => void;
  scrollToItem: (index: number, align?: 'start' | 'center' | 'end') => void;
  getScrollOffset: () => number;
}

// ============================================================================
// HOOKS
// ============================================================================

function useResizeObserver(
  ref: React.RefObject<HTMLElement>,
  callback: (entry: ResizeObserverEntry) => void
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      callback(entry);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, callback]);
}

// ============================================================================
// VIRTUAL LIST COMPONENT
// ============================================================================

import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualListInner<T extends VirtualListItem>(
  props: VirtualListProps<T>,
  ref: React.Ref<VirtualListRef>
) {
  const {
    items,
    itemHeight,
    renderItem,
    height,
    width = '100%',
    overscan = 3,
    onScroll,
    onEndReached,
    endReachedThreshold = 200,
    className = '',
    enableKeyboard = true,
    selectedId,
    onSelect,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback((index: number) => {
      return items[index].height || itemHeight;
    }, [items, itemHeight]),
    overscan,
  });

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const newScrollTop = target.scrollTop;
    onScroll?.(newScrollTop);

    if (onEndReached && rowVirtualizer.getTotalSize() - newScrollTop - target.clientHeight < endReachedThreshold) {
      onEndReached();
    }
  }, [onScroll, onEndReached, rowVirtualizer, endReachedThreshold]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboard || !containerRef.current) return;
    const container = containerRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId || !onSelect) return;

      const currentIndex = items.findIndex(item => item.id === selectedId);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      const visibleCount = Math.floor((typeof height === 'number' ? height : container.clientHeight) / itemHeight);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = Math.min(items.length - 1, currentIndex + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = Math.max(0, currentIndex - 1);
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = items.length - 1;
          break;
        case 'PageDown':
          e.preventDefault();
          nextIndex = Math.min(items.length - 1, currentIndex + visibleCount);
          break;
        case 'PageUp':
          e.preventDefault();
          nextIndex = Math.max(0, currentIndex - visibleCount);
          break;
        default:
          return;
      }

      if (nextIndex !== currentIndex) {
        onSelect(items[nextIndex].id);
        rowVirtualizer.scrollToIndex(nextIndex, { align: 'center' });
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboard, selectedId, onSelect, items, height, itemHeight, rowVirtualizer]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollTo: (offset: number) => {
      rowVirtualizer.scrollToOffset(offset);
    },
    scrollToItem: (index: number, align: 'start' | 'center' | 'end' = 'start') => {
      rowVirtualizer.scrollToIndex(index, { align });
    },
    getScrollOffset: () => containerRef.current?.scrollTop || 0,
  }), [rowVirtualizer]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto relative ${className}`}
      style={{ height, width }}
      onScroll={handleScroll}
      tabIndex={enableKeyboard ? 0 : undefined}
      role="listbox"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          const style: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualItem.size}px`,
            transform: `translateY(${virtualItem.start}px)`,
          };
          
          return (
            <div key={item.id} style={style}>
              {renderItem(item, virtualItem.index, style)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const VirtualList = forwardRef(VirtualListInner) as <T extends VirtualListItem>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListRef> }
) => React.ReactElement;

// ============================================================================
// VIRTUAL GRID COMPONENT
// ============================================================================

interface VirtualGridProps<T extends VirtualListItem> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  height: number;
  width: number;
  gap?: number;
  overscan?: number;
  className?: string;
}

export function VirtualGrid<T extends VirtualListItem>({
  items,
  itemWidth,
  itemHeight,
  renderItem,
  height,
  width,
  gap = 0,
  overscan = 2,
  className = '',
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate columns
  const columns = Math.max(1, Math.floor((width + gap) / (itemWidth + gap)));
  const rows = Math.ceil(items.length / columns);
  const totalHeight = rows * (itemHeight + gap) - gap;

  // Calculate visible rows
  const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
  const endRow = Math.min(rows - 1, Math.ceil((scrollTop + height) / (itemHeight + gap)) + overscan);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Get visible items
  const visibleItems: Array<{ item: T; index: number }> = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      if (index < items.length) {
        visibleItems.push({ item: items[index], index });
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto relative ${className}`}
      style={{ height, width }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => {
          const row = Math.floor(index / columns);
          const col = index % columns;
          const style: React.CSSProperties = {
            position: 'absolute',
            top: row * (itemHeight + gap),
            left: col * (itemWidth + gap),
            width: itemWidth,
            height: itemHeight,
          };

          return (
            <div key={item.id} style={style}>
              {renderItem(item, index, style)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// INFINITE SCROLL HOOK
// ============================================================================

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
}

export function useInfiniteScroll(
  containerRef: React.RefObject<HTMLElement>,
  options: UseInfiniteScrollOptions
) {
  const { hasMore, isLoading, onLoadMore, threshold = 200 } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isLoading || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        onLoadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, hasMore, isLoading, onLoadMore, threshold]);
}

// ============================================================================
// VIRTUALIZED FILE TREE (specialized component)
// ============================================================================

export interface FileTreeNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  depth: number;
  expanded?: boolean;
  children?: FileTreeNode[];
  icon?: React.ReactNode;
}

interface VirtualFileTreeProps {
  nodes: FileTreeNode[];
  height: number;
  onNodeClick?: (node: FileTreeNode) => void;
  onNodeExpand?: (node: FileTreeNode) => void;
  selectedId?: string | null;
  className?: string;
}

export const VirtualFileTree: React.FC<VirtualFileTreeProps> = ({
  nodes,
  height,
  onNodeClick,
  onNodeExpand,
  selectedId,
  className = '',
}) => {
  // Flatten tree for virtualization
  const flattenedNodes = useMemo(() => {
    const result: FileTreeNode[] = [];

    const flatten = (items: FileTreeNode[], depth: number) => {
      for (const item of items) {
        result.push({ ...item, depth });
        if (item.type === 'directory' && item.expanded && item.children) {
          flatten(item.children, depth + 1);
        }
      }
    };

    flatten(nodes, 0);
    return result;
  }, [nodes]);

  const renderItem = useCallback((node: FileTreeNode) => {
    const isSelected = node.id === selectedId;
    const hasChildren = node.type === 'directory' && node.children && node.children.length > 0;

    return (
      <div
        className={`
          flex items-center gap-1 px-2 py-1 cursor-pointer select-none
          ${isSelected ? 'bg-[color-mix(in_srgb,var(--aethel-info)_25%,transparent)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]/60'}
        `}
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
        onClick={() => {
          onNodeClick?.(node);
          if (node.type === 'directory') {
            onNodeExpand?.(node);
          }
        }}
      >
        {hasChildren && (
          <span
            className="flex-shrink-0 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onNodeExpand?.(node);
            }}
          >
            {node.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        )}
        {!hasChildren && <span className="w-3" />}

        {node.icon || (node.type === 'directory' ? <Folder className="h-3.5 w-3.5 text-[var(--aethel-primary)] shrink-0" /> : <FileText className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)] shrink-0" />)}
        <span className="truncate text-xs font-medium text-[var(--aethel-text-primary)]">{node.name}</span>
      </div>
    );
  }, [selectedId, onNodeClick, onNodeExpand]);

  return (
    <VirtualList
      items={flattenedNodes.map(n => ({ ...n, height: 28 }))}
      itemHeight={28}
      height={height}
      renderItem={renderItem}
      selectedId={selectedId}
      onSelect={(id) => {
        const node = flattenedNodes.find(n => n.id === id);
        if (node) onNodeClick?.(node);
      }}
      className={className}
    />
  );
};

export default VirtualList;
