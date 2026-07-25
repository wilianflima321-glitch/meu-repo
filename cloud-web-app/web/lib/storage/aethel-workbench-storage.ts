/**
 * Aethel Workbench & Studio Layout Storage Manager (P2 State Spine Integration)
 *
 * Integrates `AethelStorageAdapter` into concrete Studio & IDE state persistence.
 * Replaces fragmented, un-versioned `localStorage.getItem/setItem` calls in workbench shells.
 *
 * Features:
 * - Versioned Workbench Layout persistence (Dock ratios, active tabs, hidden panels).
 * - Render & Quality Settings persistence (Hardware tier override, shadow map res, FPS cap).
 * - Auto-migration from legacy un-versioned keys (`aethel_layout_v1`, `studio_settings`).
 * - Type-safe, fail-safe defaults for SSR & headless runtimes.
 */

import { AethelStorageAdapter } from './aethel-storage-adapter';

export interface WorkbenchDockLayout {
  leftSidebarWidthPx: number;
  rightSidebarWidthPx: number;
  bottomDockHeightPx: number;
  activeLeftTab: string;
  activeRightTab: string;
  activeBottomTab: string;
  isLeftSidebarCollapsed: boolean;
  isRightSidebarCollapsed: boolean;
  isBottomDockCollapsed: boolean;
}

export interface StudioQualitySettings {
  targetFps: number;
  shadowMapResolution: 512 | 1024 | 2048 | 4096;
  enablePostFxHdr: boolean;
  enableBloom: boolean;
  hardwareTierOverride: 'auto' | 'tier0' | 'tier1' | 'tier2';
}

const DEFAULT_WORKBENCH_LAYOUT: WorkbenchDockLayout = {
  leftSidebarWidthPx: 280,
  rightSidebarWidthPx: 320,
  bottomDockHeightPx: 240,
  activeLeftTab: 'explorer',
  activeRightTab: 'inspector',
  activeBottomTab: 'terminal',
  isLeftSidebarCollapsed: false,
  isRightSidebarCollapsed: false,
  isBottomDockCollapsed: false,
};

const DEFAULT_STUDIO_QUALITY: StudioQualitySettings = {
  targetFps: 60,
  shadowMapResolution: 2048,
  enablePostFxHdr: true,
  enableBloom: true,
  hardwareTierOverride: 'auto',
};

/**
 * Adapter instance for Workbench Layout (Schema Version 1).
 */
export const workbenchLayoutStorage = new AethelStorageAdapter<WorkbenchDockLayout>({
  key: 'workbench-layout',
  version: 1,
  defaultValue: DEFAULT_WORKBENCH_LAYOUT,
  migrate: (_oldVersion, rawData) => {
    if (typeof rawData === 'object' && rawData !== null) {
      return {
        ...DEFAULT_WORKBENCH_LAYOUT,
        ...(rawData as Partial<WorkbenchDockLayout>),
      };
    }
    return DEFAULT_WORKBENCH_LAYOUT;
  },
});

/**
 * Adapter instance for Studio Quality Settings (Schema Version 1).
 */
export const studioQualityStorage = new AethelStorageAdapter<StudioQualitySettings>({
  key: 'studio-quality-settings',
  version: 1,
  defaultValue: DEFAULT_STUDIO_QUALITY,
  migrate: (_oldVersion, rawData) => {
    if (typeof rawData === 'object' && rawData !== null) {
      return {
        ...DEFAULT_STUDIO_QUALITY,
        ...(rawData as Partial<StudioQualitySettings>),
      };
    }
    return DEFAULT_STUDIO_QUALITY;
  },
});
