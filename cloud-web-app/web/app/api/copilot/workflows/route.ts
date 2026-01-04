import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const prismaAny = prisma as any;

    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    const archived = url.searchParams.get('archived');

    const where: any = {
      userId: user.userId,
      ...(typeof archived === 'string' ? { archived: archived === 'true' } : { archived: false }),
      ...(projectId ? { projectId } : {}),
    };

    const workflows = await prismaAny.copilotWorkflow.findMany({
      where,
      orderBy: [{ lastUsedAt: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        projectId: true,
        chatThreadId: true,
        archived: true,
        contextVersion: true,
        createdAt: true,
        updatedAt: true,
        lastUsedAt: true,
      },
      take: 50,
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const prismaAny = prisma as any;

    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : 'Workflow';
    const projectId = typeof body?.projectId === 'string' && body.projectId.trim() ? body.projectId.trim() : null;
    const chatThreadId = typeof body?.chatThreadId === 'string' && body.chatThreadId.trim() ? body.chatThreadId.trim() : null;

    if (projectId) {
      const ownedProject = await prisma.project.findFirst({
        where: { id: projectId, userId: user.userId },
        select: { id: true },
      });
      if (!ownedProject) {
        return NextResponse.json({ error: 'PROJECT_NOT_FOUND', message: 'Projeto não encontrado.' }, { status: 404 });
      }
    }

    if (chatThreadId) {
      const ownedThread = await prismaAny.chatThread.findFirst({
        where: { id: chatThreadId, userId: user.userId },
        select: { id: true },
      });
      if (!ownedThread) {
        return NextResponse.json({ error: 'THREAD_NOT_FOUND', message: 'Thread não encontrada.' }, { status: 404 });
      }

      const existingLink = await prismaAny.copilotWorkflow.findFirst({
        where: { chatThreadId },
        select: { id: true },
      });
      if (existingLink) {
        return NextResponse.json(
          { error: 'THREAD_ALREADY_LINKED', message: 'Essa thread já está ligada a um workflow.' },
          { status: 409 }
        );
      }
    }

    const workflow = await prismaAny.copilotWorkflow.create({
      data: {
        userId: user.userId,
        title,
        projectId,
        chatThreadId,
        lastUsedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        chatThreadId: true,
        archived: true,
        contextVersion: true,
        createdAt: true,
        updatedAt: true,
        lastUsedAt: true,
      },
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
