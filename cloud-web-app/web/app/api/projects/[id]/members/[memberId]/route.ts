/**
 * Project Member Detail API - Aethel Engine
 * PATCH /api/projects/[id]/members/[memberId] - update role
 * DELETE /api/projects/[id]/members/[memberId] - remove member
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const MAX_PROJECT_ID_LENGTH = 120;
const MAX_MEMBER_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();
const normalizeMemberId = (value?: string) => String(value ?? '').trim();
type RouteContext = { params: Promise<{ id: string; memberId: string }> };

type ProjectRole = 'viewer' | 'editor';

interface UpdateMemberBody {
  role?: ProjectRole;
}

async function resolveRouteParams(ctx: RouteContext) {
  const resolved = await ctx.params;
  return {
    projectId: normalizeProjectId(resolved?.id),
    memberId: normalizeMemberId(resolved?.memberId),
  };
}

function invalidProjectIdResponse() {
  return NextResponse.json(
    { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
    { status: 400 }
  );
}

function invalidMemberIdResponse() {
  return NextResponse.json(
    { error: 'INVALID_MEMBER_ID', message: 'memberId is required and must be under 120 characters.' },
    { status: 400 }
  );
}

async function assertOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-member-detail-patch',
      key: user.userId,
      max: 90,
      windowMs: 60 * 60 * 1000,
      message: 'Too many member update attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    await requireEntitlementsForUser(user.userId);
    const { projectId, memberId } = await resolveRouteParams(ctx);

    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return invalidProjectIdResponse();
    }
    if (!memberId || memberId.length > MAX_MEMBER_ID_LENGTH) {
      return invalidMemberIdResponse();
    }

    const body = (await request.json().catch(() => null)) as UpdateMemberBody | null;
    const role = body?.role;

    if (!role || !['viewer', 'editor'].includes(role)) {
      return NextResponse.json(
        { error: 'INVALID_ROLE', message: 'role must be viewer or editor.' },
        { status: 400 }
      );
    }

    const project = await assertOwner(projectId, user.userId);
    if (!project) {
      return NextResponse.json(
        { error: 'PROJECT_OWNER_REQUIRED', message: 'Only the project owner can update members.' },
        { status: 403 }
      );
    }

    const member = await prisma.projectMember.findFirst({ where: { id: memberId, projectId }, select: { id: true } });
    if (!member) {
      return NextResponse.json(
        { error: 'MEMBER_NOT_FOUND', message: 'Member not found in this project.' },
        { status: 404 }
      );
    }

    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error('Failed to update member:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-member-detail-delete',
      key: user.userId,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many member removal attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    await requireEntitlementsForUser(user.userId);
    const { projectId, memberId } = await resolveRouteParams(ctx);

    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return invalidProjectIdResponse();
    }
    if (!memberId || memberId.length > MAX_MEMBER_ID_LENGTH) {
      return invalidMemberIdResponse();
    }

    const project = await assertOwner(projectId, user.userId);

    if (!project) {
      const selfMember = await prisma.projectMember.findFirst({
        where: { id: memberId, projectId, userId: user.userId },
        select: { id: true },
      });

      if (!selfMember) {
        return NextResponse.json(
          { error: 'PROJECT_OWNER_OR_SELF_REQUIRED', message: 'Only project owner or member itself can remove membership.' },
          { status: 403 }
        );
      }

      await prisma.projectMember.delete({ where: { id: memberId } });
      return NextResponse.json({ success: true, message: 'Left project.' });
    }

    const member = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'MEMBER_NOT_FOUND', message: 'Member not found in this project.' },
        { status: 404 }
      );
    }

    await prisma.projectMember.delete({ where: { id: memberId } });

    return NextResponse.json({ success: true, message: 'Member removed.' });
  } catch (error) {
    console.error('Failed to remove member:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
