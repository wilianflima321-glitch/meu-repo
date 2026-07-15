/**
 * Collaboration Rooms API - Aethel Engine
 * GET /api/collaboration/rooms - Lista salas ativas
 * POST /api/collaboration/rooms - Cria sala
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { createComponentLogger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

const logger = createComponentLogger('api.collaboration.rooms');

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
			new Error('FEATURE_NOT_AVAILABLE: collaboration requires the Basic plan or higher.'),
			{ code: 'FEATURE_NOT_AVAILABLE' }
		);
	}
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const entitlements = await requireEntitlementsForUser(user.userId);
    requireCollaborationEnabled(entitlements.plan.limits.collaborators);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (projectId) {
      const allowed = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { userId: user.userId },
            { members: { some: { userId: user.userId } } },
          ],
        },
        select: { id: true },
      });
      if (!allowed) {
        return NextResponse.json({ success: true, rooms: [] }, { status: 404 });
      }
    }

    const rooms = await prisma.collaborationRoom.findMany({
      where: projectId
        ? { projectId }
        : { participants: { some: { userId: user.userId } } },
      include: {
        participants: { select: { userId: true, status: true, lastSeen: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const roomsWithUsers = await Promise.all(
      rooms.map(async (room) => ({
        ...room,
        participants: await enrichParticipants(room.participants),
      })),
    );

    return NextResponse.json({
      success: true,
      rooms: roomsWithUsers,
    });
  } catch (error) {
    logger.error('Failed to list rooms', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const entitlements = await requireEntitlementsForUser(user.userId);
    requireCollaborationEnabled(entitlements.plan.limits.collaborators);
    const body = await request.json();
    const { name, type = 'project', projectId, fileId, maxParticipants } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Rooms de projeto exigem projectId; e o usuário precisa ter acesso ao projeto.
    if (type === 'project' && !projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required for project rooms' },
        { status: 400 }
      );
    }

    if (projectId) {
      const allowed = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { userId: user.userId },
            { members: { some: { userId: user.userId } } },
          ],
        },
        select: { id: true },
      });

      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }
    }

    const room = await prisma.collaborationRoom.create({
      data: {
        name,
        type,
        projectId: projectId || null,
        fileId: fileId || null,
        maxParticipants: typeof maxParticipants === 'number' ? maxParticipants : null,
        createdBy: user.userId,
        participants: {
          create: {
            userId: user.userId,
            status: 'online',
          },
        },
      },
      include: {
        participants: { select: { userId: true, status: true, lastSeen: true } },
      },
    });

    const roomWithUsers = {
      ...room,
      participants: await enrichParticipants(room.participants),
    };
    
    return NextResponse.json({
      success: true,
      room: roomWithUsers,
    });
  } catch (error) {
    logger.error('Failed to create room', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
