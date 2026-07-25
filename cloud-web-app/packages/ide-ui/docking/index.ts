export { WorkspaceProvider, useWorkspaceStore, usePanelMetaRegistry } from './WorkspaceProvider';
export { DockPanel } from './DockPanel';
export { DockRegion } from './DockRegion';
export { DockTabStrip } from './DockTabStrip';
export { DockResizeHandle } from './DockResizeHandle';
export { useZenMode } from './useZenMode';
export {
  createWorkspaceStore,
  registerWorkspaceLayoutPersistence,
} from './workspaceStore';
export type {
  WorkspaceState,
  WorkspaceStore,
  WorkspaceLayoutPersistenceAdapter,
} from './workspaceStore';
export type {
  DockRegionId,
  DockRegionState,
  DockRegionLayout,
  DockDragPayload,
  DockPanelMeta,
} from './types';
export { DOCK_REGION_IDS, DOCK_TAB_DRAG_MIME } from './types';
