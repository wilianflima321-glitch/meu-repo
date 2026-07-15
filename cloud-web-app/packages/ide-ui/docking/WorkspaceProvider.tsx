'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createWorkspaceStore, type WorkspaceStore } from './workspaceStore';
import type { DockPanelMeta } from './types';

const WorkspaceStoreContext = createContext<WorkspaceStore | null>(null);

/**
 * Panel display metadata (title/icon/closable) lives here, *not* in the
 * Zustand store — the store is data-only (tab IDs + order), this is the
 * lightweight side registry `DockRegion` reads to render tab labels/icons.
 */
interface PanelMetaRegistry {
  metaById: Record<string, DockPanelMeta>;
  register: (meta: DockPanelMeta) => void;
  unregister: (id: string) => void;
}

const PanelMetaContext = createContext<PanelMetaRegistry | null>(null);

/**
 * Instantiates one Docking Engine store for everything mounted beneath it.
 * Mount one per independent shell — the `/ide` workbench and each 3D
 * viewport instance must not share a layout, so each gets its own
 * `<WorkspaceProvider storageKey="...">`.
 */
export function WorkspaceProvider({ storageKey, children }: { storageKey?: string; children: ReactNode }) {
  const storeRef = useRef<WorkspaceStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createWorkspaceStore(storageKey);
  }
  const store = storeRef.current;

  const [metaById, setMetaById] = useState<Record<string, DockPanelMeta>>({});
  const register = useCallback((meta: DockPanelMeta) => {
    setMetaById((prev) => (prev[meta.id] === meta ? prev : { ...prev, [meta.id]: meta }));
  }, []);
  const unregister = useCallback((id: string) => {
    setMetaById((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);
  const metaRegistry = useMemo<PanelMetaRegistry>(() => ({ metaById, register, unregister }), [metaById, register, unregister]);

  return (
    <WorkspaceStoreContext.Provider value={store}>
      <PanelMetaContext.Provider value={metaRegistry}>{children}</PanelMetaContext.Provider>
    </WorkspaceStoreContext.Provider>
  );
}

/** Returns the nearest `WorkspaceProvider`'s store hook. Throws outside one — docking primitives are not optional chrome. */
export function useWorkspaceStore(): WorkspaceStore {
  const store = useContext(WorkspaceStoreContext);
  if (!store) {
    throw new Error('useWorkspaceStore must be used within a <WorkspaceProvider>');
  }
  return store;
}

export function usePanelMetaRegistry(): PanelMetaRegistry {
  const registry = useContext(PanelMetaContext);
  if (!registry) {
    throw new Error('usePanelMetaRegistry must be used within a <WorkspaceProvider>');
  }
  return registry;
}
