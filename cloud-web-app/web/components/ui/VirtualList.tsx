/**
 * Aethel IDE - Virtualized List Component
 * 
 * Lista virtualizada de alta performance para renderizar
 * milhares de itens sem degradação de performance.
 * Similar ao que VS Code usa para file explorer e search results.
 */

'use client';

import React, { 
  useRef, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  forwardRef,
  useImperativeHandle
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface VirtualListItem {
  id: string;
  height?: number;
}

interface VirtualListProps<T extends VirtualListItem> {
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
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(height);
  
  // Track measured heights for variable height items
  const measuredHeights = useRef<Map<string, number>>(new Map());
  
  // Calculate total height
  const totalHeight = useMemo(() => {
    return items.reduce((acc, item) => {
      const height = measuredHeights.current.get(item.id) || item.height || itemHeight;
      return acc + height;
    }, 0);
  }, [items, itemHeight]);
  
  // Calculate visible range
  const { startIndex, endIndex, offsetTop } = useMemo(() => {
    let offset = 0;
    let startIndex = 0;
    let endIndex = items.length - 1;
    let offsetTop = 0;
    
    // Find start index
    for (let i = 0; i < items.length; i++) {
      const h = measuredHeights.current.get(items[i].id) || items[i].height || itemHeight;
      if (offset + h > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        offsetTop = offset;
        
        // Adjust offset for overscan
        for (let j = startIndex; j < i; j++) {
          offsetTop -= measuredHeights.current.get(items[j].id) || items[j].height || itemHeight;
        }
        break;
      }
      offset += h;
    }
    
    // Find end index
    offset = offsetTop;
    for (let i = startIndex; i < items.length; i++) {
      const h = measuredHeights.current.get(items[i].id) || items[i].height || itemHeight;
      offset += h;
      if (offset > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
    }
    
    return { startIndex, endIndex, offsetTop };
  }, [items, scrollTop, containerHeight, itemHeight, overscan]);
  
  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);
  
  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const newScrollTop = target.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
    
    // Check end reached
    if (onEndReached && totalHeight - newScrollTop - containerHeight < endReachedThreshold) {
      onEndReached();
    }
  }, [onScroll, onEndReached, totalHeight, containerHeight, endReachedThreshold]);
  
  // Handle resize
  useResizeObserver(containerRef, useCallback((entry) => {
    setContainerHeight(entry.contentRect.height);
  }, []));
  
  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboard || !containerRef.current) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId || !onSelect) return;
      
      const currentIndex = items.findIndex(item => item.id === selectedId);
      if (currentIndex === -1) return;
      
      let nextIndex = currentIndex;
      
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
          nextIndex = Math.min(items.length - 1, currentIndex + Math.floor(containerHeight / itemHeight));
          break;
        case 'PageUp':
          e.preventDefault();
          nextIndex = Math.max(0, currentIndex - Math.floor(containerHeight / itemHeight));
          break;
        default:
          return;
      }
      
      if (nextIndex !== currentIndex) {
        onSelect(items[nextIndex].id);
        // Scroll into view
        scrollToItemInternal(nextIndex, 'center');
      }
    };
    
    containerRef.current.addEventListener('keydown', handleKeyDown);
    return () => containerRef.current?.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboard, selectedId, onSelect, items, containerHeight, itemHeight]);
  
  // Scroll methods
  const scrollToItemInternal = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!containerRef.current) return;
    
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += measuredHeights.current.get(items[i].id) || items[i].height || itemHeight;
    }
    
    const itemH = measuredHeights.current.get(items[index].id) || items[index].height || itemHeight;
    
    let scrollPosition = offset;
    if (align === 'center') {
      scrollPosition = offset - containerHeight / 2 + itemH / 2;
    } else if (align === 'end') {
      scrollPosition = offset - containerHeight + itemH;
    }
    
    containerRef.current.scrollTop = Math.max(0, scrollPosition);
  }, [items, containerHeight, itemHeight]);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollTo: (offset: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = offset;
      }
    },
    scrollToItem: scrollToItemInternal,
    getScrollOffset: () => scrollTop,
  }), [scrollToItemInternal, scrollTop]);
  
  // Calculate item positions
  const getItemStyle = useCallback((index: number): React.CSSProperties => {
    let top = offsetTop;
    for (let i = startIndex; i < index; i++) {
      top += measuredHeights.current.get(items[i].id) || items[i].height || itemHeight;
    }
    
    return {
      position: 'absolute',
      top,
      left: 0,
      right: 0,
      height: measuredHeights.current.get(items[index].id) || items[index].height || itemHeight,
    };
  }, [items, startIndex, offsetTop, itemHeight]);
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto relative ${className}`}
      style={{ height, width }}
      onScroll={handleScroll}
      tabIndex={enableKeyboard ? 0 : undefined}
      role="listbox"
      aria-rowcount={items.length}
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const actualIndex = startIndex + i;
          return (
            <div key={item.id} style={getItemStyle(actualIndex)}>
              {renderItem(item, actualIndex, getItemStyle(actualIndex))}
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
          ${isSelected ? 'bg-blue-600/30 text-white' : 'text-gray-300 hover:bg-white/5'}
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
            className="flex-shrink-0 text-gray-400"
            onClick={(e) => {
              e.stopPropagation();
              onNodeExpand?.(node);
            }}
          >
            {node.expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="w-3" />}
        
        {node.icon || (node.type === 'directory' ? '📁' : '📄')}
        <span className="truncate text-sm">{node.name}</span>
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
