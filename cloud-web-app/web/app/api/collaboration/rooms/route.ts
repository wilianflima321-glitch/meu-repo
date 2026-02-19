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
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

function requireCollaborationEnabled(collaboratorsLimit: number): void {
	if (collaboratorsLimit === 0) {
		throw Object.assign(
			new Error('FEATURE_NOT_AVAILABLE: colaboração requer plano Basic ou superior.'),
			{ code: 'FEATURE_NOT_AVAILABLE' }
		);
	}
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'collaboration-rooms-get',
      key: user.userId,
      max: 720,
      windowMs: 60 * 60 * 1000,
      message: 'Too many collaboration room list requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
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

    return NextResponse.json({
      success: true,
      rooms,
    });
  } catch (error) {
    console.error('Failed to list rooms:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'collaboration-rooms-post',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many collaboration room create requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
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
    
    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error) {
    console.error('Failed to create room:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
