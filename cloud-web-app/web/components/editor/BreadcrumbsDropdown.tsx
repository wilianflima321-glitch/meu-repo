'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Code, Folder, FolderOpen } from 'lucide-react';
import type { BreadcrumbSegment, DocumentSymbol } from './Breadcrumbs.types';
import { getFileIcon, SYMBOL_COLORS, SYMBOL_ICONS } from './Breadcrumbs.icons';

interface DropdownProps {
  trigger: ReactNode;
  items: BreadcrumbSegment[] | DocumentSymbol[];
  isSymbol?: boolean;
  onSelect: (item: BreadcrumbSegment | DocumentSymbol) => void;
  className?: string;
}

export function BreadcrumbDropdown({ trigger, items, isSymbol, onSelect, className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => {
      const name = 'label' in item ? item.label : item.name;
      return name.toLowerCase().includes(query);
    });
  }, [items, searchQuery]);

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex]);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleItemClick = (item: BreadcrumbSegment | DocumentSymbol) => {
    onSelect(item);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button type="button" aria-label={isOpen ? 'Close breadcrumb menu' : 'Open breadcrumb menu'}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--aethel-surface-secondary)] transition-colors"
      >
        {trigger}
        <ChevronDown className={`w-3 h-3 text-[var(--aethel-text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-64 max-h-80 bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-primary)] rounded-lg shadow-xl overflow-hidden z-50"
          onKeyDown={handleKeyDown}
        >
          {/* Search */}
          <div className="p-2 border-b border-[var(--aethel-border-primary)]">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 text-sm bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded outline-none focus:ring-1 focus:ring-[var(--aethel-info)]"
            />
          </div>

          {/* Items */}
          <div className="max-h-60 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-sm text-[var(--aethel-text-tertiary)] text-center">
                No results
              </div>
            ) : (
              filteredItems.map((item, index) => {
                if (isSymbol && 'kind' in item) {
                  const symbol = item as DocumentSymbol;
                  const Icon = SYMBOL_ICONS[symbol.kind] || Code;
                  const colorClass = SYMBOL_COLORS[symbol.kind] || 'text-[var(--aethel-text-tertiary)]';

                  return (
                    <button type="button" aria-label={`Navigate to symbol ${symbol.name}`}
                      key={`${symbol.name}-${symbol.range.startLine}`}
                      onClick={() => handleItemClick(item)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-[var(--aethel-info)]/30'
                          : 'hover:bg-[var(--aethel-surface-secondary)]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${colorClass}`} />
                      <span className="text-[var(--aethel-text-primary)] truncate">{symbol.name}</span>
                      <span className="ml-auto text-xs text-[var(--aethel-text-tertiary)]">
                        :{symbol.range.startLine}
                      </span>
                    </button>
                  );
                } else if ('label' in item) {
                  const segment = item as BreadcrumbSegment;
                  const Icon = segment.type === 'folder'
                    ? (index === selectedIndex ? FolderOpen : Folder)
                    : getFileIcon(segment.label);

                  return (
                    <button type="button" aria-label={`Navegar para segmento ${segment.label}`}
                      key={segment.id}
                      onClick={() => handleItemClick(item)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-[var(--aethel-info)]/30'
                          : 'hover:bg-[var(--aethel-surface-secondary)]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${
                        segment.type === 'folder' ? 'text-[var(--aethel-warning-light)]' : 'text-[var(--aethel-info)]'
                      }`} />
                      <span className="text-[var(--aethel-text-primary)] truncate">{segment.label}</span>
                    </button>
                  );
                }
                return null;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
