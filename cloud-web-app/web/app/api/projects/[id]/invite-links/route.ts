/**
 * Invite Links API - Aethel Engine
 * GET /api/projects/[id]/invite-links - list invite links
 * POST /api/projects/[id]/invite-links - create invite link
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { nanoid } from 'nanoid';
import { buildAppUrl } from '@/lib/server/app-origin';
import { notImplementedCapability } from '@/lib/server/capability-response';

export const dynamic = 'force-dynamic';

const MAX_PROJECT_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();
type RouteContext = { params: Promise<{ id: string }> };

interface InviteLinkBody {
  role?: 'editor' | 'viewer';
  expiresIn?: number;
  maxUsage?: number;
}

async function resolveProjectId(ctx: RouteContext) {
  const resolved = await ctx.params;
  return normalizeProjectId(resolved?.id);
}

function invalidProjectIdResponse() {
  return NextResponse.json(
    {
      error: 'INVALID_PROJECT_ID',
      message: 'projectId is required and must be under 120 characters.',
    },
    { status: 400 }
  );
}

function notAuthorizedResponse() {
  return NextResponse.json(
    {
      error: 'PROJECT_ACCESS_DENIED',
      message: 'Project access denied.',
    },
    { status: 403 }
  );
}

async function assertProjectAdminAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ userId }, { members: { some: { userId, role: 'admin' } } }],
    },
    select: { id: true },
  });

  return project;
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-invite-links-get',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many invite link list requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = await resolveProjectId(ctx);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return invalidProjectIdResponse();
    }

    const project = await assertProjectAdminAccess(projectId, user.userId);
    if (!project) {
      return notAuthorizedResponse();
    }

    let inviteLinks: any[] = [];
    try {
      inviteLinks = await (prisma as any).inviteLink.findMany({
        where: {
          projectId,
          OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return notImplementedCapability({
        message: 'Invite links storage is not available. Run migrations to enable this feature.',
        capability: 'PROJECT_INVITE_LINKS',
        milestone: 'P1',
        metadata: { projectId },
      });
    }

    return NextResponse.json({
      success: true,
      data: inviteLinks.map((link: any) => ({
        id: link.id,
        code: link.code,
        role: link.role,
        expiresAt: link.expiresAt?.toISOString() || null,
        usageCount: link.usageCount || 0,
        maxUsage: link.maxUsage || null,
      })),
    });
  } catch (error) {
    console.error('[Invite Links API] Error:', error);
    return NextResponse.json(
      { error: 'INVITE_LINKS_READ_FAILED', message: 'Failed to read invite links.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-invite-links-post',
      key: user.userId,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many invite link creation attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const projectId = await resolveProjectId(ctx);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return invalidProjectIdResponse();
    }

    const body = (await request.json().catch(() => null)) as InviteLinkBody | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'INVALID_BODY', message: 'Body must be a valid JSON object.' },
        { status: 400 }
      );
    }

    const role = body.role || 'viewer';
    const expiresInMs = Number.isFinite(Number(body.expiresIn)) ? Number(body.expiresIn) : undefined;
    const maxUsageNormalized = Number.isFinite(Number(body.maxUsage)) ? Number(body.maxUsage) : null;

    if (!['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'INVALID_ROLE', message: 'role must be editor or viewer.' },
        { status: 400 }
      );
    }

    const project = await assertProjectAdminAccess(projectId, user.userId);
    if (!project) {
      return notAuthorizedResponse();
    }

    const code = nanoid(16);
    const expiresAt = expiresInMs
      ? new Date(Date.now() + expiresInMs)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let inviteLink: any;
    try {
      inviteLink = await (prisma as any).inviteLink.create({
        data: {
          projectId,
          code,
          role,
          expiresAt,
          maxUsage: maxUsageNormalized,
          usageCount: 0,
          createdBy: user.userId,
        },
      });
    } catch (error) {
      console.error('[Invite Links API] InviteLink model not available:', error);
      return notImplementedCapability({
        message: 'Invite links storage is not available. Run migrations to enable this feature.',
        capability: 'PROJECT_INVITE_LINKS',
        milestone: 'P1',
        metadata: { projectId },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: inviteLink.id,
        code: inviteLink.code,
        role: inviteLink.role,
        expiresAt: inviteLink.expiresAt?.toISOString() || null,
        usageCount: inviteLink.usageCount,
        maxUsage: inviteLink.maxUsage,
        url: buildAppUrl(`/invite/${code}`, request),
      },
    });
  } catch (error) {
    console.error('[Invite Links API] Error:', error);
    return NextResponse.json(
      { error: 'INVITE_LINK_CREATE_FAILED', message: 'Failed to create invite link.' },
      { status: 500 }
    );
  }
}
