/**
 * Collaboration Room Detail API - Aethel Engine
 * GET /api/collaboration/rooms/[id] - Detalhes da sala
 * POST /api/collaboration/rooms/[id]/join - Entrar na sala
 * POST /api/collaboration/rooms/[id]/leave - Sair da sala
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { createComponentLogger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

const logger = createComponentLogger('api.collaboration.room');

type RoomParticipantSnapshot = {
  userId: string;
  status: string;
  lastSeen: Date;
};

async function enrichParticipants<T extends RoomParticipantSnapshot>(participants: T[]) {
  const userIds = [...new Set(participants.map((participant) => participant.userId))];
  if (userIds.length === 0) {
    return participants.map((participant) => ({
      ...participant,
      user: { name: null, avatar: null },
    }));
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, avatar: true },
  });

  const usersById = new Map(users.map((user) => [user.id, user]));

  return participants.map((participant) => ({
    ...participant,
    user: usersById.get(participant.userId)
      ? {
          name: usersById.get(participant.userId)?.name ?? null,
          avatar: usersById.get(participant.userId)?.avatar ?? null,
        }
      : { name: null, avatar: null },
  }));
}

function requireCollaborationEnabled(collaboratorsLimit: number): void {
	if (collaboratorsLimit === 0) {
		throw Object.assign(
			new Error('FEATURE_NOT_AVAILABLE: colaboração requer plano Basic ou superior.'),
			{ code: 'FEATURE_NOT_AVAILABLE' }
		);
	}
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const entitlements = await requireEntitlementsForUser(user.userId);
    requireCollaborationEnabled(entitlements.plan.limits.collaborators);
    const { id } = params;

    const room = await prisma.collaborationRoom.findUnique({
      where: { id },
      include: {
        participants: { select: { userId: true, status: true, lastSeen: true } },
      },
    });

    if (!room) {
      throw Object.assign(new Error('ROOM_NOT_FOUND'), { code: 'ROOM_NOT_FOUND' });
    }

    // Autorização: participante OU acesso ao projeto (se houver projectId)
    const isParticipant = room.participants.some((p) => p.userId === user.userId);
    if (!isParticipant) {
      if (room.projectId) {
        const allowed = await prisma.project.findFirst({
          where: {
            id: room.projectId,
            OR: [
              { userId: user.userId },
              { members: { some: { userId: user.userId } } },
            ],
          },
          select: { id: true },
        });
        if (!allowed) {
          throw Object.assign(new Error('PROJECT_ACCESS_DENIED'), { code: 'PROJECT_ACCESS_DENIED' });
        }
      } else {
        throw Object.assign(new Error('PROJECT_ACCESS_DENIED'), { code: 'PROJECT_ACCESS_DENIED' });
      }
    }

    const participants = await enrichParticipants(room.participants);
    const presence = participants.map((p) => ({
      userId: p.userId,
      status: p.status,
      lastSeen: p.lastSeen,
      user: p.user,
    }));
    
    return NextResponse.json({
      success: true,
      room: {
        ...room,
        participants,
      },
      presence,
    });
  } catch (error) {
    logger.error('Failed to get room', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

// POST /api/collaboration/rooms/[id]  { action: 'join' | 'touch' }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const entitlements = await requireEntitlementsForUser(user.userId);
    requireCollaborationEnabled(entitlements.plan.limits.collaborators);
    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || 'join');

    const room = await prisma.collaborationRoom.findUnique({
      where: { id },
      select: { id: true, projectId: true, maxParticipants: true },
    });
    if (!room) {
      throw Object.assign(new Error('ROOM_NOT_FOUND'), { code: 'ROOM_NOT_FOUND' });
    }

    // Se a sala é de projeto, precisa de acesso ao projeto.
    if (room.projectId) {
      const allowed = await prisma.project.findFirst({
        where: {
          id: room.projectId,
          OR: [
            { userId: user.userId },
            { members: { some: { userId: user.userId } } },
          ],
        },
        select: { id: true },
      });
      if (!allowed) {
        throw Object.assign(new Error('PROJECT_ACCESS_DENIED'), { code: 'PROJECT_ACCESS_DENIED' });
      }
    }

    if (action !== 'join' && action !== 'touch') {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    if (action === 'join') {
      if (typeof room.maxParticipants === 'number') {
        const count = await prisma.collaborationRoomParticipant.count({
          where: { roomId: room.id },
        });
        if (count >= room.maxParticipants) {
          return NextResponse.json(
            { success: false, error: 'ROOM_FULL' },
            { status: 409 }
          );
        }
      }
    }

    await prisma.collaborationRoomParticipant.upsert({
      where: { roomId_userId: { roomId: room.id, userId: user.userId } },
      create: {
        roomId: room.id,
        userId: user.userId,
        status: 'online',
        lastSeen: new Date(),
      },
      update: {
        status: 'online',
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to join or touch room', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

// DELETE /api/collaboration/rooms/[id] - leave
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const entitlements = await requireEntitlementsForUser(user.userId);
    requireCollaborationEnabled(entitlements.plan.limits.collaborators);
    const { id } = params;

    await prisma.collaborationRoomParticipant.delete({
      where: { roomId_userId: { roomId: id, userId: user.userId } },
    }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to leave room', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
