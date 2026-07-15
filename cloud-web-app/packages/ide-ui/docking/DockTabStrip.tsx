'use client';

import { useState, type DragEvent } from 'react';
import { X } from 'lucide-react';
import { useWorkspaceStore } from './WorkspaceProvider';
import { DOCK_TAB_DRAG_MIME, type DockDragPayload, type DockPanelMeta, type DockRegionId } from './types';

interface DockTabStripProps {
  regionId: DockRegionId;
  items: DockPanelMeta[];
  activeTabId: string | null;
}

/**
 * Draggable tab list for one dock region. Tabs can be reordered within the
 * strip or dragged onto any *other* region's strip / content area — both
 * cases resolve to the same `moveTab` store mutation, the only difference
 * being whether `fromRegion === regionId`.
 */
export function DockTabStrip({ regionId, items, activeTabId }: DockTabStripProps) {
  const store = useWorkspaceStore();
  const draggingTabId = store((s) => s.draggingTabId);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, tabId: string) => {
    const payload: DockDragPayload = { tabId, fromRegion: regionId };
    event.dataTransfer.setData(DOCK_TAB_DRAG_MIME, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
    store.getState().beginDrag(tabId);
  };

  const handleDragEnd = () => {
    store.getState().endDrag();
    setHoverIndex(null);
  };

  const handleTabDragOver = (event: DragEvent<HTMLButtonElement>, index: number) => {
    if (!draggingTabId) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    store.getState().setDropTarget(regionId);
    setHoverIndex(index);
  };

  const handleDropOnTab = (event: DragEvent<HTMLButtonElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    const raw = event.dataTransfer.getData(DOCK_TAB_DRAG_MIME);
    setHoverIndex(null);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as DockDragPayload;
      store.getState().moveTab(payload.tabId, regionId, index);
    } finally {
      store.getState().endDrag();
    }
  };

  return (
    <div
      role="tablist"
      className="flex items-center gap-0.5 overflow-x-auto px-1"
      style={{ minHeight: 'var(--aethel-space-7)' }}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = item.id === activeTabId;
        const isDragging = item.id === draggingTabId;
        const showInsertBefore = hoverIndex === index && draggingTabId && draggingTabId !== item.id;

        return (
          <div key={item.id} className="relative flex items-center">
            {showInsertBefore && (
              <span
                aria-hidden
                className="absolute -left-0.5 top-1 bottom-1 w-0.5 rounded-full"
                style={{ background: 'var(--aethel-primary)' }}
              />
            )}
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              draggable
              onDragStart={(event) => handleDragStart(event, item.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(event) => handleTabDragOver(event, index)}
              onDrop={(event) => handleDropOnTab(event, index)}
              onClick={() => store.getState().setActiveTab(regionId, item.id)}
              className="group flex items-center gap-1.5 rounded-[var(--aethel-radius-sm)] px-2.5 text-[11px] font-medium transition-colors duration-[var(--aethel-duration-fast)]"
              style={{
                height: 'var(--aethel-space-6)',
                opacity: isDragging ? 0.4 : 1,
                color: isActive ? 'var(--aethel-text-primary)' : 'var(--aethel-text-tertiary)',
                background: isActive ? 'var(--aethel-interactive-active)' : 'transparent',
              }}
              onMouseEnter={(event) => {
                if (!isActive) event.currentTarget.style.background = 'var(--aethel-interactive-hover)';
              }}
              onMouseLeave={(event) => {
                if (!isActive) event.currentTarget.style.background = 'transparent';
              }}
            >
              {Icon && <Icon size={13} />}
              <span className="whitespace-nowrap">{item.title}</span>
              {item.closable && (
                <span
                  role="button"
                  aria-label={`Close ${item.title}`}
                  className="ml-0.5 rounded-sm p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: 'var(--aethel-text-tertiary)' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    store.getState().closeTab(regionId, item.id);
                  }}
                >
                  <X size={11} />
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default DockTabStrip;
