/**
 * Collaboration Room Detail API - Aethel Engine
 * GET /api/collaboration/rooms/[id]    - room details
 * POST /api/collaboration/rooms/[id]   - join or touch room participant state
 * DELETE /api/collaboration/rooms/[id] - leave room
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_ROOM_ID_LENGTH = 120;
const normalizeRoomId = (value?: string) => String(value ?? '').trim();

function requireCollaborationEnabled(collaboratorsLimit: number): void {
  if (collaboratorsLimit === 0) {
    throw Object.assign(
      new Error('FEATURE_NOT_AVAILABLE: collaboration requires Basic plan or higher.'),
      { code: 'FEATURE_NOT_AVAILABLE' }
    );
  }
}

async function assertRoomAccess(roomId: string, userId: string) {
  const room = await prisma.collaborationRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { select: { userId: true, status: true, lastSeen: true } },
    },
  });
  if (!room) {
    return { error: NextResponse.json({ success: false, error: 'ROOM_NOT_FOUND' }, { status: 404 }), room: null };
  }

  const isParticipant = room.participants.some((p) => p.userId === userId);
  if (!isParticipant) {
    if (!room.projectId) {
      return {
        error: NextResponse.json({ success: false, error: 'PROJECT_ACCESS_DENIED' }, { status: 403 }),
        room: null,
      };
    }

    const allowed = await prisma.project.findFirst({
      where: {
        id: room.projectId,
        OR: [{ userId }, { members: { some: { userId } } }],
      },
      select: { id: true },
    });
    if (!allowed) {
      return {
        error: NextResponse.json({ success: false, error: 'PROJECT_ACCESS_DENIED' }, { status: 403 }),
        room: null,
      };
    }
  }

  return { error: null, room };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'collaboration-room-detail-get',
      key: user.userId,
      max: 900,
      windowMs: 60 * 60 * 1000,
      message: 'Too many collaboration room detail requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const entitlements = await requireEntitlementsForUser(user.userId);
    requireCollaborationEnabled(entitlements.plan.limits.collaborators);

    const roomId = normalizeRoomId(params?.id);
    if (!roomId || roomId.length > MAX_ROOM_ID_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ROOM_ID', message: 'roomId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const { error, room } = await assertRoomAccess(roomId, user.userId);
    if (error) return error;
    if (!room) return apiInternalError();

    const presence = room.participants.map((p) => ({
      userId: p.userId,
      status: p.status,
      lastSeen: p.lastSeen,
    }));

    return NextResponse.json({
      success: true,
      room,
      presence,
    });
  } catch (error) {
    console.error('Failed to get room:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'collaboration-room-detail-post',
      key: user.userId,
      max: 420,
      windowMs: 60 * 60 * 1000,
      message: 'Too many collaboration room action requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const entitlements = await requireEntitlementsForUser(user.userId);
    requireCollaborationEnabled(entitlements.plan.limits.collaborators);

    const roomId = normalizeRoomId(params?.id);
    if (!roomId || roomId.length > MAX_ROOM_ID_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ROOM_ID', message: 'roomId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || 'join').trim().toLowerCase();
    if (action !== 'join' && action !== 'touch') {
      return NextResponse.json(
        { success: false, error: 'INVALID_ACTION', message: 'action must be join or touch.' },
        { status: 400 }
      );
    }

    const room = await prisma.collaborationRoom.findUnique({
      where: { id: roomId },
      select: { id: true, projectId: true, maxParticipants: true },
    });
    if (!room) {
      return NextResponse.json({ success: false, error: 'ROOM_NOT_FOUND' }, { status: 404 });
    }

    if (room.projectId) {
      const allowed = await prisma.project.findFirst({
        where: {
          id: room.projectId,
          OR: [{ userId: user.userId }, { members: { some: { userId: user.userId } } }],
        },
        select: { id: true },
      });
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'PROJECT_ACCESS_DENIED' }, { status: 403 });
      }
    }

    if (action === 'join' && typeof room.maxParticipants === 'number') {
      const count = await prisma.collaborationRoomParticipant.count({ where: { roomId: room.id } });
      if (count >= room.maxParticipants) {
        return NextResponse.json({ success: false, error: 'ROOM_FULL' }, { status: 409 });
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
    console.error('Failed to join/touch room:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'collaboration-room-detail-delete',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many collaboration room leave requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const entitlements = await requireEntitlementsForUser(user.userId);
    requireCollaborationEnabled(entitlements.plan.limits.collaborators);

    const roomId = normalizeRoomId(params?.id);
    if (!roomId || roomId.length > MAX_ROOM_ID_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ROOM_ID', message: 'roomId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    await prisma.collaborationRoomParticipant
      .delete({
        where: { roomId_userId: { roomId, userId: user.userId } },
      })
      .catch(() => null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to leave room:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
