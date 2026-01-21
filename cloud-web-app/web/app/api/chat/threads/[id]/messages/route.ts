import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

async function assertThreadOwnership(userId: string, threadId: string) {
  return prisma.chatThread.findFirst({
    where: { id: threadId, userId },
    select: { id: true, userId: true, archived: true },
  });
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

    const messages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
      take: 500,
    });

    return NextResponse.json({ threadId, messages });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    await requireEntitlementsForUser(user.userId);

    const threadId = ctx.params.id;
    const thread = await assertThreadOwnership(user.userId, threadId);

    if (!thread) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND', message: 'Thread não encontrada.' }, { status: 404 });
    }

    if (thread.archived) {
      return NextResponse.json(
        { error: 'THREAD_ARCHIVED', message: 'Thread arquivada. Crie uma nova conversa.' },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Body JSON inválido.' }, { status: 400 });
    }

    const role = typeof (body as any).role === 'string' ? String((body as any).role) : '';
    const content = typeof (body as any).content === 'string' ? String((body as any).content) : '';
    const metadata = (body as any).metadata;

    const allowedRoles = new Set(['user', 'assistant', 'system']);
    if (!allowedRoles.has(role)) {
      return NextResponse.json({ error: 'INVALID_ROLE', message: 'role deve ser user|assistant|system.' }, { status: 400 });
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'EMPTY_CONTENT', message: 'content é obrigatório.' }, { status: 400 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        threadId,
        role,
        content,
        metadata: metadata ?? undefined,
      },
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    });

    // bump updatedAt
    await prisma.chatThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
      select: { id: true },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
