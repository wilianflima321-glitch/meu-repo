import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

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
  prismaAny: any,
  input: { sourceThreadId: string; targetThreadId: string; maxMessages: number }
) {
  let copied = 0;
  let lastCreatedAt: Date | null = null;
  let lastId: string | null = null;

  while (copied < input.maxMessages) {
    const remaining = input.maxMessages - copied;
    const take = Math.min(BATCH_SIZE, remaining);

    const where: any = { threadId: input.sourceThreadId };
    if (lastCreatedAt && lastId) {
      where.OR = [
        { createdAt: { gt: lastCreatedAt } },
        { createdAt: lastCreatedAt, id: { gt: lastId } },
      ];
    }

    const batch = await prismaAny.chatMessage.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, role: true, content: true, model: true, metadata: true, createdAt: true },
      take,
    });

    if (!batch.length) break;

    await prismaAny.chatMessage.createMany({
      data: batch.map((m: any) => ({
        threadId: input.targetThreadId,
        role: m.role,
        content: m.content,
        model: m.model,
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
    await prismaAny.chatThread.update({
      where: { id: input.targetThreadId },
      data: { updatedAt: new Date() },
      select: { id: true },
    });
  }

  return {
    mergedMessages: copied,
    truncated: copied >= input.maxMessages,
    maxMessages: input.maxMessages,
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const entitlements = await requireEntitlementsForUser(user.userId);
    const maxMessages = resolveMaxMessagesForPlan(entitlements.plan.limits.chatHistoryCopyMaxMessages);

    const prismaAny = prisma as any;

    const body = await req.json().catch(() => ({}));
    const sourceThreadId = typeof body?.sourceThreadId === 'string' ? body.sourceThreadId.trim() : '';
    const targetThreadId = typeof body?.targetThreadId === 'string' ? body.targetThreadId.trim() : '';

    if (!sourceThreadId || !targetThreadId) {
      return NextResponse.json(
        { error: 'INVALID_BODY', message: 'Envie { sourceThreadId, targetThreadId }.' },
        { status: 400 }
      );
    }

    if (sourceThreadId === targetThreadId) {
      return NextResponse.json(
        { error: 'INVALID_BODY', message: 'sourceThreadId e targetThreadId devem ser diferentes.' },
        { status: 400 }
      );
    }

    const [source, target] = await Promise.all([
      prismaAny.chatThread.findFirst({
        where: { id: sourceThreadId, userId: user.userId },
        select: { id: true },
      }),
      prismaAny.chatThread.findFirst({
        where: { id: targetThreadId, userId: user.userId },
        select: { id: true },
      }),
    ]);

    if (!source) {
      return NextResponse.json(
        { error: 'THREAD_NOT_FOUND', message: 'Thread de origem não encontrada.' },
        { status: 404 }
      );
    }

    if (!target) {
      return NextResponse.json(
        { error: 'THREAD_NOT_FOUND', message: 'Thread de destino não encontrada.' },
        { status: 404 }
      );
    }

    const merged = await copyThreadMessages(prismaAny, { sourceThreadId, targetThreadId, maxMessages });

    return NextResponse.json(merged);
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
