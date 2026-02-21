/**
 * Aethel Engine - Project Share API
 *
 * Share endpoints are explicitly gated until persistence and permission
 * workflows are fully implemented.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { notImplementedCapability } from '@/lib/server/capability-response';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

const MAX_PROJECT_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();

interface ShareConfig {
  type: 'link' | 'email' | 'team';
  emails?: string[];
  teamId?: string;
  permissions: 'view' | 'edit' | 'admin';
  expiresIn?: number;
}

async function assertProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json(
      { error: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' },
      { status: 404 }
    );
  }

  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-share-post',
      key: user.userId,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project share operations. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = normalizeProjectId(params?.id);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const accessError = await assertProjectAccess(projectId, user.userId);
    if (accessError) return accessError;

    const body: ShareConfig = await request.json();
    const type = body?.type;
    const permissions = body?.permissions;
    const emails = Array.isArray(body?.emails) ? body.emails : [];
    const teamId = typeof body?.teamId === 'string' ? body.teamId.trim() : '';

    if (!type || !permissions) {
      return NextResponse.json(
        { error: 'INVALID_SHARE_CONFIG', message: 'type and permissions are required.' },
        { status: 400 }
      );
    }

    return notImplementedCapability({
      message: 'Project sharing is not wired to persistence yet.',
      capability: 'PROJECT_SHARE',
      milestone: 'P1',
      metadata: {
        projectId,
        type,
        permissions,
        hasEmails: emails.length > 0,
        hasTeam: Boolean(teamId),
      },
    });
  } catch (error) {
    console.error('Project share POST error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-share-get',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project share list requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = normalizeProjectId(params?.id);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const accessError = await assertProjectAccess(projectId, user.userId);
    if (accessError) return accessError;

    return notImplementedCapability({
      message: 'Project share listing is not wired to persistence yet.',
      capability: 'PROJECT_SHARE',
      milestone: 'P1',
      metadata: { projectId },
    });
  } catch (error) {
    console.error('Project share GET error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
