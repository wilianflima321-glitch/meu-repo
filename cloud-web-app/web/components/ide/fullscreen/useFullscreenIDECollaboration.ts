"use client";

import { useWorkbenchFullAccess } from '@/components/ide/fullscreen/useWorkbenchFullAccess';
import { useWorkbenchPresence } from '@/components/ide/fullscreen/useWorkbenchPresence';
import { useWorkbenchRealtimeCollaboration } from '@/components/ide/fullscreen/useWorkbenchRealtimeCollaboration';

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
    editorPeers,
    broadcastCursor,
    broadcastSelection,
  };
}
