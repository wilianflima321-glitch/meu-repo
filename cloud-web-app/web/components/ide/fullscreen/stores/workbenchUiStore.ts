import { create } from 'zustand';

import type { BottomPanelMode, PanelState } from '@/components/ide/modern-shell/types';
import type { PreviewMode, SidebarTab } from '@/components/ide/fullscreen/types';

export type WorkbenchUiState = {
  activeBottomPanel: BottomPanelMode;
  previewMode: PreviewMode;
  sidebarTab: SidebarTab;
  panelState: PanelState;
  commandPaletteMode: 'commands' | 'files' | null;
  setActiveBottomPanel: (panel: BottomPanelMode) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setPanelState: (panelState: PanelState) => void;
  resizePanel: (panel: keyof PanelState, size: number) => void;
  openCommandPalette: (mode: 'commands' | 'files') => void;
  closeCommandPalette: () => void;
};

export const DEFAULT_WORKBENCH_PANEL_STATE: PanelState = {
  sidebar: { open: true, size: 280 },
  editor: { open: true, size: 52 },
  preview: { open: true, size: 34 },
  chat: { open: true, size: 360 },
};

export const useWorkbenchUiStore = create<WorkbenchUiState>()((set) => ({
  activeBottomPanel: 'terminal',
  previewMode: 'runtime',
  sidebarTab: 'explorer',
  panelState: DEFAULT_WORKBENCH_PANEL_STATE,
  commandPaletteMode: null,
  setActiveBottomPanel: (activeBottomPanel) => set({ activeBottomPanel }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
  setPanelState: (panelState) => set({ panelState }),
  resizePanel: (panel, size) =>
    set((state) => ({
      panelState: {
        ...state.panelState,
        [panel]: { ...state.panelState[panel], size },
      },
    })),
  openCommandPalette: (commandPaletteMode) => set({ commandPaletteMode }),
  closeCommandPalette: () => set({ commandPaletteMode: null }),
}));
