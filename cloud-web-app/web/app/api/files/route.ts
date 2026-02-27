import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

// GET /api/files?projectId=xxx - List files for project
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'files-legacy-get',
      key: user.userId,
      max: 120,
      windowMs: 60 * 1000,
      message: 'Too many file list requests. Please retry shortly.',
    });
    if (rateLimitResponse) return rateLimitResponse;
		await requireEntitlementsForUser(user.userId);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const files = await prisma.file.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error('Get files error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

// POST /api/files - Create or update file
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'files-legacy-post',
      key: user.userId,
      max: 60,
      windowMs: 60 * 1000,
      message: 'Too many file write requests. Please retry shortly.',
    });
    if (rateLimitResponse) return rateLimitResponse;
		await requireEntitlementsForUser(user.userId);

    const { projectId, path, content, language } = await req.json();

    if (!projectId || !path || content === undefined) {
      return NextResponse.json(
        { error: 'projectId, path, and content are required' },
        { status: 400 }
      );
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Upsert file (create or update)
    const file = await prisma.file.upsert({
      where: {
        projectId_path: {
          projectId,
          path,
        },
      },
      update: {
        content,
        language: language || null,
      },
      create: {
        projectId,
        path,
        content,
        language: language || null,
      },
    });

    return NextResponse.json(file);
  } catch (error) {
    console.error('Save file error:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
