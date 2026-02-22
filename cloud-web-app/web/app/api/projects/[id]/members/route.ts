/**
 * Project Members API - Aethel Engine
 * GET /api/projects/[id]/members - list members
 * POST /api/projects/[id]/members - add member
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const MAX_PROJECT_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();
type RouteContext = { params: Promise<{ id: string }> };

type ProjectRole = 'viewer' | 'editor';

interface AddMemberBody {
  email?: string;
  role?: ProjectRole;
}

async function resolveProjectId(ctx: RouteContext) {
  const resolved = await ctx.params;
  return normalizeProjectId(resolved?.id);
}

function invalidProjectIdResponse() {
  return NextResponse.json(
    { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
    { status: 400 }
  );
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-members-get',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project members requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const entitlements = await requireEntitlementsForUser(user.userId);
    const projectId = await resolveProjectId(ctx);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return invalidProjectIdResponse();
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ userId: user.userId }, { members: { some: { userId: user.userId } } }],
      },
      select: { id: true, userId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' },
        { status: 404 }
      );
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const owner = await prisma.user.findUnique({
      where: { id: project.userId },
      select: { id: true, name: true, email: true, avatar: true },
    });

    return NextResponse.json({
      success: true,
      projectId,
      owner: owner ? { ...owner, role: 'owner' } : null,
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt,
        user: member.user,
      })),
      collaboratorsLimit: entitlements.plan.limits.collaborators,
    });
  } catch (error) {
    console.error('Failed to list members:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-members-post',
      key: user.userId,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many member invitation attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const entitlements = await requireEntitlementsForUser(user.userId);
    const projectId = await resolveProjectId(ctx);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return invalidProjectIdResponse();
    }

    const body = (await request.json().catch(() => null)) as AddMemberBody | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'INVALID_BODY', message: 'Body must be a valid JSON object.' },
        { status: 400 }
      );
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role: ProjectRole = body.role === 'editor' ? 'editor' : 'viewer';

    if (!email) {
      return NextResponse.json({ error: 'EMAIL_REQUIRED', message: 'email is required.' }, { status: 400 });
    }

    if (!['viewer', 'editor'].includes(role)) {
      return NextResponse.json(
        { error: 'INVALID_ROLE', message: 'role must be viewer or editor.' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { id: true, userId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'PROJECT_OWNER_REQUIRED', message: 'Only the project owner can add members.' },
        { status: 403 }
      );
    }

    const collaboratorsLimit = entitlements.plan.limits.collaborators;
    if (collaboratorsLimit !== -1) {
      const currentCount = await prisma.projectMember.count({ where: { projectId } });
      if (currentCount >= collaboratorsLimit) {
        return NextResponse.json(
          {
            error: 'COLLABORATOR_LIMIT_REACHED',
            message: `Collaborator limit (${collaboratorsLimit}) reached. Upgrade to add more.`,
            plan: entitlements.plan.id,
          },
          { status: 402 }
        );
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, avatar: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'TARGET_USER_NOT_FOUND', message: 'No user found for this email.' },
        { status: 404 }
      );
    }

    if (targetUser.id === project.userId) {
      return NextResponse.json(
        { error: 'OWNER_CANNOT_BE_MEMBER', message: 'Project owner cannot be added as member.' },
        { status: 400 }
      );
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUser.id } },
    });

    if (existing) {
      if (existing.role !== role) {
        const updated = await prisma.projectMember.update({
          where: { id: existing.id },
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

        return NextResponse.json({
          success: true,
          member: updated,
          message: 'Member role updated.',
        });
      }

      return NextResponse.json(
        { error: 'MEMBER_ALREADY_EXISTS', message: 'User is already a member.' },
        { status: 409 }
      );
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUser.id,
        role,
      },
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

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (error) {
    console.error('Failed to add member:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
