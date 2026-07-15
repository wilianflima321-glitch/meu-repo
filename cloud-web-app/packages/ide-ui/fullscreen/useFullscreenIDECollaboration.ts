"use client";

import { useWorkbenchFullAccess } from './useWorkbenchFullAccess';
import { useWorkbenchPresence } from './useWorkbenchPresence';
import { useWorkbenchRealtimeCollaboration } from './useWorkbenchRealtimeCollaboration';

type UseFullscreenIDECollaborationOptions = {
  hasToken: boolean;
  projectId: string | null;
};

export function useFullscreenIDECollaboration({
  hasToken,
  projectId,
}: UseFullscreenIDECollaborationOptions) {
  const collaborationProjectId = projectId ?? '';

  const {
    fullAccessActiveGrant,
    toggleFullAccess: handleToggleFullAccess,
  } = useWorkbenchFullAccess({
    hasToken,
    projectId: collaborationProjectId,
  });

  const { headerCollaborators } = useWorkbenchPresence({
    hasToken,
    projectId: collaborationProjectId,
  });

  const {
    collaborationStatus,
    collaborationSession,
    collaborationConnected,
    collaborationNativeBindingEnabled,
    collaborationSyncLed,
    collaborationReadOnly,
    collaborationRole,
    editorPeers,
    broadcastCursor,
    broadcastSelection,
  } = useWorkbenchRealtimeCollaboration({
    hasToken,
    projectId: collaborationProjectId,
  });

  return {
    fullAccessActiveGrant,
    handleToggleFullAccess,
    headerCollaborators,
    collaborationStatus,
    collaborationSession,
    collaborationConnected,
    collaborationNativeBindingEnabled,
    collaborationSyncLed,
    collaborationReadOnly,
    collaborationRole,
    editorPeers,
    broadcastCursor,
    broadcastSelection,
  };
}
