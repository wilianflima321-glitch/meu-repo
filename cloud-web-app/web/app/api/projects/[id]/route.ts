import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

const MAX_PROJECT_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();

type ProjectRouteContext = { params: Promise<{ id: string }> };

// GET /api/projects/[id] - get single project
export async function GET(req: NextRequest, { params }: ProjectRouteContext) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-detail-get',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project detail requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const { id } = await params;
    const projectId = normalizeProjectId(id);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ userId: user.userId }, { members: { some: { userId: user.userId } } }],
      },
      include: {
        files: true,
        assets: true,
      },
    });
    if (!project) {
      return NextResponse.json({ error: 'PROJECT_NOT_FOUND', message: 'Project not found.' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

// PATCH /api/projects/[id] - update project
export async function PATCH(req: NextRequest, { params }: ProjectRouteContext) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-detail-patch',
      key: user.userId,
      max: 90,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project update attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const { id } = await params;
    const projectId = normalizeProjectId(id);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const data = await req.json();
    const nextName = typeof data?.name === 'string' ? data.name.trim() : undefined;
    const nextTemplate = typeof data?.template === 'string' ? data.template.trim() : undefined;

    const existing = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'PROJECT_NOT_FOUND', message: 'Project not found.' }, { status: 404 });
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(nextName !== undefined ? { name: nextName } : {}),
        ...(nextTemplate !== undefined ? { template: nextTemplate } : {}),
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

// DELETE /api/projects/[id] - delete project
export async function DELETE(req: NextRequest, { params }: ProjectRouteContext) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-detail-delete',
      key: user.userId,
      max: 30,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project delete attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const { id } = await params;
    const projectId = normalizeProjectId(id);
    if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const existing = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'PROJECT_NOT_FOUND', message: 'Project not found.' }, { status: 404 });
    }

    await prisma.project.delete({ where: { id: projectId } });
    return NextResponse.json({ success: true, projectId });
  } catch (error) {
    console.error('Delete project error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
