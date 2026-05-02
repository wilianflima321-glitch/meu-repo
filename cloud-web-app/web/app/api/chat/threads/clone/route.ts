import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ABSOLUTE_MAX_MESSAGES_PER_OPERATION = 200_000;
const BATCH_SIZE = 500;

function resolveMaxMessagesForPlan(limit: unknown): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return 5000;
  if (limit === -1) return ABSOLUTE_MAX_MESSAGES_PER_OPERATION;
  if (limit <= 0) return 5000;
  return Math.min(Math.floor(limit), ABSOLUTE_MAX_MESSAGES_PER_OPERATION);
}

async function copyThreadMessages(
  client: typeof prisma,
  input: { sourceThreadId: string; targetThreadId: string; maxMessages: number }
) {
  let copied = 0;
  let lastCreatedAt: Date | null = null;
  let lastId: string | null = null;

  while (copied < input.maxMessages) {
    const remaining = input.maxMessages - copied;
    const take = Math.min(BATCH_SIZE, remaining);

    const where: Prisma.ChatMessageWhereInput = { threadId: input.sourceThreadId };
    if (lastCreatedAt && lastId) {
      where.OR = [
        { createdAt: { gt: lastCreatedAt } },
        { createdAt: lastCreatedAt, id: { gt: lastId } },
      ];
    }

    const batch = await client.chatMessage.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, role: true, content: true, metadata: true, createdAt: true },
      take,
    });

    if (!batch.length) break;

    await client.chatMessage.createMany({
      data: batch.map((m) => ({
        threadId: input.targetThreadId,
        role: m.role,
        content: m.content,
        metadata: m.metadata ?? undefined,
        createdAt: m.createdAt,
      })),
    });

    copied += batch.length;
    lastCreatedAt = batch[batch.length - 1].createdAt;
    lastId = batch[batch.length - 1].id;

    if (batch.length < take) break;
  }

  if (copied > 0) {
    await client.chatThread.update({
      where: { id: input.targetThreadId },
      data: { updatedAt: new Date() },
      select: { id: true },
    });
  }

  return {
    copiedMessages: copied,
    truncated: copied >= input.maxMessages,
    maxMessages: input.maxMessages,
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const entitlements = await requireEntitlementsForUser(user.userId);
    const maxMessages = resolveMaxMessagesForPlan(entitlements.plan.limits.chatHistoryCopyMaxMessages);

    const body = await req.json().catch(() => ({}));
    const sourceThreadId = typeof body?.sourceThreadId === 'string' ? body.sourceThreadId.trim() : '';
    const titleRaw = typeof body?.title === 'string' ? body.title.trim() : '';

    if (!sourceThreadId) {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Envie { sourceThreadId }.' }, { status: 400 });
    }

    const source = await prisma.chatThread.findFirst({
      where: { id: sourceThreadId, userId: user.userId },
      select: { id: true, projectId: true, title: true },
    });

    if (!source) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND', message: 'Thread de origem não encontrada.' }, { status: 404 });
    }

    const title = titleRaw || `${source.title} (cópia)`;

    const newThread = await prisma.chatThread.create({
      data: {
        userId: user.userId,
        title,
        projectId: source.projectId,
      },
      select: { id: true, title: true, projectId: true, archived: true, createdAt: true, updatedAt: true },
    });

    const copied = await copyThreadMessages(prisma, { sourceThreadId, targetThreadId: newThread.id, maxMessages });

    return NextResponse.json({ thread: newThread, ...copied }, { status: 201 });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
