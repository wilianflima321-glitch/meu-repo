'use client';

import { useCallback, useRef, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import { useWorkspaceStore, usePanelMetaRegistry } from './WorkspaceProvider';
import { DockTabStrip } from './DockTabStrip';
import { DOCK_TAB_DRAG_MIME, type DockDragPayload, type DockPanelMeta, type DockRegionId } from './types';

export interface DockRegionProps {
  regionId: DockRegionId;
  /** Shown when the region currently has zero docked tabs (e.g. everything was dragged out). */
  emptyState?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * A drop target + tab strip + content host for one region of the shell.
 * Accepts a drag from *any* other `DockRegion` in the same `WorkspaceProvider`
 * — dropping anywhere in the content area (not just precisely on a tab)
 * appends the tab to the end of this region.
 */
export function DockRegion({ regionId, emptyState, className, style }: DockRegionProps) {
  const store = useWorkspaceStore();
  const registry = usePanelMetaRegistry();
  const region = store((s) => s.regions[regionId]);
  const dropTargetRegion = store((s) => s.dropTargetRegion);
  const draggingTabId = store((s) => s.draggingTabId);

  const items = region.tabIds
    .map((id) => registry.metaById[id])
    .filter((meta): meta is DockPanelMeta => Boolean(meta));

  const slotRefsRef = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  const getSlotRefCallback = useCallback(
    (tabId: string) => {
      let cb = slotRefsRef.current.get(tabId);
      if (!cb) {
        cb = (el: HTMLDivElement | null) => store.getState().registerSlotElement(tabId, el);
        slotRefsRef.current.set(tabId, cb);
      }
      return cb;
    },
    [store],
  );

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingTabId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropTargetRegion !== regionId) store.getState().setDropTarget(regionId);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    if (store.getState().dropTargetRegion === regionId) store.getState().setDropTarget(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData(DOCK_TAB_DRAG_MIME);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as DockDragPayload;
      store.getState().moveTab(payload.tabId, regionId);
    } finally {
      store.getState().endDrag();
    }
  };

  const isDropTarget = dropTargetRegion === regionId && draggingTabId;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        height: '100%',
        width: '100%',
        background: 'var(--aethel-bg-panel)',
        boxShadow: isDropTarget ? 'inset 0 0 0 2px var(--aethel-primary)' : 'none',
        transition: 'box-shadow var(--aethel-duration-fast) ease',
        ...style,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-dock-region={regionId}
    >
      {items.length > 0 && (
        <div className="flex shrink-0 items-center border-b" style={{ borderColor: 'var(--aethel-border-divider)' }}>
          <DockTabStrip regionId={regionId} items={items} activeTabId={region.activeTabId} />
        </div>
      )}
      <div className="relative min-h-0 min-w-0 flex-1">
        {items.length === 0 && emptyState}
        {region.tabIds.map((tabId) => (
          <div
            key={tabId}
            ref={getSlotRefCallback(tabId)}
            className="absolute inset-0 flex flex-col"
            style={{ display: tabId === region.activeTabId ? 'flex' : 'none' }}
          />
        ))}
      </div>
    </div>
  );
}

export default DockRegion;
