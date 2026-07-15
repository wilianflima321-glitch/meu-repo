/**
 * Aethel Docking Engine — shared types.
 *
 * Design contract (per AGDS directive): the Zustand store below never holds
 * React content, only a data tree of tab IDs. Region -> tab-id array, plus
 * an active tab per region. Moving a tab across regions is a plain array
 * mutation (`splice` out of the old region, `push`/`splice` into the new
 * one); React re-renders the new arrangement. Actual panel content is kept
 * mounted where it was authored and *portaled* into whichever region
 * currently owns its tab (see `DockPanel.tsx`), so dragging a tab across
 * regions never remounts — and never loses the state of — the panel inside
 * it (scroll position, expanded folders, terminal scrollback, etc).
 */

import type { LucideIcon } from 'lucide-react'

export type DockRegionId = 'leftBar' | 'rightBar' | 'bottomBar' | 'centerCanvas'

export const DOCK_REGION_IDS: readonly DockRegionId[] = ['leftBar', 'rightBar', 'bottomBar', 'centerCanvas']

export interface DockRegionState {
  /** Ordered tab IDs currently docked in this region. Just IDs — no components. */
  tabIds: string[]
  /** Which of `tabIds` is currently visible. Null when the region is empty. */
  activeTabId: string | null
  /** Whether the region is collapsed/hidden (independent of Zen Mode). */
  open: boolean
  /** Size of the region as a percentage of its axis (width for left/right, height for bottom). */
  size: number
}

export type DockRegionLayout = Record<DockRegionId, DockRegionState>

export interface DockDragPayload {
  tabId: string
  fromRegion: DockRegionId
}

/** MIME type used on the native HTML5 DataTransfer while a dock tab is being dragged. */
export const DOCK_TAB_DRAG_MIME = 'application/vnd.aethel.dock-tab'

export interface DockPanelMeta {
  id: string
  title: string
  /** lucide-react icon component, rendered at 14px in the tab strip. */
  icon?: LucideIcon
  closable?: boolean
  defaultRegion: DockRegionId
}
