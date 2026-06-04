'use client';

import React, { useEffect, useRef, type DragEvent, type MouseEvent } from 'react';
import { Copy, ExternalLink, Pin, PinOff, Split, X } from 'lucide-react';
import { createComponentLogger } from '@/lib/observability/logger';

import { useTabBar } from './TabBar.context';
import { getFileIcon } from './TabBar.file-icons';
import type { EditorTab, TabContextMenuAction } from './TabBar.types';

const log = createComponentLogger('TabBar');

// ============================================================================
// Tab Context Menu
// ============================================================================

export function TabContextMenu({
  tab,
  position,
  onClose,
}: {
  tab: EditorTab;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const {
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
    togglePin,
    duplicateTab,
    splitTab,
  } = useTabBar();

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const actions: TabContextMenuAction[] = [
    {
      id: 'close',
      label: 'Close',
      shortcut: 'Ctrl+W',
      action: () => closeTab(tab.id),
    },
    {
      id: 'close-others',
      label: 'Close Others',
      action: () => closeOtherTabs(tab.id),
    },
    {
      id: 'close-right',
      label: 'Close to the Right',
      action: () => closeTabsToRight(tab.id),
    },
    {
      id: 'close-all',
      label: 'Close All',
      danger: true,
      action: () => closeAllTabs(),
    },
    { id: 'divider-1', label: '-', action: () => {} },
    {
      id: 'pin',
      label: tab.isPinned ? 'Unpin' : 'Pin',
      icon: tab.isPinned ? PinOff : Pin,
      action: () => togglePin(tab.id),
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      action: () => duplicateTab(tab.id),
    },
    { id: 'divider-2', label: '-', action: () => {} },
    {
      id: 'split-right',
      label: 'Split Right',
      icon: Split,
      action: () => splitTab(tab.id, 'horizontal'),
    },
    {
      id: 'split-down',
      label: 'Split Down',
      icon: Split,
      action: () => splitTab(tab.id, 'vertical'),
    },
    { id: 'divider-3', label: '-', action: () => {} },
    {
      id: 'copy-path',
      label: 'Copy Path',
      icon: Copy,
      action: () => navigator.clipboard.writeText(tab.path),
    },
    {
      id: 'reveal',
      label: 'Reveal in Explorer',
      icon: ExternalLink,
      action: () => {
        // Trigger reveal in file explorer
        log.info('Reveal:', tab.path);
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-primary)] rounded-lg shadow-2xl py-1 overflow-hidden"
      style={{ left: position.x, top: position.y }}
    >
      {actions.map((action, index) => {
        if (action.label === '-') {
          return <div key={action.id} className="my-1 border-t border-[var(--aethel-border-primary)]" />;
        }

        return (
          <button type="button" aria-label={`${action.label} ${tab.title}`}
            key={action.id}
            onClick={() => {
              action.action(tab);
              onClose();
            }}
            disabled={action.disabled}
            className={`w-full flex items-center justify-between gap-4 px-3 py-1.5 text-sm ${
              action.danger
                ? 'text-[var(--aethel-error)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_14%,transparent)]'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-2">
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </div>
            {action.shortcut && (
              <span className="text-xs text-[var(--aethel-text-tertiary)]">{action.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Single Tab Component
// ============================================================================

export function Tab({
  tab,
  isActive,
  onSelect,
  onClose,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver,
}: {
  tab: EditorTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onContextMenu: (e: MouseEvent) => void;
  onDragStart: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  isDragging: boolean;
  isDragOver: boolean;
}) {
  const { convertPreviewToNormal } = useTabBar();
  const fileIcon = typeof tab.icon === 'string' ? null : tab.icon || getFileIcon(tab.path).icon;
  const iconColor = tab.iconColor || (typeof tab.icon !== 'string' ? getFileIcon(tab.path).color : undefined);

  const handleDoubleClick = () => {
    if (tab.isPreview) {
      convertPreviewToNormal(tab.id);
    }
  };

  const handleMiddleClick = (e: MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      draggable
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      onAuxClick={handleMiddleClick}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`
        group flex h-9 items-center gap-2 border-r border-[var(--aethel-border-subtle)] px-3 cursor-pointer
        transition-all select-none
        ${isActive
          ? 'bg-[linear-gradient(180deg,rgba(18,23,33,0.98),rgba(14,18,25,0.98))] text-[var(--aethel-text-primary)] border-t-2 border-t-[var(--aethel-info)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
          : 'bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-tertiary)] border-t-2 border-t-transparent hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)] hover:text-[var(--aethel-text-primary)]'
        }
        ${tab.isPreview ? 'italic' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${isDragOver ? 'border-l-2 border-l-[var(--aethel-info)]' : ''}
        ${tab.isPinned ? 'px-2' : ''}
      `}
    >
      {/* Pin indicator */}
      {tab.isPinned && (
        <Pin className="w-3 h-3 text-[var(--aethel-info)] flex-shrink-0" />
      )}

      {/* File icon */}
      {fileIcon && (
        <div className="flex-shrink-0" style={{ color: iconColor }}>
          {typeof fileIcon === 'function' ? (
            // LucideIcon
            React.createElement(fileIcon, { className: 'w-4 h-4' })
          ) : null}
        </div>
      )}

      {/* Tab title */}
      {!tab.isPinned && (
        <span className="max-w-32 truncate text-[13px] font-medium">
          {tab.title}
          {tab.isDirty && (
            <span className="ml-1 text-[color-mix(in_srgb,var(--aethel-warning-light)_85%,transparent)]">*</span>
          )}
        </span>
      )}

      {/* Close button */}
      {!tab.isPinned && (
        <button type="button" aria-label={`Close ${tab.title}`}
          onClick={e => {
            e.stopPropagation();
            onClose();
          }}
          className={`
            flex-shrink-0 rounded-md p-0.5
            ${isActive || tab.isDirty
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
            }
            hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]
          `}
        >
          {tab.isDirty ? (
            <div className="h-2.5 w-2.5 rounded-full bg-[var(--aethel-warning-light)]" />
          ) : (
            <X className="w-3 h-3" />
          )}
        </button>
      )}
    </div>
  );
}
