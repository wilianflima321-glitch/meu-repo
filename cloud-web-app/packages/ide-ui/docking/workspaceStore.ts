'use client';

import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { DOCK_REGION_IDS, type DockRegionId, type DockRegionLayout } from './types';

export interface WorkspaceState {
  regions: DockRegionLayout;
  /** Tab currently being dragged, or null. Ephemeral — never persisted. */
  draggingTabId: string | null;
  /** Region currently highlighted as a valid drop target, or null. Ephemeral. */
  dropTargetRegion: DockRegionId | null;
  /** F11 Zen Mode — collapses every non-centerCanvas region. */
  zenMode: boolean;
  /**
   * Named layout presets. Each preset stores a snapshot of `regions` under a
   * user-defined name (e.g. "Level Design", "Code Review"). Persisted alongside
   * the default layout in localStorage.
   */
  layoutPresets: Record<string, DockRegionLayout>;
  /**
   * DOM slot elements registered by `DockRegion` for each tab it currently
   * owns. `DockPanel` portals its content into `slotElements[tabId]`. Never
   * persisted (DOM nodes aren't serializable) and irrelevant to layout math.
   */
  slotElements: Record<string, HTMLDivElement | null>;

  registerTab: (region: DockRegionId, tabId: string) => void;
  moveTab: (tabId: string, toRegion: DockRegionId, atIndex?: number) => void;
  setActiveTab: (region: DockRegionId, tabId: string) => void;
  closeTab: (region: DockRegionId, tabId: string) => void;
  setRegionOpen: (region: DockRegionId, open: boolean) => void;
  setRegionSize: (region: DockRegionId, size: number) => void;
  beginDrag: (tabId: string) => void;
  setDropTarget: (region: DockRegionId | null) => void;
  endDrag: () => void;
  toggleZenMode: () => void;
  registerSlotElement: (tabId: string, el: HTMLDivElement | null) => void;
  /** Save the current `regions` snapshot under `name`. */
  savePreset: (name: string) => void;
  /** Restore a previously saved preset by `name`. No-op when not found. */
  loadPreset: (name: string) => void;
  /** Remove a saved preset by `name`. */
  deletePreset: (name: string) => void;
}

export type WorkspaceStore = UseBoundStore<StoreApi<WorkspaceState>>;

/**
 * CW4 — optional dual-write adapter so IDE dock layout stays on the UI persistence spine.
 * Default remains raw localStorage for package isolation / Storybook.
 */
export type WorkspaceLayoutPersistenceAdapter = {
  load(storageKey: string): string | null
  save(storageKey: string, raw: string): void
}

let workspaceLayoutPersistenceAdapter: WorkspaceLayoutPersistenceAdapter | null = null

/** Register from web (`ui-persistence-spine`) once at IDE boot. */
export function registerWorkspaceLayoutPersistence(
  adapter: WorkspaceLayoutPersistenceAdapter | null,
): void {
  workspaceLayoutPersistenceAdapter = adapter
}

const DEFAULT_REGION_SIZE: Record<DockRegionId, number> = {
  leftBar: 20,
  rightBar: 26,
  bottomBar: 28,
  centerCanvas: 100,
};

function findRegionOf(regions: DockRegionLayout, tabId: string): DockRegionId | null {
  for (const id of DOCK_REGION_IDS) {
    if (regions[id].tabIds.includes(tabId)) return id;
  }
  return null;
}

function emptyLayout(): DockRegionLayout {
  return {
    leftBar: { tabIds: [], activeTabId: null, open: true, size: DEFAULT_REGION_SIZE.leftBar },
    rightBar: { tabIds: [], activeTabId: null, open: true, size: DEFAULT_REGION_SIZE.rightBar },
    bottomBar: { tabIds: [], activeTabId: null, open: true, size: DEFAULT_REGION_SIZE.bottomBar },
    centerCanvas: { tabIds: [], activeTabId: null, open: true, size: DEFAULT_REGION_SIZE.centerCanvas },
  };
}

function loadPersistedLayout(storageKey: string | undefined): {
  regions: DockRegionLayout | null;
  presets: Record<string, DockRegionLayout>;
} {
  if (!storageKey || typeof window === 'undefined') return { regions: null, presets: {} };
  try {
    const raw =
      workspaceLayoutPersistenceAdapter?.load(storageKey) ??
      window.localStorage.getItem(storageKey);
    if (!raw) return { regions: null, presets: {} };
    const parsed = JSON.parse(raw) as {
      regions?: DockRegionLayout;
      zenMode?: boolean;
      presets?: Record<string, DockRegionLayout>;
    };
    let regions: DockRegionLayout | null = null;
    if (parsed.regions) {
      // Defensive merge — a future release adding a region must not crash on an old saved layout.
      const merged = emptyLayout();
      for (const id of DOCK_REGION_IDS) {
        if (parsed.regions[id]) merged[id] = { ...merged[id], ...parsed.regions[id] };
      }
      regions = merged;
    }
    return { regions, presets: parsed.presets ?? {} };
  } catch {
    return { regions: null, presets: {} };
  }
}

/**
 * Creates one isolated docking store for one shell instance (the `/ide`
 * workbench and each 3D viewport get their own — they must never share
 * layout state). Call once per shell via `useState(() => createWorkspaceStore(...))`
 * and distribute through `WorkspaceProvider`.
 */
export function createWorkspaceStore(storageKey?: string): WorkspaceStore {
  const { regions: persisted, presets: persistedPresets } = loadPersistedLayout(storageKey);

  const persist = (regions: DockRegionLayout, zenMode: boolean, presets: Record<string, DockRegionLayout>) => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      const raw = JSON.stringify({ regions, zenMode, presets });
      if (workspaceLayoutPersistenceAdapter) {
        workspaceLayoutPersistenceAdapter.save(storageKey, raw);
      } else {
        window.localStorage.setItem(storageKey, raw);
      }
    } catch {
      // Storage can legitimately fail (quota, private mode) — layout persistence is a nicety, not a requirement.
    }
  };

  return create<WorkspaceState>()((set, get) => ({
    regions: persisted ?? emptyLayout(),
    draggingTabId: null,
    dropTargetRegion: null,
    zenMode: false,
    layoutPresets: persistedPresets,
    slotElements: {},

    registerTab: (region, tabId) => {
      const { regions, layoutPresets } = get();
      if (findRegionOf(regions, tabId)) return; // already placed (fresh default or restored from storage)

      const target = regions[region];
      const nextRegions: DockRegionLayout = {
        ...regions,
        [region]: {
          ...target,
          tabIds: [...target.tabIds, tabId],
          activeTabId: target.activeTabId ?? tabId,
        },
      };
      set({ regions: nextRegions });
      persist(nextRegions, get().zenMode, layoutPresets);
    },

    moveTab: (tabId, toRegion, atIndex) => {
      const { regions } = get();
      const fromRegion = findRegionOf(regions, tabId);
      if (fromRegion === toRegion && atIndex === undefined) return;

      const nextRegions: DockRegionLayout = { ...regions };

      if (fromRegion) {
        const source = nextRegions[fromRegion];
        const tabIds = source.tabIds.filter((id) => id !== tabId);
        nextRegions[fromRegion] = {
          ...source,
          tabIds,
          activeTabId: source.activeTabId === tabId ? tabIds[tabIds.length - 1] ?? null : source.activeTabId,
        };
      }

      const dest = nextRegions[toRegion];
      const destIds = fromRegion === toRegion ? nextRegions[toRegion].tabIds : dest.tabIds;
      const insertAt = atIndex === undefined ? destIds.length : Math.max(0, Math.min(atIndex, destIds.length));
      const nextDestIds = [...destIds.slice(0, insertAt), tabId, ...destIds.slice(insertAt)];

      nextRegions[toRegion] = {
        ...dest,
        tabIds: nextDestIds,
        activeTabId: tabId,
        open: true,
      };

      set({ regions: nextRegions });
      persist(nextRegions, get().zenMode, get().layoutPresets);
    },

    setActiveTab: (region, tabId) => {
      const { regions } = get();
      const nextRegions: DockRegionLayout = {
        ...regions,
        [region]: { ...regions[region], activeTabId: tabId },
      };
      set({ regions: nextRegions });
      persist(nextRegions, get().zenMode, get().layoutPresets);
    },

    closeTab: (region, tabId) => {
      const { regions } = get();
      const source = regions[region];
      const tabIds = source.tabIds.filter((id) => id !== tabId);
      const nextRegions: DockRegionLayout = {
        ...regions,
        [region]: {
          ...source,
          tabIds,
          activeTabId: source.activeTabId === tabId ? tabIds[tabIds.length - 1] ?? null : source.activeTabId,
        },
      };
      set({ regions: nextRegions });
      persist(nextRegions, get().zenMode, get().layoutPresets);
    },

    setRegionOpen: (region, open) => {
      const { regions } = get();
      const nextRegions: DockRegionLayout = { ...regions, [region]: { ...regions[region], open } };
      set({ regions: nextRegions });
      persist(nextRegions, get().zenMode, get().layoutPresets);
    },

    setRegionSize: (region, size) => {
      const { regions } = get();
      set({ regions: { ...regions, [region]: { ...regions[region], size } } });
      // Sizes are cheap to recompute and change continuously while dragging a sash — skip persisting every frame.
    },

    beginDrag: (tabId) => set({ draggingTabId: tabId }),
    setDropTarget: (region) => set({ dropTargetRegion: region }),
    endDrag: () => set({ draggingTabId: null, dropTargetRegion: null }),

    toggleZenMode: () => {
      const next = !get().zenMode;
      set({ zenMode: next });
      persist(get().regions, next, get().layoutPresets);
    },

    registerSlotElement: (tabId, el) =>
      set((state) => ({ slotElements: { ...state.slotElements, [tabId]: el } })),

    savePreset: (name: string) => {
      const { regions, layoutPresets } = get();
      const nextPresets = { ...layoutPresets, [name]: regions };
      set({ layoutPresets: nextPresets });
      persist(regions, get().zenMode, nextPresets);
    },

    loadPreset: (name: string) => {
      const { layoutPresets } = get();
      const preset = layoutPresets[name];
      if (!preset) return;
      set({ regions: preset });
      persist(preset, get().zenMode, layoutPresets);
    },

    deletePreset: (name: string) => {
      const { layoutPresets } = get();
      const nextPresets = { ...layoutPresets };
      delete nextPresets[name];
      set({ layoutPresets: nextPresets });
      persist(get().regions, get().zenMode, nextPresets);
    },
  }));
}
