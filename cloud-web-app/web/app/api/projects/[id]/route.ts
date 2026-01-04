import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

// GET /api/projects/[id] - Get single project
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
		await requireEntitlementsForUser(user.userId);

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: user.userId,
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
