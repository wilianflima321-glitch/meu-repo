/**
 * Collaboration Rooms API - Aethel Engine
 * GET /api/collaboration/rooms - list active rooms
 * POST /api/collaboration/rooms - create room
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_PROJECT_ID_LENGTH = 120;
const MAX_NAME_LENGTH = 200;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();

function requireCollaborationEnabled(collaboratorsLimit: number): void {
  if (collaboratorsLimit === 0) {
    throw Object.assign(
      new Error('FEATURE_NOT_AVAILABLE: collaboration requires Basic plan or higher.'),
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
    const projectId = normalizeProjectId(searchParams.get('projectId'));
    if (projectId && projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PROJECT_ID', message: 'projectId must be under 120 characters.' },
        { status: 400 }
      );
    }

    if (projectId) {
      const allowed = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [{ userId: user.userId }, { members: { some: { userId: user.userId } } }],
        },
        select: { id: true },
      });
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' },
          { status: 404 }
        );
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
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const type = body?.type || 'project';
    const projectId = normalizeProjectId(body?.projectId);
    const fileId = typeof body?.fileId === 'string' ? body.fileId.trim() : '';
    const maxParticipants =
      typeof body?.maxParticipants === 'number' ? body.maxParticipants : null;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'NAME_REQUIRED', message: 'name is required.' },
        { status: 400 }
      );
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'INVALID_NAME', message: 'name must be under 200 characters.' },
        { status: 400 }
      );
    }
    if (projectId && projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PROJECT_ID', message: 'projectId must be under 120 characters.' },
        { status: 400 }
      );
    }

    if (type === 'project' && !projectId) {
      return NextResponse.json(
        { success: false, error: 'PROJECT_ID_REQUIRED', message: 'projectId is required for project rooms.' },
        { status: 400 }
      );
    }

    if (projectId) {
      const allowed = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [{ userId: user.userId }, { members: { some: { userId: user.userId } } }],
        },
        select: { id: true },
      });
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' },
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
        maxParticipants,
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
