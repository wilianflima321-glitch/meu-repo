import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'chat-threads-get',
      key: user.userId,
      max: 480,
      windowMs: 60 * 60 * 1000,
      message: 'Too many chat threads list requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    const archived = url.searchParams.get('archived');

    const where: any = {
      userId: user.userId,
      ...(typeof archived === 'string' ? { archived: archived === 'true' } : { archived: false }),
      ...(projectId ? { projectId } : {}),
    };

    const threads = await prisma.chatThread.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        projectId: true,
        archived: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
      take: 50,
    });

    return NextResponse.json({ threads });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'chat-threads-post',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many chat thread creation requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : 'Chat';
    const projectId = typeof body?.projectId === 'string' && body.projectId.trim() ? body.projectId.trim() : null;

    if (projectId) {
      const owned = await prisma.project.findFirst({
        where: { id: projectId, userId: user.userId },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json({ error: 'PROJECT_NOT_FOUND', message: 'Projeto não encontrado.' }, { status: 404 });
      }
    }

    const thread = await prisma.chatThread.create({
      data: {
        userId: user.userId,
        title,
        projectId,
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        archived: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
