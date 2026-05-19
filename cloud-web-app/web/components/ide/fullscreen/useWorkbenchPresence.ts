'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import type { RemotePeer } from '@/hooks/useCollaborationAwareness';
import {
  collaborationColorForUser,
  getAuthHeaders,
} from '@/components/ide/fullscreen/workbench-helpers';
import type { CollaborationRoomsResponse } from '@/components/ide/fullscreen/types';

type UseWorkbenchPresenceParams = {
  hasToken: boolean;
  projectId: string;
};

export function useWorkbenchPresence({
  hasToken,
  projectId,
}: UseWorkbenchPresenceParams) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawToken = window.localStorage.getItem('token');
    if (!rawToken) {
      setCurrentUserId(null);
      return;
    }

    try {
      const payload = JSON.parse(window.atob(rawToken.split('.')[1] ?? ''));
      setCurrentUserId(payload.userId ?? payload.sub ?? payload.id ?? null);
    } catch {
      setCurrentUserId(null);
    }
  }, [hasToken]);

  const { data: collaborationRoomsData } = useSWR<CollaborationRoomsResponse>(
    hasToken && projectId && projectId !== 'default'
      ? `/api/collaboration/rooms?projectId=${encodeURIComponent(projectId)}`
      : null,
    async (url: string) => {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      const payload = (await response.json().catch(() => ({ success: false, rooms: [] }))) as CollaborationRoomsResponse;
      if (!response.ok) {
        throw new Error(`Failed to load collaborative presence: ${response.status}`);
      }
      return payload;
    },
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
    },
  );

  const headerCollaborators = useMemo<RemotePeer[]>(() => {
    const rooms = collaborationRoomsData?.rooms ?? [];
    const collaborators = new Map<string, RemotePeer>();

    for (const room of rooms) {
      for (const participant of room.participants ?? []) {
        if (!participant?.userId) continue;
        if (currentUserId && participant.userId === currentUserId) continue;

        const candidate: RemotePeer = {
          clientId: Math.abs(
            Array.from(participant.userId).reduce(
              (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
              0,
            ),
          ),
          id: participant.userId,
          name: participant.user?.name?.trim() || `User ${participant.userId.slice(0, 6)}`,
          avatar: participant.user?.avatar ?? undefined,
          color: collaborationColorForUser(participant.userId),
          lastActivity: participant.lastSeen ? new Date(participant.lastSeen).getTime() : Date.now(),
        };

        const existing = collaborators.get(participant.userId);
        if (!existing || existing.lastActivity < candidate.lastActivity) {
          collaborators.set(participant.userId, candidate);
        }
      }
    }

    return Array.from(collaborators.values())
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, 6);
  }, [collaborationRoomsData?.rooms, currentUserId]);

  return {
    headerCollaborators,
  };
}

export default useWorkbenchPresence;
