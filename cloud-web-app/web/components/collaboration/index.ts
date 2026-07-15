/**
 * Collaboration UI exports.
 *
 * Import points of entry for the Yjs-backed collaboration primitives:
 *   - `CollaboratorsBar`     : peer avatar strip for toolbars and headers.
 *   - `FilePresenceDot`      : compact avatar stack for explorer/file presence.
 *   - `RemoteCursorLayer`    : absolute overlay of remote collaborator cursors.
 *
 * Hooks:
 *   - `useCollaborationAwareness` : subscribe to a `y-protocols` Awareness.
 */

export { default as CollaboratorsBar } from './CollaboratorsBar'
export { default as FilePresenceDot } from './FilePresenceDot'
export { default as RemoteCursorLayer } from './RemoteCursorLayer'
export { CollabSyncLed } from './CollabSyncLed'

export { default as useCollaborationAwareness } from '@/hooks/useCollaborationAwareness'
export type { RemotePeer, RemoteCursor, RemoteSelection } from '@/hooks/useCollaborationAwareness'
