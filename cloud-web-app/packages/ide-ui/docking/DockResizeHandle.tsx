'use client';

import { useCallback, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import { ResizeHandle } from '../modern-shell/chromeResizeHandle';
import { useWorkspaceStore } from './WorkspaceProvider';
import type { DockRegionId } from './types';

export interface DockResizeHandleProps {
  regionId: DockRegionId;
  orientation: 'vertical' | 'horizontal';
  /** The container whose width (vertical handle) or height (horizontal handle) the percentage is measured against. */
  containerRef: RefObject<HTMLElement | null>;
  min?: number;
  max?: number;
  /** False when the region sits on the trailing edge (e.g. a right rail), where dragging left grows it instead of shrinking it. */
  growsWithPointer?: boolean;
}

/** Drag sash that resizes a dock region, backed directly by `workspaceStore.setRegionSize`. */
export function DockResizeHandle({
  regionId,
  orientation,
  containerRef,
  min = 12,
  max = 60,
  growsWithPointer = true,
}: DockResizeHandleProps) {
  const store = useWorkspaceStore();
  const size = store((s) => s.regions[regionId].size);

  const clamp = useCallback((value: number) => Math.min(max, Math.max(min, value)), [min, max]);

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const element = containerRef.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const axisSize = orientation === 'vertical' ? bounds.width : bounds.height;
      if (axisSize <= 0) return;

      const onMove = (moveEvent: MouseEvent) => {
        const relative = orientation === 'vertical' ? moveEvent.clientX - bounds.left : moveEvent.clientY - bounds.top;
        let percent = (relative / axisSize) * 100;
        if (!growsWithPointer) percent = 100 - percent;
        store.getState().setRegionSize(regionId, clamp(percent));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [clamp, containerRef, growsWithPointer, orientation, regionId, store],
  );

  const handleAdjust = useCallback(
    (delta: number) => {
      store.getState().setRegionSize(regionId, clamp(size + (growsWithPointer ? delta : -delta)));
    },
    [clamp, growsWithPointer, regionId, size, store],
  );

  return (
    <ResizeHandle
      ariaLabel={`Resize ${regionId}`}
      orientation={orientation}
      onMouseDown={handleMouseDown}
      onAdjust={handleAdjust}
      valueNow={size}
      valueMin={min}
      valueMax={max}
    />
  );
}

export default DockResizeHandle;
