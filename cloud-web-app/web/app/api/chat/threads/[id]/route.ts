import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

async function assertThreadOwnership(userId: string, threadId: string) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
    select: { id: true, userId: true, projectId: true, archived: true, title: true, createdAt: true, updatedAt: true },
  });
  return thread;
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const threadId = ctx.params.id;
    const thread = await assertThreadOwnership(user.userId, threadId);

    if (!thread) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND', message: 'Thread não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const threadId = ctx.params.id;
    const existing = await assertThreadOwnership(user.userId, threadId);
    if (!existing) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND', message: 'Thread não encontrada.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const archived = typeof body?.archived === 'boolean' ? body.archived : undefined;

    if (!title && archived === undefined) {
      return NextResponse.json(
        { error: 'INVALID_BODY', message: 'Envie { title } e/ou { archived }.' },
        { status: 400 }
      );
    }

    const thread = await prisma.chatThread.update({
      where: { id: threadId },
      data: {
        ...(title ? { title } : {}),
        ...(archived !== undefined ? { archived } : {}),
      },
      select: { id: true, title: true, projectId: true, archived: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ thread });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const threadId = ctx.params.id;
    const existing = await assertThreadOwnership(user.userId, threadId);
    if (!existing) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND', message: 'Thread não encontrada.' }, { status: 404 });
    }

    // Hard delete (mensagens em cascade). Se quiser soft delete, use PATCH archived.
    await prisma.chatThread.delete({ where: { id: threadId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
