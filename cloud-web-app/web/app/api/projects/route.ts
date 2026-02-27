import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

// GET /api/projects - List all projects for user
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-get',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project list requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;
		await requireEntitlementsForUser(user.userId);

    const projects = await prisma.project.findMany({
			where: {
				OR: [
					{ userId: user.userId },
					{ members: { some: { userId: user.userId } } },
				],
			},
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { files: true, assets: true },
        },
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

// POST /api/projects - Create new project
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'projects-post',
      key: user.userId,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many project creation attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
		const entitlements = await requireEntitlementsForUser(user.userId);

    const { name, template } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Enforce limite de projetos
    if (entitlements.plan.limits.projects !== -1) {
      const count = await prisma.project.count({ where: { userId: user.userId } });
      if (count >= entitlements.plan.limits.projects) {
        return NextResponse.json(
          {
            error: 'PROJECT_LIMIT_REACHED',
            message: `Limite de projetos do plano (${entitlements.plan.limits.projects}) atingido. Faça upgrade.`,
            plan: entitlements.plan.id,
          },
          { status: 402 }
        );
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        template: template || null,
        userId: user.userId,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
