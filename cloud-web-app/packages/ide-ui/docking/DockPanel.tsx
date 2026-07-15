'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspaceStore, usePanelMetaRegistry } from './WorkspaceProvider';
import type { DockPanelMeta } from './types';

export interface DockPanelProps extends DockPanelMeta {
  children: ReactNode;
}

/**
 * Wraps a panel's real content (e.g. `<FileExplorerPro />`) and makes it
 * dockable: it registers a tab under `id` in `defaultRegion` (once — a
 * saved/dragged position from a previous session always wins), then portals
 * its children into whichever region currently owns that tab.
 *
 * `children` stays mounted in this exact spot in the React tree the whole
 * time; only its rendered DOM output moves between regions on drag, so
 * scroll position, expanded tree nodes, in-flight requests, etc. all survive
 * a drag-and-drop move.
 */
export function DockPanel({ id, title, icon, closable, defaultRegion, children }: DockPanelProps) {
  const store = useWorkspaceStore();
  const registry = usePanelMetaRegistry();

  useEffect(() => {
    registry.register({ id, title, icon, closable, defaultRegion });
    store.getState().registerTab(defaultRegion, id);
    return () => registry.unregister(id);
    // `title`/`icon`/`closable` are static per panel id at every call site we ship; only
    // re-registering when `id`/`defaultRegion` change avoids needless meta-map churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, defaultRegion]);

  const slotEl = store((s) => s.slotElements[id] ?? null);

  if (!slotEl) return null;
  return createPortal(
    <div className="flex h-full w-full min-h-0 min-w-0 flex-col" data-dock-panel-id={id}>
      {children}
    </div>,
    slotEl,
  );
}

export default DockPanel;
