import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

// GET /api/projects/[id] - Get single project
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: user.userId },
          { members: { some: { userId: user.userId } } },
        ],
      },
      include: {
        files: true,
        assets: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Get project error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const data = await req.json();

    // Verify ownership
    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId: user.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        name: data.name,
        template: data.template,
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

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify ownership
    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId: user.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
