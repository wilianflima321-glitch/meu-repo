/**
 * Collaboration UI exports.
 *
 * Import points of entry for the Yjs-backed collaboration primitives:
 *   - `CollaboratorsBar`     : peer avatar strip for toolbars and headers.
 *   - `FilePresenceDot`      : compact avatar stack for explorer/file presence.
 *   - `RemoteCursorLayer`    : absolute overlay of remote collaborator cursors.
 *   - `CollaborationPanel`   : full chat + presence + settings panel.
 *   - `VersionHistorySlider` : time-machine UI for replaying edits.
 *
 * Hooks:
 *   - `useCollaborationAwareness` : subscribe to a `y-protocols` Awareness.
 */

export { default as CollaboratorsBar } from './CollaboratorsBar'
export { default as FilePresenceDot } from './FilePresenceDot'
export { default as RemoteCursorLayer } from './RemoteCursorLayer'
export { default as CollaborationPanel } from './CollaborationPanel'
export { default as VersionHistorySlider } from './VersionHistorySlider'

export { default as useCollaborationAwareness } from '@/hooks/useCollaborationAwareness'
export type { RemotePeer, RemoteCursor, RemoteSelection } from '@/hooks/useCollaborationAwareness'
