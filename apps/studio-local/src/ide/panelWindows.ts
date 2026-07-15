import { invoke } from '@tauri-apps/api/core'

/**
 * Missão Suprema 1 — Multi-Monitor & Undocking.
 *
 * Asks the Rust side (`open_panel_window` in `main.rs`) to spawn a brand-new
 * OS window pointed at `index.html?panel=<id>`; `UndockedPanelWindow.tsx`
 * reads that query param and renders just that one panel. No custom sync
 * channel is required — the undocked window listens to the exact same
 * global Tauri events (`scene_graph_changed`, `hardware_sample`, ...) the
 * main window does.
 */
export type UndockablePanel = 'scene' | 'hardware' | 'terminal'

const PANEL_TITLES: Record<UndockablePanel, string> = {
  scene: 'Aethel Studio — Scene (Undocked)',
  hardware: 'Aethel Studio — Hardware Profiler (Undocked)',
  terminal: 'Aethel Studio — Terminal (Undocked)',
}

export async function openPanelWindow(panel: UndockablePanel): Promise<void> {
  await invoke('open_panel_window', {
    label: `panel-${panel}`,
    title: PANEL_TITLES[panel],
    panel,
  })
}
