import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';
import { localEvidenceHeaders, localEvidenceJson, shouldUseLocalEvidenceFallback } from '@/lib/server/local-evidence-fallback';

const log = createComponentLogger('api/projects/route');

// GET /api/projects - List all projects for user
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
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
    log.error('Get projects error', error);

    if (shouldUseLocalEvidenceFallback(req, error)) {
      return NextResponse.json([], { headers: localEvidenceHeaders('held') });
    }

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

// POST /api/projects - Create new project
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
		const entitlements = await requireEntitlementsForUser(user.userId);

    const { name, template } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Enforce limite de projetos
    if (entitlements.plan.limits.cloudProjectsMax !== -1) {
      const count = await prisma.project.count({ where: { userId: user.userId } });
      if (count >= entitlements.plan.limits.cloudProjectsMax) {
        return NextResponse.json(
          {
            error: 'CLOUD_PROJECT_LIMIT_REACHED',
            message: `Cloud-synced project limit (${entitlements.plan.limits.cloudProjectsMax}) reached. Upgrade.`,
            plan: entitlements.plan.id,
            cloudProjectsMax: entitlements.plan.limits.cloudProjectsMax,
            cloudProjectsUsed: count,
            localProjectsUnlimited: true,
            upgradeUrl: '/billing'
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
    log.error('Create project error', error);

    if (shouldUseLocalEvidenceFallback(req, error)) {
      return localEvidenceJson(
        req,
        error,
        {
          error: 'PROJECT_CREATE_HELD',
          message: 'Project creation is held until project storage and entitlement checks are configured.',
        },
        { surface: 'projects.create', state: 'held', status: 503 },
      );
    }

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
